// Runs INSIDE the preview iframe, not the main app — self-contained, no
// imports from this project (it can't reach them; it's a different
// document). Loaded as raw text (see LivePreview.jsx's `?raw` import) and
// injected into the iframe's srcDoc as an inline <script type="module">.
//
// What this does, briefly: a from-scratch client-side "bundler" that avoids
// the remote-bundling-service round trip Sandpack requires. Babel Standalone
// transforms JSX to plain JS locally (near-instant, no network call); each
// local file becomes a Blob URL holding its transformed code with relative
// imports rewritten to point at sibling Blob URLs; npm package imports are
// left as bare specifiers and resolved by the browser's native import map
// (see buildImportMap in LivePreview.jsx) against esm.sh. No bundling
// server, no queue, no wait — everything here is either instant local
// transform or a plain CDN file fetch.
(async function () {
    const errorBox = document.getElementById("error-box");

    function showError(title, detail) {
        errorBox.style.display = "block";
        errorBox.innerHTML =
            "<strong>" + title + "</strong><pre>" + (detail || "").toString().replace(/</g, "&lt;") + "</pre>";
        // The parent app has no other way to know a preview failed — it
        // can't reach into this iframe's console, and the whole point of
        // this message is letting the parent offer a "Fix with AI" action
        // instead of the error just sitting here unactionable.
        window.parent.postMessage({ type: "moximos-preview-error", title, detail: (detail || "").toString() }, "*");
    }

    // A sandboxed srcDoc iframe's document URL is "about:srcdoc", which
    // makes window.location.pathname the bare string "srcdoc" (no leading
    // slash) — confirmed live: this silently broke EVERY React project
    // using react-router-dom's <BrowserRouter>, which reads pathname to
    // match routes. "srcdoc" doesn't match even a catch-all "/*" route
    // (that pattern requires a leading slash), so <Routes> renders nothing
    // and the page stays blank with no thrown error at all — the console
    // only logs a quiet "No routes matched location \"srcdoc\"" warning.
    // Normalizing to a real path BEFORE the app's own code runs (so
    // whatever router it uses sees a normal "/" on first render) fixes
    // this for every React-stack project, not just this one.
    try {
        history.replaceState(null, "", "/");
    } catch {
        // Ignored — if the sandbox ever blocks this, the app still loads,
        // just with the pre-existing router-matching issue.
    }

    window.addEventListener("error", (e) => showError("Runtime error", (e.error && e.error.stack) || e.message));
    window.addEventListener("unhandledrejection", (e) =>
        showError("Unhandled promise rejection", (e.reason && e.reason.stack) || e.reason)
    );

    // window.onerror/onunhandledrejection only catch thrown exceptions —
    // libraries (React included) often console.error() a real, actionable
    // problem instead of throwing (e.g. a failed prop-types check, a
    // missing key warning). Relaying these too — as a separate, lower-key
    // message type, NOT one that pops the full-screen error overlay — means
    // "Fix with AI" can see real signal that never would have shown up any
    // other way, without every benign warning blocking the whole preview.
    const origConsoleError = console.error.bind(console);
    console.error = (...args) => {
        origConsoleError(...args);
        window.parent.postMessage(
            { type: "moximos-preview-console-error", detail: args.map((a) => (a && a.stack) || String(a)).join(" ") },
            "*"
        );
    };

    try {
        const files = JSON.parse(document.getElementById("files-data").textContent);

        function dirname(p) {
            const parts = p.split("/");
            parts.pop();
            return parts.join("/") || "/";
        }

        function resolvePath(baseDir, rel) {
            const baseParts = baseDir.split("/").filter(Boolean);
            const relParts = rel.split("/").filter(Boolean);
            for (const part of relParts) {
                if (part === ".") continue;
                else if (part === "..") baseParts.pop();
                else baseParts.push(part);
            }
            return "/" + baseParts.join("/");
        }

        // A relative import may omit the extension — try the exact path,
        // then common extensions, matching how the AI's own code refers to
        // its sibling files (e.g. `./components/Header` for Header.jsx).
        function findFile(path) {
            if (files[path] !== undefined) return path;
            for (const ext of [".js", ".jsx", ".css"]) {
                if (files[path + ext] !== undefined) return path + ext;
            }
            return null;
        }

        const blobUrls = {};
        const visiting = new Set();
        const visited = new Set();

        function injectCss(cssCode) {
            const style = document.createElement("style");
            style.textContent = cssCode;
            document.head.appendChild(style);
        }

        function processFile(path) {
            if (visited.has(path)) return blobUrls[path];
            if (visiting.has(path)) return blobUrls[path] || null; // circular — best effort
            visiting.add(path);

            const code = files[path];

            if (path.endsWith(".css")) {
                injectCss(code);
                visiting.delete(path);
                visited.add(path);
                blobUrls[path] = null;
                return null;
            }

            const dir = dirname(path);

            // AST-based rewrite via a real Babel plugin, not a line-anchored
            // regex — verified live that regex breaks on files the AI wrote
            // with everything squashed onto one line (a known free-model
            // output quirk seen elsewhere this session), since a regex bounded
            // by ^/$ per-line has nothing to anchor to when there ARE no
            // lines. A plugin visits actual import nodes regardless of
            // formatting — Babel Standalone already parsed the file to do
            // the JSX transform, so this reuses that same pass at no extra cost.
            const rewriteLocalImports = () => ({
                visitor: {
                    ImportDeclaration(nodePath) {
                        const spec = nodePath.node.source.value;
                        if (!spec.startsWith(".")) return; // npm package — left for the import map
                        const resolved = resolvePath(dir, spec);
                        const found = findFile(resolved);
                        if (!found) return; // unresolved — left as-is, surfaces as a real browser error
                        if (found.endsWith(".css")) {
                            processFile(found); // side effect: injects the <style> tag
                            nodePath.remove();
                        } else {
                            nodePath.node.source.value = processFile(found);
                        }
                    },
                },
            });

            let transformed;
            try {
                // runtime: "classic" — the automatic runtime imports
                // "react/jsx-runtime" as a bare specifier; classic just
                // emits React.createElement(...) calls instead, and every
                // generated file already does `import React from 'react'`
                // per the AI's own TECHNICAL RULES, so this needs no extra
                // mapping (third-party packages from esm.sh still get their
                // own jsx-runtime entry in the import map — see LivePreview.jsx —
                // since THEIR pre-built code isn't affected by this setting).
                transformed = Babel.transform(code, {
                    presets: [["react", { runtime: "classic" }]],
                    plugins: [rewriteLocalImports],
                    filename: path,
                }).code;
            } catch (err) {
                showError("Syntax error in " + path, err.message);
                throw err;
            }

            const blob = new Blob([transformed], { type: "text/javascript" });
            const url = URL.createObjectURL(blob);
            blobUrls[path] = url;
            visiting.delete(path);
            visited.add(path);
            return url;
        }

        const entryPath =
            files["/App.js"] !== undefined
                ? "/App.js"
                : files["/app/page.js"] !== undefined
                  ? "/app/page.js"
                  : Object.keys(files).find((p) => p.endsWith(".js") || p.endsWith(".jsx"));

        if (!entryPath) throw new Error("No entry file (/App.js) found in this project.");

        const entryUrl = processFile(entryPath);
        const mod = await import(/* @vite-ignore */ entryUrl);
        const App = mod.default;
        if (!App) throw new Error(entryPath + " has no default export.");

        const React = await import("react");
        const { createRoot } = await import("react-dom/client");
        createRoot(document.getElementById("root")).render(React.createElement(App));
    } catch (err) {
        showError("Failed to load preview", (err && err.stack) || String(err));
        console.error(err);
    }
})();
