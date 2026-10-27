import crypto from "crypto";
import { query } from "./db.js";

/**
 * Persistence for the backend.
 *
 * Records are JSON documents stored in Postgres JSONB columns. The previous
 * implementation was a single JSON file read and rewritten synchronously on
 * every call; that cannot run on Vercel, whose filesystem is read-only and
 * whose instances are discarded between requests (see db.js). Keeping the
 * document shape means everything above this module still sees the same
 * objects — only the calls became async.
 *
 * Every function below is async. Callers must await them.
 */

// --- Passwords ---
// Node's built-in scrypt — no extra dependency, no native compilation risk.
export function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
    if (!stored || !stored.includes(":")) return false;
    const [salt, hash] = stored.split(":");
    const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
    // Constant-time compare — a plain === here would leak timing info about
    // how many leading bytes matched, which is exactly what scrypt storage
    // is supposed to protect against.
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(candidate, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// --- Sessions ---
// Persisted, never in memory. On Vercel an in-memory Map would not merely
// log people out on a restart: every request can land on a different
// instance, so a session created by one would not exist on the next.
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // matches the cookie's Max-Age

export async function createSession(userId) {
    const token = crypto.randomBytes(24).toString("hex");
    await query(`INSERT INTO mx_sessions (token, user_id, created_at) VALUES ($1, $2, $3)`, [token, userId, Date.now()]);
    return token;
}

export async function getSessionUserId(token) {
    if (!token) return null;
    const rows = await query(`SELECT user_id, created_at FROM mx_sessions WHERE token = $1`, [token]);
    const session = rows[0];
    if (!session) return null;
    if (Date.now() - Number(session.created_at) > SESSION_MAX_AGE_MS) {
        await query(`DELETE FROM mx_sessions WHERE token = $1`, [token]);
        return null;
    }
    return session.user_id;
}

export async function destroySession(token) {
    await query(`DELETE FROM mx_sessions WHERE token = $1`, [token]);
}

// --- Users ---
const normaliseEmail = (email) => String(email || "").trim().toLowerCase();

export async function findUserByEmail(email) {
    const rows = await query(`SELECT data FROM mx_users WHERE email = $1`, [normaliseEmail(email)]);
    return rows[0]?.data || null;
}

export async function findUserById(id) {
    const rows = await query(`SELECT data FROM mx_users WHERE id = $1`, [id]);
    return rows[0]?.data || null;
}

export async function createUser({ name, email, password }) {
    const clean = normaliseEmail(email);
    const user = {
        _id: crypto.randomUUID(),
        name: name || clean.split("@")[0],
        email: clean,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
    };
    // ON CONFLICT makes "does this email exist" and "insert it" one atomic
    // statement. A check-then-insert leaves a window where two simultaneous
    // sign-ups for the same address both pass the check.
    const rows = await query(
        `INSERT INTO mx_users (id, email, data) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (email) DO NOTHING RETURNING id`,
        [user._id, clean, JSON.stringify(user)]
    );
    if (rows.length === 0) {
        throw Object.assign(new Error("An account with that email already exists"), { status: 409 });
    }
    return user;
}

export function publicUser(user) {
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return rest;
}

// --- Projects ---
// The sidebar needs a name and a date for every project, not the generated
// files. Selecting just those fields keeps a user's project list from pulling
// every file of every site they have ever built.
export async function listProjects(userId) {
    const rows = await query(
        `SELECT jsonb_build_object(
                    '_id', id,
                    'name', data->'name',
                    'description', data->'description',
                    'version', data->'version',
                    'createdAt', data->'createdAt',
                    'updatedAt', data->'updatedAt'
                ) AS project
           FROM mx_projects
          WHERE user_id = $1
          ORDER BY updated_at DESC`,
        [userId]
    );
    return rows.map((r) => r.project);
}

export async function getProject(id, userId) {
    const rows = await query(`SELECT data FROM mx_projects WHERE id = $1 AND user_id = $2`, [id, userId]);
    return rows[0]?.data || null;
}

export async function getPublicProject(id) {
    const rows = await query(`SELECT data FROM mx_projects WHERE id = $1 AND published = true`, [id]);
    return rows[0]?.data || null;
}

export async function createProject(userId, data) {
    const now = new Date().toISOString();
    const project = {
        _id: crypto.randomUUID(),
        userId,
        version: 1,
        published: false,
        createdAt: now,
        updatedAt: now,
        ...data,
    };
    await query(`INSERT INTO mx_projects (id, user_id, published, data) VALUES ($1, $2, $3, $4::jsonb)`, [
        project._id,
        userId,
        Boolean(project.published),
        JSON.stringify(project),
    ]);
    return project;
}

/**
 * Shallow-merge `patch` into a project and return the result, or null if no
 * such project belongs to this user.
 *
 * The merge happens inside Postgres (`data || patch`) rather than as a
 * read-modify-write in JavaScript. Generation calls this many times in quick
 * succession from callbacks (stage changes, file progress, completed files),
 * and a JS read-then-write lets one callback overwrite another's fields with
 * a stale copy. The `||` operator replaces top-level keys exactly as the old
 * spread did, but atomically.
 */
export async function updateProject(id, userId, patch) {
    const full = { ...patch, updatedAt: new Date().toISOString() };
    const rows = await query(
        `UPDATE mx_projects
            SET data       = data || $3::jsonb,
                updated_at = now(),
                published  = COALESCE(($3::jsonb ->> 'published')::boolean, published)
          WHERE id = $1 AND user_id = $2
      RETURNING data`,
        [id, userId, JSON.stringify(full)]
    );
    return rows[0]?.data || null;
}

export async function deleteProject(id, userId) {
    const rows = await query(`DELETE FROM mx_projects WHERE id = $1 AND user_id = $2 RETURNING id`, [id, userId]);
    return rows.length > 0;
}

// --- Places API usage cap ---
// Persisted so the cap survives restarts — an in-memory counter would reset
// on every cold start, defeating the point of a cap on a billed API.
function todayKey() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

export async function getPlacesUsageToday() {
    const rows = await query(`SELECT data FROM mx_kv WHERE ns = 'placesUsage' AND key = $1`, [todayKey()]);
    return Number(rows[0]?.data?.count || 0);
}

// One atomic upsert-and-add. The old read, add, write let two concurrent
// searches both read the same count and both write count+1, so the counter
// under-reported — and the hard cap on a billed API is only as reliable as
// that counter.
export async function incrementPlacesUsage(by = 1) {
    const rows = await query(
        `INSERT INTO mx_kv (ns, key, data)
              VALUES ('placesUsage', $1, jsonb_build_object('count', $2::int))
         ON CONFLICT (ns, key) DO UPDATE
                 SET data = jsonb_build_object('count', (mx_kv.data ->> 'count')::int + $2::int),
                     updated_at = now()
           RETURNING (data ->> 'count')::int AS count`,
        [todayKey(), by]
    );
    return Number(rows[0]?.count || 0);
}

// --- Lead search cache ---
// Keyed on (niche, city) — deliberately NOT on rating/reviews/site-status,
// since those are just filters over the same underlying pool of businesses.
// The raw pool is cached once; a later search with a different rating
// threshold on the same city+niche still hits the cache instead of paying
// for another Google request.
function leadCacheKey(niche, city) {
    return `${niche.trim().toLowerCase()}::${city.trim().toLowerCase()}`;
}

export async function getCachedLeadSearch(niche, city) {
    const rows = await query(`SELECT data FROM mx_kv WHERE ns = 'leadSearches' AND key = $1`, [leadCacheKey(niche, city)]);
    return rows[0]?.data || null;
}

export async function saveCachedLeadSearch(niche, city, rawResults) {
    const value = { fetchedAt: new Date().toISOString(), results: rawResults };
    await query(
        `INSERT INTO mx_kv (ns, key, data) VALUES ('leadSearches', $1, $2::jsonb)
         ON CONFLICT (ns, key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [leadCacheKey(niche, city), JSON.stringify(value)]
    );
}

// --- Known businesses ---
// Keyed on Google's own Place ID — the stable identifier for one real,
// specific business, independent of which search surfaced it. Once a business
// is known, our own record is authoritative for it.
export async function getKnownBusiness(placeId) {
    if (!placeId) return null;
    const rows = await query(`SELECT data FROM mx_kv WHERE ns = 'businesses' AND key = $1`, [placeId]);
    return rows[0]?.data || null;
}

// Fetch only the businesses a search actually returned, as { placeId: record }.
// This replaces getAllKnownBusinesses(), which returned the entire table —
// harmless for a small JSON file in memory, but it would drag every business
// ever discovered across the network on every single search.
export async function getKnownBusinesses(placeIds) {
    const ids = [...new Set((placeIds || []).filter(Boolean))];
    if (ids.length === 0) return {};
    const rows = await query(`SELECT key, data FROM mx_kv WHERE ns = 'businesses' AND key = ANY($1::text[])`, [ids]);
    return Object.fromEntries(rows.map((r) => [r.key, r.data]));
}

async function upsertBusiness(placeId, data) {
    const record = { ...data, placeId, firstSeenAt: new Date().toISOString() };
    // On conflict keep the ORIGINAL firstSeenAt but take everything else
    // from the new record.
    await query(
        `INSERT INTO mx_kv (ns, key, data) VALUES ('businesses', $1, $2::jsonb)
         ON CONFLICT (ns, key) DO UPDATE
                 SET data = $2::jsonb || jsonb_build_object(
                         'firstSeenAt', COALESCE(mx_kv.data ->> 'firstSeenAt', $2::jsonb ->> 'firstSeenAt')
                     ),
                     updated_at = now()`,
        [placeId, JSON.stringify(record)]
    );
}

export async function saveKnownBusiness(placeId, data) {
    if (!placeId) return;
    await upsertBusiness(placeId, data);
}

export async function saveKnownBusinessesBulk(records) {
    const entries = Object.entries(records || {});
    if (entries.length === 0) return;
    await Promise.all(entries.map(([placeId, data]) => upsertBusiness(placeId, data)));
}
