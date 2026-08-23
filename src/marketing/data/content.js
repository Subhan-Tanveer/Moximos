/**
 * Marketing copy and sample data.
 *
 * Kept out of the page components so wording can be revised without touching
 * animation code. The Lead Explorer records are representative sample data
 * shaped exactly like real Google Maps scrape output.
 */

export const ENGINES = [
    {
        id: "scrape",
        index: "01",
        code: "LEAD ENGINE",
        title: "Scrape",
        headline: "Find businesses already winning offline.",
        body: "Point it at a city and a niche. Moximos sweeps Google Maps and pulls every business rated 4 stars or higher with 50+ reviews — then filters down to the ones with no website, or one that's actively costing them money.",
        detail: "Proven demand. Weak online presence. The exact gap you get paid to close.",
        readouts: [
            { label: "Source", value: "Google Maps" },
            { label: "Min rating", value: "4.0★" },
            { label: "Min reviews", value: "50+" },
            { label: "Filter", value: "No / bad site" },
        ],
        tone: "ion",
    },
    {
        id: "build",
        index: "02",
        code: "AI WEBSITE BUILDER",
        title: "Build",
        headline: "Every lead gets a real site, not a pitch deck.",
        body: "A multi-agent AI system plans the architecture, writes the components, validates the code, and ships a fully custom animated website for that specific business — their name, their trade, their reviews, their photos.",
        detail: "Published live at moximos.com/theirbusiness. No login wall. They just click and see it.",
        readouts: [
            { label: "Agents", value: "Plan → Code → QA" },
            { label: "Build time", value: "~4 min" },
            { label: "Output", value: "Live URL" },
            { label: "Login required", value: "None" },
        ],
        tone: "violet",
    },
    {
        id: "send",
        index: "03",
        code: "OUTREACH ENGINE",
        title: "Send",
        headline: "The pitch sends itself, from your inbox.",
        body: "Connect your Gmail once. Moximos writes a short, human message, drops in the link to the site it just built for them, and sends it from your address — spaced and throttled so it lands like a person wrote it.",
        detail: "They open a website that already has their name on it. That's the entire pitch.",
        readouts: [
            { label: "Channel", value: "Your Gmail" },
            { label: "Sending", value: "Throttled" },
            { label: "Personalised", value: "Per business" },
            { label: "Reply-to", value: "You" },
        ],
        tone: "solar",
    },
];

export const HOME_STATS = [
    { value: "4 min", label: "Lead → live demo site", tone: "ion" },
    { value: "0", label: "Cold calls required", tone: "solar" },
    { value: "100%", label: "Custom per business", tone: "magenta" },
    { value: "24/7", label: "Pipeline running", tone: "starlight" },
];

export const NICHES = [
    "Roofing",
    "Dental",
    "HVAC",
    "Landscaping",
    "Med Spa",
    "Auto Repair",
    "Plumbing",
    "Law Firms",
    "Fencing",
    "Chiropractic",
    "Pool Service",
    "Electricians",
    "Barbershops",
    "Pest Control",
    "Remodeling",
    "Veterinary",
];

export const TESTIMONIALS = [
    {
        quote: "I sent 40 of these in a week. Six replies, three calls booked, two closed at $3,500 each. I have never once picked up a phone.",
        name: "Marcus Ellery",
        role: "Solo freelancer → 2-person studio",
        stat: "$7,000 in 9 days",
    },
    {
        quote: "The demo site is the whole trick. They're not reading a pitch, they're looking at their own business online for the first time. It closes itself.",
        name: "Priya Raghunathan",
        role: "Agency owner, 11 retainer clients",
        stat: "11 retainers",
    },
    {
        quote: "I run it on one city per week. Scrape Monday, builds run overnight, outreach goes Tuesday. The rest of the week I just take calls.",
        name: "Dylan Okafor",
        role: "Side hustle → full time in 5 months",
        stat: "5 months to full time",
    },
];

/* ── Lead Explorer sample data ───────────────────────────────── */

export const LEAD_CITIES = ["Austin, TX", "Phoenix, AZ", "Tampa, FL", "Denver, CO", "Nashville, TN"];

export const LEAD_NICHES = ["Roofing", "Dental", "HVAC", "Landscaping", "Auto Repair", "Med Spa"];

export const SAMPLE_LEADS = [
    { name: "Hill Country Roofing Co.", niche: "Roofing", city: "Austin, TX", rating: 4.9, reviews: 214, site: "none", phone: "(512) 555-0148", years: 12 },
    { name: "Barton Creek Family Dental", niche: "Dental", city: "Austin, TX", rating: 4.8, reviews: 389, site: "bad", phone: "(512) 555-0192", years: 18 },
    { name: "Lone Star Air & Heat", niche: "HVAC", city: "Austin, TX", rating: 4.7, reviews: 156, site: "none", phone: "(512) 555-0173", years: 9 },
    { name: "Verde Lawn & Landscape", niche: "Landscaping", city: "Austin, TX", rating: 4.9, reviews: 97, site: "none", phone: "(512) 555-0126", years: 6 },
    { name: "Desert Ridge Roofing", niche: "Roofing", city: "Phoenix, AZ", rating: 4.6, reviews: 341, site: "bad", phone: "(602) 555-0117", years: 21 },
    { name: "Camelback Smile Studio", niche: "Dental", city: "Phoenix, AZ", rating: 5.0, reviews: 128, site: "none", phone: "(602) 555-0164", years: 4 },
    { name: "Sonoran Cooling Systems", niche: "HVAC", city: "Phoenix, AZ", rating: 4.8, reviews: 502, site: "bad", phone: "(602) 555-0139", years: 27 },
    { name: "Papago Auto Werks", niche: "Auto Repair", city: "Phoenix, AZ", rating: 4.9, reviews: 176, site: "none", phone: "(602) 555-0155", years: 14 },
    { name: "Bayshore Roofing Group", niche: "Roofing", city: "Tampa, FL", rating: 4.7, reviews: 88, site: "none", phone: "(813) 555-0181", years: 7 },
    { name: "Gulfside Dental Arts", niche: "Dental", city: "Tampa, FL", rating: 4.8, reviews: 267, site: "bad", phone: "(813) 555-0134", years: 16 },
    { name: "Palma Ceia Med Spa", niche: "Med Spa", city: "Tampa, FL", rating: 4.9, reviews: 143, site: "none", phone: "(813) 555-0109", years: 5 },
    { name: "Ybor Auto & Tire", niche: "Auto Repair", city: "Tampa, FL", rating: 4.6, reviews: 412, site: "bad", phone: "(813) 555-0177", years: 23 },
    { name: "Front Range Exteriors", niche: "Roofing", city: "Denver, CO", rating: 4.8, reviews: 195, site: "none", phone: "(303) 555-0142", years: 11 },
    { name: "Cherry Creek Dental", niche: "Dental", city: "Denver, CO", rating: 4.9, reviews: 331, site: "bad", phone: "(303) 555-0168", years: 19 },
    { name: "Mile High Heating & Air", niche: "HVAC", city: "Denver, CO", rating: 4.7, reviews: 121, site: "none", phone: "(303) 555-0153", years: 8 },
    { name: "Highlands Yard & Stone", niche: "Landscaping", city: "Denver, CO", rating: 5.0, reviews: 76, site: "none", phone: "(303) 555-0198", years: 3 },
    { name: "Music City Roof Works", niche: "Roofing", city: "Nashville, TN", rating: 4.8, reviews: 259, site: "bad", phone: "(615) 555-0121", years: 15 },
    { name: "Germantown Dental Care", niche: "Dental", city: "Nashville, TN", rating: 4.9, reviews: 184, site: "none", phone: "(615) 555-0176", years: 10 },
    { name: "Cumberland Comfort HVAC", niche: "HVAC", city: "Nashville, TN", rating: 4.6, reviews: 298, site: "bad", phone: "(615) 555-0145", years: 22 },
    { name: "Belle Meade Aesthetics", niche: "Med Spa", city: "Nashville, TN", rating: 4.9, reviews: 112, site: "none", phone: "(615) 555-0187", years: 6 },
    { name: "Zilker Pool & Patio", niche: "Landscaping", city: "Austin, TX", rating: 4.7, reviews: 64, site: "none", phone: "(512) 555-0111", years: 5 },
    { name: "Scottsdale Glow Med Spa", niche: "Med Spa", city: "Phoenix, AZ", rating: 4.8, reviews: 221, site: "bad", phone: "(602) 555-0193", years: 9 },
    { name: "Seminole Heights Motors", niche: "Auto Repair", city: "Tampa, FL", rating: 4.9, reviews: 137, site: "none", phone: "(813) 555-0159", years: 13 },
    { name: "Wash Park Landscaping", niche: "Landscaping", city: "Denver, CO", rating: 4.8, reviews: 105, site: "bad", phone: "(303) 555-0182", years: 17 },
];

/* ── Showcase before/after ───────────────────────────────────── */

export const SHOWCASE_ITEMS = [
    {
        business: "Hill Country Roofing Co.",
        niche: "Roofing",
        city: "Austin, TX",
        before: "No website. A Google Maps pin, 214 five-star reviews, and a phone number.",
        after: "Full site with hero video, service grid, review wall, instant quote form.",
        palette: ["#1B2A4A", "#4CE0FF", "#0A0A0F"],
        buildTime: "3m 51s",
    },
    {
        business: "Camelback Smile Studio",
        niche: "Dental",
        city: "Phoenix, AZ",
        before: "A Facebook page last updated in 2019, no booking, no hours.",
        after: "Clinic site with treatment pages, team bios, and online booking.",
        palette: ["#0E2E2A", "#5EE9C1", "#0A0A0F"],
        buildTime: "4m 12s",
    },
    {
        business: "Sonoran Cooling Systems",
        niche: "HVAC",
        city: "Phoenix, AZ",
        before: "A 2011 template site — broken layout on mobile, no way to contact.",
        after: "Emergency-first layout, service area map, click-to-call on every screen.",
        palette: ["#3A1B12", "#FFB84C", "#0A0A0F"],
        buildTime: "3m 28s",
    },
    {
        business: "Palma Ceia Med Spa",
        niche: "Med Spa",
        city: "Tampa, FL",
        before: "Instagram only. No pricing, no treatment list, no way to book.",
        after: "Editorial site with treatment menu, before/after gallery, booking flow.",
        palette: ["#2A1236", "#C23FDB", "#0A0A0F"],
        buildTime: "4m 40s",
    },
];

/* ── Pricing ─────────────────────────────────────────────────── */

export const PRICING_TIERS = [
    {
        name: "Launch",
        code: "TIER-01",
        price: 97,
        tagline: "Prove it works, in one city.",
        features: [
            "250 scraped leads / month",
            "25 AI-built demo sites / month",
            "1 connected Gmail account",
            "moximos.com/yourbusiness hosting",
            "Lead Explorer with all filters",
            "Email support",
        ],
        cta: "Start free",
        highlight: false,
    },
    {
        name: "Orbit",
        code: "TIER-02",
        price: 297,
        tagline: "The one people actually run an agency on.",
        features: [
            "2,000 scraped leads / month",
            "200 AI-built demo sites / month",
            "3 connected Gmail accounts",
            "Custom domain for demo sites",
            "Automated outreach sequences",
            "Reply tracking + booked-call inbox",
            "Priority build queue",
            "Priority support",
        ],
        cta: "Start free",
        highlight: true,
    },
    {
        name: "Constellation",
        code: "TIER-03",
        price: 697,
        tagline: "Run it as a team, or run it for clients.",
        features: [
            "Unlimited scraped leads",
            "1,000 AI-built demo sites / month",
            "10 connected Gmail accounts",
            "White-label demo sites + domains",
            "Team seats and shared pipelines",
            "API access",
            "Dedicated onboarding call",
            "Direct line to the founders",
        ],
        cta: "Talk to us",
        highlight: false,
    },
];

export const PRICING_FAQ = [
    {
        q: "Do I need to know how to design or code?",
        a: "No. The AI builds the site end to end — layout, copy, components, animation. You review it and send it. If you want to change something, you can edit it in the builder without touching code.",
    },
    {
        q: "Where do the demo sites live?",
        a: "Every site publishes instantly to moximos.com/thebusinessname, with no login wall in front of it. On Orbit and above you can point your own domain at them instead.",
    },
    {
        q: "Is the outreach sent from Moximos or from me?",
        a: "From you. You connect your own Gmail, and messages send from your address with your reply-to. Sending is throttled and spaced so it behaves like a person, not a blast.",
    },
    {
        q: "What do I charge my clients?",
        a: "Whatever you want — that's the point. Moximos is your cost of production. Subscribers commonly charge $1,500–$5,000 for a build, or $200–$800 a month on retainer.",
    },
    {
        q: "What counts as a 'bad' website?",
        a: "No mobile layout, no HTTPS, load times over four seconds, dead links, or nothing published since 2019. You can tune the thresholds in Lead Explorer.",
    },
    {
        q: "Can I cancel?",
        a: "Any time, from the dashboard. No call, no retention flow. Sites you've already published stay live through the end of your billing period.",
    },
];
