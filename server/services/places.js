import pMap from "p-map";
import {
    getPlacesUsageToday,
    incrementPlacesUsage,
    getCachedLeadSearch,
    saveCachedLeadSearch,
    getAllKnownBusinesses,
    saveKnownBusinessesBulk,
} from "../store.js";
import { evaluateSite } from "./siteEvaluator.js";

const SITE_EVAL_TTL_DAYS = parseInt(process.env.SITE_EVAL_TTL_DAYS || "30", 10);
// Verified live, twice: unbounded concurrent fetches to arbitrary business
// sites failed outright in this environment, and batching the store's sync
// file I/O outside the concurrent loop (see saveKnownBusinessesBulk) fixed
// most but not all of it — concurrency=3 still dropped 2 of 5 otherwise-
// healthy sites that succeeded when fetched standalone. Fully sequential is
// the setting that's actually been proven reliable here; a bounded fetch
// count (≤20 businesses, most already cached) makes the added latency
// acceptable in exchange for search results that aren't randomly wrong.
const SITE_EVAL_CONCURRENCY = parseInt(process.env.SITE_EVAL_CONCURRENCY || "1", 10);

/**
 * Real business lookups via Google Places API (New).
 *
 * Unlike the OpenRouter integration, this one bills per request past a small
 * free monthly allowance — so unlike ai.js, every call here is preceded by a
 * hard cap check. The cap is enforced in code, not just documented: once
 * GOOGLE_PLACES_DAILY_CAP calls happen in a day, further searches are
 * refused outright rather than silently continuing to bill.
 */

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const DAILY_CAP = parseInt(process.env.GOOGLE_PLACES_DAILY_CAP || "50", 10);
const CACHE_TTL_DAYS = parseInt(process.env.GOOGLE_PLACES_CACHE_TTL_DAYS || "30", 10);
const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

// Exactly the fields Moximos needs and nothing more — Places API bills by
// which fields you ask for, so an unused field is unused cost.
const FIELD_MASK = [
    "places.id",
    "places.displayName",
    "places.rating",
    "places.userRatingCount",
    "places.websiteUri",
    "places.nationalPhoneNumber",
    "places.formattedAddress",
    "places.businessStatus",
].join(",");

class PlacesCapError extends Error {
    constructor(used, cap) {
        super(`Daily Places API cap reached (${used}/${cap} requests used today). Raise GOOGLE_PLACES_DAILY_CAP in .env to allow more.`);
        this.name = "PlacesCapError";
        this.status = 429;
    }
}

class PlacesConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = "PlacesConfigError";
        this.status = 500;
    }
}

/**
 * Search for real businesses matching a city/niche, filtered to the ones
 * Moximos actually wants: decent reputation, still operating.
 *
 * Note on "website status": Places API tells us whether a `websiteUri` is
 * present, which is a real, verifiable signal. It does NOT tell us whether
 * an existing site is good or bad — that would require actually visiting
 * and analyzing each site, a separate feature this doesn't attempt. Results
 * here are honestly only ever "none" or "has" — never "bad" — and callers
 * should not claim otherwise.
 */
export async function searchBusinesses({ city, niche, minRating = 4.0, minReviews = 50, maxResults = 6, siteStatus = "any" }) {
    if (!city?.trim() || !niche?.trim()) {
        const err = new Error("Both city and niche are required");
        err.status = 400;
        throw err;
    }

    // The UI lets someone add several niche keyword chips ("roofing",
    // "plumbing"), which used to get joined into ONE Google query
    // ("roofing, plumbing in Austin, TX") — Places textSearch treats that as
    // a single confused phrase, not an OR, and routinely returns few or zero
    // matches even when both niches individually have plenty of businesses.
    // Each niche gets its own search (still cached per (niche, city) pair,
    // same as a single-niche search always was) and the pools are merged.
    const nicheTerms = [...new Set(niche.split(",").map((n) => n.trim()).filter(Boolean))];

    const pools = await Promise.all(nicheTerms.map((term) => getRawPool(term, city)));

    const merged = [];
    const seenPlaceIds = new Set();
    for (const pool of pools) {
        for (const business of pool.results) {
            const key = business.placeId || `${business.name}::${business.address}`;
            if (seenPlaceIds.has(key)) continue;
            seenPlaceIds.add(key);
            merged.push(business);
        }
    }
    merged.sort((a, b) => (b.outdatedScore ?? 0) - (a.outdatedScore ?? 0));

    const leads = merged
        .filter((p) => (p.rating ?? 0) >= minRating)
        .filter((p) => (p.reviews ?? 0) >= minReviews)
        .filter((p) => {
            if (siteStatus === "has") return p.site === "has";
            if (siteStatus === "none") return p.site === "none";
            return true; // "any"
        })
        // Filters run before the slice so "give me 6" means 6 that actually
        // match every filter, not 6 raw results filtered down afterward.
        .slice(0, maxResults);

    // Surfaced to the UI so a zero-result search can say WHY: no businesses
    // matching the niche/city at all, vs. businesses found but excluded by
    // the rating/review/website filters — those read as very different bugs
    // to a user, even though only one of them is actually a filter problem.
    return {
        leads,
        totalFound: merged.length,
        fromCache: pools.every((p) => p.fromCache),
        cachedAt: pools[0]?.fetchedAt,
    };
}

/**
 * The unfiltered pool of businesses for a (niche, city) pair — from cache
 * when available and fresh, otherwise a real (and billed) Google request.
 * Deliberately not filtered by rating/reviews/site-status here: those are
 * adjustable thresholds a caller can change without that meaning "go pay
 * for this search again."
 */
async function getRawPool(niche, city) {
    const cached = getCachedLeadSearch(niche, city);
    if (cached) {
        const ageDays = (Date.now() - new Date(cached.fetchedAt).getTime()) / 86_400_000;
        if (ageDays < CACHE_TTL_DAYS) {
            return { results: cached.results, fromCache: true, fetchedAt: cached.fetchedAt };
        }
    }

    if (!API_KEY) {
        throw new PlacesConfigError("GOOGLE_PLACES_API_KEY is not set — add it to .env to enable real lead search.");
    }

    const used = getPlacesUsageToday();
    if (used >= DAILY_CAP) {
        throw new PlacesCapError(used, DAILY_CAP);
    }

    const res = await fetch(SEARCH_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": FIELD_MASK,
        },
        // Always fetch Google's max page (20) — the raw pool is cached once
        // and reused across every future filter/threshold on this (niche,
        // city), so it's worth fetching wide up front rather than narrowly
        // per-request.
        body: JSON.stringify({ textQuery: `${niche} in ${city}`, pageSize: 20 }),
        signal: AbortSignal.timeout(15000),
    });

    // Count the call the moment it's made, regardless of outcome — a
    // request that fails after Google received it still counts against
    // quota on Google's side, so the local cap should track the same way.
    incrementPlacesUsage(1);

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        const err = new Error(`Places API request failed (${res.status}): ${body.slice(0, 300)}`);
        err.status = res.status === 403 ? 502 : 500;
        throw err;
    }

    const data = await res.json();
    const places = data.places || [];

    // One synchronous read before the concurrent phase starts — not one
    // per business inside it. See the note on saveKnownBusinessesBulk in
    // store.js for why that distinction is load-bearing, not stylistic.
    const knownBusinesses = getAllKnownBusinesses();
    const toPersist = {};

    const resolved = await pMap(
        places.filter((p) => p.businessStatus === "OPERATIONAL" || !p.businessStatus),
        (p) => resolveBusiness(p, niche, city, knownBusinesses, toPersist),
        { concurrency: SITE_EVAL_CONCURRENCY }
    );

    // One write after every fetch in the batch has finished — zero fs I/O
    // while network requests are in flight.
    saveKnownBusinessesBulk(toPersist);

    // Best rebuild-opportunity businesses first — baked into the cached
    // order so every future read of this (niche, city) pool, regardless of
    // rating/review/site-status filtering, stays ranked by opportunity.
    const results = resolved.sort((a, b) => (b.outdatedScore ?? 0) - (a.outdatedScore ?? 0));

    saveCachedLeadSearch(niche, city, results);
    return { results, fromCache: false, fetchedAt: new Date().toISOString() };
}

/**
 * One specific business, identified by Google's Place ID rather than by
 * name/address matching (which can drift — a business renaming slightly or
 * moving address shouldn't read as a "new" business). If we've captured this
 * exact business before, through ANY prior search, our own stored record is
 * used instead of Google's fresh response for it — this is what makes a
 * business genuinely "known" across different niche/city searches, not just
 * within one repeated search.
 *
 * Also owns the site evaluation (the outdated/opportunity score used for
 * ranking): computed once per business and cached alongside it, since a
 * website's design doesn't change often enough to justify re-fetching and
 * re-judging it on every search that happens to surface the same business.
 *
 * Reads from the pre-loaded `knownBusinesses` map and writes into the
 * `toPersist` accumulator — no direct store I/O here, so this function is
 * safe to run concurrently across many businesses at once.
 */
async function resolveBusiness(p, niche, city, knownBusinesses, toPersist) {
    const placeId = p.id || null;
    const known = placeId ? knownBusinesses[placeId] : null;

    if (known && isEvalFresh(known.siteEval)) {
        return known;
    }

    const business = known || {
        placeId,
        name: p.displayName?.text || "Unknown business",
        niche,
        city,
        address: p.formattedAddress || null,
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? 0,
        site: p.websiteUri ? "has" : "none",
        website: p.websiteUri || null,
        phone: p.nationalPhoneNumber || null,
    };

    const evaluation = await evaluateSite(business.website);
    const withEval = {
        ...business,
        outdatedScore: evaluation.outdatedScore,
        evalReason: evaluation.reason,
        siteEval: { evaluatedAt: new Date().toISOString(), usedAI: evaluation.usedAI },
    };

    if (placeId) toPersist[placeId] = withEval;
    return withEval;
}

function isEvalFresh(siteEval) {
    if (!siteEval?.evaluatedAt) return false;
    const ageDays = (Date.now() - new Date(siteEval.evaluatedAt).getTime()) / 86_400_000;
    return ageDays < SITE_EVAL_TTL_DAYS;
}

export function getPlacesUsage() {
    return { used: getPlacesUsageToday(), cap: DAILY_CAP };
}
