import crypto from "crypto";

export function hashContent(content) {
    return crypto.createHash("md5").update(content).digest("hex").slice(0, 12);
}

// Apply AI file operations (create, update, delete) to project files
export function applyOperations(currentFiles, operations) {
    const files = { ...currentFiles };
    const applied = [];
    const errors = [];

    for (const op of operations) {
        try {
            switch (op.op) {
                case "create": {
                    if (!op.content) {
                        errors.push(`create ${op.path}: missing content`);
                        break;
                    }
                    files[op.path] = {
                        content: op.content,
                        hash: hashContent(op.content),
                    };
                    applied.push(`created ${op.path}`);
                    break;
                }

                case "update": {
                    const existing = files[op.path];
                    if (!existing) {
                        errors.push(`update ${op.path}: file not found`);
                        break;
                    }
                    if (!op.search || op.replace == null) {
                        errors.push(`update ${op.path}: missing search/replace`);
                        break;
                    }

                    const newContent = searchReplace(existing.content, op.search, op.replace);

                    if (newContent === null) {
                        errors.push(`update ${op.path}: search string not found`);
                        break;
                    }

                    files[op.path] = {
                        content: newContent,
                        hash: hashContent(newContent),
                    };
                    applied.push(`updated ${op.path}`);
                    break;
                }

                case "delete": {
                    if (files[op.path]) {
                        delete files[op.path];
                        applied.push(`deleted ${op.path}`);
                    } else {
                        errors.push(`delete ${op.path}: file not found`);
                    }
                    break;
                }

                default:
                    errors.push(`unknown op: ${op.op}`);
            }
        } catch (err) {
            errors.push(`${op.op} ${op.path}: ${err.message}`);
        }
    }

    return { files, applied, errors };
}

/*
 * Search and replace, with a whitespace-tolerant fallback that refuses to
 * guess.
 *
 * Both stages now require the match to be UNIQUE. The previous version took
 * the first hit either way, which is a silent corruption vector rather than
 * a convenience: a model asked to change one of several visually identical
 * blocks (three `<a href='#...'>` nav links, two identical card wrappers)
 * emits a search string that matches all of them, and the edit lands on
 * whichever happens to come first — usually not the one meant. Returning
 * null instead surfaces "search string not found" to the caller, which is
 * already handled: applyOperations records it in `errors`, the file is left
 * untouched, and nothing is corrupted.
 *
 * The fallback also re-indents the replacement to the indentation of the
 * block it displaces. It matches while IGNORING whitespace, so the model's
 * own indentation for the replacement is by definition not trustworthy —
 * splicing it in verbatim is how a patched file ends up with its structure
 * flattened.
 */
function searchReplace(content, search, replace) {
    // 1. Exact match — but only when there's exactly one of them.
    const firstExact = content.indexOf(search);
    if (firstExact !== -1) {
        if (content.indexOf(search, firstExact + search.length) !== -1) {
            return null; // ambiguous: refuse rather than patch the wrong one
        }
        return content.slice(0, firstExact) + replace + content.slice(firstExact + search.length);
    }

    // 2. Whitespace-tolerant fallback (collapse runs of spaces/tabs, trim lines)
    const normalizeLine = (line) => line.replace(/\s+/g, " ").trim();
    const searchLines = search.split("\n").map(normalizeLine).filter((l) => l.length > 0);
    if (searchLines.length === 0) return null;

    const contentLines = content.split("\n");
    const normalizedContentLines = contentLines.map(normalizeLine);

    // Collect EVERY candidate position, not just the first.
    const matches = [];
    for (let i = 0; i <= normalizedContentLines.length - searchLines.length; i++) {
        let hit = true;
        for (let j = 0; j < searchLines.length; j++) {
            if (normalizedContentLines[i + j] !== searchLines[j]) {
                hit = false;
                break;
            }
        }
        if (hit) matches.push(i);
    }

    if (matches.length !== 1) return null; // zero or ambiguous — refuse

    const start = matches[0];
    const indent = contentLines[start].match(/^[ \t]*/)?.[0] ?? "";

    // Re-indent the replacement relative to its own first line, then anchor
    // it to the indentation of the block being replaced.
    const replaceLines = replace.split("\n");
    const ownIndent = replaceLines.find((l) => l.trim().length > 0)?.match(/^[ \t]*/)?.[0] ?? "";
    const reindented = replaceLines.map((line) => {
        if (line.trim().length === 0) return "";
        const stripped = line.startsWith(ownIndent) ? line.slice(ownIndent.length) : line.replace(/^[ \t]*/, "");
        return indent + stripped;
    });

    return [...contentLines.slice(0, start), ...reindented, ...contentLines.slice(start + searchLines.length)].join("\n");
}
