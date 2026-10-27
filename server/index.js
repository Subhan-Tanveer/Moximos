import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { waitUntil } from "@vercel/functions";
import {
    createUser,
    findUserByEmail,
    findUserById,
    publicUser,
    verifyPassword,
    createSession,
    getSessionUserId,
    destroySession,
    listProjects,
    getProject,
    getPublicProject,
    createProject,
    updateProject,
    deleteProject,
} from "./store.js";
import { generateProject, reviseProject, reviseContentPlan } from "./services/ai.js";
import { describePlanChange } from "./services/sectionLibrary.js";
import { verifyFile } from "./services/staticValidator.js";
import { buildPreviewHtml } from "./services/previewHtml.js";
import { applyOperations, hashContent } from "./services/diff.js";
import { searchBusinesses, getPlacesUsage } from "./services/places.js";

const PORT = parseInt(process.env.PORT || "8787", 10);
const COOKIE_NAME = "moximos_session";
const IS_PROD = process.env.NODE_ENV === "production";

const app = express();
// The AI Code Editor lets a user attach screenshots (base64-encoded in the
// JSON body) so the AI can see what's actually broken. This was 15mb, but
// Vercel rejects any request body over 4.5MB before it reaches this code
// (413 FUNCTION_PAYLOAD_TOO_LARGE), so a limit above that is unreachable —
// 4mb keeps a clear, JSON-shaped error of our own in front of the platform's.
app.use(express.json({ limit: "4mb" }));
app.use(cookieParser());

// Reflects the request origin rather than a fixed one — this is a local/dev
// backend with no hosted frontend origin decided yet. The Vite dev proxy
// (vite.config.js) is the primary path and makes this moot in normal dev
// (same-origin, no CORS involved at all); this is the fallback for anyone
// hitting the server directly.
app.use(cors({ origin: true, credentials: true }));

/* ── Async route support ──────────────────────────────────────
   Express 4 does not catch a rejected promise from an async handler: the
   request would simply hang until the platform times it out. The store is now
   async (it talks to Postgres), so every route is. Wrapping at registration
   sends a rejection to the error handler at the bottom instead — the same
   thing express-async-errors does, kept local and explicit. */
for (const method of ["get", "post", "put", "delete"]) {
    const register = app[method].bind(app);
    app[method] = (routePath, ...handlers) => {
        // app.get("setting") with no handlers is Express's settings getter.
        if (handlers.length === 0) return register(routePath);
        return register(
            routePath,
            ...handlers.map((h) => (req, res, next) => {
                try {
                    Promise.resolve(h(req, res, next)).catch(next);
                } catch (err) {
                    next(err);
                }
            })
        );
    };
}

/* ── Auth helpers ─────────────────────────────────────────── */

function setSessionCookie(res, token) {
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
    });
}

async function requireAuth(req, res, next) {
    const token = req.cookies?.[COOKIE_NAME];
    const userId = token ? await getSessionUserId(token) : null;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    req.userId = userId;
    next();
}

/* ── File-shape normalization ────────────────────────────────
   Every code path that saves files (fresh generation, manual edits,
   revisions) converges on {path: {content, hash}} — the shape diff.js's
   applyOperations already expects. AppShell.jsx and exportProject.js
   already tolerate this shape (they were written defensively against both
   plain strings and {content} objects), so this is a safe, one-way
   standardization rather than a frontend change. */
function normalizeFiles(files) {
    const out = {};
    for (const [path, value] of Object.entries(files || {})) {
        const content = typeof value === "string" ? value : value?.content || "";
        out[path] = { content, hash: hashContent(content) };
    }
    return out;
}

function flattenFiles(files) {
    const out = {};
    for (const [path, value] of Object.entries(files || {})) {
        out[path] = typeof value === "string" ? value : value?.content || "";
    }
    return out;
}

function projectSummary(p) {
    return { _id: p._id, name: p.name, description: p.description, version: p.version, createdAt: p.createdAt, updatedAt: p.updatedAt };
}

/* ── Background generation ────────────────────────────────────
   POST /api/projects returns immediately with a "pending" project so the
   frontend can poll progress — matching what AgentProgressDashboard was
   actually built to show (planned files, completed files, current file,
   stage) rather than blocking the request for the 30-90s a full
   plan→build→animate→review pass can take. */
/*
 * How long a generation may run before it is treated as lost.
 *
 * On Vercel a function is killed at its maxDuration (300s on the Hobby plan).
 * A generation still running at that point does not fail — it just stops, and
 * the project would sit on "pending" forever with a spinner. So the work gets
 * a budget a little under the limit (GENERATION_BUDGET_MS, used by
 * generateProject to skip optional phases rather than be cut off mid-file),
 * and a project that has not moved for longer than STALE_MS is reported as
 * failed so the user can retry instead of waiting on nothing.
 *
 * Off Vercel there is no hard cap, so the budget is off and the stale window is
 * generous: a slow free-tier model legitimately goes minutes between updates.
 */
const ON_VERCEL = Boolean(process.env.VERCEL);
const GENERATION_BUDGET_MS = Number(process.env.GENERATION_BUDGET_MS) || (ON_VERCEL ? 255_000 : 0);
const STALE_MS = Number(process.env.GENERATION_STALE_MS) || (ON_VERCEL ? 330_000 : 20 * 60_000);

async function failIfStalled(project, userId) {
    if (!project || project.status !== "pending") return project;
    const idleMs = Date.now() - new Date(project.updatedAt).getTime();
    if (idleMs < STALE_MS) return project;
    console.warn(`[AI] Project ${project._id} made no progress for ${Math.round(idleMs / 1000)}s — marking failed`);
    return (
        (await updateProject(project._id, userId, {
            status: "failed",
            stage: "failed",
            currentFiles: [],
            error:
                "Generation ran out of time before it finished — usually the AI provider was slow or unavailable. " +
                "Press Retry to start it again.",
        })) || project
    );
}

/* ── Background generation ────────────────────────────────────
   POST /api/projects returns immediately with a "pending" project so the
   frontend can poll progress — matching what AgentProgressDashboard was
   actually built to show (planned files, completed files, current file,
   stage) rather than blocking the request for the minutes a full
   plan→build→animate→review pass can take.

   On Vercel the response ending would normally freeze the function, so the
   work is handed to waitUntil(), which keeps the invocation alive (up to its
   maxDuration) after the response has been sent. Locally waitUntil is a
   no-op and the promise just keeps running. */
function startGeneration(projectId, userId, prompt) {
    const job = runGeneration(projectId, userId, prompt).catch((err) => {
        console.error(`[AI] Generation job for ${projectId} crashed outside its own handler:`, err?.message || err);
    });
    waitUntil(job);
    return job;
}

async function runGeneration(projectId, userId, prompt) {
    const deadline = GENERATION_BUDGET_MS > 0 ? Date.now() + GENERATION_BUDGET_MS : undefined;
    try {
        const result = await generateProject(
            prompt,
            {
                onStageChange: async (stage) => {
                    await updateProject(projectId, userId, { stage });
                },
                onPlan: async (plan) => {
                    await updateProject(projectId, userId, {
                        name: plan.projectName || undefined,
                        description: plan.projectDescription || undefined,
                        filesPlanned: plan.files.map((f) => ({ path: f.path, description: f.description })),
                    });
                },
                onFileStart: async (filePath) => {
                    // Tracks EVERY file currently in flight, not just the most
                    // recent, so the UI can show each as active while it works.
                    const current = await getProject(projectId, userId);
                    if (!current) return;
                    const currentFiles = current.currentFiles || [];
                    if (!currentFiles.includes(filePath)) {
                        await updateProject(projectId, userId, { currentFiles: [...currentFiles, filePath] });
                    }
                },
                onFileSettled: async (filePath) => {
                    const current = await getProject(projectId, userId);
                    if (!current) return;
                    await updateProject(projectId, userId, {
                        currentFiles: (current.currentFiles || []).filter((p) => p !== filePath),
                    });
                },
                onFileComplete: async (filePath, code, stage) => {
                    const current = await getProject(projectId, userId);
                    if (!current) return;
                    const files = { ...current.files, [filePath]: { content: code, hash: hashContent(code) } };
                    // filesGenerated tracks "has completed its initial build" —
                    // later passes (animating/reviewing) update file content
                    // without re-triggering progress-bar math for a file that
                    // was already counted done.
                    const filesGenerated =
                        stage === "building" && !current.filesGenerated.includes(filePath)
                            ? [...current.filesGenerated, filePath]
                            : current.filesGenerated;
                    await updateProject(projectId, userId, { files, filesGenerated });
                },
            },
            { deadline }
        );

        await updateProject(projectId, userId, {
            status: "completed",
            stage: "completed",
            currentFiles: [],
            files: normalizeFiles(result.files),
            filesGenerated: Object.keys(result.files),
            qaIssues: result.qaIssues || [],
            stack: result.stack || "react",
            // Storing the plan is what makes safe revisions possible: an edit
            // updates this structured data and re-renders, instead of asking
            // a model to patch raw markup.
            contentPlan: result.contentPlan || null,
            sourcePrompt: prompt,
            messages: [
                ...((await getProject(projectId, userId))?.messages || []),
                {
                    role: "assistant",
                    content: `Built ${Object.keys(result.files).length} files for: "${result.description}".`,
                    timestamp: new Date().toISOString(),
                },
            ],
        });
    } catch (err) {
        console.error(`[AI] Generation failed for project ${projectId}:`, err?.message || err);
        await updateProject(projectId, userId, {
            status: "failed",
            stage: "failed",
            error: err?.message || "Generation failed",
        });
    }
}

/* ── Auth routes ──────────────────────────────────────────── */

app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await findUserById(req.userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    res.json({ user: publicUser(user) });
});

app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    try {
        const user = await createUser({ name, email, password });
        const token = await createSession(user._id);
        setSessionCookie(res, token);
        res.status(201).json({ user: publicUser(user) });
    } catch (err) {
        res.status(err.status || 400).json({ error: err.message });
    }
});

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    const user = await findUserByEmail(email || "");
    if (!user || !verifyPassword(password || "", user.passwordHash)) {
        return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = await createSession(user._id);
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", async (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) await destroySession(token);
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ message: "Logged out" });
});

/* ── Project routes ───────────────────────────────────────── */

app.get("/api/projects", requireAuth, async (req, res) => {
    res.json((await listProjects(req.userId)).map(projectSummary));
});

app.post("/api/projects", requireAuth, async (req, res) => {
    const prompt = (req.body?.prompt || "New Project").trim();
    if (!prompt) return res.status(400).json({ error: "A prompt is required" });

    const name = prompt.length > 40 ? prompt.slice(0, 40) + "..." : prompt;
    const project = await createProject(req.userId, {
        name,
        description: prompt,
        status: "pending",
        stage: "planning",
        filesPlanned: [],
        filesGenerated: [],
        currentFiles: [],
        files: {},
        qaIssues: [],
        messages: [{ role: "user", content: prompt, timestamp: new Date().toISOString() }],
    });

    res.status(201).json(project);
    startGeneration(project._id, req.userId, prompt);
});

app.post("/api/projects/:id/retry", requireAuth, async (req, res) => {
    const project = await getProject(req.params.id, req.userId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (project.status !== "failed") {
        return res.status(400).json({ error: "Only a failed project can be retried" });
    }

    // Re-run generation for the SAME project id rather than creating a new
    // one — a plan-phase timeout (the actual failure mode seen so far) never
    // wrote any files, so there's nothing to preserve by starting fresh
    // except the sidebar entry the user already clicked into.
    const prompt = project.messages?.[0]?.content || project.description;
    const updated = await updateProject(req.params.id, req.userId, {
        status: "pending",
        stage: "planning",
        error: null,
        filesPlanned: [],
        filesGenerated: [],
        currentFiles: [],
        files: {},
        qaIssues: [],
    });

    res.json(updated);
    startGeneration(req.params.id, req.userId, prompt);
});

app.get("/api/projects/public/:id", async (req, res) => {
    const project = await getPublicProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Website unavailable or not published yet" });
    res.json(project);
});

app.get("/api/projects/:id", requireAuth, async (req, res) => {
    const found = await getProject(req.params.id, req.userId);
    if (!found) return res.status(404).json({ error: "Project not found" });
    // The UI polls this while a build runs. If the function doing the build was
    // cut off, nothing else will ever move the status, so detect it here.
    res.json(await failIfStalled(found, req.userId));
});

// Served as a real, same-origin HTTP page rather than an iframe srcDoc/blob:
// URL — those give the iframe an opaque or otherwise non-rewritable
// location, which silently breaks react-router-dom's <BrowserRouter> (it
// reads window.location.pathname to match routes; an opaque "about:srcdoc"
// or blob: URL can't be rewritten to a normal "/" via history.replaceState,
// so it matches nothing and the preview renders blank with no thrown
// error). A real HTTP response has a real, rewritable URL, so
// previewBootstrap.js's history.replaceState(null, "", "/") on load
// actually succeeds here.
app.get("/api/projects/:id/preview", requireAuth, async (req, res) => {
    const project = await getProject(req.params.id, req.userId);
    if (!project) return res.status(404).send("Project not found");
    const html = buildPreviewHtml(project);
    if (!html) {
        return res
            .status(400)
            .send("Live preview isn't available for Next.js projects — use Export and run it locally instead.");
    }
    res.set("Cache-Control", "no-store");
    res.type("html").send(html);
});

app.put("/api/projects/:id/files", requireAuth, async (req, res) => {
    const project = await getProject(req.params.id, req.userId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    await updateProject(req.params.id, req.userId, { files: normalizeFiles(req.body?.files) });
    res.json({ success: true });
});

// A user attachment is either a screenshot (kind: "image", data: a
// data:image/...;base64,... URL — sent straight to a vision model so the
// AI can see what's actually broken instead of only reading a text
// description) or a text-ish file (kind: "text", data: its raw content —
// inlined directly into the revision prompt as reference material, no
// model call needed). Capped at 5 files, and 3MB each / 3MB in total: Vercel
// refuses any request body over 4.5MB, and base64 plus the rest of the JSON
// need headroom, so the totals must fit inside the 4mb parser limit above.
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const MAX_ATTACHMENT_TOTAL_BYTES = 3 * 1024 * 1024;

function sanitizeAttachments(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((a) => a && typeof a === "object")
        .slice(0, MAX_ATTACHMENTS)
        .map((a) => ({
            name: typeof a.name === "string" ? a.name.slice(0, 200) : "attachment",
            kind: a.kind === "image" ? "image" : "text",
            mime: typeof a.mime === "string" ? a.mime.slice(0, 100) : "",
            data: typeof a.data === "string" ? a.data : "",
        }))
        .filter((a) => a.data && Buffer.byteLength(a.data, "utf-8") <= MAX_ATTACHMENT_BYTES)
        .reduce(
            (acc, a) => {
                const size = Buffer.byteLength(a.data, "utf-8");
                if (acc.total + size > MAX_ATTACHMENT_TOTAL_BYTES) return acc;
                acc.total += size;
                acc.kept.push(a);
                return acc;
            },
            { total: 0, kept: [] }
        ).kept;
}

app.post("/api/projects/:id/chat", requireAuth, async (req, res) => {
    const project = await getProject(req.params.id, req.userId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const prompt = (req.body?.prompt || "").trim();
    const attachments = sanitizeAttachments(req.body?.attachments);
    if (!prompt && attachments.length === 0) return res.status(400).json({ error: "A prompt is required" });

    const manifest = Object.entries(project.files).map(([path, value]) => ({
        path,
        hash: value.hash,
        size: Buffer.byteLength(value.content, "utf-8"),
    }));
    const relevantFiles = flattenFiles(project.files);
    const messages = [
        ...(project.messages || []),
        {
            role: "user",
            content: prompt || "(see attached file(s))",
            // Only images are kept for display — a text attachment's
            // content already lives inline in the prompt sent to the
            // model, and re-storing potentially large file contents in
            // every message forever isn't worth it just to show a name.
            attachments: attachments
                .filter((a) => a.kind === "image")
                .map((a) => ({ name: a.name, kind: a.kind, mime: a.mime, data: a.data })),
            timestamp: new Date().toISOString(),
        },
    ];

    /*
     * A project built from the section library revises its PLAN, not its
     * markup. The model edits structured content and the page is re-rendered
     * from the same hand-written templates, so an edit cannot damage layout,
     * palette, type scale, responsiveness or motion.
     *
     * This path exists because the free-form one below actively broke pages:
     * asked to make a page "responsive and animated", it reported adding GSAP
     * and reveal classes while leaving the service cards ~100px wide with one
     * word per line. Patching raw HTML with a 30B model is not a safe edit
     * primitive. Projects generated before this (no stored plan) still use it,
     * since there is nothing structured to edit.
     */
    if (project.contentPlan) {
        try {
            const { files, contentPlan } = await reviseContentPlan(
                prompt || "Improve this page.",
                project.contentPlan,
                project.sourcePrompt || project.description || ""
            );

            const updated = await updateProject(req.params.id, req.userId, {
                files: normalizeFiles(files),
                contentPlan,
                version: project.version + 1,
                status: "completed",
                messages: [
                    ...messages,
                    {
                        role: "assistant",
                        // Describes what actually changed, including the
                        // honest "nothing changed" case.
                        content: describePlanChange(project.contentPlan, contentPlan, prompt),
                        timestamp: new Date().toISOString(),
                    },
                ],
            });
            return res.json(updated);
        } catch (err) {
            console.error(`[AI] Plan revision failed for ${project._id}:`, err?.message || err);
            return res.status(500).json({ error: "Revision failed — try rephrasing the request" });
        }
    }

    try {
        const revision = await reviseProject(
            prompt || "Look at the attached file(s) and fix whatever they show is wrong.",
            manifest,
            relevantFiles,
            project.messages || [],
            project.stack || "react",
            attachments
        );
        const { files: updatedFiles, applied, errors } = applyOperations(project.files, revision.operations || []);

        if (errors.length > 0) {
            console.warn(`[AI] Revision applied with errors for ${project._id}: ${errors.join("; ")}`);
        }

        // Deterministic verification — real esbuild syntax parsing + real
        // npm registry existence checks, NOT another AI call. Every full
        // generation already goes through this (generateProject's Phase 5);
        // revisions never did, which is exactly why a broken/unused import
        // could keep getting reintroduced by "Fix with AI" edits with
        // nothing to catch it before it reached the user. One automatic
        // fix attempt mirrors the same pattern generateProject uses.
        const touchedPaths = [
            ...new Set(
                (revision.operations || [])
                    .filter((op) => (op.op === "create" || op.op === "update") && updatedFiles[op.path])
                    .map((op) => op.path)
            ),
        ];
        let finalFiles = updatedFiles;
        let unresolvedIssues = [];
        const firstPassIssues = [];
        for (const path of touchedPaths) {
            const result = await verifyFile(finalFiles[path].content, path);
            if (!result.ok) firstPassIssues.push({ path, problems: result.problems });
        }

        if (firstPassIssues.length > 0) {
            console.warn(
                `[Verify] Revision for ${project._id} left real problems, attempting one automatic fix: ${firstPassIssues.map((i) => `${i.path}: ${i.problems.join(" ")}`).join(" | ")}`
            );
            try {
                const fixPrompt =
                    "Your previous edit left these confirmed, real problems — fix them precisely. Only touch the file(s) listed:\n" +
                    firstPassIssues.map((i) => `- ${i.path}: ${i.problems.join(" ")}`).join("\n");
                const fixRevision = await reviseProject(
                    fixPrompt,
                    manifest,
                    flattenFiles(finalFiles),
                    [],
                    project.stack || "react",
                    []
                );
                const { files: fixedFiles, errors: fixErrors } = applyOperations(finalFiles, fixRevision.operations || []);
                if (fixErrors.length > 0) {
                    console.warn(`[AI] Automatic fix pass had errors for ${project._id}: ${fixErrors.join("; ")}`);
                }
                finalFiles = fixedFiles;
                for (const issue of firstPassIssues) {
                    const recheck = await verifyFile(finalFiles[issue.path]?.content || "", issue.path);
                    if (!recheck.ok) unresolvedIssues.push({ path: issue.path, problems: recheck.problems });
                }
            } catch (err) {
                console.warn(`[AI] Automatic fix attempt failed for ${project._id}: ${err?.message || err}`);
                unresolvedIssues = firstPassIssues;
            }
        }

        const description = revision.description || `Applied ${applied.length} change(s).`;

        // ROLL BACK an edit that still fails verification after the fix pass.
        //
        // This used to save `finalFiles` unconditionally and merely append a
        // "heads up" note to the reply. That made every failed edit
        // permanent AND cumulative: the next revision started from a file
        // that doesn't parse, the model tried to patch around broken code,
        // and the same syntax error resurfaced on every subsequent edit with
        // no way for the user to get back to working code. Reported by the
        // user as "it always shows me this syntax error everytime I want to
        // edit the website" — that's this branch, not a model defect.
        //
        // The whole edit reverts, not just the failing file: revisions
        // routinely touch several files that depend on each other (markup +
        // the CSS/JS that drives it), so keeping the half that happened to
        // parse would leave a project that's internally inconsistent, which
        // is harder to recover from than simply not applying the change.
        const rolledBack = unresolvedIssues.length > 0;
        if (rolledBack) {
            console.warn(
                `[Verify] Revision for ${project._id} REVERTED — still failing after the automatic fix: ${unresolvedIssues.map((i) => `${i.path}: ${i.problems.join(" ")}`).join(" | ")}`
            );
        }

        const assistantContent = rolledBack
            ? `I tried that edit, but it produced code that doesn't compile, and my automatic fix attempt didn't resolve it:\n\n${unresolvedIssues.map((i) => `- ${i.path}: ${i.problems.join(" ")}`).join("\n")}\n\nI've reverted the change, so your site is exactly as it was before — nothing is broken. Try describing the change differently, or ask for a smaller piece of it at a time.`
            : description;

        const updated = await updateProject(req.params.id, req.userId, {
            // Reverting means the previous files stay exactly as they were.
            files: rolledBack ? project.files : finalFiles,
            version: rolledBack ? project.version : project.version + 1,
            status: "completed",
            messages: [
                ...messages,
                {
                    role: "assistant",
                    content: assistantContent,
                    timestamp: new Date().toISOString(),
                },
            ],
        });
        res.json(updated);
    } catch (err) {
        console.error(`[AI] Revision failed for ${project._id}:`, err?.message || err);
        res.status(500).json({ error: "Revision failed — try rephrasing the request" });
    }
});

app.post("/api/projects/:id/publish", requireAuth, async (req, res) => {
    const project = await getProject(req.params.id, req.userId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    await updateProject(req.params.id, req.userId, { published: true });
    res.json({ published: true });
});

app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    await deleteProject(req.params.id, req.userId);
    res.json({ message: "Project deleted" });
});

/* ── Lead Engine routes ───────────────────────────────────────
   Real business search via Places API — behind auth (it costs real money
   per request, so only signed-in accounts can trigger it) and behind the
   hard daily cap enforced inside searchBusinesses(). */

app.get("/api/leads/usage", requireAuth, async (req, res) => {
    res.json(await getPlacesUsage());
});

app.get("/api/leads", requireAuth, async (req, res) => {
    const { city, niche, minRating, minReviews, siteStatus } = req.query;
    try {
        const { leads, totalFound, fromCache, cachedAt } = await searchBusinesses({
            city,
            niche,
            minRating: minRating ? parseFloat(minRating) : undefined,
            minReviews: minReviews ? parseInt(minReviews, 10) : undefined,
            siteStatus: siteStatus || undefined,
        });
        res.json({ leads, totalFound, fromCache, cachedAt, usage: await getPlacesUsage() });
    } catch (err) {
        console.error(`[Places] Search failed:`, err?.message || err);
        res.status(err.status || 500).json({ error: err.message });
    }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, next) => {
    if (err?.type === "entity.too.large") {
        return res.status(413).json({ error: "That request is too large — attach smaller screenshots (about 3MB in total)." });
    }
    console.error(err);
    res.status(err?.status && err.status < 600 ? err.status : 500).json({
        error: err?.status && err.status < 500 ? err.message : "Internal server error",
    });
});

export default app;

/*
 * Only listen when this file is run directly (npm run server). On Vercel the
 * platform imports the exported app through api/index.js and owns the socket —
 * calling listen() there would be wrong — and the tests import it without
 * binding a port.
 */
const isEntryPoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`[server] Moximos API listening on http://localhost:${PORT}`);
        if (!process.env.NVIDIA_API_KEY) {
            console.warn("[server] NVIDIA_API_KEY is not set — project generation will fail.");
        }
    });
}
