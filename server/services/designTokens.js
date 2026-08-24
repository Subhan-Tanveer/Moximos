/*
 * Design tokens per style archetype.
 *
 * This is the first half of the section-library architecture. The problem it
 * solves: asking a 30B model to invent an entire page's visual language on
 * every generation produces competent-but-generic output at best, and the
 * failures we measured at worst (a header styled with utilities the page
 * never loaded, an H1 at 72px on a phone, sections of empty black).
 *
 * The fix is to stop asking. Colour, type, spacing, radius and shadow are
 * decided HERE, by hand, once per archetype — so every generated page
 * inherits a coherent palette and a real type scale no matter what the model
 * does. The model's job shrinks to what it is genuinely good at: choosing
 * which sections a business needs and writing the copy that goes in them.
 *
 * Every token set is a complete, self-consistent design: background, two
 * surface levels, a text ramp, one accent (plus a hover state), border
 * colour, and a font pairing that actually exists on Google Fonts.
 */

export const DESIGN_TOKENS = {
    Luxury: {
        fonts: { display: "'Playfair Display', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
        googleFonts: "Playfair+Display:wght@500;600;700&family=Inter:wght@300;400;500;600",
        tokens: {
            "--bg": "#0b0b0c",
            "--surface": "#131315",
            "--surface-2": "#1b1b1f",
            "--text": "#f4f2ee",
            "--text-muted": "#a8a29a",
            "--accent": "#c9a227",
            "--accent-hover": "#e0b93b",
            "--accent-contrast": "#0b0b0c",
            "--border": "#2a2a2e",
            "--radius": "4px",
            "--radius-lg": "8px",
            "--shadow": "0 20px 60px -20px rgba(0,0,0,.7)",
        },
    },
    Minimal: {
        fonts: { display: "'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
        googleFonts: "Inter:wght@300;400;500;600;700",
        tokens: {
            "--bg": "#ffffff",
            "--surface": "#fafafa",
            "--surface-2": "#f4f4f5",
            "--text": "#18181b",
            "--text-muted": "#71717a",
            "--accent": "#18181b",
            "--accent-hover": "#3f3f46",
            "--accent-contrast": "#ffffff",
            "--border": "#e4e4e7",
            "--radius": "8px",
            "--radius-lg": "16px",
            "--shadow": "0 1px 3px rgba(0,0,0,.06)",
        },
    },
    Bold: {
        fonts: { display: "'Archivo Black', Impact, sans-serif", body: "'Inter', system-ui, sans-serif" },
        googleFonts: "Archivo+Black&family=Inter:wght@400;600;700",
        tokens: {
            "--bg": "#fffdf7",
            "--surface": "#ffffff",
            "--surface-2": "#ffe94d",
            "--text": "#0a0a0a",
            "--text-muted": "#3f3f46",
            "--accent": "#ff4d17",
            "--accent-hover": "#e03d0c",
            "--accent-contrast": "#ffffff",
            "--border": "#0a0a0a",
            "--radius": "0px",
            "--radius-lg": "0px",
            "--shadow": "6px 6px 0 #0a0a0a",
        },
    },
    Organic: {
        fonts: { display: "'Fraunces', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
        googleFonts: "Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@300;400;500;600",
        tokens: {
            "--bg": "#faf6f0",
            "--surface": "#ffffff",
            "--surface-2": "#f0e9df",
            "--text": "#2c2416",
            "--text-muted": "#7a6a55",
            "--accent": "#5f7a4f",
            "--accent-hover": "#4c6440",
            "--accent-contrast": "#ffffff",
            "--border": "#e2d8c9",
            "--radius": "16px",
            "--radius-lg": "28px",
            "--shadow": "0 12px 40px -12px rgba(92,74,48,.22)",
        },
    },
    Corporate: {
        fonts: { display: "'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
        googleFonts: "Inter:wght@400;500;600;700;800",
        tokens: {
            "--bg": "#ffffff",
            "--surface": "#f8fafc",
            "--surface-2": "#f1f5f9",
            "--text": "#0f172a",
            "--text-muted": "#64748b",
            "--accent": "#1d4ed8",
            "--accent-hover": "#1e40af",
            "--accent-contrast": "#ffffff",
            "--border": "#e2e8f0",
            "--radius": "8px",
            "--radius-lg": "14px",
            "--shadow": "0 4px 16px -4px rgba(15,23,42,.10)",
        },
    },
    Futuristic: {
        fonts: { display: "'Space Grotesk', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
        googleFonts: "Space+Grotesk:wght@500;600;700&family=Inter:wght@300;400;500",
        tokens: {
            "--bg": "#07080d",
            "--surface": "#0e1018",
            "--surface-2": "#151824",
            "--text": "#e8ecf6",
            "--text-muted": "#8b94ad",
            "--accent": "#4de2f7",
            "--accent-hover": "#7cebfb",
            "--accent-contrast": "#07080d",
            "--border": "#1e2334",
            "--radius": "10px",
            "--radius-lg": "18px",
            "--shadow": "0 0 40px -10px rgba(77,226,247,.28)",
        },
    },
    Editorial: {
        fonts: { display: "'Libre Baskerville', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
        googleFonts: "Libre+Baskerville:wght@400;700&family=Inter:wght@300;400;500",
        tokens: {
            "--bg": "#fffefb",
            "--surface": "#ffffff",
            "--surface-2": "#f5f3ee",
            "--text": "#141414",
            "--text-muted": "#5c5c5c",
            "--accent": "#a8322d",
            "--accent-hover": "#8a2724",
            "--accent-contrast": "#ffffff",
            "--border": "#e0ddd5",
            "--radius": "2px",
            "--radius-lg": "4px",
            "--shadow": "0 2px 12px rgba(0,0,0,.06)",
        },
    },
    Playful: {
        fonts: { display: "'Poppins', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
        googleFonts: "Poppins:wght@600;700;800&family=Inter:wght@400;500;600",
        tokens: {
            "--bg": "#fffaf3",
            "--surface": "#ffffff",
            "--surface-2": "#ffeede",
            "--text": "#1f1235",
            "--text-muted": "#6b5b83",
            "--accent": "#f2542d",
            "--accent-hover": "#d94420",
            "--accent-contrast": "#ffffff",
            "--border": "#f0e2d2",
            "--radius": "20px",
            "--radius-lg": "32px",
            "--shadow": "0 14px 40px -14px rgba(242,84,45,.35)",
        },
    },
};

// Archetypes without a bespoke token set fall back to the nearest sibling
// rather than to something arbitrary.
const ALIASES = { Glass: "Futuristic", Retro: "Organic" };

export function tokensFor(archetype) {
    const key = DESIGN_TOKENS[archetype] ? archetype : ALIASES[archetype] || "Minimal";
    return { name: key, ...DESIGN_TOKENS[key] };
}

/**
 * The base stylesheet every generated page gets: the archetype's tokens, a
 * fluid type scale, container/section rhythm, and the button/link primitives.
 *
 * Written by hand, so it is correct by construction — clamp() type that fits
 * a 375px phone, a container that never causes horizontal scroll, and a
 * reduced-motion block. None of this is left to the model any more.
 */
export function baseStylesheet(archetype, brand = "") {
    const t = tokensFor(archetype);
    // The accent varies per brand so two businesses of the same type don't
    // come out as the same website with different words. Everything else in
    // the palette stays fixed — background, text and surfaces are what
    // guarantee contrast, and those are not up for variation.
    const accent = accentFor(t.name, brand);
    const tokens = accent ? { ...t.tokens, "--accent": accent[0], "--accent-hover": accent[1] } : t.tokens;
    const vars = Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join("\n");

    return `@import url('https://fonts.googleapis.com/css2?family=${t.googleFonts}&display=swap');

:root {
${vars}
  --font-display: ${t.fonts.display};
  --font-body: ${t.fonts.body};
  --container: 1200px;
  --gutter: clamp(1.25rem, 4vw, 2.5rem);
}

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 1.0625rem;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
img { max-width: 100%; height: auto; display: block; }
a { color: inherit; text-decoration: none; }

/* Fluid type scale — sized so the display face fits a 375px screen and
   still commands a 1440px one, without a media query in sight. */
h1, h2, h3 { font-family: var(--font-display); font-weight: 600; line-height: 1.08; margin: 0 0 .5em; letter-spacing: -0.02em; }
h1 { font-size: clamp(2.5rem, 7vw, 4.75rem); }
h2 { font-size: clamp(1.875rem, 4.5vw, 3rem); }
h3 { font-size: clamp(1.25rem, 2.2vw, 1.6rem); line-height: 1.25; }
p  { margin: 0 0 1.15em; max-width: 68ch; }
.lede { font-size: clamp(1.0625rem, 1.6vw, 1.3rem); color: var(--text-muted); }
.eyebrow {
  font-family: var(--font-body);
  font-size: .75rem; font-weight: 600;
  letter-spacing: .18em; text-transform: uppercase;
  color: var(--accent); margin: 0 0 1rem;
}

.container { width: 100%; max-width: var(--container); margin-inline: auto; padding-inline: var(--gutter); }
.section { padding-block: clamp(4rem, 9vw, 8rem); }
.section--tight { padding-block: clamp(3rem, 6vw, 5rem); }
.section--surface { background: var(--surface); }
.section--surface2 { background: var(--surface-2); }

.grid { display: grid; gap: clamp(1.25rem, 2.5vw, 2rem); }
.grid--2 { grid-template-columns: 1fr; }
.grid--3 { grid-template-columns: 1fr; }
@media (min-width: 700px)  { .grid--2 { grid-template-columns: repeat(2, 1fr); } .grid--3 { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1000px) { .grid--3 { grid-template-columns: repeat(3, 1fr); } }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
  padding: .95rem 1.9rem;
  font-family: var(--font-body); font-size: .975rem; font-weight: 600;
  border-radius: var(--radius); border: 1px solid transparent;
  cursor: pointer; transition: transform .2s ease, background-color .2s ease, color .2s ease, box-shadow .2s ease;
}
.btn--primary { background: var(--accent); color: var(--accent-contrast); }
.btn--primary:hover { background: var(--accent-hover); transform: translateY(-2px); }
.btn--ghost { border-color: var(--border); color: var(--text); }
.btn--ghost:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-2px); }

.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: clamp(1.5rem, 3vw, 2rem);
  box-shadow: var(--shadow);
  transition: transform .3s ease, border-color .3s ease;
}
.card:hover { transform: translateY(-4px); border-color: var(--accent); }

/* Scroll reveal. The END state is the visible one and the fallback is
   visible too, so content can never be stranded invisible if JS fails. */
.reveal { opacity: 1; transform: none; }
.js .reveal { opacity: 0; transform: translateY(18px); transition: opacity .7s ease, transform .7s ease; }
.js .reveal.is-visible { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; }
  .js .reveal { opacity: 1 !important; transform: none !important; }
}
`;
}

/*
 * Deterministic archetype selection.
 *
 * The content-plan prompt tells the model which archetype suits which kind of
 * business ("trades and local services → Organic or Corporate"). Measured
 * across three runs on an identical landscaping prompt, it chose Luxury twice
 * — near-black and gold for a Portland yard-care company, which reads wrong
 * and undercuts the trust a local trade needs.
 *
 * Visual direction is too important to leave advisory. Where the business
 * type is unambiguous, it is decided here; where it isn't, the model's choice
 * stands. This is the same principle applied to images: tell the model, then
 * enforce it in code.
 */
const ARCHETYPE_BY_INDUSTRY = [
    // Trades and home services: warm, grounded, trustworthy. Never dark luxury —
    // a homeowner choosing a roofer is buying reliability, not glamour.
    { archetype: "Organic", words: ["landscap", "lawn", "garden", "tree surgeon", "arborist", "roof", "fence", "deck", "patio", "paving", "driveway", "pool", "pest control", "cleaning", "cleaner", "pressure wash", "window clean", "carpet clean", "chimney", "hvac", "heating", "boiler", "plumb", "electrician", "handyman", "remodel", "renovation", "contractor", "construction", "builder", "carpentry", "carpenter", "joinery", "flooring", "tiling", "plaster", "painter", "decorator", "siding", "gutter", "solar", "removals", "man and van", "movers", "moving company", "junk removal", "waste removal", "locksmith", "farm", "nursery garden", "florist"] },

    // Professional and financial: credible, conservative, unflashy.
    { archetype: "Corporate", words: ["law firm", "attorney", "lawyer", "legal", "solicitor", "barrister", "notary", "conveyancing", "account", "bookkeep", "insurance", "financial", "mortgage", "wealth", "real estate", "realtor", "estate agent", "letting", "surveyor", "consult", "b2b", "logistics", "freight", "staffing", "recruit", "it support", "cyber", "managed service", "franchise", "funeral", "storage"] },

    // Hospitality and premium personal services: this is where Luxury belongs.
    { archetype: "Luxury", words: ["fine dining", "restaurant", "steakhouse", "bistro", "brasserie", "wine", "winery", "cocktail", "whisky", "med spa", "medspa", "day spa", "aesthetic clinic", "jewel", "boutique hotel", "hotel", "resort", "spa", "luxury", "bridal", "limousine", "chauffeur", "yacht", "interior design", "architect"] },

    // Family-facing, food and pets: approachable and bright.
    { archetype: "Playful", words: ["bakery", "cafe", "café", "coffee", "food truck", "ice cream", "pizza", "burger", "donut", "doughnut", "candy", "kids", "children", "childcare", "daycare", "preschool", "nursery", "kindergarten", "montessori", "nanny", "babysit", "soft play", "party", "balloon", "entertainer", "toy", "pet", "dog", "cat", "veterinar", "grooming", "kennel", "animal", "birthday"] },

    // Creative and portfolio work: type-led, editorial.
    { archetype: "Editorial", words: ["photograph", "videograph", "portfolio", "designer", "design studio", "creative studio", "architect", "gallery", "magazine", "writer", "copywriter", "film", "video production", "tattoo", "barber", "art", "ceramics", "furniture maker", "bespoke", "atelier", "music", "band", "recording studio", "record label"] },

    // Health, fitness and clinical: clean, calm, uncluttered.
    { archetype: "Minimal", words: ["dental", "dentist", "orthodont", "chiropract", "physio", "therap", "counsel", "clinic", "medical", "doctor", "optician", "pharmacy", "gym", "fitness", "yoga", "pilates", "personal train", "crossfit", "martial arts", "boxing", "climbing", "swim", "wellness", "nutrition", "dietitian", "massage", "acupuncture"] },

    // Technology and anything selling a product rather than a service.
    { archetype: "Futuristic", words: ["saas", "software", "app development", "platform", "crypto", "blockchain", "web3", "data", "developer tool", "api", "devops", "infrastructure", "automation", "robotics", "drone", "esports", "gaming"] },

    // Loud, high-energy, youth-facing.
    { archetype: "Bold", words: ["skate", "streetwear", "sneaker", "energy drink", "nightclub", "festival", "brewery", "taproom", "vape", "airsoft", "paintball", "go kart", "trampoline"] },
];

/**
 * Returns the archetype an unambiguous business type demands, or null when
 * nothing matches confidently and the model's own choice should stand.
 */
export function archetypeForBusiness(prompt) {
    const text = (prompt || "").toLowerCase();
    for (const { archetype, words } of ARCHETYPE_BY_INDUSTRY) {
        if (words.some((w) => text.includes(w))) return archetype;
    }
    return null;
}

/*
 * Accent variation within an archetype.
 *
 * Every business of the same type was coming out the same colour, so two
 * roofers looked like the same website with different words — reported as
 * "it always uses the same template and same design".
 *
 * Each archetype now carries several accents that all work against its
 * background, chosen by a hash of the brand name. That means variety between
 * businesses but STABILITY for one business: regenerating "David Tulloch
 * Roofing" always produces the same green, so a client never sees their brand
 * colour change under them.
 *
 * Only the accent moves. Background, text and surfaces stay fixed, because
 * those are what guarantee contrast — letting a model or a hash loose on the
 * whole palette is how you get unreadable pages.
 */
const ACCENT_VARIANTS = {
    Luxury:     [["#c9a227", "#e0b93b"], ["#b08d57", "#c9a86c"], ["#9a8c98", "#b3a5b1"], ["#a63d40", "#c14f52"]],
    Minimal:    [["#18181b", "#3f3f46"], ["#1d4ed8", "#1e40af"], ["#0f766e", "#0d5f59"], ["#b91c1c", "#991b1b"]],
    Bold:       [["#ff4d17", "#e03d0c"], ["#0047ff", "#0038cc"], ["#ff2d87", "#e0246f"], ["#00a878", "#008c63"]],
    Organic:    [["#5f7a4f", "#4c6440"], ["#8a6a3f", "#6f5533"], ["#3f6f6a", "#325854"], ["#8c5a3c", "#714830"]],
    Corporate:  [["#1d4ed8", "#1e40af"], ["#0f766e", "#0d5f59"], ["#4338ca", "#3730a3"], ["#0369a1", "#075985"]],
    Futuristic: [["#4de2f7", "#7cebfb"], ["#a78bfa", "#c4b5fd"], ["#34d399", "#6ee7b7"], ["#fb7185", "#fda4af"]],
    Editorial:  [["#a8322d", "#8a2724"], ["#1f4e5f", "#173c49"], ["#5b3a86", "#472d69"], ["#2f6b3f", "#255432"]],
    Playful:    [["#f2542d", "#d94420"], ["#7c3aed", "#6d28d9"], ["#0ea5e9", "#0284c7"], ["#e11d74", "#c0165f"]],
};

/**
 * Deterministic accent for a brand: same name always yields the same colour.
 */
export function accentFor(archetype, brand = "") {
    const list = ACCENT_VARIANTS[archetype];
    if (!list || list.length === 0) return null;
    let h = 2166136261;
    for (let i = 0; i < brand.length; i++) {
        h ^= brand.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return list[(h >>> 0) % list.length];
}
