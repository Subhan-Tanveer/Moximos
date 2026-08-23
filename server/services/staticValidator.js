import esbuild from "esbuild";

/**
 * Deterministic, non-AI verification for generated code — this is the
 * "dedicated checker" the pipeline was missing. Every bug hand-fixed in the
 * Om Organic Ventures project (a hallucinated npm package that 404s on the
 * real registry, malformed JSX that doesn't parse) was something a real
 * parser or a real registry lookup catches with 100% reliability, in
 * milliseconds, with zero risk of the checker itself hallucinating or
 * silently failing — unlike another AI review pass, which we've now watched
 * correctly IDENTIFY a bug in its own response text while still shipping
 * the broken code, because the fix it wrote was itself wrong or got cut off.
 * A parser either accepts the code or it doesn't; there's no ambiguity.
 */

// npm registry existence is cached per-process — the same package (react-router-dom,
// gsap, etc.) gets imported by many files across many projects, no reason to
// re-check it every time.
const packageExistenceCache = new Map();

async function packageExistsOnNpm(pkg) {
    if (packageExistenceCache.has(pkg)) return packageExistenceCache.get(pkg);
    const promise = (async () => {
        try {
            const res = await fetch(`https://registry.npmjs.org/${pkg}`, {
                method: "HEAD",
                signal: AbortSignal.timeout(6000),
            });
            return res.ok;
        } catch {
            // A network blip shouldn't fail a real package — assume it
            // exists rather than falsely flagging something reachable.
            return true;
        }
    })();
    packageExistenceCache.set(pkg, promise);
    return promise;
}

function extractExternalImports(code) {
    const importRegex = /from\s+['"]([^./][^'"]*)['"]/g;
    const pkgs = new Set();
    let match;
    while ((match = importRegex.exec(code)) !== null) {
        const raw = match[1];
        const pkg = raw.startsWith("@") ? raw.split("/").slice(0, 2).join("/") : raw.split("/")[0];
        if (pkg !== "react" && pkg !== "react-dom") pkgs.add(pkg);
    }
    return [...pkgs];
}

// HTML has no real parser available here (esbuild only understands
// JS/TS/CSS, not markup) — but the two actual defects confirmed live on a
// real generated file are both cheap, reliable heuristics, not things that
// need a full parser:
//   1. Every attribute wrapped in double-backticks instead of quotes
//      (`lang=``en``` instead of `lang="en"`) — backticks are never
//      legitimate in raw HTML markup outside a <script> block's own JS, so
//      any backtick found OUTSIDE script/style content is corrupted output.
//   2. The file cutting off mid-tag (generation truncated before
//      completion) — a complete document always ends with a closing
//      </html>; anything else means the file is a fragment, not a page.
function checkHtmlSyntax(code) {
    const withoutScriptsAndStyles = code
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
    if (withoutScriptsAndStyles.includes("`")) {
        return { valid: false, error: "Contains backtick characters in markup — attributes must use double quotes, not backticks (e.g. lang=\"en\", not lang=``en``)." };
    }
    if (!/<\/html\s*>\s*$/i.test(code.trim())) {
        return { valid: false, error: "Document doesn't end with a closing </html> tag — generation was likely cut off before the file completed." };
    }
    // A whole document collapsed onto one line. Seen live as a 7,828-char
    // single line where every newline had been emitted as a literal "&#10;"
    // entity. contentNormalizer now decodes those, so reaching here means
    // the model genuinely emitted no line breaks — which a browser still
    // renders, but leaves a file no search/replace revision can safely
    // patch (every edit has to match inside one enormous line). Treat it as
    // a real defect so the pipeline regenerates instead of shipping it.
    const trimmed = code.trim();
    if (!trimmed.includes("\n") && trimmed.length > 400) {
        return { valid: false, error: `Entire document is on a single ${trimmed.length}-character line — emit real newlines and indentation so the file can be read and edited.` };
    }
    return { valid: true, error: null };
}

// Real parse check — catches the exact class of bug hand-fixed this session:
// mismatched <link>/<Link> tags, `onClick={() = />` typos, unclosed JSX,
// anything that doesn't actually compile. esbuild is already a transitive
// dependency of this project's own Vite build, not a new package. Its css
// loader does real CSS parsing too — confirmed live it catches an
// unterminated `/* comment` left by a truncated generation, the same class
// of bug the HTML check above targets for markup.
export function checkSyntax(code, filePath) {
    const ext = filePath.split(".").pop()?.toLowerCase();
    if (ext === "html") return checkHtmlSyntax(code);

    const loader =
        ext === "css" ? "css" : ext === "jsx" || ext === "js" ? "jsx" : ext === "tsx" || ext === "ts" ? "tsx" : "jsx";

    try {
        esbuild.transformSync(code, loader === "css" ? { loader } : { loader, jsx: "automatic" });
        return { valid: true, error: null };
    } catch (err) {
        const detail = err?.errors?.[0]?.text || err?.message || "Unknown syntax error";
        const location = err?.errors?.[0]?.location;
        const locationStr = location ? ` (line ${location.line}, col ${location.column})` : "";
        return { valid: false, error: `${detail}${locationStr}` };
    }
}

// Real registry check — catches hallucinated package names (confirmed live:
// 'use-media-query' does not exist on npm, breaking the entire Sandpack
// bundle for every file, not just the one that imported it).
export async function checkPackagesExist(code) {
    const pkgs = extractExternalImports(code);
    const missing = [];
    await Promise.all(
        pkgs.map(async (pkg) => {
            const exists = await packageExistsOnNpm(pkg);
            if (!exists) missing.push(pkg);
        })
    );
    return missing;
}

// Combined check used by the pipeline's final verification pass.
export async function verifyFile(code, filePath) {
    const syntax = checkSyntax(code, filePath);
    const missingPackages = await checkPackagesExist(code);
    const problems = [];
    if (!syntax.valid) problems.push(`Syntax error: ${syntax.error}`);
    if (missingPackages.length > 0) {
        problems.push(`Import${missingPackages.length > 1 ? "s" : ""} of nonexistent package${missingPackages.length > 1 ? "s" : ""}: ${missingPackages.join(", ")} — this package name does not exist on npm.`);
    }
    return { ok: problems.length === 0, problems };
}
