import path from "path";
import { fileURLToPath } from "url";

/*
 * Database access: one query function, two backends, one SQL dialect.
 *
 *   DATABASE_URL (or POSTGRES_URL) set  → Neon Postgres over HTTP. This is
 *       production on Vercel. The HTTP driver is stateless — every query is
 *       its own request — which is what serverless needs: no connection pool
 *       to leak across invocations and no sockets held open between them.
 *
 *   otherwise                           → PGlite, a real Postgres compiled to
 *       WASM, persisted under server/data/pglite. This is local development.
 *       Because it IS Postgres, the SQL that runs on a laptop is the SQL that
 *       runs in production; there is no second implementation to drift.
 *
 * This replaces a JSON file read and rewritten synchronously on every call.
 * That design cannot exist on Vercel: the filesystem is read-only apart from
 * /tmp, and /tmp is per-instance and discarded, so every account and project
 * would vanish on each cold start.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Errors that mean "the request never reached a working database". Neon
// scales a free-tier database to zero when idle, and the first query after
// that can fail while compute wakes up; retrying succeeds. Only transport
// failures are retried — a SQL error (constraint violation, syntax) would
// fail identically every time and must surface immediately.
const TRANSIENT = /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|Error connecting to database|terminating connection|Connection terminated|socket hang up|network/i;

let driverPromise = null;
let schemaPromise = null;

async function createDriver() {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (url) {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(url);
        return { name: "neon", run: (text, params) => sql.query(text, params) };
    }

    // No URL on Vercel means the deployment is misconfigured, and falling
    // through to PGlite would try to write to a read-only filesystem and fail
    // with something unrelated. Say what is actually wrong.
    if (process.env.VERCEL) {
        throw new Error(
            "DATABASE_URL is not set. In the Vercel dashboard open Storage, add Neon Postgres to this project, " +
                "then redeploy — environment variables are only picked up by a new deployment."
        );
    }

    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR || path.join(__dirname, "data", "pglite");
    const pg = new PGlite(dir);
    await pg.waitReady;
    return { name: "pglite", run: async (text, params) => (await pg.query(text, params)).rows };
}

function getDriver() {
    if (!driverPromise) {
        driverPromise = createDriver().catch((err) => {
            driverPromise = null; // let the next request try again
            throw err;
        });
    }
    return driverPromise;
}

// One statement per entry. The Neon HTTP driver runs a single statement per
// request, and PGlite's parameterised path does the same, so the schema is
// applied statement by statement rather than as one multi-statement string.
const SCHEMA = [
    `CREATE TABLE IF NOT EXISTS mx_users (
        id    text PRIMARY KEY,
        email text NOT NULL UNIQUE,
        data  jsonb NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mx_sessions (
        token      text PRIMARY KEY,
        user_id    text NOT NULL,
        created_at bigint NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mx_projects (
        id         text PRIMARY KEY,
        user_id    text NOT NULL,
        published  boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now(),
        data       jsonb NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS mx_projects_user_idx ON mx_projects (user_id, updated_at DESC)`,
    // A small generic document table for the Lead Engine: the daily Places
    // usage counter, the (niche, city) search cache, and known businesses.
    `CREATE TABLE IF NOT EXISTS mx_kv (
        ns         text NOT NULL,
        key        text NOT NULL,
        data       jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (ns, key)
    )`,
];

async function runWithRetry(driver, text, params) {
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            return await driver.run(text, params);
        } catch (err) {
            lastErr = err;
            if (!TRANSIENT.test(`${err?.message || ""} ${err?.cause?.message || ""}`)) throw err;
            await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
        }
    }
    throw lastErr;
}

async function ensureSchema(driver) {
    // One cheap round trip decides whether any DDL is needed — on a warm
    // database this is the only schema work a cold start does.
    const rows = await runWithRetry(driver, `SELECT to_regclass('public.mx_kv') AS present`, []);
    if (rows?.[0]?.present) return;

    for (const statement of SCHEMA) {
        try {
            await runWithRetry(driver, statement, []);
        } catch (err) {
            // Two cold starts creating the schema at once can collide inside
            // Postgres even with IF NOT EXISTS. Losing that race is fine as
            // long as the table exists afterwards, which the next check proves.
            console.warn(`[db] schema statement raced or failed (${err?.message}); continuing`);
        }
    }
}

/**
 * Run one SQL statement with $1, $2 … placeholders and get the rows back.
 * Always parameterised — never build SQL by concatenating user input.
 */
export async function query(text, params = []) {
    const driver = await getDriver();
    if (!schemaPromise) {
        schemaPromise = ensureSchema(driver).catch((err) => {
            schemaPromise = null;
            throw err;
        });
    }
    await schemaPromise;
    return runWithRetry(driver, text, params);
}

export async function dbInfo() {
    const driver = await getDriver();
    return { driver: driver.name };
}
