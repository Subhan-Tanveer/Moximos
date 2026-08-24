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
    pets: [
        "photo-1450778869180-41d0601e046e", // dog and cat together
        "photo-1548199973-03cce0bbc87b", // pet close-up
        "photo-1552053831-71594a27632d", // grooming
    ],
    plumbing: [
        "photo-1607472586893-edb57bdc0e39", // pipework on brick
        "photo-1621905251189-08b45d6a269e", // tradesman at work
    ],
    cleaning: [
        "photo-1581578731548-c64695cc6952", // cleaning a window
        "photo-1527515637462-cff94eecc1ac", // domestic cleaning
        "photo-1585421514738-01798e348b17", // supplies
    ],
    construction: [
        "photo-1541888946425-d81bb19240f5", // site work
        "photo-1503387762-592deb58ef4e", // house exterior build
        "photo-1504307651254-35680f356dfd", // structure detail
    ],
    childcare: [
        "photo-1503454537195-1dcabb73ffb9", // child painting
        "photo-1587654780291-39c9404d746b", // kids activity
        "photo-1471286174890-9c112ffca5b4", // play detail
    ],
    travel: [
        "photo-1566073771259-6a8506099945", // hotel exterior
        "photo-1520250497591-112f2f40a3f4", // suitcase and travel
        "photo-1517840901100-8179e982acb7", // destination
    ],
    wellness: [
        "photo-1544161515-4ab6ce6db874", // massage treatment
        "photo-1540555700478-4be289fbecef", // spa detail
        "photo-1600334089648-b0d9d3028eb2", // relaxation
    ],
    music: [
        "photo-1493225457124-a3eb161ffa5f", // live performance
        "photo-1511671782779-c97d3d27a1d4", // instruments
        "photo-1470019693664-1d202d2c0907", // studio
    ],
    legal: [
        "photo-1589829545856-d10d557cf95f", // scales of justice
        "photo-1450101499163-c8848c66ca85", // law books
        "photo-1505664194779-8beaceb93744", // office desk
    ],
    nonprofit: [
        "photo-1593113646773-028c64a8f1b8", // volunteers together
        "photo-1509099836639-18ba1795216d", // community work
        "photo-1469571486292-0ba58a3f068b", // outreach
    ],
    portrait: [
        "photo-1507003211169-0a1dd7228f2d", // man, neutral background
        "photo-1494790108377-be9c29b29330", // woman, neutral background
        "photo-1500648767791-00dcc994a43e", // man, outdoor light
    ],
};

/*
 * Niche routing.
 *
 * Deliberately broad: a sub-niche that matches nothing falls through to
 * "office", which is generic stock and the most visible way a generated page
 * looks like it was made for nobody. Many niches share honest imagery — a
 * plumber, an electrician and an HVAC engineer are all a tradesperson working
 * — so several keys map to the same verified set rather than pretending each
 * needs its own photographs.
 *
 * ORDER MATTERS. pickCategories takes the first match, and short keywords are
 * substrings of longer ones ("barbershop" contains "barber"; "coffee roaster"
 * contains "coffee"; "dog grooming" contains "grooming", which salon also
 * claims). Specific first, generic last.
 */
const CATEGORY_KEYWORDS = {
    // ── Personal care and body ──────────────────────────────
    tattoo: ["tattoo", "piercing", "ink studio", "body art", "flash art"],
    barber: ["barber", "barbershop", "mens grooming", "shave", "beard trim", "fade"],
    wellness: ["spa", "massage", "wellness", "reiki", "acupuncture", "sauna", "float tank", "day spa", "med spa", "medspa", "facial", "aesthetic clinic", "botox", "waxing"],
    salon: ["salon", "hair", "beauty", "nails", "stylist", "lash", "brow", "colourist", "colorist", "blow dry", "makeup artist"],

    // ── Food and drink ──────────────────────────────────────
    coffee: ["coffee", "espresso", "roaster", "coffee shop", "cafe", "café", "barista"],
    bakery: ["bakery", "baker", "pastry", "bread", "cake", "patisserie", "cupcake", "donut", "doughnut"],
    restaurant: ["restaurant", "dining", "bistro", "eatery", "steakhouse", "sushi", "pizzeria", "food truck", "brasserie", "diner", "tapas", "ramen", "burger", "bbq", "barbecue", "gastropub", "pub", "cocktail", "brewery", "winery", "distillery"],
    // "food" and "kitchen" were removed as keywords: they are substrings of
    // things that are not food businesses at all — "charity food bank" routed
    // to food imagery, and so did "kitchen fitter". The specific terms below
    // still catch every real food business.
    food: ["menu", "chef", "dessert", "pizza", "brunch", "meal prep", "catering", "butcher", "deli", "grocer", "farm shop"],

    // ── Trades and home services ────────────────────────────
    roofing: ["roof", "roofing", "shingle", "gutter", "siding", "fascia", "soffit", "chimney"],
    plumbing: ["plumb", "electrician", "electrical", "hvac", "heating", "boiler", "furnace", "air conditioning", "drain", "sewer", "septic", "gas engineer", "handyman", "appliance repair", "locksmith", "garage door", "welding", "fabrication"],
    construction: ["construction", "builder", "remodel", "renovation", "contractor", "carpentry", "carpenter", "joinery", "flooring", "tiling", "tiler", "drywall", "plaster", "painter", "decorator", "kitchen fitter", "bathroom fitter", "extension", "loft conversion", "scaffolding", "demolition", "concrete", "masonry", "glazier", "window fitter", "insulation", "solar"],
    cleaning: ["cleaning", "cleaner", "janitorial", "housekeeping", "maid", "pressure wash", "power wash", "window clean", "carpet clean", "gutter clean", "chimney sweep", "waste removal", "junk removal", "man and van", "removals", "moving company", "movers", "storage"],
    landscaping: ["landscap", "lawn", "garden", "outdoor", "patio", "decking", "fence", "fencing", "pool", "tree surgeon", "arborist", "pest control", "paving", "driveway", "turf", "irrigation", "snow removal"],

    // ── Vehicles ────────────────────────────────────────────
    automotive: ["auto repair", "mechanic", "car repair", "detailing", "tire", "tyre", "body shop", "garage", "automotive", "car wash", "vehicle wrap", "dealership", "motorcycle", "bike shop", "towing", "car rental", "driving school", "chauffeur", "taxi", "limo"],

    // ── Health and clinical ─────────────────────────────────
    dental: ["dental", "dentist", "orthodont", "hygienist", "implant", "invisalign"],
    pets: ["vet", "veterinar", "pet", "dog", "cat", "puppy", "kennel", "cattery", "pet sitting", "dog walking", "grooming", "animal"],
    fitness: ["gym", "fitness", "personal train", "yoga", "pilates", "crossfit", "workout", "bootcamp", "martial arts", "boxing", "climbing", "swim school", "dance studio", "physio", "sports therapy", "chiropract"],
    childcare: ["childcare", "nursery", "daycare", "preschool", "kindergarten", "montessori", "babysit", "nanny", "kids club", "soft play", "childrens"],

    // ── Professional services ───────────────────────────────
    legal: ["law firm", "attorney", "lawyer", "legal", "solicitor", "barrister", "paralegal", "notary", "conveyancing"],
    realestate: ["real estate", "realtor", "property", "estate agent", "letting", "lettings", "mortgage", "surveyor", "property management"],
    photography: ["photograph", "videograph", "film studio", "portrait studio", "wedding photo", "drone"],
    music: ["music", "band", "recording studio", "producer", "singer", "guitar lesson", "piano lesson", "music school", "sound engineer"],
    education: ["tutor", "school", "academy", "course", "training", "coaching", "e-learning", "language school", "exam prep", "university"],
    events: ["event", "wedding", "party", "venue", "planner", "florist", "balloon", "photo booth", "entertainer", "conference", "exhibition"],
    travel: ["hotel", "motel", "bed and breakfast", "guest house", "hostel", "travel agen", "tour", "holiday", "vacation rental", "campsite", "glamping", "cruise"],
    nonprofit: ["charity", "nonprofit", "non-profit", "ngo", "foundation", "community", "volunteer", "food bank", "shelter", "church", "mosque", "temple", "synagogue"],
    retail: ["shop", "store", "boutique", "retail", "gift", "jewel", "clothing", "fashion", "furniture", "bookshop", "toy store", "pharmacy", "optician"],

    // ── Generic fallback. Anything office-based lands here. ──
    office: ["account", "bookkeep", "consult", "agency", "insurance", "financial", "b2b", "saas", "software", "startup", "recruit", "staffing", "marketing", "logistics", "freight", "printing", "signage", "it support", "cyber", "web design", "seo", "medical", "doctor", "clinic", "health"],
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
