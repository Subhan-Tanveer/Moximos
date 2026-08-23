import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

/**
 * Persistence for the real backend.
 *
 * A single JSON file, not a database — deliberately. This project has no
 * budget for hosted infrastructure yet, and a flat file needs zero setup,
 * zero new services, and survives server restarts (which is already a real
 * improvement over the old frontend mock, whose data lived in one browser's
 * localStorage and vanished per-device). When this moves to real hosting,
 * swap loadDB/saveDB for a real database client — everything above this
 * module only calls the functions exported here, so that's a contained swap.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "data", "db.json");

function loadDB() {
    try {
        const raw = fs.readFileSync(DB_PATH, "utf-8");
        const db = JSON.parse(raw);
        if (!db.placesUsage) db.placesUsage = {};
        if (!db.leadSearches) db.leadSearches = {};
        if (!db.businesses) db.businesses = {};
        if (!db.sessions) db.sessions = {};
        return db;
    } catch {
        return { users: [], projects: [], placesUsage: {}, leadSearches: {}, businesses: {}, sessions: {} };
    }
}

function saveDB(db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

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
// Persisted (not in-memory) — this server gets restarted often during
// development (every server-side code change), and an in-memory Map used to
// mean every restart silently logged everyone out mid-session. That's not
// just an inconvenience: a session dying while a project is polling for
// generation progress makes the UI go blank with no error, which reads as
// "the build is stuck" rather than "you got logged out."
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // matches the cookie's Max-Age

export function createSession(userId) {
    const token = crypto.randomBytes(24).toString("hex");
    const db = loadDB();
    if (!db.sessions) db.sessions = {};
    db.sessions[token] = { userId, createdAt: Date.now() };
    saveDB(db);
    return token;
}

export function getSessionUserId(token) {
    const db = loadDB();
    const session = db.sessions?.[token];
    if (!session) return null;
    if (Date.now() - session.createdAt > SESSION_MAX_AGE_MS) {
        delete db.sessions[token];
        saveDB(db);
        return null;
    }
    return session.userId;
}

export function destroySession(token) {
    const db = loadDB();
    if (db.sessions) {
        delete db.sessions[token];
        saveDB(db);
    }
}

// --- Users ---
export function findUserByEmail(email) {
    const db = loadDB();
    return db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) || null;
}

export function findUserById(id) {
    const db = loadDB();
    return db.users.find((u) => u._id === id) || null;
}

export function createUser({ name, email, password }) {
    const db = loadDB();
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        throw Object.assign(new Error("An account with that email already exists"), { status: 409 });
    }
    const user = {
        _id: crypto.randomUUID(),
        name: name || email.split("@")[0],
        email: email.trim().toLowerCase(),
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    saveDB(db);
    return user;
}

export function publicUser(user) {
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return rest;
}

// --- Projects ---
export function listProjects(userId) {
    const db = loadDB();
    return db.projects
        .filter((p) => p.userId === userId)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getProject(id, userId) {
    const db = loadDB();
    return db.projects.find((p) => p._id === id && p.userId === userId) || null;
}

export function getPublicProject(id) {
    const db = loadDB();
    return db.projects.find((p) => p._id === id && p.published) || null;
}

export function createProject(userId, data) {
    const db = loadDB();
    const project = {
        _id: crypto.randomUUID(),
        userId,
        version: 1,
        published: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
    };
    db.projects.push(project);
    saveDB(db);
    return project;
}

export function updateProject(id, userId, patch) {
    const db = loadDB();
    const idx = db.projects.findIndex((p) => p._id === id && p.userId === userId);
    if (idx === -1) return null;
    db.projects[idx] = { ...db.projects[idx], ...patch, updatedAt: new Date().toISOString() };
    saveDB(db);
    return db.projects[idx];
}

export function deleteProject(id, userId) {
    const db = loadDB();
    const before = db.projects.length;
    db.projects = db.projects.filter((p) => !(p._id === id && p.userId === userId));
    saveDB(db);
    return db.projects.length < before;
}

// --- Places API usage cap ---
// Persisted (not in-memory) deliberately: this server gets restarted often
// during development, and an in-memory counter would silently reset the cap
// every time, defeating the entire point of having one on a billed API.
function todayKey() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

export function getPlacesUsageToday() {
    const db = loadDB();
    return db.placesUsage[todayKey()] || 0;
}

export function incrementPlacesUsage(by = 1) {
    const db = loadDB();
    const key = todayKey();
    db.placesUsage[key] = (db.placesUsage[key] || 0) + by;
    saveDB(db);
    return db.placesUsage[key];
}

// --- Lead search cache ---
// Keyed on (niche, city) — deliberately NOT on rating/reviews/site-status,
// since those are just filters over the same underlying pool of businesses.
// The raw pool is cached once; a later search with a different rating
// threshold on the same city+niche still hits the cache instead of paying
// for another Google request. Every real business found through the Lead
// Engine accumulates here, so the system genuinely never re-buys the same
// lookup twice within the TTL window.
function leadCacheKey(niche, city) {
    return `${niche.trim().toLowerCase()}::${city.trim().toLowerCase()}`;
}

export function getCachedLeadSearch(niche, city) {
    const db = loadDB();
    return db.leadSearches[leadCacheKey(niche, city)] || null;
}

export function saveCachedLeadSearch(niche, city, rawResults) {
    const db = loadDB();
    db.leadSearches[leadCacheKey(niche, city)] = {
        fetchedAt: new Date().toISOString(),
        results: rawResults,
    };
    saveDB(db);
}

// --- Known businesses ---
// Keyed on Google's own Place ID — the stable identifier for one real,
// specific business, independent of which search query happened to surface
// it. The (niche, city) cache above avoids re-paying for the same search;
// this avoids re-trusting Google's fresh response for a company we've
// already captured, even when it turns up through a completely different
// search. Once a business is known, our own record is authoritative for it.
export function getKnownBusiness(placeId) {
    if (!placeId) return null;
    const db = loadDB();
    return db.businesses[placeId] || null;
}

export function saveKnownBusiness(placeId, data) {
    if (!placeId) return;
    const db = loadDB();
    const existing = db.businesses[placeId];
    db.businesses[placeId] = {
        ...data,
        placeId,
        firstSeenAt: existing?.firstSeenAt || new Date().toISOString(),
    };
    saveDB(db);
}

// Bulk variants — verified necessary, not just an optimization: calling
// getKnownBusiness/saveKnownBusiness (each its own synchronous
// readFileSync/writeFileSync) once per business INSIDE a concurrent fetch
// loop was corrupting other in-flight fetches. Reproduced directly — adding
// sync file I/O around evaluateSite() inside a pMap loop made an otherwise-
// healthy fetch fail with a generic "fetch failed", matching the real bug
// exactly. Synchronous fs calls block Node's single main thread; doing that
// repeatedly while other network I/O is in flight stalls it at the wrong
// moment. The fix: one read before the concurrent phase starts, one write
// after it ends — zero fs I/O while fetches are actually in flight.
export function getAllKnownBusinesses() {
    const db = loadDB();
    return db.businesses;
}

export function saveKnownBusinessesBulk(records) {
    const entries = Object.entries(records);
    if (entries.length === 0) return;
    const db = loadDB();
    for (const [placeId, data] of entries) {
        const existing = db.businesses[placeId];
        db.businesses[placeId] = {
            ...data,
            placeId,
            firstSeenAt: existing?.firstSeenAt || new Date().toISOString(),
        };
    }
    saveDB(db);
}
