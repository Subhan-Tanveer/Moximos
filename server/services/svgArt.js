/*
 * Generated SVG art.
 *
 * The reference sites the client keeps pointing at (pleurat.com's hand-drawn
 * city strip, saifullah.dev's vector scenes, visitmeatopia.com's 70 bespoke
 * SVGs) share one thing: their visual identity comes from ILLUSTRATION, not
 * photography. That is why they look authored and a stock-photo page looks
 * generic, and it is the single biggest remaining gap in what this builder
 * produces.
 *
 * Commissioning illustration costs money and a model cannot draw. But a lot
 * of that character is procedural — skylines, contour lines, grain, meshes,
 * dot fields are all just geometry. So they are generated here, in code, for
 * free, and they inherit the project's palette through CSS custom properties
 * rather than hardcoded colour.
 *
 * Everything is DETERMINISTIC. A seeded PRNG (never Math.random) means the
 * same business always gets the same artwork — regenerating a project doesn't
 * silently reshuffle its identity, and a page can be reproduced exactly.
 */

/** Mulberry32 — small, fast, seeded. Same seed, same art, forever. */
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Stable seed from a string, so "Verdant Landscaping" always draws the same. */
export function seedFrom(str = "") {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

const r2 = (n) => Math.round(n * 100) / 100;

/*
 * A city/village skyline strip — the pleurat.com device. Buildings, trees,
 * lamps and benches along a ground line, drawn as flat outlines so it reads
 * as an illustration rather than clip-art. Every element is placed by the
 * seeded PRNG, so each business gets a different but equally coherent street.
 */
export function skylineStrip(seed, { width = 1600, height = 220 } = {}) {
    const rand = rng(seed);
    const parts = [];
    const ground = height - 28;
    let x = 10;

    while (x < width - 60) {
        const kind = rand();
        if (kind < 0.52) {
            // Building with a window grid.
            const w = 46 + Math.floor(rand() * 60);
            const h = 60 + Math.floor(rand() * 110);
            const y = ground - h;
            parts.push(`<rect x="${r2(x)}" y="${r2(y)}" width="${w}" height="${h}" rx="2"/>`);
            const cols = Math.max(2, Math.floor(w / 18));
            const rows = Math.max(2, Math.floor(h / 22));
            for (let c = 0; c < cols; c++) {
                for (let rw = 0; rw < rows; rw++) {
                    if (rand() < 0.32) continue; // some windows unlit — avoids a mechanical grid
                    parts.push(
                        `<rect x="${r2(x + 7 + c * (w / cols))}" y="${r2(y + 9 + rw * (h / rows))}" width="6" height="8" rx="1" opacity=".55"/>`
                    );
                }
            }
            x += w + 12 + Math.floor(rand() * 16);
        } else if (kind < 0.72) {
            // Tree: trunk + canopy.
            const th = 34 + Math.floor(rand() * 26);
            const rad = 13 + Math.floor(rand() * 9);
            parts.push(`<rect x="${r2(x + rad - 2)}" y="${r2(ground - th)}" width="4" height="${th}" rx="2"/>`);
            parts.push(`<circle cx="${r2(x + rad)}" cy="${r2(ground - th - rad + 4)}" r="${rad}" opacity=".85"/>`);
            x += rad * 2 + 16 + Math.floor(rand() * 14);
        } else if (kind < 0.85) {
            // Street lamp.
            const lh = 52 + Math.floor(rand() * 22);
            parts.push(`<rect x="${r2(x)}" y="${r2(ground - lh)}" width="3" height="${lh}" rx="1.5"/>`);
            parts.push(`<circle cx="${r2(x + 1.5)}" cy="${r2(ground - lh - 3)}" r="5" opacity=".7"/>`);
            x += 26 + Math.floor(rand() * 20);
        } else {
            // Bench.
            parts.push(`<rect x="${r2(x)}" y="${r2(ground - 16)}" width="34" height="4" rx="2"/>`);
            parts.push(`<rect x="${r2(x + 3)}" y="${r2(ground - 12)}" width="3" height="12"/>`);
            parts.push(`<rect x="${r2(x + 28)}" y="${r2(ground - 12)}" width="3" height="12"/>`);
            x += 48 + Math.floor(rand() * 22);
        }
    }

    return `<svg class="art art--skyline" viewBox="0 0 ${width} ${height}" fill="currentColor" role="presentation" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
  <g>${parts.join("")}</g>
  <rect x="0" y="${ground}" width="${width}" height="1.5" opacity=".45"/>
</svg>`;
}

/*
 * Topographic contour lines. Reads as considered, technical texture — good
 * behind a hero or as a section backdrop, and it costs nothing.
 */
export function topoLines(seed, { width = 1200, height = 600, rings = 9 } = {}) {
    const rand = rng(seed);
    const cx = width * (0.3 + rand() * 0.4);
    const cy = height * (0.35 + rand() * 0.3);
    const paths = [];

    for (let i = 1; i <= rings; i++) {
        const rx = (width / 12) * i * (0.9 + rand() * 0.25);
        const ry = (height / 9) * i * (0.85 + rand() * 0.3);
        const pts = [];
        const steps = 46;
        for (let s = 0; s <= steps; s++) {
            const a = (s / steps) * Math.PI * 2;
            const wob = 1 + Math.sin(a * (2 + (i % 3)) + i) * 0.06 + (rand() - 0.5) * 0.02;
            pts.push(`${r2(cx + Math.cos(a) * rx * wob)},${r2(cy + Math.sin(a) * ry * wob)}`);
        }
        paths.push(`<polygon points="${pts.join(" ")}" fill="none" stroke="currentColor" stroke-width="1" opacity="${r2(0.34 - i * 0.025)}"/>`);
    }

    return `<svg class="art art--topo" viewBox="0 0 ${width} ${height}" role="presentation" aria-hidden="true" preserveAspectRatio="xMidYMid slice">${paths.join("")}</svg>`;
}

/*
 * Soft gradient mesh — several blurred blobs in the accent colour. The cheap,
 * free stand-in for the ambient colour wash on a modern product site.
 */
export function gradientMesh(seed, { width = 1200, height = 800, blobs = 4 } = {}) {
    const rand = rng(seed);
    const shapes = [];
    for (let i = 0; i < blobs; i++) {
        const cx = width * (0.1 + rand() * 0.8);
        const cy = height * (0.1 + rand() * 0.8);
        const rr = Math.min(width, height) * (0.22 + rand() * 0.28);
        const fill = i % 2 === 0 ? "var(--accent)" : "var(--text-muted)";
        shapes.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(rr)}" fill="${fill}" opacity="${r2(0.2 + rand() * 0.18)}"/>`);
    }
    return `<svg class="art art--mesh" viewBox="0 0 ${width} ${height}" role="presentation" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
  <defs><filter id="mesh-blur-${seed % 9999}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="70"/></filter></defs>
  <g filter="url(#mesh-blur-${seed % 9999})">${shapes.join("")}</g>
</svg>`;
}

/*
 * Film grain via feTurbulence. One of the highest ratios of perceived
 * craft to effort available — it stops large flat colour areas reading as
 * "unfinished CSS" and makes a page feel printed.
 */
export function grainOverlay(seed) {
    const id = `grain-${seed % 9999}`;
    return `<svg class="art art--grain" role="presentation" aria-hidden="true" preserveAspectRatio="none">
  <defs><filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs>
  <rect width="100%" height="100%" filter="url(#${id})" opacity="0.05"/>
</svg>`;
}

/** Dotted grid — quiet structure behind content. */
export function dotGrid(seed, { gap = 26 } = {}) {
    const id = `dots-${seed % 9999}`;
    return `<svg class="art art--dots" role="presentation" aria-hidden="true">
  <defs><pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" opacity=".28"/></pattern></defs>
  <rect width="100%" height="100%" fill="url(#${id})"/>
</svg>`;
}

/** Diagonal stripe field — energy for the bolder archetypes. */
export function stripeField(seed, { gap = 14 } = {}) {
    const id = `stripes-${seed % 9999}`;
    return `<svg class="art art--stripes" role="presentation" aria-hidden="true">
  <defs><pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="2" height="${gap}" fill="currentColor" opacity=".22"/></pattern></defs>
  <rect width="100%" height="100%" fill="url(#${id})"/>
</svg>`;
}

/** Organic wave divider between sections. */
export function waveDivider(seed, { width = 1440, height = 90, flip = false } = {}) {
    const rand = rng(seed);
    const p1 = r2(width * (0.2 + rand() * 0.12));
    const p2 = r2(width * (0.55 + rand() * 0.12));
    const d = `M0,${height} C${p1},${r2(height * 0.15)} ${p2},${r2(height * 0.95)} ${width},${r2(height * 0.25)} L${width},${height} Z`;
    return `<svg class="art art--wave${flip ? " art--wave-flip" : ""}" viewBox="0 0 ${width} ${height}" role="presentation" aria-hidden="true" preserveAspectRatio="none"><path d="${d}" fill="currentColor"/></svg>`;
}

/*
 * Which artwork suits which archetype. Chosen so the art reinforces the
 * palette rather than fighting it — contour lines under a warm Organic
 * palette, stripes under Bold, a colour mesh under Futuristic.
 */
const ART_BY_ARCHETYPE = {
    Organic: { hero: "topo", band: "skyline", texture: "grain" },
    Luxury: { hero: "mesh", band: "skyline", texture: "grain" },
    Minimal: { hero: "dots", band: "skyline", texture: "none" },
    Corporate: { hero: "dots", band: "skyline", texture: "none" },
    Editorial: { hero: "topo", band: "skyline", texture: "grain" },
    Bold: { hero: "stripes", band: "skyline", texture: "none" },
    Playful: { hero: "mesh", band: "skyline", texture: "grain" },
    Futuristic: { hero: "mesh", band: "topo", texture: "grain" },
};

export function artFor(archetype, seed) {
    const spec = ART_BY_ARCHETYPE[archetype] || ART_BY_ARCHETYPE.Minimal;
    const pick = (kind, opts) => {
        switch (kind) {
            case "topo": return topoLines(seed, opts);
            case "mesh": return gradientMesh(seed, opts);
            case "dots": return dotGrid(seed, opts);
            case "stripes": return stripeField(seed, opts);
            case "skyline": return skylineStrip(seed, opts);
            case "grain": return grainOverlay(seed);
            default: return "";
        }
    };
    return {
        hero: pick(spec.hero),
        band: pick(spec.band),
        texture: pick(spec.texture),
        wave: waveDivider(seed),
    };
}

export const ART_CSS = `
/* Generated SVG art. Always decorative and always behind content: every
   piece is aria-hidden, pointer-events:none, and sits at a negative z-index
   so it can never intercept a click or be read aloud. */
.art { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.art--skyline { position: relative; inset: auto; height: auto; color: var(--text); opacity: .5; }
.art--topo { color: var(--accent); opacity: .5; }
.art--dots { color: var(--text-muted); opacity: .7; }
.art--stripes { color: var(--accent); }
.art--grain { mix-blend-mode: multiply; opacity: .9; }
.art--wave { position: relative; inset: auto; display: block; height: clamp(48px, 7vw, 90px); color: var(--surface); }
.art--wave-flip { transform: rotate(180deg); }

.art-host { position: relative; isolation: isolate; overflow: hidden; }
.art-host > *:not(.art) { position: relative; z-index: 1; }

/* The skyline band: an illustrated strip that separates major sections. */
.skyline-band { overflow: hidden; padding-top: clamp(2rem, 5vw, 4rem); }
.skyline-band .art--skyline { width: 100%; min-width: 900px; }
@media (max-width: 700px) { .skyline-band { overflow-x: hidden; } }
`;
