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
export function baseStylesheet(archetype) {
    const t = tokensFor(archetype);
    const vars = Object.entries(t.tokens).map(([k, v]) => `  ${k}: ${v};`).join("\n");

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
    // Trades and home services: warm, grounded, trustworthy. Never dark luxury.
    { archetype: "Organic", words: ["landscap", "lawn", "garden", "tree service", "roof", "fence", "deck", "patio", "pool", "pest control", "cleaning", "pressure wash", "window clean", "hvac", "plumb", "electric", "handyman", "remodel", "renovation", "contractor", "construction", "siding", "gutter", "solar", "moving", "junk removal"] },
    // Professional and financial services: credible, conservative.
    { archetype: "Corporate", words: ["law firm", "attorney", "lawyer", "legal", "accounting", "accountant", "bookkeep", "insurance", "financial", "mortgage", "real estate", "realtor", "consulting", "consultant", "b2b", "logistics", "staffing", "recruit"] },
    // Hospitality and premium personal services: this is where Luxury belongs.
    { archetype: "Luxury", words: ["fine dining", "restaurant", "steakhouse", "bistro", "brasserie", "wine", "cocktail", "med spa", "medspa", "day spa", "jewel", "boutique hotel", "resort", "aesthetic clinic", "luxury"] },
    // Family-facing and food: approachable and bright.
    { archetype: "Playful", words: ["bakery", "cafe", "café", "coffee", "food truck", "ice cream", "pizza", "kids", "children", "daycare", "preschool", "pet ", "dog ", "grooming", "veterinar", "toy", "party", "birthday"] },
    // Creative portfolios: type-led.
    { archetype: "Editorial", words: ["photograph", "portfolio", "designer", "studio", "architect", "gallery", "magazine", "writer", "film", "video production"] },
    // Health and fitness: clean and energetic.
    { archetype: "Minimal", words: ["dental", "dentist", "orthodont", "chiropract", "physio", "therap", "clinic", "medical", "doctor", "gym", "fitness", "yoga", "pilates", "personal train", "wellness"] },
    // Technology.
    { archetype: "Futuristic", words: ["saas", "software", "app development", "ai ", "crypto", "blockchain", "cyber", "data platform", "developer tool", "api "] },
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
