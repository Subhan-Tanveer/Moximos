// Single source of truth for per-page SEO. Used at runtime (useSeo keeps the
// title/description/canonical right during client-side navigation) and at build
// time (scripts/prerender-seo.mjs writes a real HTML file per route so crawlers
// get unique tags and readable content without running any JavaScript).
export const SITE = {
    url: "https://moximos.com",
    name: "Moximos",
    tagline: "AI website builder and lead outreach for web agencies",
    image: "https://moximos.com/og-image.png",
};

export const PAGES = {
    "/": {
        title: "Moximos — AI Website Builder & Lead Outreach for Agencies",
        description:
            "Moximos finds local businesses with no website, builds each one a custom AI-generated site in minutes, and emails it from your inbox. Land web design clients on autopilot.",
        h1: "Send them their website before you ever say hello.",
        lede: "Moximos finds the businesses that need a website, builds each one a custom site with AI, and emails it to them from your inbox. You just take the calls.",
        priority: "1.0",
        points: [
            "Lead Explorer scrapes Google Maps for 4-star+ businesses with 50+ reviews and no website or a poor one.",
            "The AI Website Builder writes a custom, mobile-ready site for each lead in about four minutes.",
            "Outreach Automation sends each site from your own Gmail, at a human pace, with replies coming straight to you.",
        ],
    },
    "/how-it-works": {
        title: "How Moximos Works — Find Leads, Build Sites, Send Outreach",
        description:
            "Three automated stages take you from an empty list to a booked call: scrape local leads, auto-build a custom website for each, and send it from your own inbox.",
        h1: "Three stages. One button. No cold calls.",
        lede: "Each stage hands off to the next automatically. You set the city and the niche, and the pipeline runs from an empty list to a booked call without you in the middle of it.",
        priority: "0.9",
        points: [
            "Stage 1 — Scrape: pick a city and a niche and Moximos pulls qualified local businesses.",
            "Stage 2 — Build: an AI agent plans, writes and validates a custom website for every lead.",
            "Stage 3 — Send: the finished site is emailed to the owner from your own Gmail address.",
        ],
    },
    "/ai-website-builder": {
        title: "AI Website Builder — Custom Sites for Every Lead in Minutes",
        description:
            "Not a template. A multi-agent AI reads the business, plans the architecture, writes every component and validates the code — one custom website per prospect in about four minutes.",
        h1: "A real site for every lead, in about four minutes.",
        lede: "A multi-agent system reads the business, plans the architecture, writes every component, and validates the code before it ships — one custom site per prospect, at a scale no human agency can match.",
        priority: "0.9",
        points: [
            "Every site is generated from the business's own details, not dropped into a shared template.",
            "Code is validated before it ships so pages load fast and work on mobile.",
            "Edit any site in plain English inside the builder — no code required.",
        ],
    },
    "/lead-explorer": {
        title: "Lead Explorer — Find Local Businesses That Need a Website",
        description:
            "Search any city and niche for highly rated local businesses with no website or an outdated one. Filter by rating, review count and site quality, then build their site in one click.",
        h1: "Businesses that already have customers, and nowhere to send them.",
        lede: "Every result is rated 4 stars or higher with 50+ reviews, and every one of them is either missing a website or running something that's costing them work.",
        priority: "0.8",
        points: [
            "Search by city and niche: roofing, dental, HVAC, landscaping, auto repair, med spas and more.",
            "Filter by rating, review count and whether the site is missing, slow or not mobile-friendly.",
            "Send any lead straight into the AI builder.",
        ],
    },
    "/outreach": {
        title: "Outreach Automation — Email Websites From Your Own Gmail",
        description:
            "Connect Gmail once and every site the AI builds is delivered to the business it was built for — from your address, at a human pace, with replies landing in your inbox.",
        h1: "The pitch sends itself, from your own inbox.",
        lede: "From then on, every site the AI builds gets delivered to the business it was built for — from your address, at a human pace, with replies coming straight back to you.",
        priority: "0.8",
        points: [
            "Messages send from your own Gmail with your reply-to address.",
            "Sending is throttled and spaced so it behaves like a person, not a blast.",
            "Reply tracking and a booked-call inbox keep every conversation in one place.",
        ],
    },
    "/showcase": {
        title: "Showcase — Real Before & After Websites Built by Moximos",
        description:
            "See Google Maps listings with great reviews and no real website, and what Moximos published for each of them minutes later. Scroll each one from before to after.",
        h1: "Same business. Four minutes apart.",
        lede: "Every one of these was a Google Maps listing with great reviews and no website worth visiting. Scroll each one to wipe from what they had to what Moximos published for them.",
        priority: "0.8",
        points: ["Before-and-after examples across roofing, dental, HVAC, landscaping and more."],
    },
    "/pricing": {
        title: "Pricing — Moximos Plans From $97/month",
        description:
            "One subscription, as many clients as you want. Launch $97, Orbit $297, Constellation $697 per month. Includes lead scraping, AI-built sites and Gmail outreach.",
        h1: "One subscription. However many clients you want.",
        lede: "Moximos is your cost of production, not a per-site fee. What you charge on top of it is entirely your call.",
        priority: "0.9",
        points: [],
    },
    "/about": {
        title: "About Moximos — Built by Agency Owners Who Hated Cold Calling",
        description:
            "Moximos started as a workaround for a problem its founders had themselves: the only outreach that ever worked took too long to do at scale. Here is why we built it.",
        h1: "We built the thing we wished existed when we were the ones cold calling.",
        lede: "Moximos started as a workaround for a problem we had ourselves: the only outreach that ever worked was the kind that took too long to do at scale.",
        priority: "0.6",
        points: [],
    },
    "/contact": {
        title: "Contact Moximos — Talk to the Team",
        description: "Questions about Moximos, plans or onboarding? Get in touch and the founders will reply.",
        h1: "Talk to the people who built it.",
        lede: "Questions about plans, onboarding or the builder? Send a message and we will get back to you.",
        priority: "0.7",
        points: [],
    },
};

// Pages that must never be indexed.
export const NOINDEX_PREFIXES = ["/app", "/login", "/signup"];

export function seoFor(pathname) {
    const clean = pathname.replace(/\/+$/, "") || "/";
    if (NOINDEX_PREFIXES.some((p) => clean === p || clean.startsWith(p + "/"))) {
        return { noindex: true, title: "Moximos", description: PAGES["/"].description, path: clean };
    }
    const page = PAGES[clean];
    if (!page) {
        return { noindex: true, title: "Page not found — Moximos", description: PAGES["/"].description, path: clean };
    }
    return { ...page, path: clean, noindex: false };
}
