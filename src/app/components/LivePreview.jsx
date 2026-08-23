import { useEffect, useRef, useState } from "react";
import api from "../api";

/**
 * Renders a completed project's actual code in a live, sandboxed iframe.
 *
 * The HTML itself is assembled server-side (see server/services/previewHtml.js)
 * and served as a real, same-origin HTTP page — NOT an iframe srcDoc or
 * blob: URL. Both of those give the iframe an opaque, non-rewritable
 * location: confirmed live that "about:srcdoc" makes window.location.pathname
 * the bare string "srcdoc" (no leading slash), and a blob: URL's pathname is
 * itself a full nested URL string — neither can be rewritten to a normal "/"
 * via history.replaceState (srcDoc throws outright; blob: silently refuses
 * any path outside its own opaque form). Either way, react-router-dom's
 * <BrowserRouter> reads that pathname to match routes, matches nothing, and
 * the whole preview renders blank with no thrown error at all. A real HTTP
 * response has a real, rewritable URL, so previewBootstrap.js's
 * history.replaceState(null, "", "/") on load actually works.
 */
export default function LivePreview({ files, stack, projectId, onProjectUpdated }) {
    const [reloadKey, setReloadKey] = useState(0);
    const [previewError, setPreviewError] = useState(null);
    const [fixing, setFixing] = useState(false);
    const [fixError, setFixError] = useState(null);
    // Non-fatal console.error() calls relayed from previewBootstrap.js — not
    // shown in the UI (too noisy for every render), but folded into the
    // "Fix with AI" prompt as extra context a thrown-error-only signal would
    // have missed entirely.
    const consoleErrorsRef = useRef([]);

    // The endpoint always serves the LATEST persisted project.files, so this
    // only needs to change to force a fresh navigation (the browser won't
    // re-fetch an unchanged iframe src on its own). Bumped on manual
    // Refresh, on a successful "Fix with AI", AND whenever the files prop
    // itself changes reference — which happens on every poll update while a
    // project is actively generating, preserving the old live-updating-as-
    // it-builds behavior.
    //
    // Comparing against the LAST files reference we've actually processed
    // (not a simple "have I run before" flag) guards against a real bug
    // confirmed live: every useEffect fires once right after the FIRST
    // render, AND — since the whole app is wrapped in <StrictMode> (see
    // main.jsx) — React 18 dev intentionally invokes each effect TWICE on
    // mount to help surface impure effects. A plain boolean "first render"
    // flag gets flipped by the FIRST of those two invocations, so the
    // SECOND one slips through and bumps reloadKey anyway — a fresh iframe
    // then force-remounts on top of the one that just loaded correctly,
    // milliseconds later. That's exactly what "I could see the content for
    // a moment but it disappears" looks like. Comparing values instead of
    // counting invocations is immune to this: both StrictMode invocations
    // see the SAME `files` reference as last time and no-op; only a
    // genuine prop change (a real new generation, a Fix-with-AI edit, an
    // AI Editor edit) ever differs from what's stored here.
    const lastFilesRef = useRef(files);
    useEffect(() => {
        if (files === lastFilesRef.current) return;
        lastFilesRef.current = files;
        setReloadKey((k) => k + 1);
    }, [files]);

    useEffect(() => {
        setPreviewError(null);
        setFixError(null);
    }, [reloadKey]);

    useEffect(() => {
        function handleMessage(event) {
            if (event.data?.type === "moximos-preview-error") {
                setPreviewError({ title: event.data.title, detail: event.data.detail });
            } else if (event.data?.type === "moximos-preview-console-error") {
                const list = consoleErrorsRef.current;
                list.push(event.data.detail);
                if (list.length > 5) list.shift();
            }
        }
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // A failing module specifier that isn't one of this project's own file
    // paths (a blob: URL, or an esm.sh/unpkg URL) means the error lives
    // inside a THIRD-PARTY package's own code, not anything the model could
    // actually find and edit — flagged explicitly so the model doesn't burn
    // an attempt hallucinating a plausible-looking but wrong fix in an
    // unrelated project file (a real failure mode seen live: it once
    // "fixed" this by adding an unused, broken import to a file that had
    // nothing to do with the actual error).
    function isLikelyThirdPartyError(detail) {
        return /\bblob:|esm\.sh|unpkg\.com/i.test(detail || "");
    }

    async function handleFixWithAi() {
        if (!projectId || !previewError || fixing) return;
        setFixing(true);
        setFixError(null);
        try {
            const thirdParty = isLikelyThirdPartyError(previewError.detail);
            const consoleContext = consoleErrorsRef.current.length
                ? `\n\nRecent console errors (may or may not be related):\n${consoleErrorsRef.current.join("\n")}`
                : "";
            const prompt = thirdParty
                ? `The live preview is showing this error:\n\n${previewError.title}\n${previewError.detail}${consoleContext}\n\nThis error references a module path that is NOT one of this project's own files (it's a blob:/esm.sh/unpkg URL), which usually means the problem is inside a third-party package's own internals or a dependency version mismatch, not a bug in this project's code. Only make a change if you can identify a SPECIFIC file in this project whose code is the actual, direct cause (e.g. a wrong import path, a wrong package name). If no project file is actually at fault, do not guess or add unrelated code — say so instead.`
                : `The live preview is showing this error:\n\n${previewError.title}\n${previewError.detail}${consoleContext}\n\nFind the file causing it and fix the code so the preview loads without error.`;
            const { data } = await api.post(`/api/projects/${projectId}/chat`, { prompt });
            onProjectUpdated?.(data);
            setPreviewError(null);
            consoleErrorsRef.current = [];
            setReloadKey((k) => k + 1);
        } catch (err) {
            setFixError(err?.response?.data?.error || "Fix failed — try again.");
        } finally {
            setFixing(false);
        }
    }

    if (stack === "nextjs") {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="font-medium text-starlight">Live preview isn't available for Next.js projects</p>
                <p className="max-w-md text-[0.84rem] leading-relaxed text-faint">
                    This preview runs entirely in the browser and can't reproduce Next.js's file-based routing or
                    server-rendered pages. Use Export, then run{" "}
                    <code className="rounded bg-white/10 px-1 py-0.5 text-[0.8rem]">npm install &amp;&amp; npm run dev</code>{" "}
                    locally to see it.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-3 py-1.5">
                {previewError ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-[0.74rem] text-magenta">
                        <span className="truncate">Preview error: {previewError.title}</span>
                    </div>
                ) : (
                    <span />
                )}
                <div className="flex shrink-0 items-center gap-2">
                    {fixError && <span className="text-[0.72rem] text-magenta">{fixError}</span>}
                    {previewError && projectId && (
                        <button
                            type="button"
                            onClick={handleFixWithAi}
                            disabled={fixing}
                            className="rounded-md bg-violet px-2.5 py-1 text-[0.74rem] font-medium text-white transition-colors hover:bg-violet/85 disabled:opacity-60"
                        >
                            {fixing ? "Fixing..." : "Fix with AI"}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setReloadKey((k) => k + 1)}
                        className="rounded-md px-2 py-1 text-[0.74rem] text-faint transition-colors hover:bg-white/8 hover:text-starlight"
                    >
                        Refresh
                    </button>
                </div>
            </div>
            {projectId && (
                <iframe
                    key={reloadKey}
                    title="Live preview"
                    src={`/api/projects/${projectId}/preview?v=${reloadKey}`}
                    sandbox="allow-scripts allow-same-origin"
                    className="min-h-0 flex-1 bg-white"
                    style={{ border: "none", width: "100%" }}
                />
            )}
        </div>
    );
}
