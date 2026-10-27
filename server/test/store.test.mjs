// Run with:  npm test
//
// Exercises server/store.js against a REAL Postgres (PGlite, in memory), so
// the SQL that ships to Neon is the SQL that is tested here — including the
// JSONB merge, the atomic counter and the upserts, which are the parts a
// mock would simply agree with.
import test from "node:test";
import assert from "node:assert/strict";

process.env.PGLITE_DIR = "memory://";
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.VERCEL;

const store = await import("../store.js");

test("users: create, find by email (case-insensitive), find by id, duplicate rejected", async () => {
    const u = await store.createUser({ name: "Ada", email: "  Ada@Example.COM ", password: "correct horse" });
    assert.equal(u.email, "ada@example.com");
    assert.ok(u._id);

    assert.equal((await store.findUserByEmail("ADA@example.com"))._id, u._id);
    assert.equal((await store.findUserById(u._id)).name, "Ada");
    assert.equal(await store.findUserByEmail("nobody@example.com"), null);

    await assert.rejects(store.createUser({ email: "ada@example.com", password: "another pass" }), (e) => e.status === 409);

    assert.equal(store.verifyPassword("correct horse", (await store.findUserById(u._id)).passwordHash), true);
    assert.equal(store.verifyPassword("wrong", (await store.findUserById(u._id)).passwordHash), false);
    assert.equal("passwordHash" in store.publicUser(u), false);
});

test("users: simultaneous sign-ups for one address create exactly one account", async () => {
    const results = await Promise.allSettled(
        Array.from({ length: 6 }, () => store.createUser({ email: "race@example.com", password: "password123" }))
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(results.filter((r) => r.status === "rejected" && r.reason.status === 409).length, 5);
});

test("sessions: create, resolve, destroy, unknown token", async () => {
    const u = await store.createUser({ email: "sess@example.com", password: "password123" });
    const token = await store.createSession(u._id);
    assert.equal(await store.getSessionUserId(token), u._id);
    assert.equal(await store.getSessionUserId("not-a-token"), null);
    assert.equal(await store.getSessionUserId(undefined), null);
    await store.destroySession(token);
    assert.equal(await store.getSessionUserId(token), null);
});

test("projects: create, get, scoped to owner, list summaries without files", async () => {
    const a = await store.createUser({ email: "owner@example.com", password: "password123" });
    const b = await store.createUser({ email: "other@example.com", password: "password123" });

    const p = await store.createProject(a._id, { name: "Site", description: "d", files: { "/index.html": { content: "<h1>hi</h1>" } } });
    assert.equal(p.version, 1);
    assert.equal(p.userId, a._id);

    assert.equal((await store.getProject(p._id, a._id)).files["/index.html"].content, "<h1>hi</h1>");
    assert.equal(await store.getProject(p._id, b._id), null, "another user must not see it");

    const list = await store.listProjects(a._id);
    assert.equal(list.length, 1);
    assert.equal(list[0]._id, p._id);
    assert.equal(list[0].name, "Site");
    assert.equal("files" in list[0], false, "the list must not carry every generated file");
    assert.equal((await store.listProjects(b._id)).length, 0);
});

test("projects: update merges top-level keys and keeps the rest", async () => {
    const u = await store.createUser({ email: "merge@example.com", password: "password123" });
    const p = await store.createProject(u._id, { name: "Keep me", status: "pending", stage: "planning", files: {} });

    const updated = await store.updateProject(p._id, u._id, { stage: "building", files: { "/a.js": { content: "x" } } });
    assert.equal(updated.stage, "building");
    assert.equal(updated.name, "Keep me", "untouched keys survive the merge");
    assert.equal(updated.status, "pending");
    assert.deepEqual(Object.keys(updated.files), ["/a.js"]);
    assert.ok(updated.updatedAt >= p.updatedAt);

    assert.equal(await store.updateProject(p._id, "someone-else", { stage: "x" }), null);
    assert.equal((await store.getProject(p._id, u._id)).stage, "building");
});

test("projects: concurrent updates to different keys do not clobber each other", async () => {
    const u = await store.createUser({ email: "conc@example.com", password: "password123" });
    const p = await store.createProject(u._id, { name: "c" });
    await Promise.all([
        store.updateProject(p._id, u._id, { stage: "building" }),
        store.updateProject(p._id, u._id, { currentFiles: ["/index.html"] }),
        store.updateProject(p._id, u._id, { filesPlanned: [{ path: "/index.html" }] }),
        store.updateProject(p._id, u._id, { qaIssues: [] }),
    ]);
    const got = await store.getProject(p._id, u._id);
    assert.equal(got.stage, "building");
    assert.deepEqual(got.currentFiles, ["/index.html"]);
    assert.deepEqual(got.filesPlanned, [{ path: "/index.html" }]);
    assert.deepEqual(got.qaIssues, []);
});

test("projects: publishing makes it publicly readable, unpublished stays private", async () => {
    const u = await store.createUser({ email: "pub@example.com", password: "password123" });
    const p = await store.createProject(u._id, { name: "p" });
    assert.equal(await store.getPublicProject(p._id), null);
    await store.updateProject(p._id, u._id, { published: true });
    assert.equal((await store.getPublicProject(p._id)).name, "p");
    await store.updateProject(p._id, u._id, { published: false });
    assert.equal(await store.getPublicProject(p._id), null);
});

test("projects: delete only removes the owner's project", async () => {
    const a = await store.createUser({ email: "del-a@example.com", password: "password123" });
    const b = await store.createUser({ email: "del-b@example.com", password: "password123" });
    const p = await store.createProject(a._id, { name: "gone" });
    assert.equal(await store.deleteProject(p._id, b._id), false);
    assert.ok(await store.getProject(p._id, a._id));
    assert.equal(await store.deleteProject(p._id, a._id), true);
    assert.equal(await store.getProject(p._id, a._id), null);
});

test("places usage: counter is atomic under concurrency", async () => {
    const before = await store.getPlacesUsageToday();
    await Promise.all(Array.from({ length: 12 }, () => store.incrementPlacesUsage(1)));
    assert.equal(await store.getPlacesUsageToday(), before + 12, "every increment must be counted");
});

test("lead search cache: round-trips and is keyed case-insensitively", async () => {
    assert.equal(await store.getCachedLeadSearch("Roofing", "Ottawa"), null);
    await store.saveCachedLeadSearch("Roofing", "Ottawa", [{ id: 1 }]);
    const hit = await store.getCachedLeadSearch("  roofing ", "OTTAWA");
    assert.deepEqual(hit.results, [{ id: 1 }]);
    assert.ok(hit.fetchedAt);
});

test("known businesses: lookup by id list, upsert preserves firstSeenAt", async () => {
    await store.saveKnownBusinessesBulk({ p1: { name: "One" }, p2: { name: "Two" } });
    const found = await store.getKnownBusinesses(["p1", "p2", "missing"]);
    assert.deepEqual(Object.keys(found).sort(), ["p1", "p2"]);
    assert.equal(found.p1.name, "One");
    const first = found.p1.firstSeenAt;

    await new Promise((r) => setTimeout(r, 15));
    await store.saveKnownBusinessesBulk({ p1: { name: "One (renamed)" } });
    const again = (await store.getKnownBusinesses(["p1"])).p1;
    assert.equal(again.name, "One (renamed)");
    assert.equal(again.firstSeenAt, first, "firstSeenAt must survive an update");

    assert.deepEqual(await store.getKnownBusinesses([]), {});
    assert.equal((await store.getKnownBusiness("p2")).name, "Two");
    assert.equal(await store.getKnownBusiness(null), null);
});
