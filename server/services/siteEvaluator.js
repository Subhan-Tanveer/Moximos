import { generateObject } from "ai";
import { callWithFallback } from "./ai.js";
import { SiteQualitySchema } from "./aiSchemas.js";
import { SITE_QUALITY_SYSTEM } from "./prompts.js";

/**
 * Scores how much a business needs a new website — the actual ranking
 * signal the Lead Engine sorts by. Higher score = more outdated/neglected
 * = a better lead (more obvious opportunity to pitch a rebuild).
 *
 * Two tiers, deliberately:
 *  1. Fast heuristics (real HTTP fetch + pattern checks) — free, instant,
 *     confident at the extremes: no site at all, a dead link, or an
 *     obviously current site all score clearly without needing an opinion.
 *  2. An AI read of the page text — only for the ambiguous middle band a
 *     heuristic genuinely can't call either way. This is the expensive
 *     path (one more model call), so it's scoped tightly on purpose.
 */

const FETCH_TIMEOUT_MS = parseInt(process.env.SITE_EVAL_FETCH_TIMEOUT_MS || "6000", 10);
// Raised alongside ai.js's CALL_TIMEOUT_MS for the same reason — the
// underlying NVIDIA NIM models emit reasoning tokens before their answer,
// which 20s didn't reliably account for, even for this much shorter prompt.
const AI_JUDGE_TIMEOUT_MS = parseInt(process.env.SITE_EVAL_AI_TIMEOUT_MS || "35000", 10);
// The heuristic score band where a heuristic verdict genuinely isn't
// confident enough to trust alone — outside this band the heuristic score
// is used as-is.
const AMBIGUOUS_LOW = 20;
const AMBIGUOUS_HIGH = 65;

const OLD_TECH_PATTERN = /<marquee|<blink|<font\s|cellspacing=|<center>|frameset/i;
const CURRENT_YEAR = 2026; // stamped, not computed — Date.now() is unavailable in this environment's scripted contexts

export async function evaluateSite(website) {
    if (!website) {
        return { outdatedScore: 100, reachable: null, usedAI: false, reason: "No website at all — the clearest possible opportunity." };
    }

    let html;
    let finalUrl = website;
    try {
        const res = await fetch(website, {
            redirect: "follow",
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            headers: { "User-Agent": "Mozilla/5.0 (compatible; MoximosLeadBot/1.0)" },
        });
        finalUrl = res.url || website;
        if (!res.ok) {
            return { outdatedScore: 90, reachable: false, usedAI: false, reason: `Site returned an error (${res.status}) — likely broken or abandoned.` };
        }
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
            return { outdatedScore: 60, reachable: true, usedAI: false, reason: "Unexpected response type — couldn't read it as a normal page." };
        }
        html = await res.text();
    } catch {
        // Timeout, DNS failure, connection refused, TLS error — all read
        // the same way here: they claim a website and it doesn't work.
        return { outdatedScore: 90, reachable: false, usedAI: false, reason: "Site didn't respond — broken, expired, or unreachable." };
    }

    const heuristic = scoreHeuristics(html, finalUrl);

    if (heuristic.score <= AMBIGUOUS_LOW || heuristic.score >= AMBIGUOUS_HIGH) {
        return { outdatedScore: heuristic.score, reachable: true, usedAI: false, reason: heuristic.reason };
    }

    // Ambiguous — ask for a real opinion, but never let this block the
    // whole search if the model is slow or unavailable.
    try {
        const excerpt = extractVisibleText(html).slice(0, 2500);
        const { object } = await callWithFallback("site quality judgment", AI_JUDGE_TIMEOUT_MS, (model, abortSignal) =>
            generateObject({
                model,
                schema: SiteQualitySchema,
                system: SITE_QUALITY_SYSTEM,
                prompt: `Homepage text excerpt:\n\n${excerpt}`,
                maxRetries: 1,
                abortSignal,
            })
        );
        return { outdatedScore: object.outdatedScore, reachable: true, usedAI: true, reason: object.reason };
    } catch (err) {
        console.warn(`[SiteEval] AI judgment failed for ${website}, keeping heuristic score: ${err?.message || err}`);
        return { outdatedScore: heuristic.score, reachable: true, usedAI: false, reason: heuristic.reason };
    }
}

function scoreHeuristics(html, finalUrl) {
    let score = 0;
    const notes = [];

    if (!finalUrl.startsWith("https://")) {
        score += 25;
        notes.push("no HTTPS");
    }
    if (!/<meta[^>]*name=["']viewport["']/i.test(html)) {
        score += 25;
        notes.push("not mobile-friendly");
    }
    if (OLD_TECH_PATTERN.test(html)) {
        score += 30;
        notes.push("uses outdated markup patterns");
    }
    const yearMatch = html.match(/(?:©|copyright)[^\d]{0,12}(19|20)(\d{2})/i);
    if (yearMatch) {
        const year = parseInt(yearMatch[1] + yearMatch[2], 10);
        if (CURRENT_YEAR - year >= 5) {
            score += 15;
            notes.push(`copyright year stuck at ${year}`);
        }
    }
    if (html.length < 2500) {
        score += 15;
        notes.push("very sparse page");
    }
    if (!/<link[^>]*rel=["'](?:shortcut )?icon["']/i.test(html)) {
        score += 5;
        notes.push("no favicon");
    }
    if (!/<meta[^>]*name=["']description["']/i.test(html)) {
        score += 5;
        notes.push("no meta description");
    }

    score = Math.min(100, score);
    const reason = notes.length > 0 ? `Signals: ${notes.join(", ")}.` : "Looks current and well-maintained.";
    return { score, reason };
}

// Crude but dependency-free text extraction — strips tags rather than
// parsing a real DOM, since this only feeds a short excerpt to the AI
// judgment call and doesn't need to be perfectly accurate.
function extractVisibleText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
