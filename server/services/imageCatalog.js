/*
 * A curated, verified image catalog — the fix for hallucinated photo URLs.
 *
 * The prompt used to tell the model to write
 * `https://images.unsplash.com/[photo-id]` and leave it to recall a real
 * photo ID from memory. That cannot work, and measurably didn't:
 *
 *   - A wrong ID returns HTTP 404, so the page shows a broken image.
 *   - A remembered-but-unrelated ID returns a real photo of the wrong
 *     thing. Confirmed live: a fine-dining restaurant page rendered
 *     `photo-1507525428034-b723cf961d3e` — a tropical beach — because that
 *     is one of the handful of IDs the model has memorized.
 *   - `source.unsplash.com/featured/?<keyword>`, the old keyword endpoint,
 *     is dead (returns 503), so there is no keyword fallback either.
 *
 * So image URLs are no longer generated at all. Every ID below was checked
 * two ways: fetched over HTTP to confirm it returns an actual image, and
 * viewed to confirm it depicts what its category claims. The model is given
 * the exact URLs it may use for a project, and anything it invents anyway is
 * replaced deterministically before the file is saved.
 */

// Verified live. Each entry: a real Unsplash photo id, HTTP 200 + image/*,
// subject confirmed by eye. Do not add an id here without doing both.
export const IMAGE_CATALOG = {
    restaurant: [
        "photo-1414235077428-338989a2e8c0", // plated fine-dining dish, dark table
        "photo-1517248135467-4c7edcad34c4", // warm restaurant interior, wide
        "photo-1555396273-367ea4eb4db5", // dark upscale dining room
        "photo-1552566626-52f8b828add9", // industrial cafe interior
        "photo-1424847651672-bf20a4b0982b", // chef plating, close
        "photo-1466978913421-dad2ebd01d17", // bar / drinks setting
    ],
    food: [
        "photo-1546069901-ba9599a7e63c", // fresh bowl, overhead, bright
        "photo-1565299624946-b28f40a0ae38", // pizza slice detail
        "photo-1504674900247-0877df9cc836", // steak, rustic board
        "photo-1540189549336-e6e99c3679fe", // salad plate, overhead
    ],
    roofing: [
        "photo-1632759145351-1d592919f522", // roofer working on shingles
        "photo-1503387762-592deb58ef4e", // house exterior, roofline
        "photo-1416331108676-a22ccb276e35", // construction detail
    ],
    salon: [
        "photo-1560066984-138dadb4c035", // salon chairs, mirrors
        "photo-1522337360788-8b13dee7a37e", // stylist at work
        "photo-1595476108010-b4d1f102b1b1", // barber chair detail
    ],
    dental: [
        "photo-1629909613654-28e377c37b09", // dental surgery room
        "photo-1588776814546-1ffcf47267a5", // clinical detail
        "photo-1606811841689-23dfddce3e95", // dentist with patient
    ],
    fitness: [
        "photo-1534438327276-14e5300c3a48", // gym floor, equipment
        "photo-1571019613454-1cb2f99b2d8b", // training in progress
        "photo-1517836357463-d25dfeac3438", // weights detail
    ],
    landscaping: [
        "photo-1558904541-efa843a96f01", // manicured garden
        "photo-1416879595882-3373a0480b5b", // lawn / greenery
        "photo-1585320806297-9794b3e4eeae", // outdoor patio build
    ],
    office: [
        "photo-1497366754035-f200968a6e72", // modern office interior
        "photo-1497366811353-6870744d04b2", // meeting space
        "photo-1600880292203-757bb62b4baf", // consultation, two people
    ],
    team: [
        "photo-1600880292089-90a7e086ee0c", // team collaborating
        "photo-1521737604893-d14cc237f11d", // group at table
        "photo-1543269865-cbf427effbad", // working session
    ],
    tattoo: [
        "photo-1611501275019-9b5cda994e8d", // full back piece, blackwork
        "photo-1565058379802-bbe93b2f703a", // artist mid-session, close
    ],
    barber: [
        "photo-1503951914875-452162b0f3f1", // barber shave, dark interior
        "photo-1585747860715-2ba37e788b70", // cutting, chair
    ],
    coffee: [
        "photo-1495474472287-4d71bcdd2085", // latte art from above
        "photo-1501339847302-ac426a4a7cbb", // espresso pour
        "photo-1453614512568-c4024d13c247", // cafe counter
    ],
    bakery: [
        "photo-1509440159596-0249088772ff", // artisan loaves and wheat
        "photo-1486427944299-d1955d23e34d", // pastry counter
        "photo-1555507036-ab1f4038808a", // baking detail
    ],
    retail: [
        "photo-1441986300917-64674bd600d8", // shopfront exterior
        "photo-1560472354-b33ff0c44a43", // boutique interior
        "photo-1567401893414-76b7b1e5a7a5", // product display
    ],
    automotive: [
        "photo-1486262715619-67b85e0b08d3", // engine bay detail
        "photo-1493238792000-8113da705763", // workshop
        "photo-1487754180451-c456f719a1fc", // car exterior
    ],
    photography: [
        "photo-1452587925148-ce544e77e70d", // film camera and prints
        "photo-1516035069371-29a1b244cc32", // photographer working
        "photo-1542038784456-1ea8e935640e", // studio lighting
    ],
    realestate: [
        "photo-1560518883-ce09059eeffa", // house keys on a table
        "photo-1568605114967-8130f3a36994", // modern home exterior
        "photo-1512917774080-9991f1c4c750", // bright interior
    ],
    education: [
        "photo-1503676260728-1c00da094a0b", // students working
        "photo-1509062522246-3755977927d7", // classroom
        "photo-1524178232363-1fb2b075b655", // study detail
    ],
    events: [
        "photo-1519671482749-fd09be7ccebf", // event lighting and crowd
        "photo-1464366400600-7168b8af9bc3", // table setting
        "photo-1511578314322-379afb476865", // celebration
    ],
    portrait: [
        "photo-1507003211169-0a1dd7228f2d", // man, neutral background
        "photo-1494790108377-be9c29b29330", // woman, neutral background
        "photo-1500648767791-00dcc994a43e", // man, outdoor light
    ],
};

// Which catalog categories a project should draw from, in priority order.
// Keyword-matched against the user's own description of the business — the
// only reliable signal available at planning time.
const CATEGORY_KEYWORDS = {
    // Specific trades first — a broader category below would otherwise
    // swallow them ("barbershop" contains "barber"; "coffee roaster"
    // contains "coffee").
    tattoo: ["tattoo", "piercing", "ink studio", "body art"],
    barber: ["barber", "barbershop", "men's grooming", "shave"],
    coffee: ["coffee", "espresso", "roaster", "coffee shop", "cafe", "café"],
    bakery: ["bakery", "baker", "pastry", "bread", "cake", "patisserie"],
    automotive: ["auto repair", "mechanic", "car repair", "detailing", "tire", "body shop", "garage", "automotive"],
    photography: ["photograph", "videograph", "film studio", "portrait studio"],
    realestate: ["real estate", "realtor", "property", "estate agent", "letting"],
    education: ["tutor", "school", "academy", "course", "training", "coaching", "driving instructor"],
    events: ["event", "wedding", "party", "venue", "catering", "dj ", "planner"],
    retail: ["shop", "store", "boutique", "retail", "gift", "florist"],
    restaurant: ["restaurant", "dining", "bistro", "eatery", "steakhouse", "sushi", "pizzeria", "food truck", "brasserie", "diner"],
    food: ["menu", "food", "chef", "dessert", "pizza", "kitchen", "brunch"],
    roofing: ["roof", "roofing", "contractor", "construction", "remodel", "renovation", "builder", "fence", "deck", "siding", "gutter"],
    salon: ["salon", "hair", "beauty", "spa", "nails", "stylist", "med spa", "lash"],
    dental: ["dental", "dentist", "orthodont", "clinic", "medical", "doctor", "health", "chiropract", "veterinar", "physio"],
    fitness: ["gym", "fitness", "trainer", "yoga", "pilates", "crossfit", "workout", "wellness"],
    landscaping: ["landscap", "lawn", "garden", "outdoor", "patio", "pool", "tree", "pest control", "cleaning", "pressure wash"],
    office: ["law", "attorney", "legal", "account", "consult", "agency", "insurance", "financial", "b2b", "saas", "software"],
};

export function pickCategories(prompt) {
    const text = (prompt || "").toLowerCase();
    const hits = [];
    for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
        if (words.some((w) => text.includes(w))) hits.push(cat);
    }
    // team/portrait are always useful (about sections, testimonials) and
    // office is the neutral fallback when nothing matched.
    if (hits.length === 0) hits.push("office");
    return [...hits, "team", "portrait"];
}

const RENDER = (id, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export function catalogUrlsFor(prompt, limit = 10) {
    const urls = [];
    for (const cat of pickCategories(prompt)) {
        for (const id of IMAGE_CATALOG[cat] || []) {
            if (!urls.includes(RENDER(id))) urls.push(RENDER(id));
            if (urls.length >= limit) return urls;
        }
    }
    return urls;
}

/** The block injected into generation prompts listing the only legal images. */
export function buildImageBlock(prompt) {
    const urls = catalogUrlsFor(prompt);
    return `\n\n## IMAGES — USE ONLY THESE EXACT URLS
Do NOT invent Unsplash photo IDs. An invented id returns HTTP 404 (broken
image) or a real photo of something unrelated. These URLs are verified and
subject-checked for THIS project — copy them exactly, character for character:

${urls.map((u) => `- ${u}`).join("\n")}

Rules:
- Pick whichever fit each section; reuse is fine, but never alter the id.
- Change only the \`w=\` value if you need a different size (e.g. w=600 for a card, w=1600 for a hero).
- Every <img> needs width/height or an aspect-ratio class, real descriptive alt text, and loading="lazy" except the hero image.
- If none fit a slot, use a CSS gradient or solid colour block — never a made-up image URL, never a placeholder service.`;
}

/*
 * Enforcement is scoped to the categories RELEVANT to this business, not to
 * the catalog as a whole.
 *
 * The first version accepted any id present anywhere in the catalog. That
 * left an obvious hole: the model recalls ids it has seen, so a Brooklyn
 * tattoo studio came back with "modern office interior" and "meeting space"
 * — real, verified, catalogued photographs of entirely the wrong thing —
 * and they passed the check untouched because they existed *somewhere*.
 *
 * Scoping to pickCategories() means an image has to be right for THIS
 * business, not merely real.
 */
export function enforceCatalogImages(code, prompt) {
    const allowed = catalogUrlsFor(prompt, 40);
    if (allowed.length === 0) return { code, warnings: [] };

    // Ids legal for this specific project.
    const allowedIds = new Set();
    for (const cat of pickCategories(prompt)) {
        for (const id of IMAGE_CATALOG[cat] || []) allowedIds.add(id);
    }

    let i = 0;
    let replaced = 0;
    const swap = () => {
        replaced++;
        return allowed[i++ % allowed.length];
    };

    let out = code.replace(/https:\/\/images\.unsplash\.com\/([A-Za-z0-9_-]+)([^"'\s)]*)/g, (full, id) =>
        allowedIds.has(id) ? full : swap()
    );
    out = out.replace(/https:\/\/source\.unsplash\.com\/[^"'\s)]*/g, swap);
    out = out.replace(/https:\/\/(?:via\.placeholder\.com|placehold\.(?:it|co)|dummyimage\.com)\/[^"'\s)]*/g, swap);

    return {
        code: out,
        warnings: replaced > 0 ? [`Replaced ${replaced} off-topic or invented image URL(s) with images matched to this business`] : [],
    };
}
