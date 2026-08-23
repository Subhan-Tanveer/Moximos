import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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
// Raised from 2mb — the AI Code Editor lets a user attach screenshots
// (base64-encoded in the JSON body) so the AI can see what's actually
// broken instead of relying on the user describing it in words. A few
// full-page screenshots easily exceeds 2mb.
app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());

// Reflects the request origin rather than a fixed one — this is a local/dev
// backend with no hosted frontend origin decided yet. The Vite dev proxy
// (vite.config.js) is the primary path and makes this moot in normal dev
// (same-origin, no CORS involved at all); this is the fallback for anyone
// hitting the server directly.
app.use(cors({ origin: true, credentials: true }));

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

function requireAuth(req, res, next) {
    const token = req.cookies?.[COOKIE_NAME];
    const userId = token ? getSessionUserId(token) : null;
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
async function runGeneration(projectId, userId, prompt) {
    try {
        const result = await generateProject(prompt, {
            onStageChange: async (stage) => {
                updateProject(projectId, userId, { stage });
            },
            onPlan: async (plan) => {
                updateProject(projectId, userId, {
                    name: plan.projectName || undefined,
                    description: plan.projectDescription || undefined,
                    filesPlanned: plan.files.map((f) => ({ path: f.path, description: f.description })),
                });
            },
            onFileStart: async (path) => {
                // Tracks EVERY file currently in flight, not just the most
                // recent — MAX_CONCURRENCY lets 2+ files generate at once,
                // so a single "currentFile" string meant the UI could only
                // ever show one as active, making the other look abandoned
                // even while it was still genuinely working.
                const current = getProject(projectId, userId);
                if (!current) return;
                const currentFiles = current.currentFiles || [];
                if (!currentFiles.includes(path)) {
                    updateProject(projectId, userId, { currentFiles: [...currentFiles, path] });
                }
            },
            onFileSettled: async (path) => {
                const current = getProject(projectId, userId);
                if (!current) return;
                updateProject(projectId, userId, {
                    currentFiles: (current.currentFiles || []).filter((p) => p !== path),
                });
            },
            onFileComplete: async (path, code, stage) => {
                const current = getProject(projectId, userId);
                if (!current) return;
                const files = { ...current.files, [path]: { content: code, hash: hashContent(code) } };
                // filesGenerated tracks "has completed its initial build" —
                // later passes (animating/reviewing) update file content
                // without re-triggering progress-bar math for a file that
                // was already counted done.
                const filesGenerated =
                    stage === "building" && !current.filesGenerated.includes(path)
                        ? [...current.filesGenerated, path]
                        : current.filesGenerated;
                updateProject(projectId, userId, { files, filesGenerated });
            },
        });

        updateProject(projectId, userId, {
            status: "completed",
            stage: "completed",
            currentFiles: [],
            files: normalizeFiles(result.files),
            filesGenerated: Object.keys(result.files),
            qaIssues: result.qaIssues || [],
            stack: result.stack || "react",
            // Storing the plan is what makes safe revisions possible: an edit
            // updates this structured data and re-renders, instead of asking
            // a model to patch raw markup (which is how a "make it
            // responsive" request ended up leaving the layout broken).
            contentPlan: result.contentPlan || null,
            sourcePrompt: prompt,
            messages: [
                ...(getProject(projectId, userId)?.messages || []),
                {
                    role: "assistant",
                    content: `Built ${Object.keys(result.files).length} files for: "${result.description}".`,
                    timestamp: new Date().toISOString(),
                },
            ],
        });
    } catch (err) {
        console.error(`[AI] Generation failed for project ${projectId}:`, err?.message || err);
        updateProject(projectId, userId, {
            status: "failed",
            stage: "failed",
            error: err?.message || "Generation failed",
        });
    }
}

/* ── Auth routes ──────────────────────────────────────────── */

app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = findUserById(req.userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    res.json({ user: publicUser(user) });
});

app.post("/api/auth/register", (req, res) => {
    const { name, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    try {
        const user = createUser({ name, email, password });
        const token = createSession(user._id);
        setSessionCookie(res, token);
        res.status(201).json({ user: publicUser(user) });
    } catch (err) {
        res.status(err.status || 400).json({ error: err.message });
    }
});

app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body || {};
    const user = findUserByEmail(email || "");
    if (!user || !verifyPassword(password || "", user.passwordHash)) {
        return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = createSession(user._id);
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) destroySession(token);
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ message: "Logged out" });
});

/* ── Project routes ───────────────────────────────────────── */

app.get("/api/projects", requireAuth, (req, res) => {
    res.json(listProjects(req.userId).map(projectSummary));
});

app.post("/api/projects", requireAuth, (req, res) => {
    const prompt = (req.body?.prompt || "New Project").trim();
    if (!prompt) return res.status(400).json({ error: "A prompt is required" });

    const name = prompt.length > 40 ? prompt.slice(0, 40) + "..." : prompt;
    const project = createProject(req.userId, {
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
    runGeneration(project._id, req.userId, prompt);
});

app.post("/api/projects/:id/retry", requireAuth, (req, res) => {
    const project = getProject(req.params.id, req.userId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (project.status !== "failed") {
        return res.status(400).json({ error: "Only a failed project can be retried" });
    }

    // Re-run generation for the SAME project id rather than creating a new
    // one — a plan-phase timeout (the actual failure mode seen so far) never
    // wrote any files, so there's nothing to preserve by starting fresh
    // except the sidebar entry the user already clicked into.
    const prompt = project.messages?.[0]?.content || project.description;
    const updated = updateProject(req.params.id, req.userId, {
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
    runGeneration(req.params.id, req.userId, prompt);
});

app.get("/api/projects/public/:id", (req, res) => {
    const project = getPublicProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Website unavailable or not published yet" });
    res.json(project);
});

app.get("/api/projects/:id", requireAuth, (req, res) => {
    const project = getProject(req.params.id, req.userId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
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
app.get("/api/projects/:id/preview", requireAuth, (req, res) => {
    const project = getProject(req.params.id, req.userId);
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

app.put("/api/projects/:id/files", requireAuth, (req, res) => {
    const project = getProject(req.params.id, req.userId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    updateProject(req.params.id, req.userId, { files: normalizeFiles(req.body?.files) });
    res.json({ success: true });
});

// A user attachment is either a screenshot (kind: "image", data: a
// data:image/...;base64,... URL — sent straight to a vision model so the
// AI can see what's actually broken instead of only reading a text
// description) or a text-ish file (kind: "text", data: its raw content —
// inlined directly into the revision prompt as reference material, no
// model call needed). Capped at 5 files and 6MB each so one request can't
// blow past the 15mb JSON body limit or make an already-slow free-tier
// revision call even slower.
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;

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
        .filter((a) => a.data && Buffer.byteLength(a.data, "utf-8") <= MAX_ATTACHMENT_BYTES);
}

app.post("/api/projects/:id/chat", requireAuth, async (req, res) => {
    const project = getProject(req.params.id, req.userId);
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

            const updated = updateProject(req.params.id, req.userId, {
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

        const updated = updateProject(req.params.id, req.userId, {
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

app.post("/api/projects/:id/publish", requireAuth, (req, res) => {
    const project = getProject(req.params.id, req.userId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    updateProject(req.params.id, req.userId, { published: true });
    res.json({ published: true });
});

app.delete("/api/projects/:id", requireAuth, (req, res) => {
    deleteProject(req.params.id, req.userId);
    res.json({ message: "Project deleted" });
});

/* ── Lead Engine routes ───────────────────────────────────────
   Real business search via Places API — behind auth (it costs real money
   per request, so only signed-in accounts can trigger it) and behind the
   hard daily cap enforced inside searchBusinesses(). */

app.get("/api/leads/usage", requireAuth, (req, res) => {
    res.json(getPlacesUsage());
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
        res.json({ leads, totalFound, fromCache, cachedAt, usage: getPlacesUsage() });
    } catch (err) {
        console.error(`[Places] Search failed:`, err?.message || err);
        res.status(err.status || 500).json({ error: err.message });
    }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
    console.log(`[server] Moximos API listening on http://localhost:${PORT}`);
    if (!process.env.NVIDIA_API_KEY) {
        console.warn("[server] NVIDIA_API_KEY is not set — project generation will fail.");
    }
});
