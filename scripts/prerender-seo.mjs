// Runs after `vite build`. For every public route it writes dist/<route>/index.html
// with that page's own <title>, description, canonical, Open Graph / Twitter tags,
// JSON-LD, and the page's real headline + copy inside #root. Crawlers (and link
// previews, which never run JavaScript) therefore see a complete page; React then
// replaces #root's contents on load exactly as before. Also writes sitemap.xml.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES, SITE } from "../src/seo/pages.js";
import { PRICING_TIERS, PRICING_FAQ } from "../src/marketing/data/content.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const template = fs.readFileSync(path.join(dist, "index.html"), "utf8");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const urlFor = (p) => SITE.url + (p === "/" ? "/" : p);
const NAV = Object.entries(PAGES).map(([p, v]) => ({ p, label: v.title.split(/ [—–-] /)[0] }));

function jsonLd(route, page) {
    const graph = [
        {
            "@type": "Organization",
            "@id": `${SITE.url}/#org`,
            name: SITE.name,
            url: SITE.url,
            logo: `${SITE.url}/logo.svg`,
        },
        {
            "@type": "WebSite",
            "@id": `${SITE.url}/#website`,
            url: SITE.url,
            name: SITE.name,
            publisher: { "@id": `${SITE.url}/#org` },
        },
        {
            "@type": "WebPage",
            "@id": `${urlFor(route)}#webpage`,
            url: urlFor(route),
            name: page.title,
            description: page.description,
            isPartOf: { "@id": `${SITE.url}/#website` },
        },
    ];
    if (route === "/" || route === "/ai-website-builder" || route === "/pricing") {
        graph.push({
            "@type": "SoftwareApplication",
            name: SITE.name,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: PAGES["/"].description,
            url: SITE.url,
            offers: PRICING_TIERS.map((t) => ({
                "@type": "Offer",
                name: t.name,
                price: String(t.price),
                priceCurrency: "USD",
                url: `${SITE.url}/pricing`,
            })),
        });
    }
    if (route === "/pricing") {
        graph.push({
            "@type": "FAQPage",
            mainEntity: PRICING_FAQ.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
        });
    }
    if (route !== "/") {
        graph.push({
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: SITE.url + "/" },
                { "@type": "ListItem", position: 2, name: page.h1, item: urlFor(route) },
            ],
        });
    }
    return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}

function body(route, page) {
    const points = page.points.map((t) => `<li>${esc(t)}</li>`).join("");
    const tiers =
        route === "/pricing"
            ? `<h2>Plans</h2><ul>${PRICING_TIERS.map(
                  (t) => `<li><strong>${esc(t.name)} — $${t.price}/month.</strong> ${esc(t.tagline)} ${t.features.map(esc).join("; ")}.</li>`
              ).join("")}</ul><h2>Frequently asked questions</h2>${PRICING_FAQ.map(
                  (f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`
              ).join("")}`
            : "";
    const links = NAV.map((n) => `<a href="${n.p}">${esc(n.label)}</a>`).join(" · ");
    return (
        `<main style="max-width:60rem;margin:0 auto;padding:6rem 1.25rem;font-family:system-ui,sans-serif;color:#e8e8f0;background:#050507">` +
        `<h1>${esc(page.h1)}</h1><p>${esc(page.lede)}</p>${points ? `<ul>${points}</ul>` : ""}${tiers}` +
        `<p><a href="/signup">Start free</a></p><nav aria-label="Site">${links}</nav></main>`
    );
}

function render(route, page) {
    const url = urlFor(route);
    const tags = [
        `<title>${esc(page.title)}</title>`,
        `<meta name="description" content="${esc(page.description)}" />`,
        `<meta name="robots" content="index, follow, max-image-preview:large" />`,
        `<link rel="canonical" href="${url}" />`,
        `<meta property="og:site_name" content="${SITE.name}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:title" content="${esc(page.title)}" />`,
        `<meta property="og:description" content="${esc(page.description)}" />`,
        `<meta property="og:image" content="${SITE.image}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${esc(page.title)}" />`,
        `<meta name="twitter:description" content="${esc(page.description)}" />`,
        `<meta name="twitter:image" content="${SITE.image}" />`,
        `<script type="application/ld+json">${jsonLd(route, page)}</script>`,
    ].join("\n        ");

    // Drop the generic head tags from the template so nothing is duplicated.
    let html = template
        .replace(/<title>[\s\S]*?<\/title>/, "")
        .replace(/<meta\s+name="description"[\s\S]*?\/>/, "")
        .replace(/<meta\s+property="og:[a-z:_]+"[\s\S]*?\/>/g, "")
        .replace(/<meta\s+name="twitter:[a-z:_]+"[\s\S]*?\/>/g, "")
        .replace(/<meta\s+name="robots"[\s\S]*?\/>/g, "")
        .replace(/<link\s+rel="canonical"[\s\S]*?\/>/g, "")
        .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");

    html = html.replace("</head>", `        ${tags}\n    </head>`);
    html = html.replace('<div id="root"></div>', `<div id="root">${body(route, page)}</div>`);
    return html;
}

// SPA fallback for everything that is not a prerendered public page (/login,
// /signup, /app/*, unknown URLs). Deliberately noindex with no canonical, so the
// home page's tags are never inherited by pages that should not be indexed.
const spa = template
    .replace(/<link\s+rel="canonical"[\s\S]*?\/>/g, "")
    .replace("</head>", `        <meta name="robots" content="noindex, nofollow" />\n    </head>`);
fs.writeFileSync(path.join(dist, "spa.html"), spa);

for (const [route, page] of Object.entries(PAGES)) {
    const html = render(route, page);
    const out = route === "/" ? path.join(dist, "index.html") : path.join(dist, route.slice(1), "index.html");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
}

const today = new Date().toISOString().slice(0, 10);
const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    Object.entries(PAGES)
        .map(([p, v]) => `  <url><loc>${urlFor(p)}</loc><lastmod>${today}</lastmod><priority>${v.priority}</priority></url>`)
        .join("\n") +
    `\n</urlset>\n`;
fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemap);

console.log(`[seo] prerendered ${Object.keys(PAGES).length} pages + sitemap.xml`);
