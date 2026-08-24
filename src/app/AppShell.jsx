import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    AlertTriangle,
    ArrowLeft,
    ArrowUp,
    Code2,
    Download,
    Eye,
    FileCode2,
    Globe,
    LogOut,
    Plus,
    Loader2,
    PanelLeftClose,
    PanelLeftOpen,
    RotateCw,
    Search,
    Sparkles,
    Trash2,
} from "lucide-react";
import api from "./api";
import AgentProgressDashboard from "./components/AgentProgressDashboard";
import AiCodeEditor from "./components/AiCodeEditor";
import LeadSearch from "./components/LeadSearch";
import LivePreview from "./components/LivePreview";
import { exportProjectZip } from "./utils/exportProject";
import { detectDependencies } from "./utils/sandpackUtils";
import { useAutoGrow } from "./utils/useAutoGrow";

const STARTER_PROMPTS = [
    "A landing page for a roofing company in Austin, TX",
    "A booking site for a hair salon",
    "A portfolio site for a freelance photographer",
    "A menu + ordering page for a food truck",
];

/**
 * The product app.
 *
 * Same brand as the marketing site and the auth screens — void background,
 * glass panels, the same accent palette — but functional rather than
 * cinematic: no starfield canvas, no Lenis, no pinned scroll sequences.
 * The tool should feel like it belongs to Moximos, not like a stock admin
 * template bolted on after checkout.
 *
 * Everything here runs against the existing `api` client, so it already speaks
 * the real endpoint shapes (/api/auth/*, /api/projects/*). Today those are
 * answered by the mock adapter in api.js.
 */
export default function AppShell() {
    const navigate = useNavigate();
    // The project open in the main pane is now a real URL segment
    // (/app/:projectId), not internal-only state — every project is its
    // own bookmarkable, shareable page, per an explicit ask.
    const { projectId: activeId } = useParams();
    const [user, setUser] = useState(null);
    const [projects, setProjects] = useState([]);
    const [activeProject, setActiveProject] = useState(null);
    const [activeFile, setActiveFile] = useState(null);
    // Bumped to force the polling effect below to restart — needed after a
    // retry, since that effect's own poll loop permanently stops once it
    // observes status "failed" and won't resume just because state elsewhere
    // set activeProject back to "pending".
    const [pollNonce, setPollNonce] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    // Which right-pane view a completed project shows — defaults to the
    // live preview since "did it actually build a working site" is the
    // question that matters, not "what does the code look like."
    const [paneView, setPaneView] = useState("preview");
    const [exporting, setExporting] = useState(false);
    const [promptDraft, setPromptDraft] = useState("");
    // Grows with the brief instead of scrolling a three-line box.
    const promptRef = useAutoGrow(promptDraft, 280);
    const [creating, setCreating] = useState(false);
    const [view, setView] = useState("projects"); // "projects" | "leads"

    // Session + project list. If the URL is the bare /app (no project id)
    // and at least one project exists, land on the most recent one instead
    // of an empty composer — but only ONCE, on initial load, so this can't
    // fight a later, explicit navigation back to /app (e.g. "New project").
    const hasAutoSelectedRef = useRef(false);
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const [me, list] = await Promise.all([
                    api.get("/api/auth/me"),
                    api.get("/api/projects"),
                ]);
                if (cancelled) return;
                setUser(me.data.user);
                setProjects(list.data);
                if (!activeId && !hasAutoSelectedRef.current && list.data[0]) {
                    hasAutoSelectedRef.current = true;
                    navigate(`/app/${list.data[0]._id}`, { replace: true });
                }
            } catch {
                if (!cancelled) navigate("/login");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    // Full record for whichever project is selected. Generation runs in the
    // background on the server (see server/index.js's runGeneration) so a
    // project can come back with status "pending" — this polls until it
    // resolves, which is what actually drives AgentProgressDashboard's
    // live file-by-file progress instead of it just sitting on a spinner.
    useEffect(() => {
        if (!activeId) {
            setActiveProject(null);
            return undefined;
        }
        let cancelled = false;
        let pollId = null;

        const fetchOnce = async () => {
            try {
                const { data } = await api.get(`/api/projects/${activeId}`);
                if (cancelled) return;
                setActiveProject(data);
                setActiveFile((current) => current ?? Object.keys(data.files || {})[0] ?? null);

                const inProgress = data.status !== "completed" && data.status !== "failed";
                if (inProgress) {
                    pollId = window.setTimeout(fetchOnce, 1200);
                }
            } catch (err) {
                if (cancelled) return;
                // A generation can take minutes at 1.2s/poll — hundreds of
                // requests, any single one of which can blip from a network
                // hiccup or a momentary server hiccup. Only a genuine 404
                // (the project actually doesn't exist — deleted, or this
                // session's user doesn't own it) means there's really
                // nothing to show; anything else just retries in place so a
                // transient failure doesn't blow away a live, in-progress
                // view back to the blank "new project" composer.
                if (err?.response?.status === 404) {
                    setActiveProject(null);
                } else {
                    pollId = window.setTimeout(fetchOnce, 2000);
                }
            }
        };

        fetchOnce();

        return () => {
            cancelled = true;
            if (pollId) window.clearTimeout(pollId);
        };
    }, [activeId, pollNonce]);

    const files = useMemo(() => Object.keys(activeProject?.files || {}), [activeProject]);

    const dependencies = useMemo(() => {
        if (!activeProject?.files) return {};
        const flat = {};
        for (const [path, content] of Object.entries(activeProject.files)) {
            flat[path] = typeof content === "string" ? content : content?.content || "";
        }
        return detectDependencies(flat);
    }, [activeProject]);

    const handleLogout = async () => {
        try {
            await api.post("/api/auth/logout");
        } finally {
            navigate("/login");
        }
    };

    const handleExport = async () => {
        if (!activeProject) return;
        setExporting(true);
        try {
            await exportProjectZip(activeProject);
        } finally {
            setExporting(false);
        }
    };

    // Navigates back to the bare /app URL so the prompt-first composer
    // shows, rather than dropping straight into an old project's file view.
    const startNewProject = () => {
        navigate("/app");
        setPromptDraft("");
        setView("projects");
    };

    const createProject = async (prompt) => {
        const trimmed = prompt.trim();
        if (!trimmed || creating) return;
        setCreating(true);
        try {
            const { data } = await api.post("/api/projects", { prompt: trimmed });
            const list = await api.get("/api/projects");
            setProjects(list.data);
            navigate(`/app/${data._id}`);
            setPromptDraft("");
        } finally {
            setCreating(false);
        }
    };

    const [deletingId, setDeletingId] = useState(null);
    const [retryingId, setRetryingId] = useState(null);
    // The project awaiting delete confirmation — a themed in-app dialog
    // instead of window.confirm(), which renders as a plain OS popup that
    // clashes with the rest of the UI.
    const [confirmDeleteProject, setConfirmDeleteProject] = useState(null);
    const [deleteError, setDeleteError] = useState("");

    const requestDeleteProject = (project, e) => {
        e.stopPropagation(); // don't also trigger the row's onClick (selecting it)
        setDeleteError("");
        setConfirmDeleteProject(project);
    };

    const confirmDelete = async () => {
        if (!confirmDeleteProject) return;
        const id = confirmDeleteProject._id;
        setDeletingId(id);
        setDeleteError("");
        try {
            await api.delete(`/api/projects/${id}`);
            const list = await api.get("/api/projects");
            setProjects(list.data);
            if (activeId === id) navigate(list.data[0] ? `/app/${list.data[0]._id}` : "/app");
            setConfirmDeleteProject(null);
        } catch (err) {
            // Previously this had no catch at all — a failed delete (stale
            // session, transient error) closed the dialog and did nothing,
            // with zero indication anything had gone wrong. Keep the dialog
            // open and show what actually happened instead.
            setDeleteError(err?.response?.data?.error || "Couldn't delete this project — try again.");
        } finally {
            setDeletingId(null);
        }
    };

    // A plan-phase timeout on the free OpenRouter tier leaves a project with
    // status "failed" and zero files — re-running generation on the SAME
    // project id (rather than making the user retype the prompt into a new
    // one) is the whole point of this button.
    const retryProject = async () => {
        if (!activeProject || retryingId) return;
        setRetryingId(activeProject._id);
        try {
            await api.post(`/api/projects/${activeProject._id}/retry`);
            // Restarts the polling effect above — it stopped for good the
            // moment it saw status "failed", so just updating activeProject
            // here wouldn't resume live progress updates on its own.
            setPollNonce((n) => n + 1);
        } finally {
            setRetryingId(null);
        }
    };

    // Jumps from a real Lead Search result straight into the builder,
    // switching to the Projects view and kicking off generation immediately
    // with that specific business's real name/niche/city/rating as context
    // — the AI writes copy branded to them, not a generic placeholder site.
    const buildFromLead = (lead) => {
        setView("projects");
        navigate("/app");
        const ratingLine =
            lead.rating != null ? ` They're rated ${lead.rating}★ with ${lead.reviews} reviews.` : "";
        const prompt = `A landing page for ${lead.name}, a ${lead.niche} business in ${lead.city}.${ratingLine}`;
        createProject(prompt);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-void">
                <Loader2 className="animate-spin text-dust" size={22} />
            </div>
        );
    }

    const isBuilding = activeProject && activeProject.status !== "completed" && activeProject.status !== "failed";
    const fileBody =
        typeof activeProject?.files?.[activeFile] === "string"
            ? activeProject.files[activeFile]
            : activeProject?.files?.[activeFile]?.content || "";

    // Whenever a specific project is open (a real /app/:projectId URL), the
    // sidebar IS the AI Code Editor — always visible right beside the live
    // preview, not a button/overlay the user has to go find — per an
    // explicit ask: editing should happen "live in front of" the user. The
    // project list has no reason to be on screen while working on ONE
    // project, so it's replaced entirely rather than added to.
    const insideProject = Boolean(activeId);

    return (
        <div className="flex h-screen overflow-hidden bg-void text-starlight">
            {/* Sidebar */}
            <aside
                className={`flex shrink-0 flex-col border-r border-white/8 bg-abyss transition-all duration-300 ${
                    sidebarOpen ? (insideProject ? "w-96" : "w-72") : "w-0 overflow-hidden"
                }`}
            >
                {insideProject ? (
                    <>
                        <div className="flex items-center gap-2 border-b border-white/8 px-3 py-3">
                            <button
                                type="button"
                                onClick={() => navigate("/app")}
                                title="Back to projects"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dust transition-colors hover:bg-white/8 hover:text-starlight"
                            >
                                <ArrowLeft size={16} />
                            </button>
                            <div className="flex min-w-0 items-center gap-2">
                                <Sparkles size={14} className="shrink-0 text-violet" />
                                <div className="min-w-0">
                                    <p className="truncate text-[0.84rem] font-semibold text-starlight">
                                        AI Code Editor
                                    </p>
                                    <p className="truncate text-[0.7rem] text-faint">
                                        {activeProject?.name || "Loading..."}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {activeProject?.status === "completed" ? (
                            <AiCodeEditor project={activeProject} onProjectUpdated={setActiveProject} embedded />
                        ) : (
                            <div className="flex flex-1 items-center justify-center px-6 text-center">
                                <p className="text-[0.82rem] leading-relaxed text-faint">
                                    {activeProject?.status === "failed"
                                        ? "Generation failed — retry the build before editing with AI."
                                        : "The AI editor will be available once this build finishes."}
                                </p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3.5">
                            <Link to="/" className="flex items-center gap-2" aria-label="Moximos home">
                                <svg width="17" height="19" viewBox="0 0 63 71" fill="none" aria-hidden="true">
                                    <path
                                        d="M0.87793 22.8482V40.4288L11.7198 34.2753V23.4334L28.1291 14.0567L17.5814 7.61719L5.98284 14.1282C2.82985 15.8982 0.87793 19.2324 0.87793 22.8482Z"
                                        fill="currentColor"
                                        className="text-starlight"
                                    />
                                    <path
                                        d="M63 47.4682V29.8876L52.1581 36.0411V46.883L35.7488 56.2597L46.2965 62.6992L57.8951 56.1882C61.0481 54.4182 63 51.084 63 47.4682Z"
                                        fill="currentColor"
                                        className="text-starlight"
                                    />
                                    <path
                                        d="M62.5224 22.1214L62.707 24.614L51.8652 30.4744V23.4419L21.0977 6.43948L31.6454 0L57.3558 14.0907C60.3274 15.7193 62.2721 18.742 62.5224 22.1214Z"
                                        fill="currentColor"
                                        className="text-starlight"
                                    />
                                    <path
                                        d="M0.184636 48.7927L0 46.3001L10.8419 40.4396V47.4722L41.6093 64.4746L31.0616 70.9141L5.35122 56.8233C2.37962 55.1947 0.434958 52.172 0.184636 48.7927Z"
                                        fill="currentColor"
                                        className="text-starlight"
                                    />
                                </svg>
                                <span className="text-[0.95rem] font-semibold tracking-tight text-starlight">
                                    Moximos
                                </span>
                            </Link>
                            <button
                                type="button"
                                onClick={startNewProject}
                                title="New project"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-dust transition-colors hover:bg-white/8 hover:text-starlight"
                            >
                                <Plus size={15} />
                            </button>
                        </div>

                        {/* Section switcher */}
                        <div className="flex gap-1 border-b border-white/8 p-2.5">
                            <button
                                type="button"
                                onClick={() => setView("projects")}
                                className={`flex-1 rounded-lg px-2.5 py-1.5 text-[0.82rem] font-medium transition-colors ${
                                    view === "projects"
                                        ? "bg-white/8 text-starlight"
                                        : "text-dust hover:text-starlight"
                                }`}
                            >
                                Projects
                            </button>
                            <button
                                type="button"
                                onClick={() => setView("leads")}
                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.82rem] font-medium transition-colors ${
                                    view === "leads" ? "bg-white/8 text-starlight" : "text-dust hover:text-starlight"
                                }`}
                            >
                                <Search size={12} />
                                Leads
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2.5">
                            <p className="label-mono px-2 py-2">Projects</p>
                            {projects.length === 0 ? (
                                <p className="px-2.5 py-2 text-[0.8rem] leading-relaxed text-faint">
                                    Nothing yet — describe what to build to start your first one.
                                </p>
                            ) : (
                                <ul className="space-y-0.5">
                                    {projects.map((project) => (
                                        <li key={project._id} className="group relative">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigate(`/app/${project._id}`);
                                                    setView("projects");
                                                }}
                                                className="w-full rounded-lg py-2 pl-2.5 pr-8 text-left text-dust transition-colors hover:bg-white/[0.04] hover:text-starlight"
                                            >
                                                <span className="block truncate text-[0.86rem] font-medium">
                                                    {project.name}
                                                </span>
                                                <span className="mt-0.5 block truncate font-mono text-[0.68rem] text-faint">
                                                    v{project.version} ·{" "}
                                                    {new Date(project.updatedAt).toLocaleDateString()}
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                title="Delete project"
                                                onClick={(e) => requestDeleteProject(project, e)}
                                                disabled={deletingId === project._id}
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-faint opacity-0 transition-all hover:bg-white/8 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
                                            >
                                                {deletingId === project._id ? (
                                                    <Loader2 size={13} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={13} />
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="border-t border-white/8 p-2.5">
                            <div className="flex items-center justify-between rounded-lg px-2.5 py-2">
                                <div className="min-w-0">
                                    <p className="truncate text-[0.84rem] font-medium text-starlight">
                                        {user?.name}
                                    </p>
                                    <p className="truncate text-[0.72rem] text-faint">{user?.email}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    title="Log out"
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-white/8 hover:text-starlight"
                                >
                                    <LogOut size={14} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </aside>

            {/* Main */}
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/8 bg-abyss/70 px-4 py-3 backdrop-blur-sm">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen((v) => !v)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-dust transition-colors hover:bg-white/8 hover:text-starlight"
                            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                        >
                            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-[0.95rem] font-semibold text-starlight">
                                {view === "leads" ? "Lead Search" : activeProject?.name || "New project"}
                            </h1>
                            {view !== "leads" && activeProject && (
                                <p className="truncate font-mono text-[0.7rem] text-faint">
                                    {files.length} files · {Object.keys(dependencies).length} dependencies
                                </p>
                            )}
                        </div>
                    </div>

                    {view !== "leads" && activeProject && (
                        <div className="flex shrink-0 items-center gap-2">
                            {activeProject.status === "completed" && (
                                <div className="flex items-center rounded-lg border border-white/12 p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setPaneView("preview")}
                                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.78rem] font-medium transition-colors ${
                                            paneView === "preview"
                                                ? "bg-white/10 text-starlight"
                                                : "text-faint hover:text-dust"
                                        }`}
                                    >
                                        <Eye size={12} />
                                        Preview
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaneView("code")}
                                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.78rem] font-medium transition-colors ${
                                            paneView === "code"
                                                ? "bg-white/10 text-starlight"
                                                : "text-faint hover:text-dust"
                                        }`}
                                    >
                                        <Code2 size={12} />
                                        Code
                                    </button>
                                </div>
                            )}
                            <span
                                className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.68rem] font-medium sm:flex ${
                                    activeProject.published
                                        ? "border border-ion/30 bg-ion/10 text-ion"
                                        : "border border-white/10 bg-white/[0.03] text-faint"
                                }`}
                            >
                                <Globe size={11} />
                                {activeProject.published ? "Published" : "Draft"}
                            </span>
                            <button
                                type="button"
                                onClick={handleExport}
                                disabled={exporting}
                                className="flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-1.5 text-[0.8rem] font-medium text-dust transition-colors hover:border-white/25 hover:text-starlight disabled:opacity-50"
                            >
                                {exporting ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : (
                                    <Download size={13} />
                                )}
                                Export
                            </button>
                        </div>
                    )}
                </header>

                <main className="min-h-0 flex-1 overflow-hidden">
                    {view === "leads" ? (
                        <LeadSearch onBuildSite={buildFromLead} />
                    ) : !activeProject ? (
                        <div className="relative flex h-full flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-10 text-center">
                            <div
                                className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[560px] max-w-[88vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-35 blur-[100px]"
                                style={{
                                    background:
                                        "radial-gradient(circle, rgba(91,58,160,0.85) 0%, rgba(194,63,219,0.3) 45%, transparent 70%)",
                                }}
                                aria-hidden="true"
                            />

                            <div className="relative">
                                <h2 className="font-display text-[1.7rem] text-starlight sm:text-[2.1rem]">
                                    What do you want to build?
                                </h2>
                                <p className="mx-auto mt-2.5 max-w-md text-[0.95rem] leading-relaxed text-dust">
                                    Describe the business and the site — the AI plans, writes and validates a
                                    full working codebase from it.
                                </p>
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    createProject(promptDraft);
                                }}
                                className="relative w-full max-w-xl"
                            >
                                <div className="glass-panel flex flex-col gap-3 rounded-2xl p-3 transition-colors duration-300 focus-within:border-violet/50">
                                    <textarea
                                        ref={promptRef}
                                        value={promptDraft}
                                        onChange={(e) => setPromptDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                createProject(promptDraft);
                                            }
                                        }}
                                        placeholder="A landing page for a family-owned bakery in Denver, warm and rustic..."
                                        rows={3}
                                        autoFocus
                                        disabled={creating}
                                        className="w-full resize-none border-0 bg-transparent text-[0.95rem] text-starlight placeholder:text-faint focus:outline-none disabled:opacity-60"
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 font-mono text-[0.7rem] text-faint">
                                            <Sparkles size={12} className="text-violet" />
                                            Builds a full site, not a template
                                        </span>
                                        <button
                                            type="submit"
                                            disabled={!promptDraft.trim() || creating}
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-solar text-void transition-opacity hover:opacity-90 disabled:opacity-30"
                                            aria-label="Build this site"
                                        >
                                            {creating ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <ArrowUp size={15} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>

                            <div className="relative flex max-w-xl flex-wrap items-center justify-center gap-2">
                                {STARTER_PROMPTS.map((starter) => (
                                    <button
                                        key={starter}
                                        type="button"
                                        onClick={() => setPromptDraft(starter)}
                                        disabled={creating}
                                        className="rounded-full border border-white/12 bg-white/[0.02] px-3.5 py-1.5 text-[0.78rem] text-dust transition-colors hover:border-white/25 hover:text-starlight disabled:opacity-50"
                                    >
                                        {starter}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : isBuilding ? (
                        <AgentProgressDashboard project={activeProject} />
                    ) : activeProject?.status === "failed" ? (
                        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                                <AlertTriangle size={22} />
                            </div>
                            <div className="max-w-sm">
                                <p className="font-medium text-starlight">Generation failed</p>
                                <p className="mt-1.5 text-[0.84rem] leading-relaxed text-faint">
                                    {activeProject.error ||
                                        "The AI model didn't respond in time — this is usually free-tier congestion, not a permanent problem."}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={retryProject}
                                disabled={retryingId === activeProject._id}
                                className="flex items-center gap-1.5 rounded-lg bg-violet px-4 py-2 text-[0.86rem] font-medium text-white transition-colors hover:bg-violet/85 disabled:opacity-60"
                            >
                                {retryingId === activeProject._id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <RotateCw size={14} />
                                )}
                                {retryingId === activeProject._id ? "Retrying..." : "Retry generation"}
                            </button>
                        </div>
                    ) : paneView === "preview" ? (
                        <LivePreview
                            files={activeProject.files}
                            stack={activeProject.stack}
                            projectId={activeProject._id}
                            onProjectUpdated={setActiveProject}
                        />
                    ) : (
                        <div className="flex h-full">
                            {/* File tree */}
                            <div className="w-60 shrink-0 overflow-y-auto border-r border-white/8 bg-abyss/60 p-2.5">
                                <p className="label-mono px-2 py-2">Files</p>
                                <ul className="space-y-0.5">
                                    {files.map((file) => (
                                        <li key={file}>
                                            <button
                                                type="button"
                                                onClick={() => setActiveFile(file)}
                                                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                                                    file === activeFile
                                                        ? "bg-white/8 text-starlight ring-1 ring-white/10"
                                                        : "text-dust hover:bg-white/[0.04] hover:text-starlight"
                                                }`}
                                            >
                                                <FileCode2 size={12} className="shrink-0 text-faint" />
                                                <span className="truncate font-mono text-[0.74rem]">{file}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Code */}
                            <div className="min-w-0 flex-1 overflow-auto bg-void">
                                <pre className="min-h-full p-5 font-mono text-[0.78rem] leading-relaxed text-dust">
                                    <code>{fileBody}</code>
                                </pre>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {confirmDeleteProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#0c0c12] p-5 shadow-2xl shadow-black/60">
                        <h3 className="text-[0.98rem] font-semibold text-starlight">Delete project?</h3>
                        <p className="mt-1.5 text-[0.84rem] leading-relaxed text-faint">
                            <span className="text-dust">"{confirmDeleteProject.name}"</span> will be permanently
                            deleted. This can't be undone.
                        </p>
                        {deleteError && (
                            <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[0.8rem] text-red-300">
                                {deleteError}
                            </p>
                        )}
                        <div className="mt-5 flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteProject(null)}
                                disabled={deletingId === confirmDeleteProject._id}
                                className="rounded-lg px-3.5 py-2 text-[0.84rem] font-medium text-dust transition-colors hover:bg-white/8 hover:text-starlight disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deletingId === confirmDeleteProject._id}
                                className="flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3.5 py-2 text-[0.84rem] font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-60"
                            >
                                {deletingId === confirmDeleteProject._id ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : (
                                    <Trash2 size={13} />
                                )}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
