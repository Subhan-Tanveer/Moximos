// Post-generation code validator and auto-fixer
// Repairs common AI code generation errors before saving to DB using regex checks

// Void HTML elements that must be self-closed in JSX
const VOID_ELEMENTS = ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"];

// Validate and auto-fix common AI-generated code issues
export function validateAndFixCode(code, filePath, context) {
    const warnings = [];
    const isCSS = filePath.endsWith(".css");
    const isJS = filePath.endsWith(".js") || filePath.endsWith(".jsx");
    // These fixups assume JSX conventions (class→className, a component's
    // default export, an implicit React import). For the "html" stack,
    // /script.js is a real plain <script> tag, not a module — applying them
    // there is actively dangerous: rule #8 below used to fire on ANY
    // `<letter` pattern anywhere in the file (e.g. a script building HTML
    // strings via innerHTML) and inject `import React from 'react'`, which
    // is invalid syntax outside a module and would break the page outright.
    const isJsxStack = context?.stack !== "html";

    // 1. Strip markdown code fences that some models wrap around code
    const fencePattern = /^```(?:jsx?|javascript|css|html|tsx?|react)?\s*\n([\s\S]*?)\n```\s*$/;
    const fenceMatch = code.match(fencePattern);
    if (fenceMatch) {
        code = fenceMatch[1];
        warnings.push(`${filePath}: Stripped markdown code fences`);
    }

    // Also handle cases where fences appear at the very start/end with other content
    code = code.replace(/^```(?:jsx?|javascript|css|html|tsx?|react)?\s*\n/, "");
    code = code.replace(/\n```\s*$/, "");

    if (isCSS) {
        // CSS-specific fixes — minimal, just trim and return
        return { code: code.trim() + "\n", warnings };
    }

    if (filePath.endsWith(".html")) {
        // Placeholder Subresource Integrity hashes.
        //
        // Models routinely emit CDN <link>/<script> tags carrying
        // `integrity="sha512-..."` — a literal ellipsis, not a real digest.
        // This is worse than useless: a malformed integrity attribute makes
        // the browser REFUSE to load the resource entirely. Confirmed live
        // on a generated page — Font Awesome and both GSAP scripts were
        // silently blocked ("Error parsing 'integrity' attribute"), so the
        // icons were missing and every scroll animation the page set up
        // never ran, with nothing in the markup to suggest why.
        //
        // Only obviously-fake digests are stripped: a real SRI hash is
        // base64 and far longer than this pattern allows, so a genuine one
        // is left intact.
        // Rewritten per-tag rather than file-wide: `crossorigin` must be
        // removed ONLY from the tags whose integrity was stripped. A tag
        // carrying a genuine hash needs its crossorigin to keep working —
        // SRI on a cross-origin resource requires CORS, so removing it
        // would break the very check we're preserving.
        const placeholderSri = /\s+integrity=(["'])sha(?:256|384|512)-[.…\s]*\1/i;
        let strippedSri = 0;
        code = code.replace(/<(?:link|script)\b[^>]*>/gi, (tag) => {
            if (!placeholderSri.test(tag)) return tag;
            strippedSri++;
            return tag
                .replace(placeholderSri, "")
                .replace(/\s+crossorigin=(["'])[^"']*\1/i, "");
        });
        if (strippedSri > 0) {
            warnings.push(`${filePath}: Removed ${strippedSri} placeholder integrity="sha…-..." attribute(s) that would have blocked the CDN resources from loading`);
        }

        // Tailwind utility classes with no Tailwind loaded.
        //
        // Confirmed live: markup styled its header with utilities
        // (class="container flex justify-between items-center", "hidden
        // lg:flex", "lg:hidden") while <head> loaded only styles.css, Font
        // Awesome and GSAP. Every one of those classes was inert, so the
        // header fell back to block layout, the nav stacked vertically, and
        // the mobile hamburger showed on desktop — the exact broken layout
        // a user reported seeing.
        //
        // Injecting the CDN is the deterministic repair: without it these
        // classes do nothing at all, so the page is definitely broken;
        // with it they do what the markup plainly intends. The tag goes
        // LAST in <head> so the project's own stylesheet, which is written
        // against this same markup, still wins on equal specificity.
        const usesTailwind = /class=["'][^"']*\b(?:flex|grid|hidden|(?:sm|md|lg|xl):[a-z-]+|justify-(?:between|center|around)|items-(?:center|start|end)|space-[xy]-\d|gap-\d|(?:p|m|px|py|mx|my|mt|mb)-\d|text-(?:xs|sm|lg|xl|\dxl)|rounded-(?:lg|xl|full)|bg-\[?#?\w)/.test(code);
        const hasTailwind = /cdn\.tailwindcss\.com|tailwind(?:\.min)?\.css|@tailwind\b/.test(code);
        if (usesTailwind && !hasTailwind && /<\/head>/i.test(code)) {
            code = code.replace(/<\/head>/i, '  <script src="https://cdn.tailwindcss.com"></script>\n</head>');
            warnings.push(`${filePath}: Markup uses Tailwind utility classes but no Tailwind was loaded — injected the CDN so the layout classes actually apply`);
        }

        // The hero image must not be lazy-loaded.
        //
        // Measured: the hero <img> shipped with loading="lazy", which defers
        // the single largest element on the page — the one that defines the
        // first impression and the LCP metric. The prompt asks for eager
        // hero loading; the model complied roughly half the time, so it is
        // enforced here instead. Only the FIRST image is touched; every
        // other image should stay lazy.
        const firstImg = code.match(/<img\b[^>]*>/i);
        if (firstImg && /\sloading=["']lazy["']/i.test(firstImg[0])) {
            const eager = firstImg[0].replace(/\sloading=["']lazy["']/i, ' loading="eager" fetchpriority="high"');
            code = code.replace(firstImg[0], eager);
            warnings.push(`${filePath}: Hero image was lazy-loaded — switched to eager so the largest element isn't deferred`);
        }

        // Fixed-size display headings don't fit a phone.
        //
        // Measured on a 375px viewport: the H1 rendered at 72px because the
        // model reached for Tailwind's fixed `text-7xl` instead of the fluid
        // clamp() the quality bar asks for. It wraps rather than overflowing,
        // so nothing visibly breaks — it just looks wrong. Swapping in a
        // responsive ladder is safe and mechanical: the large size is kept
        // for desktop and a smaller one applies below the breakpoint.
        const H1_LADDER = { "text-9xl": "text-5xl sm:text-7xl lg:text-9xl", "text-8xl": "text-5xl sm:text-6xl lg:text-8xl", "text-7xl": "text-4xl sm:text-5xl lg:text-7xl", "text-6xl": "text-4xl sm:text-5xl lg:text-6xl" };
        code = code.replace(/<h1\b[^>]*>/gi, (tag) => {
            // Already responsive (has a breakpoint-prefixed text size)? Leave it.
            if (/\b(?:sm|md|lg|xl):text-/.test(tag)) return tag;
            for (const [fixed, ladder] of Object.entries(H1_LADDER)) {
                if (new RegExp(`\\b${fixed}\\b`).test(tag)) {
                    warnings.push(`${filePath}: H1 used fixed ${fixed} (rendered ~72px on a 375px phone) — replaced with a responsive size ladder`);
                    return tag.replace(new RegExp(`\\b${fixed}\\b`), ladder);
                }
            }
            return tag;
        });

        return { code, warnings };
    }

    if (!isJS) {
        return { code, warnings };
    }

    // --- JS/JSX-specific fixes ---

    // 2. Fix `class=` → `className=` in JSX (but not inside strings or comments)
    // Match class= that appears inside JSX tags (after < and before >)
    if (isJsxStack) {
        const classFixRegex = /(<[a-zA-Z][^>]*?)\bclass=/g;
        if (classFixRegex.test(code)) {
            code = code.replace(/(<[a-zA-Z][^>]*?)\bclass=/g, "$1className=");
            warnings.push(`${filePath}: Fixed 'class=' → 'className='`);
        }
    }

    // 3. Fix `for=` → `htmlFor=` in JSX labels
    if (isJsxStack) {
        const forFixRegex = /(<label[^>]*?)\bfor=/gi;
        if (forFixRegex.test(code)) {
            code = code.replace(/(<label[^>]*?)\bfor=/gi, "$1htmlFor=");
            warnings.push(`${filePath}: Fixed 'for=' → 'htmlFor='`);
        }
    }

    // 4. Self-close void elements that aren't self-closed
    for (const tag of VOID_ELEMENTS) {
        // Match <tag ... > that is NOT already self-closed (no / before >)
        const voidRegex = new RegExp(`<${tag}(\\s[^>]*?)?(?<!/)>`, "gi");
        if (voidRegex.test(code)) {
            code = code.replace(new RegExp(`<${tag}(\\s[^>]*?)?(?<!/)>`, "gi"), (match, attrs) => `<${tag}${attrs || ""} />`);
            warnings.push(`${filePath}: Self-closed <${tag}> elements`);
        }
    }

    // 5. Ensure exactly one default export exists
    const defaultExportCount = (code.match(/export\s+default\s+/g) || []).length;
    if (isJsxStack && defaultExportCount === 0 && !filePath.endsWith(".css")) {
        // Try to find the main function/component and add default export
        const funcMatch = code.match(/^function\s+([A-Z]\w*)\s*\(/m);
        const constMatch = code.match(/^const\s+([A-Z]\w*)\s*=\s*(?:\(|function)/m);
        const componentName = funcMatch?.[1] || constMatch?.[1];

        if (componentName) {
            // Check if there's already a named export
            const namedExportRegex = new RegExp(`export\\s+(function|const)\\s+${componentName}`);
            if (namedExportRegex.test(code)) {
                // Convert `export function X` → `export default function X`
                code = code.replace(new RegExp(`export\\s+(function|const)\\s+${componentName}`), `export default $1 ${componentName}`);
            } else {
                // Add default export at the end
                code = code.trimEnd() + `\n\nexport default ${componentName};\n`;
            }
            warnings.push(`${filePath}: Added missing default export for '${componentName}'`);
        }
    }

    // 6. Remove stray HTML comments inside JSX return blocks
    // Pattern: <!-- comment --> which is invalid in JSX
    const htmlCommentRegex = /<!--[\s\S]*?-->/g;
    if (htmlCommentRegex.test(code)) {
        code = code.replace(htmlCommentRegex, "");
        warnings.push(`${filePath}: Removed HTML comments (invalid in JSX)`);
    }

    // 7. Fix common TypeScript syntax that slips in
    // Remove `: React.FC` or `: FC` type annotations from function declarations
    code = code.replace(/:\s*React\.FC(?:<[^>]*>)?\s*=/g, (match) => {
        warnings.push(`${filePath}: Removed TypeScript React.FC annotation`);
        return " =";
    });

    // Remove simple type annotations from function parameters like (props: any)
    // But be careful not to break destructured defaults like { name = 'default' }
    code = code.replace(/(\([^)]*?)\s*:\s*(?:string|number|boolean|any|object|void)\s*([,)])/g, (match, before, after) => {
        warnings.push(`${filePath}: Removed TypeScript type annotation`);
        return `${before}${after}`;
    });

    // 8. Ensure React import exists if JSX is used
    if (isJsxStack) {
        const hasJSX = /<[A-Za-z]/.test(code);
        const hasReactImport = /import\s+React/.test(code);
        if (hasJSX && !hasReactImport) {
            code = `import React from 'react';\n${code}`;
            warnings.push(`${filePath}: Added missing React import`);
        }
    }

    // 9. Fix import paths that point to incorrect folders/paths compared to what was planned
    if (context?.allPlannedFiles) {
        const fixResult = fixImportPaths(code, filePath, context.allPlannedFiles);
        code = fixResult.code;
        warnings.push(...fixResult.warnings);
    }

    return { code: code.trim() + "\n", warnings };
}

// Validate and fix code specifically for revision operations
export function validateRevisionContent(content, filePath, op, stack) {
    if (op === "delete") return { content, warnings: [] };

    if (op === "create") {
        const result = validateAndFixCode(content, filePath, { stack });
        return { content: result.code, warnings: result.warnings };
    }

    // For update ops (search/replace content), only apply safe fixes
    // that won't break the partial context
    const warnings = [];
    const isJsxStack = stack !== "html";

    // Fix class → className — a real class="..." attribute in an HTML-stack
    // revision is correct as-is and must not be touched.
    if (isJsxStack) {
        const classFixRegex = /(<[a-zA-Z][^>]*?)\bclass=/g;
        if (classFixRegex.test(content)) {
            content = content.replace(/(<[a-zA-Z][^>]*?)\bclass=/g, "$1className=");
            warnings.push(`${filePath}: Fixed 'class=' → 'className=' in replacement`);
        }
    }

    // Fix for → htmlFor
    if (isJsxStack) {
        const forFixRegex = /(<label[^>]*?)\bfor=/gi;
        if (forFixRegex.test(content)) {
            content = content.replace(/(<label[^>]*?)\bfor=/gi, "$1htmlFor=");
            warnings.push(`${filePath}: Fixed 'for=' → 'htmlFor=' in replacement`);
        }
    }

    // Self-close void elements
    for (const tag of VOID_ELEMENTS) {
        const voidRegex = new RegExp(`<${tag}(\\s[^>]*?)?(?<!/)>`, "gi");
        if (voidRegex.test(content)) {
            content = content.replace(new RegExp(`<${tag}(\\s[^>]*?)?(?<!/)>`, "gi"), (match, attrs) => `<${tag}${attrs || ""} />`);
            warnings.push(`${filePath}: Self-closed <${tag}> in replacement`);
        }
    }

    return { content, warnings };
}

// --- Import Path Resolution Helpers ---

function getDir(p) {
    const parts = p.split("/");
    parts.pop();
    return parts.join("/") || "/";
}

function resolvePath(baseDir, relativePath) {
    const baseParts = baseDir.split("/").filter(Boolean);
    const relParts = relativePath.split("/").filter(Boolean);

    for (const part of relParts) {
        if (part === ".") {
            continue;
        } else if (part === "..") {
            baseParts.pop();
        } else {
            baseParts.push(part);
        }
    }
    return "/" + baseParts.join("/");
}

function getRelativePath(fromDir, toPath) {
    const fromParts = fromDir.split("/").filter(Boolean);
    const toParts = toPath.split("/").filter(Boolean);

    let commonLength = 0;
    while (commonLength < fromParts.length && commonLength < toParts.length && fromParts[commonLength] === toParts[commonLength]) {
        commonLength++;
    }

    const upCount = fromParts.length - commonLength;
    const remainingTo = toParts.slice(commonLength);

    const relParts = [];
    for (let i = 0; i < upCount; i++) {
        relParts.push("..");
    }
    if (relParts.length === 0) {
        relParts.push(".");
    }
    relParts.push(...remainingTo);
    return relParts.join("/");
}

function cleanExtension(p) {
    return p.replace(/\.(js|jsx|css|ts|tsx)$/, "");
}

function fixImportPaths(code, filePath, allPlannedFiles) {
    const warnings = [];
    if (!allPlannedFiles || allPlannedFiles.length === 0) {
        return { code, warnings };
    }

    const currentDir = getDir(filePath);
    const plannedPaths = allPlannedFiles.map((f) => (f.path.startsWith("/") ? f.path : "/" + f.path));

    // Matches lines like: import Header from './components/Header';
    // or import '../styles.css'; or require('./components/Header')
    const importRegex = /(from\s+['"]|import\s+['"])([^'"]+)(['"])/g;

    const newCode = code.replace(importRegex, (match, prefix, importTarget, suffix) => {
        // Skip absolute imports (non-relative packages like 'react')
        if (!importTarget.startsWith(".")) {
            return match;
        }

        // 1. Resolve relative import target path
        const resolvedTarget = resolvePath(currentDir, importTarget);
        const resolvedClean = cleanExtension(resolvedTarget);

        // Check if it already matches a planned file path exactly (with or without extension)
        const exactExists = plannedPaths.some((p) => cleanExtension(p) === resolvedClean);
        if (exactExists) {
            return match;
        }

        // 2. Mismatch! Try to find a planned file with the same filename
        const importFilename = resolvedClean.split("/").pop();
        if (!importFilename) {
            return match;
        }

        const foundPlannedPath = plannedPaths.find((p) => {
            const plannedClean = cleanExtension(p);
            const plannedFilename = plannedClean.split("/").pop();
            return plannedFilename === importFilename;
        });

        if (foundPlannedPath) {
            // Calculate relative path from current directory to actual planned file path
            const newRelative = getRelativePath(currentDir, foundPlannedPath);
            // Prefix relative prefix if missing
            const finalRelative = newRelative.startsWith(".") ? newRelative : "./" + newRelative;

            // Retain file extension if the original import target had it
            const hasExt = /\.(js|jsx|css|ts|tsx)$/.test(importTarget);
            const ext = hasExt ? "." + importTarget.split(".").pop() : "";

            const rewrittenTarget = cleanExtension(finalRelative) + ext;
            if (rewrittenTarget !== importTarget) {
                warnings.push(
                    `${filePath}: Corrected import '${importTarget}' to '${rewrittenTarget}' (file planned at '${foundPlannedPath}')`,
                );
                return `${prefix}${rewrittenTarget}${suffix}`;
            }
        }

        return match;
    });

    return { code: newCode, warnings };
}
