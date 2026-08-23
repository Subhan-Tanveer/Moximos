import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read once at module load — this file only changes on a deploy, and
// reading it per-request would be wasted disk I/O on every preview load.
const PREVIEW_BOOTSTRAP_SRC = fs.readFileSync(
    path.join(__dirname, "../../src/app/utils/previewBootstrap.js"),
    "utf-8"
);

// Same two CDN tags every export/preview path needs — see HTML_RULES /
// buildBaseSystem in prompts.js, which tells every AI call these are
// "loaded globally".
const CDN_HEAD = `<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />`;

const REACT_VERSION = "18.2.0";

// Same real compatibility problem hit and fixed for the old Sandpack-based
// preview: an unpinned "latest" resolution for these packages can land on a
// major version that requires React 19, while everything here is pinned to
// React 18.
const VERSION_OVERRIDES = {
    "@react-three/fiber": "8.15.0",
    "@react-three/drei": "9.99.0",
    "@react-spring/three": "9.7.0",
    "@react-spring/web": "9.7.0",
    three: "0.160.0",
};

export function flattenFiles(files) {
    const flat = {};
    for (const [filePath, value] of Object.entries(files || {})) {
        flat[filePath] = typeof value === "string" ? value : value?.content || "";
    }
    return flat;
}

function collectImportSpecifiers(files) {
    const specifiers = new Set();
    const allCode = Object.values(files).join("\n");
    const importRegex = /from\s+['"]([^./][^'"]*)['"]/g;
    let match;
    while ((match = importRegex.exec(allCode)) !== null) {
        specifiers.add(match[1]);
    }
    return specifiers;
}

function buildImportMap(files) {
    const imports = {
        react: `https://esm.sh/react@${REACT_VERSION}`,
        "react-dom": `https://esm.sh/react-dom@${REACT_VERSION}`,
        "react-dom/client": `https://esm.sh/react-dom@${REACT_VERSION}/client`,
        "react/jsx-runtime": `https://esm.sh/react@${REACT_VERSION}/jsx-runtime`,
        "react/jsx-dev-runtime": `https://esm.sh/react@${REACT_VERSION}/jsx-dev-runtime`,
    };
    const specifiers = collectImportSpecifiers(files);
    // If a pinned package (three, @react-three/fiber, etc.) is used, mark
    // every OTHER pinned package this project uses as external for it too —
    // otherwise a package like @react-three/drei (which depends on both
    // three AND @react-three/fiber) has esm.sh bundle IT its own separate,
    // unpinned copy of each, ignoring VERSION_OVERRIDES entirely. Confirmed
    // live, twice, for two different packages nested inside the same
    // dependency.
    const pinnedInUse = new Set(
        Object.keys(VERSION_OVERRIDES).filter(
            (pkg) => specifiers.has(pkg) || [...specifiers].some((s) => s.startsWith(pkg + "/"))
        )
    );
    for (const spec of specifiers) {
        if (spec === "react" || spec === "react-dom" || imports[spec]) continue;
        const isScoped = spec.startsWith("@");
        const segments = spec.split("/");
        const basePkg = isScoped ? segments.slice(0, 2).join("/") : segments[0];
        const subpath = isScoped ? segments.slice(2).join("/") : segments.slice(1).join("/");
        const version = VERSION_OVERRIDES[basePkg];
        const versionedBase = version ? `${basePkg}@${version}` : basePkg;
        const externals = ["react", "react-dom"];
        for (const pinned of pinnedInUse) {
            if (pinned !== basePkg) externals.push(pinned);
        }
        imports[spec] = `https://esm.sh/${versionedBase}${subpath ? "/" + subpath : ""}?external=${externals.join(",")}`;
    }
    return JSON.stringify({ imports });
}

function buildReactPreviewHtml(files) {
    const importMap = buildImportMap(files);
    const filesJson = JSON.stringify(files).replace(/<\/script/gi, "<\\/script");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${CDN_HEAD}
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="importmap">${importMap}</script>
  <style>
    #error-box { display: none; position: fixed; inset: 0; z-index: 9999; background: #1a0505; color: #fca5a5; padding: 1.5rem; font-family: monospace; font-size: 13px; overflow: auto; white-space: pre-wrap; }
    #error-box pre { margin-top: 0.75rem; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="error-box"></div>
  <script id="files-data" type="application/json">${filesJson}</script>
  <script type="module">
${PREVIEW_BOOTSTRAP_SRC}
  </script>
</body>
</html>
`;
}

// Plain HTML stack needs none of the above — the AI's own /index.html is
// already a complete, valid document (see HTML_RULES in prompts.js). Inline
// the sibling CSS/JS files directly so a single response has everything;
// otherwise relative <link>/<script src> tags would 404 (this endpoint has
// no static file serving behind it for those paths).
function buildHtmlStackPreview(files) {
    let html = files["/index.html"] || "<p>No /index.html found.</p>";

    /*
     * Inline EVERY local stylesheet and script, matched by name against the
     * project's own files — not just the two filenames this function
     * originally knew about.
     *
     * It used to hardcode "styles.css" and "script.js". When the section
     * library added "/motion.js" (all the GSAP/ScrollTrigger/Lenis
     * choreography), nothing here matched it, so the preview served
     * <script src="motion.js"> against an endpoint with no static file
     * serving — a 404, and every animation silently dead in the app while
     * working perfectly everywhere else. Reported as "it's not animated".
     *
     * Driving the replacement from Object.keys(files) means any future file
     * the renderer adds is picked up automatically. External URLs (the CDN
     * tags) are left alone — only same-project paths are inlined.
     */
    const isExternal = (src) => /^(https?:)?\/\//i.test(src) || src.startsWith("data:");

    html = html.replace(/<link\b[^>]*>/gi, (tag) => {
        const m = tag.match(/href=["']([^"']+)["']/i);
        if (!m || isExternal(m[1]) || !/stylesheet/i.test(tag)) return tag;
        const key = "/" + m[1].replace(/^\.?\//, "");
        const css = files[key];
        return css === undefined ? tag : `<style>\n${css}\n</style>`;
    });

    html = html.replace(/<script\b[^>]*>\s*<\/script>/gi, (tag) => {
        const m = tag.match(/src=["']([^"']+)["']/i);
        if (!m || isExternal(m[1])) return tag;
        const key = "/" + m[1].replace(/^\.?\//, "");
        const js = files[key];
        if (js === undefined) return tag;
        // `defer` is meaningless once inlined, and dropping it preserves the
        // document order these files rely on (script.js before motion.js).
        return `<script>\n${js}\n</script>`;
    });

    return html;
}

// Returns null for stacks this browser-only preview genuinely cannot
// reproduce (Next.js's file-based routing / server rendering) — the caller
// is expected to respond with an explanatory message instead.
export function buildPreviewHtml(project) {
    if (project.stack === "nextjs") return null;
    const flat = flattenFiles(project.files);
    if (project.stack === "html") return buildHtmlStackPreview(flat);
    return buildReactPreviewHtml(flat);
}
