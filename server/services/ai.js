import {createOpenAI} from '@ai-sdk/openai'
import { generateObject, generateText, NoObjectGeneratedError } from 'ai';
import pMap from "p-map";
import { FileCodeSchema, FilePlanSchema, RevisionResultSchema, AnimationPassSchema, QAReviewSchema, ContentPlanSchema } from './aiSchemas.js';
import { buildFileCodeSystem, FILE_PLAN_SYSTEM, REVISE_SYSTEM, buildAnimationSystem, buildQAReviewSystem, buildContentPlanSystem } from './prompts.js';
import { normalizeContent } from './contentNormalizer.js';
import { validateAndFixCode, validateRevisionContent } from './codeValidator.js';
import { verifyFile } from './staticValidator.js';
import { enforceCatalogImages, catalogUrlsFor } from './imageCatalog.js';
import { renderPage, sanitizePlan } from './sectionLibrary.js';
import { archetypeForBusiness } from './designTokens.js';

// --- NVIDIA NIM Model Setup ---
// Switched from OpenRouter's free router after its account-wide daily quota
// ("Rate limit exceeded: free-models-per-day") started hard-failing every
// request regardless of retries — a wall no amount of client-side retry
// logic can get through. NVIDIA NIM exposes an OpenAI-compatible endpoint
// (https://integrate.api.nvidia.com/v1), so the same @ai-sdk/openai client
// works unchanged; what actually fixes the failure mode is trying more than
// one model. Order matters: earlier entries are tried first.
//
// `compatibility: "strict"` + `structuredOutputs: true` on every model is
// NOT a stylistic choice — it is the fix for the worst bug in this pipeline.
//
// By default the AI SDK implements generateObject() via TOOL CALLING, and
// NVIDIA NIM truncates tool-call argument strings at exactly 1024
// characters. Every file this builder has ever generated was therefore cut
// off at 1024 chars before it was ever saved. Measured, same prompt, same
// model (nemotron-3-nano-30b-a3b):
//
//   default (tool calling)        1024 chars, truncated mid-document
//   mode: "json"                  fails schema validation outright
//   structuredOutputs: true      10400 chars, COMPLETE document
//
// The raw NIM endpoint returns ~9.8k chars through the identical
// json_schema request, so the provider was never the limit — the SDK's
// default object-generation strategy was. structuredOutputs sends a real
// `response_format: json_schema` instead of a tool call, which has no such
// cap.
//
// This one default is the root cause of essentially every symptom this file
// works around: "Document doesn't end with a closing </html>", "Unexpected
// end of file", stylesheets missing rules for half the markup's classes,
// and pages that look sparse and unfinished. They were all one truncation.
// It also explains why output size looked so erratic between runs (1024
// chars on one call, 22 on the next): where the tool-call JSON happened to
// be severed changed what survived parsing.
const nvidia = createOpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_API_KEY,
    compatibility: "strict",
});

// Every model used for structured code generation must carry this flag.
const structured = (id) => nvidia(id, { structuredOutputs: true });

// The models used for structured code generation. All three carry
// structuredOutputs (see above) — without it their output is truncated at
// 1024 chars. Ordering and rationale are documented on MODEL_CHAIN below.
const MODELS = {
    nano: { id: "nvidia/nemotron-3-nano-30b-a3b", model: structured("nvidia/nemotron-3-nano-30b-a3b") },
    super120b: { id: "nvidia/nemotron-3-super-120b-a12b", model: structured("nvidia/nemotron-3-super-120b-a12b") },
    lightning: { id: "nvidia/nemotron-3.5-lightning-30b-a3b", model: structured("nvidia/nemotron-3.5-lightning-30b-a3b") },
};

/*
 * One chain, nano first — and this is now a MEASURED result rather than a
 * speed-vs-quality compromise.
 *
 * Once the 1024-char tool-calling truncation above was fixed, all five
 * candidates were re-timed on an identical "write a full landing page"
 * prompt. The ranking was not close:
 *
 *   nemotron-3-nano-30b-a3b        8069 chars,  30s, COMPLETE
 *   nemotron-3.5-lightning-30b     4096 chars,  76s, truncated
 *   nemotron-3-super-120b-a12b     4095 chars,  17s, truncated
 *   llama-3.3-nemotron-super-49b     — ,       150s, timeout
 *   openai/gpt-oss-120b              — ,       150s, timeout
 *
 * nano is the ONLY model that returns a complete document, and it is also
 * the fastest of the ones that answer at all. The larger models stop dead
 * at their own 4096-char ceiling, which is the same defect one layer up.
 * So there is no quality/speed tradeoff to make here: the perceived
 * "quality" problem was truncation, and fixing it made the fast model the
 * best model. A quality-first reordering was tried and measured WORSE
 * (475s, failed generation) — it is not a matter of taste.
 *
 * Two model IDs were also removed as non-existent or unusable:
 *   - "deepseek-ai/deepseek-v4-flash" is not a real model on this account.
 *     It returned 410 "Gone" on 100% of calls and had been silently
 *     burning a chain slot on every single request. (The real ID is
 *     "deepseek-ai/deepseek-v4-flash-0731" — which then timed out at 120s
 *     on every attempt, so it is not in the chain either.)
 *   - "llama-3.3-nemotron-super-49b-v1.5" timed out on every attempt.
 *
 * The remaining two entries are fallbacks for the case where nano is
 * rate-limited or down entirely — they truncate long files, but a
 * truncated file is caught by Phase 5 verification and regenerated,
 * whereas a timing-out model just stalls the build. They get a fraction of
 * the timeout budget so a stalled fallback can't dominate a request.
 */
const FALLBACK_TIMEOUT_FACTOR = parseFloat(process.env.AI_FALLBACK_TIMEOUT_FACTOR || "0.5");

const MODEL_CHAIN = [
    MODELS.nano,
    { ...MODELS.super120b, timeoutFactor: FALLBACK_TIMEOUT_FACTOR },
    { ...MODELS.lightning, timeoutFactor: FALLBACK_TIMEOUT_FACTOR },
];

export { MODEL_CHAIN };


// A separate, single vision-capable model — confirmed available on
// NVIDIA NIM's free tier and OpenAI-compatible (image content passed as a
// data: URL in a normal chat message, same shape OpenAI's own vision API
// uses). Not part of MODEL_CHAIN: none of those text models can accept
// image input at all, so there's no "fallback chain" here, just one model
// this specific capability depends on — if it's ever down, image
// attachments degrade to "couldn't be analyzed" rather than the whole
// revision failing (see describeImage below).
const VISION_MODEL_ID = "meta/llama-3.2-90b-vision-instruct";
const VISION_TIMEOUT_MS = parseInt(process.env.AI_VISION_TIMEOUT_MS || "45000", 10);

// Turns a user-uploaded screenshot into a plain-text description the
// text-only revision model chain can actually use — keeps the main
// revise pipeline single-modality/provider-agnostic instead of needing
// every model in MODEL_CHAIN to support vision (most free-tier text
// models don't). Never throws: a failed image call degrades to a plain
// "couldn't be analyzed" note in the prompt rather than failing the whole
// revision over one bad/oversized image.
export async function describeImage(dataUrl, name) {
    try {
        const { text } = await generateText({
            model: nvidia(VISION_MODEL_ID),
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Describe exactly what this screenshot shows, in concrete detail — layout, visible text, colors, and especially anything that looks broken: error messages, misalignment, overlapping elements, missing/blank sections, wrong colors, broken images. This description is the ONLY way another AI (which cannot see the image itself) will know what's in it, so be specific rather than general.",
                        },
                        { type: "image", image: dataUrl },
                    ],
                },
            ],
            abortSignal: AbortSignal.timeout(VISION_TIMEOUT_MS),
        });
        return text;
    } catch (err) {
        console.warn(`[AI] Vision description failed for "${name}": ${err?.message || err}`);
        return null;
    }
}

// Firing many concurrent requests at a free-tier key is a real failure mode,
// not a hypothetical one: a live test sent 6 files at once and 4 of them
// timed out on all 3 retry attempts (12 straight 45s timeouts) while the
// other 2 completed normally in the same window — the free router evidently
// can't actually service 6 concurrent requests and the rest just starve in
// a queue. 2 was chosen empirically after that failure, not copied from a
// paid-tier default.
const MAX_CONCURRENCY = parseInt(process.env.AI_MAX_CONCURRENCY || "2", 10)

// Animation and QA are each an extra full pass over every file — on a free
// model tier that's real rate-limit pressure. Both default on (this is meant
// to be a genuinely polished pipeline), but can be dialled back with one env
// var if a specific free model's limits turn out to be too tight in practice.
const ENABLE_ANIMATION_PASS = process.env.AI_ENABLE_ANIMATION_PASS !== "false";
const ENABLE_QA_PASS = process.env.AI_ENABLE_QA_PASS !== "false";
// Animating /styles.css or a near-empty file wastes a call on nothing to animate.
const MIN_ANIMATABLE_CHARS = 120;

// generateObject has no built-in timeout — a request that hangs awaits
// forever, silently freezing that file with no error, no log line, and no
// chance for the fallback logic below to ever run. AbortSignal.timeout is
// the AI SDK's documented way to bound a call; every generateObject call in
// this file passes one so a hang becomes a catchable failure instead.
//
// 45s (a value carried over from OpenRouter) turned out too tight for these
// NVIDIA NIM models specifically: a raw, unscripted API test showed a small
// prompt answering in under 1s, but this app's REAL prompt — the ~9000-char
// system prompt plus a request for a genuinely complete production file —
// took ~6-10s even for a toy example, and the live pipeline showed real
// per-file calls legitimately running past 45s on more than one model, not
// hanging or broken. These models also emit reasoning tokens before their
// final answer (visible as `reasoning_content` in raw responses), which adds
// real time a non-reasoning free-tier model wouldn't have spent. Raised to
// give genuine in-progress generation room to finish instead of getting cut
// off and treated as if failed.
const CALL_TIMEOUT_MS = parseInt(process.env.AI_CALL_TIMEOUT_MS || "90000", 10);
const PLAN_TIMEOUT_MS = parseInt(process.env.AI_PLAN_TIMEOUT_MS || "120000", 10);

// Kill switch for the section-library path. Set AI_USE_SECTION_LIBRARY=false
// to send every project through free-form generation instead — useful for
// comparing the two paths on the same prompt.
const USE_SECTION_LIBRARY = process.env.AI_USE_SECTION_LIBRARY !== "false";

/*
 * Output token ceiling — the single most damaging bug found in this file.
 *
 * No call in this module ever set maxTokens, so every generateObject()
 * inherited the provider's default output cap (~1024 tokens on NVIDIA NIM).
 * Measured live across a full generation: index.html 952 chars, script.js
 * 748, styles.css 1025, retry 877 — every file in the project cut off at
 * roughly the same ceiling, mid-document, every time.
 *
 * That one missing parameter produced the entire cluster of symptoms this
 * pipeline had elaborate machinery to cope with:
 *   - "Document doesn't end with a closing </html> tag"  → truncation
 *   - "Unexpected end of file" / unbalanced-paren syntax errors → truncation
 *   - stylesheets missing rules for half the markup's classes → the CSS ran
 *     out of budget before it got to them
 *   - pages that look empty, generic and unfinished → they ARE unfinished
 *
 * It was consistently misread as model quality ("nano writes bland copy")
 * and as free-tier congestion, and the response was to add retries, a QA
 * pass and a fallback chain — none of which can help, because every retry
 * hits the identical ceiling at the identical point.
 *
 * A complete single-page site is ~8-15k characters ≈ 3-5k tokens; JSON
 * string escaping inside the structured-output envelope inflates that
 * further. 16k leaves genuine headroom without being unbounded.
 */
const MAX_OUTPUT_TOKENS = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || "16000", 10);
// The plan is a compact file list, not code — it needs far less, and a
// smaller cap keeps the (quality-model) planning call fast.
const PLAN_MAX_OUTPUT_TOKENS = parseInt(process.env.AI_PLAN_MAX_OUTPUT_TOKENS || "4000", 10);

function isTimeoutError(err) {
    return err?.name === "TimeoutError" || err?.name === "AbortError" || /aborted due to timeout/i.test(err?.message || "");
}

// Distinguished from a timeout/malformed-output failure because retrying the
// SAME model against a rate limit is pointless — the fix is a different
// model, not another attempt. Checked against both the HTTP status the SDK
// surfaces and the message text, since different providers report this
// differently (NVIDIA NIM's was plain text: "Rate limit exceeded:
// free-models-per-day").
function isRateLimitError(err) {
    // NVIDIA NIM surfaces at least two distinct capacity-exhaustion shapes:
    // a plain "Rate limit exceeded" message, and a gRPC-style
    // "ResourceExhausted: Worker local total request limit reached (32/32)"
    // — both mean the same thing (this model is out of headroom right now,
    // try a different one), so both need to route to the same fallback
    // behavior rather than only the first one being recognized.
    return (
        err?.statusCode === 429 ||
        err?.status === 429 ||
        /rate.?limit/i.test(err?.message || "") ||
        /resourceexhausted|request limit reached/i.test(err?.message || "")
    );
}

// Any other non-2xx from the gateway itself (as opposed to a malformed
// response from the model) — a live example hit this in production: a call
// to the FIRST model in the chain came back with the bare message "Gone"
// (a 410, presumably a transient upstream/gateway hiccup, not anything
// about the prompt), and because it matched none of the three recognized
// retryable shapes, callWithFallback treated it as fatal and aborted the
// whole chain instead of trying the next two models. Free-tier NIM infra is
// flaky enough (see the rate-limit/timeout handling above) that ANY
// server-side status in the 5xx range, plus 408/409/410 specifically,
// should mean "try the next model," not "give up."
function isTransientServerError(err) {
    const status = err?.statusCode || err?.status;
    if (typeof status === "number" && (status === 408 || status === 409 || status === 410 || status >= 500)) return true;
    return /^gone$/i.test((err?.message || "").trim());
}

// Tries each model in MODEL_CHAIN in order, moving to the next one as soon
// as a model proves unusable (rate-limited) or unreliable (repeated
// timeouts / unparsable output) rather than retrying a single provider
// forever. This is what actually fixed the real failure mode seen here: an
// account-wide daily quota block on one provider that no amount of
// client-side retrying against THAT SAME provider could get through — only
// trying a different one does.
export async function callWithFallback(label, timeoutMs, buildCallFn, chain = MODEL_CHAIN) {
    let lastErr;
    for (const { id, model, timeoutFactor } of chain) {
        // Each entry can take a fraction of the caller's budget rather than
        // the whole thing. That's what makes a quality-first ordering
        // affordable: a congested strong model is abandoned early and the
        // chain reaches a responsive model in seconds, instead of spending
        // the full budget proving one model is down.
        const budget = Math.max(15000, Math.round(timeoutMs * (timeoutFactor ?? 1)));
        try {
            return await buildCallFn(model, AbortSignal.timeout(budget));
        } catch (err) {
            lastErr = err;
            const timedOut = isTimeoutError(err);
            const unparsable = NoObjectGeneratedError.isInstance(err);
            const rateLimited = isRateLimitError(err);
            const transientServerError = isTransientServerError(err);

            if (!timedOut && !unparsable && !rateLimited && !transientServerError) throw err;

            if (rateLimited) {
                console.warn(`[AI] ${label}: ${id} is rate-limited, trying next model`);
            } else if (unparsable) {
                console.warn(
                    `[AI] ${label}: ${id} returned unparsable output, trying next model. Raw text: ${(err.text || "").slice(0, 200)}`
                );
            } else if (transientServerError) {
                console.warn(`[AI] ${label}: ${id} returned a server error (${err?.message}), trying next model`);
            } else {
                console.warn(`[AI] ${label}: ${id} timed out after ${budget}ms, trying next model`);
            }
        }
    }
    throw lastErr;
}

// Every stack has a different real entry point — this used to be hardcoded
// to /App.js, which only made sense back when React was the only option.
function entryFilePath(stack) {
    if (stack === "html") return "/index.html";
    if (stack === "nextjs") return "/app/page.js";
    return "/App.js";
}

// Guarantees the plan includes the files every project of this stack
// structurally needs, regardless of whether the model's plan happened to
// include them — mirrors the old React-only /App.js + /styles.css fallback,
// generalized per stack.
function ensureEntryFiles(plan) {
    const has = (path) => plan.files.some((f) => f.path === path);

    if (plan.stack === "html") {
        if (!has("/index.html")) {
            plan.files.unshift({ path: "/index.html", description: "Main HTML page", exports: "", imports: [] });
        }
        if (!has("/styles.css")) {
            plan.files.push({ path: "/styles.css", description: "Global CSS", exports: "", imports: [] });
        }
    } else if (plan.stack === "nextjs") {
        if (!has("/app/layout.js")) {
            plan.files.unshift({
                path: "/app/layout.js",
                description: "Root layout shared by every page",
                exports: "default RootLayout",
                imports: ["./globals.css"],
            });
        }
        if (!has("/app/page.js")) {
            plan.files.splice(1, 0, {
                path: "/app/page.js",
                description: "Home page",
                exports: "default Home",
                imports: [],
            });
        }
        if (!has("/app/globals.css")) {
            plan.files.push({ path: "/app/globals.css", description: "Global CSS", exports: "", imports: [] });
        }
    } else {
        if (!has("/App.js")) {
            plan.files.unshift({
                path: "/App.js",
                description: "Main application entry point",
                exports: "default App",
                imports: ["./styles.css"],
            });
        }
        if (!has("/styles.css")) {
            plan.files.push({
                path: "/styles.css",
                description: "Global CSS: Google Font import, keyframe animations, utility classes",
                exports: "none",
                imports: [],
            });
        }
    }
}

// A file that never generated gets a stack-appropriate visible placeholder
// instead of silently vanishing — an empty entry file would otherwise crash
// the preview instead of showing what went wrong.
/*
 * Decide the order files are written in: structure → styles → behaviour.
 *
 * The order matters because generation is sequential and each file is given
 * the full text of every file already written. Whatever comes first is
 * authored blind, so the first bucket must be the one that DEFINES the
 * vocabulary (elements, class names, ids) that later files have to agree
 * with — not one that has to guess at it.
 *
 *   1. structure  the markup: .html, or the JSX/component tree. Establishes
 *                 every class name and id the rest of the project targets.
 *   2. styles     .css, written against markup that already exists, so its
 *                 selectors match real elements instead of invented ones.
 *   3. behaviour  plain scripts, written last so every querySelector points
 *                 at markup that is already fixed, and it can see what the
 *                 stylesheet animates or toggles.
 *
 * Within the structure bucket the stack's entry point goes first (it frames
 * the layout everything else fits into), then the plan's own order is kept —
 * the planner already lists files roughly parent-before-child.
 */
export function orderFilesForGeneration(planFiles, stack) {
    const entry = entryFilePath(stack);
    const ext = (p) => p.split(".").pop()?.toLowerCase() || "";

    const bucket = (f) => {
        const e = ext(f.path);
        if (e === "css") return 1;
        if (e === "html") return 0;
        // For JSX stacks a .jsx/.tsx file is markup, and so is the entry
        // point whatever its extension. Remaining plain .js/.ts files are
        // helpers/behaviour (script.js, hooks, utils).
        if (e === "jsx" || e === "tsx") return 0;
        if (f.path === entry) return 0;
        if (stack !== "html" && /\/(components|pages|app|layouts?)\//i.test(f.path)) return 0;
        return 2;
    };

    return planFiles
        .map((f, i) => ({ f, i, b: bucket(f) }))
        .sort((a, b) => {
            if (a.b !== b.b) return a.b - b.b;
            // entry point leads its bucket
            if (a.f.path === entry) return -1;
            if (b.f.path === entry) return 1;
            return a.i - b.i; // otherwise keep the planner's ordering
        })
        .map(({ f }) => ({ ...f }));
}

function placeholderContent(file, stack) {
    const ext = file.path.split(".").pop()?.toLowerCase();

    if (ext === "css") {
        return `/* ${file.description} — Generation failed, please retry */\n`;
    }

    if (ext === "html") {
        return `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8" /><title>Generation failed</title></head>\n<body>\n  <div style="padding:2rem;text-align:center;color:#71717a;font-family:sans-serif;">\n    <p>⚠️ This page could not be generated. Please retry.</p>\n    <p>Purpose: ${file.description}</p>\n  </div>\n</body>\n</html>\n`;
    }

    if (stack === "html") {
        // A plain vanilla script — no JSX, no default export.
        return `// ⚠️ This file could not be generated. Please retry.\n// Purpose: ${file.description}\nconsole.warn("${file.path} failed to generate — please retry.");\n`;
    }

    const isClientBoundary = stack === "nextjs" ? '"use client";\n\n' : "";
    return (
        isClientBoundary +
        "import React from 'react';\n\n" +
        `// ⚠️ This file could not be generated. Please retry.\n` +
        `// Purpose: ${file.description}\n\n` +
        "export default function Placeholder() {\n" +
        "  return (\n" +
        "    <div className='p-8 text-center text-zinc-400'>\n" +
        "      <p>⚠️ Component failed to generate. Please try again.</p>\n" +
        "    </div>\n" +
        "  );\n" +
        "}\n"
    );
}

// Generate a single file's code
async function generateSingleFile(file, allFiles, prompt, alreadyGeneratedFiles, styleArchetype, stack){
     const system = buildFileCodeSystem(allFiles, alreadyGeneratedFiles, styleArchetype, stack, prompt);

     const userMsg = `Project: ${prompt}\n\nWrite the complete code for: ${file.path}\nPurpose: ${file.description}`;

     console.log(`[AI] Creating file: ${file.path}...`);
     const { object } = await callWithFallback(`generate ${file.path}`, CALL_TIMEOUT_MS, (model, abortSignal) =>
        generateObject({
            model,
            schema: FileCodeSchema,
            system,
            prompt: userMsg,
            maxTokens: MAX_OUTPUT_TOKENS,
            maxRetries: 2,
            abortSignal,
        })
    );

     let code = normalizeContent(object.code);

     if(code.trim().length === 0){
        throw new Error("Generated code is empty after normalization");
     }

     // Apply post-generation validation and auto-fixing
     const validation = validateAndFixCode(code, file.path, {allPlannedFiles: allFiles, stack});

     code = validation.code;

     // Deterministic image enforcement — the model is TOLD which URLs it may
     // use (see buildImageBlock), but being told is not a guarantee. Any
     // Unsplash id outside the verified catalog is swapped for one that is,
     // so a 404 or an off-topic stock photo can't reach the page.
     const imageCheck = enforceCatalogImages(code, prompt);
     code = imageCheck.code;
     if (imageCheck.warnings.length > 0) {
        console.log(`[Images] ${file.path}: ${imageCheck.warnings.join("; ")}`);
     }

     if(validation.warnings.length > 0){
        console.log(`[Validator] Code adjustments for ${file.path}:\n  - ${validation.warnings.join("\n  - ")}`);
     }

     console.log(`[AI] Created file: ${file.path} (${code.length} chars)`);
     return {path: file.path, code}
}

// Animation pass: a second, narrower call per file that adds scroll reveals
// and micro-interactions to code that's already functionally complete.
// Failure here is never fatal — the file just keeps its unanimated version,
// since motion is an enhancement, not a correctness requirement.
async function enhanceFileAnimation(path, code, allFiles, styleArchetype, stack) {
    if (path.endsWith(".css") || path.endsWith(".html") || code.length < MIN_ANIMATABLE_CHARS) {
        return { path, code, changed: false };
    }

    try {
        const system = buildAnimationSystem(allFiles, styleArchetype, stack);
        const { object } = await callWithFallback(`animate ${path}`, CALL_TIMEOUT_MS, (model, abortSignal) =>
            generateObject({
                model,
                schema: AnimationPassSchema,
                system,
                prompt: `Add motion to this file:\n\nPath: ${path}\n\n\`\`\`javascript\n${code}\n\`\`\``,
                maxTokens: MAX_OUTPUT_TOKENS,
                maxRetries: 1,
                abortSignal,
            })
        );

        let animated = normalizeContent(object.code);
        if (animated.trim().length === 0) return { path, code, changed: false };

        const validation = validateAndFixCode(animated, path, { allPlannedFiles: allFiles, stack });
        animated = validation.code;

        console.log(`[AI] Animated: ${path}`);
        return { path, code: animated, changed: true };
    } catch (err) {
        console.warn(`[AI] Animation pass failed for ${path}, keeping unanimated version: ${err?.message || err}`);
        return { path, code, changed: false };
    }
}

// QA pass: an LLM read of the finished file looking for real bugs the
// regex-based codeValidator can't catch (undefined vars, broken hooks,
// mismatched exports). Also never fatal — a QA call that errors just leaves
// the file as-is rather than blocking the build.
async function reviewFile(path, code, allFiles, stack) {
    if (path.endsWith(".css") || code.length < MIN_ANIMATABLE_CHARS) {
        return { path, code, issues: [], changed: false };
    }

    try {
        const system = buildQAReviewSystem(allFiles, stack);
        const { object } = await callWithFallback(`review ${path}`, CALL_TIMEOUT_MS, (model, abortSignal) =>
            generateObject({
                model,
                schema: QAReviewSchema,
                system,
                prompt: `Review this file:\n\nPath: ${path}\n\n\`\`\`\n${code}\n\`\`\``,
                maxTokens: MAX_OUTPUT_TOKENS,
                maxRetries: 1,
                abortSignal,
            })
        );

        if (!object.hasChanges || !object.code) {
            return { path, code, issues: object.issues || [], changed: false };
        }

        let reviewed = normalizeContent(object.code);
        const validation = validateAndFixCode(reviewed, path, { allPlannedFiles: allFiles, stack });
        reviewed = validation.code;

        if (object.issues?.length > 0) {
            console.log(`[QA] ${path}: ${object.issues.join("; ")}`);
        }
        return { path, code: reviewed, issues: object.issues || [], changed: true };
    } catch (err) {
        console.warn(`[AI] QA pass failed for ${path}, keeping prior version: ${err?.message || err}`);
        return { path, code, issues: [], changed: false };
    }
}

// Generate project files: plan first, then build files in order with fallback retries
/*
 * The section-library path.
 *
 * For a static landing page the model no longer writes code at all. It
 * returns a content plan — which sections, and the copy for each — and
 * sectionLibrary.js renders hand-written responsive markup with the motion
 * layer already attached.
 *
 * This exists because free-form generation could not be made to lay out a
 * page reliably. The last measured failure: a services grid whose cards came
 * out roughly 100px wide with one word per line, overflowing their container.
 * Every prompt instruction, validator and retry in this file was aimed at
 * that class of problem and none of them fixed it, because the model was
 * being asked to do the one thing it is worst at — invent correct layout —
 * on every single request.
 *
 * What the model is good at is judgement and words. That is all it does here.
 * Layout quality is now a constant, not a per-request gamble.
 */
async function generateFromSections(prompt, callbacks) {
    console.log(`[AI] Section-library path: planning content for "${prompt.slice(0, 80)}..."`);
    if (callbacks?.onStageChange) await callbacks.onStageChange("planning");

    let { object: plan } = await callWithFallback("content plan", PLAN_TIMEOUT_MS, (model, abortSignal) =>
        generateObject({
            model,
            schema: ContentPlanSchema,
            system: buildContentPlanSystem(prompt),
            prompt: `Create the content plan for: ${prompt}`,
            maxTokens: MAX_OUTPUT_TOKENS,
            maxRetries: 2,
            abortSignal,
        })
    );

    // Visual direction is decided in code where the business type is
    // unambiguous. The prompt already states the rule ("trades and local
    // services → Organic or Corporate") and the model ignored it in 2 of 3
    // measured runs, choosing Luxury — near-black and gold — for a Portland
    // landscaping company. Where archetypeForBusiness has no confident match,
    // the model's choice stands.
    const forced = archetypeForBusiness(prompt);
    if (forced && forced !== plan.styleArchetype) {
        console.log(`[AI] Archetype override: ${plan.styleArchetype} → ${forced} (business type is unambiguous)`);
        plan.styleArchetype = forced;
    }

    // Structural rules the prompt states but the model does not always keep.
    const sanitized = sanitizePlan(plan);
    plan = sanitized.plan;
    if (sanitized.notes.length) console.log(`[Plan] ${sanitized.notes.join("; ")}`);

    console.log(`[AI] Archetype: ${plan.styleArchetype} | sections: ${plan.sections.map((s) => s.type).join(" → ")}`);
    if (callbacks?.onPlan) {
        await callbacks.onPlan({
            projectName: plan.brand,
            projectDescription: plan.metaDescription,
            files: [
                { path: "/index.html", description: "Page markup assembled from the section library" },
                { path: "/styles.css", description: `Design system (${plan.styleArchetype}) + section styles` },
                { path: "/script.js", description: "Navigation and reveal behaviour" },
                { path: "/motion.js", description: "GSAP / ScrollTrigger / Lenis choreography" },
            ],
        });
    }

    if (callbacks?.onStageChange) await callbacks.onStageChange("building");

    // Images: enforce the catalog AND fill gaps.
    //
    // Enforcement handles invented URLs. The gap-filling handles the other
    // failure, measured on a real plan: the model omitted `image` on the
    // heroImage section entirely, so the single most important image on the
    // page rendered as src="" — a blank hero. A section whose template
    // expects an image always gets one now, drawn from the same verified,
    // industry-matched catalog.
    const pool = catalogUrlsFor(prompt, 40);
    let poolIndex = 0;
    const nextImage = () => pool[poolIndex++ % pool.length];
    const NEEDS_IMAGE = new Set(["heroImage", "heroSplit", "split"]);
    let filled = 0;

    for (const section of plan.sections) {
        if (section.image) {
            section.image = enforceCatalogImages(section.image, prompt).code;
        } else if (NEEDS_IMAGE.has(section.type) && pool.length) {
            section.image = nextImage();
            section.imageAlt = section.imageAlt || section.title || plan.brand;
            filled++;
        }
        if (Array.isArray(section.items)) {
            for (const item of section.items) {
                if (item.image) item.image = enforceCatalogImages(item.image, prompt).code;
            }
        }
    }
    if (filled > 0) console.log(`[Images] Filled ${filled} missing section image(s) from the catalog`);

    // The model tends to write a generic <title> ("Landing Page"). The brand
    // name is what belongs in a browser tab and a search result.
    if (!plan.title || !plan.title.toLowerCase().includes((plan.brand || "").toLowerCase().slice(0, 6))) {
        plan.title = plan.brand + (plan.title ? ` — ${plan.title}` : "");
    }

    const files = renderPage(plan, plan.styleArchetype);

    for (const [path, code] of Object.entries(files)) {
        if (callbacks?.onFileComplete) await callbacks.onFileComplete(path, code, "building");
    }

    // Rendering is deterministic, but verification is free and catches a
    // template regression immediately rather than in a user's browser.
    if (callbacks?.onStageChange) await callbacks.onStageChange("verifying");
    const qaIssues = [];
    for (const [path, code] of Object.entries(files)) {
        const result = await verifyFile(code, path);
        if (!result.ok) {
            console.error(`[Verify] ${path}: ${result.problems.join(" ")}`);
            qaIssues.push({ path, issues: result.problems });
        }
    }

    console.log(`[AI] Section-library build complete: ${Object.keys(files).length} files, ${qaIssues.length} issue(s)`);
    // The plan is returned so it can be STORED with the project. Revisions
    // then edit the plan and re-render, instead of patching markup — see
    // reviseContentPlan below.
    return { files, description: plan.metaDescription, qaIssues, stack: "html", contentPlan: plan };
}

export async function generateProject(prompt, callbacks){
    // A static landing page — the overwhelming majority of what this product
    // is asked for — goes through the section library. React/Next projects
    // still take the free-form path below, since they are genuine
    // applications rather than marketing pages and there is no section
    // library for app UI.
    if (USE_SECTION_LIBRARY) {
        const wantsApp = /\b(app|game|dashboard|calculator|todo|quiz|tracker|editor|tool|admin|portal|chat)\b/i.test(prompt);
        if (!wantsApp) {
            try {
                return await generateFromSections(prompt, callbacks);
            } catch (err) {
                // Fall back only for MODEL/API failures — a timeout, a
                // rate limit, output that won't validate. A ReferenceError
                // or TypeError is a bug in this repo, and silently falling
                // back to the free-form path hides it: exactly that
                // happened once (renderPage was used without being
                // imported), and the pipeline quietly produced free-form
                // pages for a full cycle while appearing to work.
                const isOurBug = err instanceof ReferenceError || err instanceof TypeError || err instanceof SyntaxError;
                if (isOurBug) {
                    console.error(`[AI] Section-library path has a CODE BUG, not a model failure: ${err?.stack || err}`);
                    throw err;
                }
                console.warn(`[AI] Section-library path failed (${err?.message || err}) — falling back to free-form generation`);
            }
        }
    }

    // Phase 1: Plan
    console.log(`[AI] Phase 1: Planning file structure for: "${prompt.slice(0,80)}..."`);
    if (callbacks?.onStageChange) await callbacks.onStageChange("planning");
    const { object: plan } = await callWithFallback("plan", PLAN_TIMEOUT_MS, (model, abortSignal) =>
        generateObject({
            model,
            schema: FilePlanSchema,
            system: FILE_PLAN_SYSTEM,
            prompt: `Plan a website for: ${prompt}`,
            maxTokens: PLAN_MAX_OUTPUT_TOKENS,
            maxRetries: 2,
            abortSignal,
        })
    );

    // Guarantee the entry point for whichever stack the plan picked exists —
    // each stack has a different one, so this can't be a single hardcoded
    // fallback the way it was when React was the only option.
    ensureEntryFiles(plan);

    if(callbacks?.onPlan){
        await callbacks.onPlan(plan)
    }

    console.log(`[AI] Stack: ${plan.stack}${plan.stackRationale ? ` — ${plan.stackRationale}` : ""}`);
    console.log(`[AI] Style archetype: ${plan.styleArchetype}${plan.styleRationale ? ` — ${plan.styleRationale}` : ""}`);
    /*
     * Phase 2: files are generated ONE AT A TIME, in dependency order.
     *
     * This used to run files through pMap at concurrency 2, so two files
     * were written simultaneously by separate model calls that could not
     * see each other's output. buildFileCodeSystem instructs each file to
     * "align your exports, imports, CSS selectors ... EXACTLY" with the
     * already-generated files — but under concurrency that context is
     * empty or partial, so agreement was down to luck.
     *
     * The failure this produces is not subtle. Confirmed on real output:
     * the markup styled its header with Tailwind utilities
     * (class="container flex justify-between items-center", "hidden
     * lg:flex") while the stylesheet, written blind, defined semantic
     * rules (.nav { display: flex }) for class names the markup never
     * used — and the page loaded no Tailwind at all, so the header
     * collapsed to block layout and the nav stacked vertically.
     *
     * Ordering is structure → styles → behaviour, because that is the
     * real dependency direction: the stylesheet needs to know which
     * elements and class names exist, and the script needs to know which
     * ids, classes and elements it will query. Generating in that order
     * means every file is written against the finished text of everything
     * it depends on.
     *
     * The cost is wall-clock: an N-file project is now N sequential calls
     * rather than N/2 rounds. That is a deliberate trade — a project that
     * builds twice as fast but whose files disagree with each other is
     * not faster to ship, because the disagreement lands on the user as a
     * broken page.
     */
    const generationOrder = orderFilesForGeneration(plan.files, plan.stack);

    console.log(
        `[AI] Phase 2: Generating ${generationOrder.length} files sequentially, in dependency order:\n` +
            generationOrder.map((f, i) => `        ${i + 1}. ${f.path}`).join("\n")
    );
    if (callbacks?.onStageChange) await callbacks.onStageChange("building");

    const files = {};
    const placeholderPaths = [];
    const maxRetryRounds = 2;

    for (const file of generationOrder) {
        let generated = null;

        for (let attempt = 0; attempt <= maxRetryRounds && generated === null; attempt++) {
            if (attempt > 0) {
                console.log(`[AI] Retry ${attempt}/${maxRetryRounds} for ${file.path}`);
            }
            try {
                if (callbacks?.onFileStart) await callbacks.onFileStart(file.path);
                // `files` holds every file completed so far — under
                // sequential generation that is now genuinely complete
                // context rather than whatever happened to have finished.
                const result = await generateSingleFile(file, plan.files, prompt, files, plan.styleArchetype, plan.stack);
                generated = result.code;
                if (callbacks?.onFileComplete) await callbacks.onFileComplete(file.path, result.code, "building");
            } catch (err) {
                console.warn(`[AI] ${file.path} failed on attempt ${attempt}: ${err?.message || err}`);
            } finally {
                // Runs on success AND failure — a failed file that stayed
                // marked "in progress" used to look permanently stuck in
                // the UI even after the build had moved past it.
                if (callbacks?.onFileSettled) await callbacks.onFileSettled(file.path);
            }
        }

        if (generated !== null) {
            files[file.path.startsWith("/") ? file.path : "/" + file.path] = generated;
        } else {
            // A file that never generated gets a visible placeholder rather
            // than silently vanishing — an empty entry file would crash the
            // preview instead of showing what went wrong.
            console.error(`[AI] Failed to generate ${file.path} after ${maxRetryRounds + 1} attempts`);
            files[file.path] = placeholderContent(file, plan.stack);
            placeholderPaths.push(file.path);
        }
    }
    const entryPath = entryFilePath(plan.stack);
    if(!files[entryPath]){
        throw new Error(`AI did not generate ${entryPath} entry point`);
    }
    // A placeholder entry file IS a real generation failure, not a
    // "completed" project with a cosmetic issue — confirmed live: every
    // model in MODEL_CHAIN failed 3 retry rounds in a row for /index.html
    // (an NVIDIA-side congestion/outage window, not a code bug), and the
    // project still saved as "completed" with the literal "Generation
    // failed, please retry" placeholder as its entire page content. The
    // caller needs to know this happened so it can mark the project failed
    // instead of silently shipping a broken page as a success.
    if (placeholderPaths.includes(entryPath)) {
        throw new Error(
            `The AI model wasn't able to generate ${entryPath} after ${maxRetryRounds + 1} attempts — this is usually free-tier congestion, not a permanent problem. Try again.`
        );
    }

    // Phase 3: Animation pass — a second, focused call per file adding
    // scroll reveals and micro-interactions on top of working layout/logic.
    if (ENABLE_ANIMATION_PASS) {
        const animatable = Object.keys(files).filter((p) => !p.endsWith(".css"));
        console.log(`[AI] Phase 3: Animation pass over ${animatable.length} files`);

        if (callbacks?.onStageChange) await callbacks.onStageChange("animating");

        const animResults = await pMap(
            animatable,
            async (path) => {
                if (callbacks?.onFileStart) await callbacks.onFileStart(path, "animating");
                const result = await enhanceFileAnimation(path, files[path], plan.files, plan.styleArchetype, plan.stack);
                if (callbacks?.onFileComplete) await callbacks.onFileComplete(path, result.code, "animating");
                if (callbacks?.onFileSettled) await callbacks.onFileSettled(path);
                return result;
            },
            { concurrency: MAX_CONCURRENCY },
        );

        for (const r of animResults) {
            if (r.changed) files[r.path] = r.code;
        }
    }

    // Phase 4: QA review pass — an LLM re-read of each file catching real
    // bugs the regex validator can't (broken hooks, mismatched exports,
    // dead handlers), not just malformed syntax.
    const qaIssues = [];
    if (ENABLE_QA_PASS) {
        const reviewable = Object.keys(files).filter((p) => !p.endsWith(".css"));
        console.log(`[AI] Phase 4: QA review over ${reviewable.length} files`);

        if (callbacks?.onStageChange) await callbacks.onStageChange("reviewing");

        const qaResults = await pMap(
            reviewable,
            async (path) => {
                if (callbacks?.onFileStart) await callbacks.onFileStart(path, "reviewing");
                const result = await reviewFile(path, files[path], plan.files, plan.stack);
                if (callbacks?.onFileComplete) await callbacks.onFileComplete(path, result.code, "reviewing");
                if (callbacks?.onFileSettled) await callbacks.onFileSettled(path);
                return result;
            },
            { concurrency: MAX_CONCURRENCY },
        );

        for (const r of qaResults) {
            if (r.changed) files[r.path] = r.code;
            if (r.issues?.length > 0) qaIssues.push({ path: r.path, issues: r.issues });
        }
    }

    // Phase 5: Deterministic verification — the "dedicated checker" role,
    // implemented as real tooling (a real JS/JSX parser, a real npm
    // registry lookup) rather than another AI review pass. This is what
    // actually catches things like a hallucinated package name or
    // mismatched JSX tags with 100% reliability: a parser either accepts
    // the code or it doesn't, unlike an LLM QA pass that can correctly
    // describe a bug in its own response text while still shipping code
    // that has the exact same bug (observed live, more than once). Runs
    // with no concurrency cap and no model fallback chain — these are
    // fast local/network checks, not AI calls, so NVIDIA congestion never
    // touches this phase.
    console.log(`[AI] Phase 5: Deterministic verification over ${Object.keys(files).length} files`);
    if (callbacks?.onStageChange) await callbacks.onStageChange("verifying");

    const filesToVerify = Object.keys(files);
    await Promise.all(
        filesToVerify.map(async (path) => {
            const result = await verifyFile(files[path], path);
            if (result.ok) return;

            console.warn(`[Verify] ${path}: ${result.problems.join(" ")} — attempting one automatic fix`);

            const planEntry = plan.files.find((f) => f.path === path);
            if (!planEntry) {
                // Shouldn't happen (every file in `files` came from the
                // plan), but fail safe rather than throw mid-verification.
                qaIssues.push({ path, issues: result.problems });
                return;
            }

            try {
                const retryFile = {
                    ...planEntry,
                    description: `${planEntry.description}\n\nIMPORTANT: A previous attempt at this exact file had these confirmed, real problems — fix them precisely:\n${result.problems.map((p) => `- ${p}`).join("\n")}`,
                };
                const retryResult = await generateSingleFile(retryFile, plan.files, prompt, files, plan.styleArchetype, plan.stack);
                const reverify = await verifyFile(retryResult.code, path);

                if (reverify.ok) {
                    files[path] = retryResult.code;
                    if (callbacks?.onFileComplete) await callbacks.onFileComplete(path, retryResult.code, "verifying");
                    console.log(`[Verify] ${path}: fixed on retry`);
                } else {
                    // Ship the retry anyway — it's not guaranteed better,
                    // but a second real attempt from a (possibly different,
                    // per the fallback chain) model is not guaranteed worse
                    // either. Surface exactly what's still wrong either way,
                    // instead of silently shipping a file nobody was told
                    // might be broken.
                    files[path] = retryResult.code;
                    qaIssues.push({ path, issues: reverify.problems });
                    console.warn(`[Verify] ${path}: still failing after retry — ${reverify.problems.join(" ")}`);
                }
            } catch (err) {
                qaIssues.push({ path, issues: result.problems });
                console.warn(`[Verify] ${path}: retry generation failed (${err?.message || err}), keeping original`);
            }
        })
    );

    // Non-entry placeholders (a secondary component that never generated)
    // don't block the project from shipping the way the entry file does,
    // but they're still a real, visible gap — surfaced the same way any
    // other post-generation problem is, instead of silently disappearing.
    for (const path of placeholderPaths) {
        if (path !== entryPath) qaIssues.push({ path, issues: ["This file could not be generated after retrying — showing a placeholder."] });
    }

    // The Phase 5 loop above deliberately ships a still-broken file rather
    // than blocking on it (a secondary file failing verification twice
    // shouldn't sink an otherwise-working project) — but the entry file is
    // different: confirmed live, a truncated/corrupted entry file that
    // failed its one retry attempt (real NVIDIA congestion, every model
    // timing out) still saved as a "completed" project with a broken page
    // as its entire content. One more free, deterministic (non-AI) check
    // decides this for real rather than guessing from qaIssues bookkeeping.
    const entryVerify = await verifyFile(files[entryPath], entryPath);
    if (!entryVerify.ok) {
        throw new Error(
            `The AI model couldn't produce a working ${entryPath} even after retrying — this is real NVIDIA free-tier congestion right now, not a permanent problem. Try again. (${entryVerify.problems.join(" ")})`
        );
    }

    return {files, description: plan.projectDescription, qaIssues, stack: plan.stack}
}

export async function reviseProject(prompt, manifest, relevantFiles, recentMessages, stack, attachments = []){
    const contextParts = [];

    contextParts.push("## Current Project Files (manifest)");
    contextParts.push("```");
    for (const f of manifest) {
        contextParts.push(`${f.path} (${f.hash}, ${f.size}B)`)
    }
    contextParts.push("```");

    if(Object.keys(relevantFiles).length > 0){
        contextParts.push("\n## File Contents (for reference)");
        for (const [path, content] of Object.entries(relevantFiles)) {
        contextParts.push(`\n### ${path}\n\`\`\`\n${content}\n\`\`\``)
    }
    }

    if(recentMessages.length > 0){
        contextParts.push("\n## Recent Conversation");
        for (const msg of recentMessages.slice(-3)) {
        contextParts.push(`${msg.role}: ${msg.content}`)
    }
    }

    if (attachments.length > 0) {
        contextParts.push("\n## Files the user attached to this request");
        for (const att of attachments) {
            if (att.kind === "text") {
                // Plenty for a log excerpt, an error message, or a
                // reference config/snippet without one huge paste
                // dominating the whole prompt.
                const truncated = att.data.length > 8000 ? att.data.slice(0, 8000) + "\n...(truncated)" : att.data;
                contextParts.push(`\n### ${att.name} (uploaded file)\n\`\`\`\n${truncated}\n\`\`\``);
            }
        }
        // Images run through the vision model IN PARALLEL, not one at a
        // time — each is an independent ~45s-capped call, no reason to
        // pay that latency serially for a user who attached 2-3 screenshots.
        const imageAttachments = attachments.filter((att) => att.kind === "image");
        if (imageAttachments.length > 0) {
            const descriptions = await Promise.all(
                imageAttachments.map((att) => describeImage(att.data, att.name))
            );
            imageAttachments.forEach((att, i) => {
                const description = descriptions[i];
                contextParts.push(
                    description
                        ? `\n### ${att.name} (uploaded screenshot)\nWhat this image shows: ${description}`
                        : `\n### ${att.name} (uploaded screenshot)\n(This image could not be automatically analyzed — base the fix only on the user's text description, and if it's not enough, say so instead of guessing.)`
                );
            });
        }
    }

    contextParts.push(`\n## Revision Request\n${prompt}`);

    console.log("[AI] Revising project...");

    const { object: rawParsed } = await callWithFallback("revise", PLAN_TIMEOUT_MS, (model, abortSignal) =>
        generateObject({
            model,
            schema: RevisionResultSchema,
            system: REVISE_SYSTEM(stack),
            prompt: contextParts.join("\n"),
            maxTokens: MAX_OUTPUT_TOKENS,
            maxRetries: 2,
            abortSignal,
        })
    );

    if(rawParsed && Array.isArray(rawParsed.operations)){
        rawParsed.operations = rawParsed.operations.map((op)=>{
            if(!op || typeof op !== "object") return op;

            let opStr = String(op.op || "").trim().toLowerCase();

            if(["create", "add", "new"].includes(opStr)) op.op = "create";
            else if (["update", "edit", "modify", "patch"].includes(opStr)) op.op = "update";
            else if (["delete", "remove", "del", "rm"].includes(opStr)) op.op = "delete";

            if(op.path && typeof op.path === "string" && !op.path.startsWith("/")){
                op.path = "/" + op.path;
            }

            if (op.content) op.content = normalizeContent(op.content);
            if (op.search) op.search = normalizeContent(op.search);
            if (op.replace) op.replace = normalizeContent(op.replace);

            if (op.op === "create" && op.content){
                const validation = validateRevisionContent(op.content, op.path, "create", stack);
                op.content = validation.content;
                if(validation.warnings.length > 0){
                    console.log(`[Validator] Revision Create adjustments for ${op.path}:\n  - ${validation.warnings.join("\n  - ")}`);
                }
            }else if(op.op === "update" && op.replace){
                 const validation = validateRevisionContent(op.replace, op.path, "update", stack);
                 op.replace = validation.content;
                 if(validation.warnings.length > 0){
                    console.log(`[Validator] Revision Update adjustments for ${op.path}:\n  - ${validation.warnings.join("\n  - ")}`);
                 }
            }
            return op;
        })
    }
    return rawParsed;
}
/*
 * Revising a section-library project.
 *
 * Edits never touch markup. The model is given the CURRENT content plan and
 * the user's request, and returns an updated plan; the page is then
 * re-rendered from the same hand-written templates.
 *
 * This closes the last hole in the architecture. Generation was already safe,
 * but revisions still ran through reviseProject's search/replace patching of
 * raw HTML — so one edit could undo every layout guarantee. Observed exactly
 * that: a user asked a generated page to be "responsive and animated", and
 * the free-form revision replied that it had added GSAP and reveal classes
 * while leaving the service cards ~100px wide with one word per line.
 *
 * Editing structured data instead of markup means a revision CANNOT break the
 * layout, the palette, the type scale, the responsive behaviour or the
 * motion. The worst a bad edit can do is produce worse copy.
 */
export async function reviseContentPlan(request, currentPlan, projectPrompt) {
    const { object: revised } = await callWithFallback("revise plan", PLAN_TIMEOUT_MS, (model, abortSignal) =>
        generateObject({
            model,
            schema: ContentPlanSchema,
            system: buildContentPlanSystem(projectPrompt || currentPlan.brand || ""),
            prompt:
                `Here is the CURRENT content plan for this site:\n\n${JSON.stringify(currentPlan, null, 2)}\n\n` +
                `The user asked for this change:\n"${request}"\n\n` +
                `Return the COMPLETE updated content plan with that change applied. Keep everything the user did not ask to change exactly as it is — same sections in the same order, same copy, same images — unless the request requires otherwise.\n\n` +
                `Note: responsiveness, scroll animations, smooth scrolling, hover states, fonts, colours and layout are ALREADY handled by the rendering system and are not part of the plan. If the user asks for those, they are already present — simply return the plan unchanged rather than inventing fields for them.`,
            maxTokens: MAX_OUTPUT_TOKENS,
            maxRetries: 2,
            abortSignal,
        })
    );

    const forced = archetypeForBusiness(projectPrompt || "");
    if (forced) revised.styleArchetype = forced;

    // Same image guarantees as a fresh build.
    const pool = catalogUrlsFor(projectPrompt || revised.brand || "", 40);
    let i = 0;
    const NEEDS_IMAGE = new Set(["heroImage", "heroSplit", "split"]);
    for (const section of revised.sections) {
        if (section.image) section.image = enforceCatalogImages(section.image, projectPrompt || "").code;
        else if (NEEDS_IMAGE.has(section.type) && pool.length) section.image = pool[i++ % pool.length];
        if (Array.isArray(section.items)) {
            for (const item of section.items) {
                if (item.image) item.image = enforceCatalogImages(item.image, projectPrompt || "").code;
            }
        }
    }

    const clean = sanitizePlan(revised);
    if (clean.notes.length) console.log(`[Plan] ${clean.notes.join("; ")}`);
    const files = renderPage(clean.plan, clean.plan.styleArchetype);
    return { files, contentPlan: clean.plan };
}
