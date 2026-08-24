/*
 * Hand-designed section templates.
 *
 * The second half of the section-library architecture (see designTokens.js
 * for the first). Each section here is written once, by hand, responsive and
 * correct: real flex/grid layout, a nav that collapses properly, images with
 * aspect ratios, no fixed heights around short content.
 *
 * The model no longer writes layout. It returns CONTENT — which sections this
 * business needs, and the copy for each — and these templates render it. That
 * inverts where design quality comes from: instead of hoping a 30B model
 * invents a good header on this particular run, the header is good because a
 * human wrote it and it is the same header every time.
 *
 * Every template takes plain data and returns HTML. Nothing here calls a
 * model; render() is deterministic and instant.
 */

import { baseStylesheet, tokensFor } from "./designTokens.js";
import { MOTION_CDN, MOTION_CSS, MOTION_JS } from "./motionLayer.js";
import { ART_CSS, artFor, seedFrom } from "./svgArt.js";
import { WEBGL_CDN, WEBGL_CSS, WEBGL_JS, sceneFor } from "./webglScenes.js";

const esc = (s = "") =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const img = (src, alt, { ratio = "4 / 3", eager = false, sizes = "" } = {}) =>
    `<img src="${esc(src)}" alt="${esc(alt)}" style="aspect-ratio:${ratio};object-fit:cover;width:100%;border-radius:var(--radius-lg)"${
        eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"'
    }${sizes ? ` sizes="${esc(sizes)}"` : ""}>`;

const ctas = (primary, secondary) =>
    [
        primary ? `<a class="btn btn--primary" href="${esc(primary.href || "#contact")}">${esc(primary.label)}</a>` : "",
        secondary ? `<a class="btn btn--ghost" href="${esc(secondary.href || "#about")}">${esc(secondary.label)}</a>` : "",
    ].join("\n          ");

/* ─── Sections ──────────────────────────────────────────────── */

export const SECTIONS = {
    /** Sticky header. Horizontal on desktop, real working drawer on mobile. */
    nav: ({ brand, links = [], cta }) => `
  <header class="site-header">
    <div class="container site-header__inner">
      <a class="site-header__brand" href="#top">${esc(brand)}</a>
      <nav class="site-nav" id="site-nav" aria-label="Main">
        ${links.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join("\n        ")}
        ${cta ? `<a class="btn btn--primary site-nav__cta" href="${esc(cta.href || "#contact")}">${esc(cta.label)}</a>` : ""}
      </nav>
      <button class="site-header__toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>`,

    /** Full-bleed image hero with a legibility scrim. */
    heroImage: ({ eyebrow, title, subtitle, primaryCta, secondaryCta, image, imageAlt }) => `
  <section class="hero" id="top">
    <div class="hero__media">${img(image, imageAlt || title, { ratio: "16 / 9", eager: true, sizes: "100vw" })}</div>
    <div class="container hero__inner">
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
      <h1>${esc(title)}</h1>
      ${subtitle ? `<p class="lede hero__lede">${esc(subtitle)}</p>` : ""}
      <div class="hero__actions">
          ${ctas(primaryCta, secondaryCta)}
      </div>
    </div>
  </section>`,

    /** Type-led hero for brands that want restraint over photography. */
    heroSplit: ({ eyebrow, title, subtitle, primaryCta, secondaryCta, image, imageAlt }) => `
  <section class="section hero-split" id="top">
    <div class="container grid grid--2 hero-split__inner">
      <div>
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
        <h1>${esc(title)}</h1>
        ${subtitle ? `<p class="lede">${esc(subtitle)}</p>` : ""}
        <div class="hero__actions">
          ${ctas(primaryCta, secondaryCta)}
        </div>
      </div>
      <div>${img(image, imageAlt || title, { ratio: "4 / 5", eager: true, sizes: "(min-width:700px) 50vw, 100vw" })}</div>
    </div>
  </section>`,

    /*
     * Editorial hero: oversized two-tone headline, meta column beside it,
     * generated art behind. This is the pleurat/saifullah device — the
     * headline IS the design, so it needs real scale and a second weight or
     * colour to give it rhythm. `titleAccent` is the part that changes tone.
     */
    heroEditorial: ({ eyebrow, title, titleAccent, subtitle, primaryCta, secondaryCta, meta = [], art = "" }) => `
  <section class="section hero-editorial art-host" id="top">
    ${art}
    <div class="container hero-editorial__inner">
      <div class="hero-editorial__main">
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
        <h1 class="hero-editorial__title">${esc(title)}${titleAccent ? ` <span class="tone">${esc(titleAccent)}</span>` : ""}</h1>
      </div>
      <div class="hero-editorial__aside">
        ${subtitle ? `<p class="lede">${esc(subtitle)}</p>` : ""}
        <div class="hero__actions">
          ${ctas(primaryCta, secondaryCta)}
        </div>
        ${meta.length ? `<dl class="hero-editorial__meta">${meta.map((m) => `<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`).join("")}</dl>` : ""}
      </div>
    </div>
  </section>`,

    /*
     * Hero with a live WebGL backdrop.
     *
     * The scene is chosen from the archetype, never supplied by the model —
     * it has no way to know which motion suits which brand, and no way to
     * write a render loop that is safe on a phone.
     *
     * The gradient div is not a placeholder, it is the real background. WebGL
     * draws ON TOP of it when available. So a device without WebGL, a blocked
     * CDN, or reduced-motion all land on a finished-looking hero rather than
     * a blank box.
     */
    hero3d: ({ eyebrow, title, titleAccent, subtitle, primaryCta, secondaryCta, scene = "particles" }) => `
  <section class="section hero hero--3d" id="top">
    <div class="scene3d" data-scene="${esc(scene)}" aria-hidden="true">
      <div class="scene3d__fallback"></div>
    </div>
    <div class="container hero-3d__inner">
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
      <h1 class="hero-3d__title">${esc(title)}${titleAccent ? ` <span class="tone">${esc(titleAccent)}</span>` : ""}</h1>
      ${subtitle ? `<p class="lede hero__lede">${esc(subtitle)}</p>` : ""}
      <div class="hero__actions">
          ${ctas(primaryCta, secondaryCta)}
      </div>
    </div>
  </section>`,

    /* An illustrated strip that separates major sections — the single most
       "authored"-feeling element available without commissioning artwork. */
    artBand: ({ art = "", caption }) => `
  <section class="skyline-band" aria-hidden="${caption ? "false" : "true"}">
    ${caption ? `<div class="container skyline-band__caption">${esc(caption)}</div>` : ""}
    ${art}
  </section>`,

    /* Numbered rows. Reads as a considered index rather than a card grid —
       right for services, process, or selected work. */
    numberedList: ({ id = "services", eyebrow, title, intro, items = [] }) => `
  <section class="section" id="${esc(id)}">
    <div class="container">
      <div class="section__head reveal">
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
        <h2>${esc(title)}</h2>
        ${intro ? `<p class="lede">${esc(intro)}</p>` : ""}
      </div>
      <ol class="numbered">
        ${items
            .map(
                (it, i) => `<li class="numbered__row reveal">
          <span class="numbered__index">${String(i + 1).padStart(2, "0")}</span>
          <div class="numbered__body">
            <h3>${esc(it.title)}</h3>
            <p>${esc(it.body)}</p>
          </div>
          ${it.meta ? `<span class="numbered__meta">${esc(it.meta)}</span>` : ""}
        </li>`
            )
            .join("\n        ")}
      </ol>
    </div>
  </section>`,

    /* Scrolling marquee. Cheap, and it makes a static page feel alive. */
    /* Accepts `texts` (what the schema and prompt call it) or `items`
       (what the other sections use). The two names diverged once and shipped a
       marquee with empty runs — 38px wide, nothing to scroll. Tolerating both
       costs one line and removes a whole class of silent breakage. */
    marquee: ({ items = [], texts = [], separator = "—" }) => {
        const list = (texts.length ? texts : items).map((t) => (typeof t === "string" ? t : t.title || t.label || "")).filter(Boolean);
        if (list.length === 0) return "";
        const run = list.map((t) => `<span>${esc(t)}</span>`).join(`<i aria-hidden="true">${esc(separator)}</i>`);
        // Duplicated so the loop is seamless; the copy is aria-hidden so a
        // screen reader hears the list once, not twice.
        return `
  <section class="marquee" aria-label="${esc(list.join(", "))}">
    <div class="marquee__track">
      <div class="marquee__run">${run}</div>
      <div class="marquee__run" aria-hidden="true">${run}</div>
    </div>
  </section>`;
    },

    /* Image gallery — for work, before/after, or a menu with photography. */
    gallery: ({ id = "work", eyebrow, title, intro, items = [] }) => `
  <section class="section" id="${esc(id)}">
    <div class="container">
      <div class="section__head reveal">
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
        <h2>${esc(title)}</h2>
        ${intro ? `<p class="lede">${esc(intro)}</p>` : ""}
      </div>
      <div class="gallery">
        ${items
            .map(
                (it, i) => `<figure class="gallery__item reveal${i % 3 === 0 ? " gallery__item--wide" : ""}">
          ${img(it.image, it.imageAlt || it.title, { ratio: i % 3 === 0 ? "16 / 10" : "4 / 5" })}
          ${it.title ? `<figcaption>${esc(it.title)}${it.meta ? `<span>${esc(it.meta)}</span>` : ""}</figcaption>` : ""}
        </figure>`
            )
            .join("\n        ")}
      </div>
    </div>
  </section>`,

    /* Process steps — connected, horizontal on desktop. */
    process: ({ id = "process", eyebrow, title, intro, items = [] }) => `
  <section class="section section--surface" id="${esc(id)}">
    <div class="container">
      <div class="section__head reveal">
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
        <h2>${esc(title)}</h2>
        ${intro ? `<p class="lede">${esc(intro)}</p>` : ""}
      </div>
      <div class="process">
        ${items
            .map(
                (it, i) => `<div class="process__step reveal">
          <div class="process__num">${String(i + 1).padStart(2, "0")}</div>
          <h3>${esc(it.title)}</h3>
          <p>${esc(it.body)}</p>
        </div>`
            )
            .join("\n        ")}
      </div>
    </div>
  </section>`,

    /* FAQ — real <details>, so it works with zero JavaScript. */
    faq: ({ id = "faq", eyebrow, title, items = [] }) => `
  <section class="section" id="${esc(id)}">
    <div class="container faq">
      <div class="section__head reveal">
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
        <h2>${esc(title)}</h2>
      </div>
      ${items
          .map(
              (it) => `<details class="faq__item reveal">
        <summary>${esc(it.title)}</summary>
        <p>${esc(it.body)}</p>
      </details>`
          )
          .join("\n      ")}
    </div>
  </section>`,

    /** Numbers band — credibility without a wall of text. */
    stats: ({ items = [] }) => `
  <section class="section--tight section--surface stats">
    <div class="container stats__grid">
      ${items
          .map(
              (s) => `<div class="stats__item">
        <div class="stats__value">${esc(s.value)}</div>
        <div class="stats__label">${esc(s.label)}</div>
      </div>`
          )
          .join("\n      ")}
    </div>
  </section>`,

    /** Services / features / menu — one grid, three uses. */
    cardGrid: ({ id = "services", eyebrow, title, intro, items = [], columns = 3 }) => `
  <section class="section" id="${esc(id)}">
    <div class="container">
      <div class="section__head reveal">
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
        <h2>${esc(title)}</h2>
        ${intro ? `<p class="lede">${esc(intro)}</p>` : ""}
      </div>
      <div class="grid grid--${columns === 2 ? "2" : "3"}">
        ${items
            .map(
                (it) => `<article class="card reveal">
          ${it.image ? img(it.image, it.imageAlt || it.title, { ratio: "3 / 2" }) : ""}
          ${it.icon ? `<div class="card__icon" aria-hidden="true">${esc(it.icon)}</div>` : ""}
          <h3>${esc(it.title)}</h3>
          <p>${esc(it.body)}</p>
          ${it.meta ? `<p class="card__meta">${esc(it.meta)}</p>` : ""}
        </article>`
            )
            .join("\n        ")}
      </div>
    </div>
  </section>`,

    /** Image + copy, alternating side. */
    split: ({ id = "about", eyebrow, title, body = [], image, imageAlt, reverse = false, cta }) => `
  <section class="section" id="${esc(id)}">
    <div class="container grid grid--2 split${reverse ? " split--reverse" : ""}">
      <div class="split__media reveal">${img(image, imageAlt || title, { ratio: "4 / 3", sizes: "(min-width:700px) 50vw, 100vw" })}</div>
      <div class="split__copy reveal">
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
        <h2>${esc(title)}</h2>
        ${body.map((p) => `<p>${esc(p)}</p>`).join("\n        ")}
        ${cta ? `<a class="btn btn--ghost" href="${esc(cta.href || "#contact")}">${esc(cta.label)}</a>` : ""}
      </div>
    </div>
  </section>`,

    /** Single strong quote beats three weak ones. */
    testimonial: ({ quote, author, role, image, imageAlt }) => `
  <section class="section section--surface testimonial">
    <div class="container testimonial__inner reveal">
      <blockquote class="testimonial__quote">${esc(quote)}</blockquote>
      <div class="testimonial__person">
        ${image ? `<img class="testimonial__avatar" src="${esc(image)}" alt="${esc(imageAlt || author)}" loading="lazy">` : ""}
        <div>
          <div class="testimonial__author">${esc(author)}</div>
          ${role ? `<div class="testimonial__role">${esc(role)}</div>` : ""}
        </div>
      </div>
    </div>
  </section>`,

    /** Closing conversion band. */
    ctaBand: ({ id = "contact", title, subtitle, primaryCta, secondaryCta }) => `
  <section class="section cta-band" id="${esc(id)}">
    <div class="container cta-band__inner reveal">
      <h2>${esc(title)}</h2>
      ${subtitle ? `<p class="lede">${esc(subtitle)}</p>` : ""}
      <div class="hero__actions">
          ${ctas(primaryCta, secondaryCta)}
      </div>
    </div>
  </section>`,

    /*
     * Footer, in three hand-built variants.
     *
     * Previously there was exactly one footer and the model could only change
     * its words. So "make the footer look better" was a request the system
     * structurally could not satisfy — and the revision cheerfully reported
     * "Done" while nothing visible changed. That is the worst kind of failure:
     * the user is told their instruction was followed when it was ignored.
     *
     *   rich     (default) full agency footer — brand column, link columns,
     *            contact block with real tel:/mailto:, opening hours, service
     *            areas, social row, legal line. This is what people mean when
     *            they say "a proper footer".
     *   columns  the older compact version, for pages that want less weight.
     *   centered a single centred stack — right for a one-CTA landing page.
     *
     * Variants are how design requests become actionable without letting a
     * model near the layout: it picks from versions a human wrote, all of
     * which are responsive and correct.
     */
    footer: (props) => {
        const cols = Array.isArray(props.linkColumns) ? props.linkColumns : Array.isArray(props.columns) ? props.columns : [];
        const variant = props.variant === "columns" || props.variant === "centered" ? props.variant : "rich";
        return SECTIONS[`__footer_${variant}`]({ ...props, columns: cols });
    },

    __footer_rich: ({ brand, tagline, columns = [], contact, social = [], hours, serviceAreas = [], year = 2026 }) => {
        const telHref = contact?.phone ? `tel:${String(contact.phone).replace(/[^\d+]/g, "")}` : null;
        return `
  <footer class="site-footer site-footer--rich">
    <div class="container">
      <div class="site-footer__top">
        <div class="site-footer__brandcol">
          <div class="site-footer__brand">${esc(brand)}</div>
          ${tagline ? `<p class="site-footer__tagline">${esc(tagline)}</p>` : ""}
          ${telHref ? `<a class="site-footer__phone" href="${esc(telHref)}">${esc(contact.phone)}</a>` : ""}
          ${social.length ? `<div class="site-footer__social">${social.map((s) => `<a href="${esc(s.href)}" aria-label="${esc(s.label)}">${esc(s.label)}</a>`).join("")}</div>` : ""}
        </div>

        ${columns
            .map(
                (c) => `<nav class="site-footer__col" aria-label="${esc(c.title)}">
          <h3 class="site-footer__heading">${esc(c.title)}</h3>
          ${(c.links || []).map((l) => `<a class="site-footer__link" href="${esc(l.href)}">${esc(l.label)}</a>`).join("\n          ")}
        </nav>`
            )
            .join("\n        ")}

        ${
            serviceAreas.length
                ? `<div class="site-footer__col">
          <h3 class="site-footer__heading">Areas served</h3>
          <ul class="site-footer__areas">${serviceAreas.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
        </div>`
                : ""
        }

        ${
            contact || hours
                ? `<div class="site-footer__col site-footer__contact">
          <h3 class="site-footer__heading">Get in touch</h3>
          ${contact?.address ? `<address class="site-footer__address">${esc(contact.address)}</address>` : ""}
          ${telHref ? `<a class="site-footer__link" href="${esc(telHref)}">${esc(contact.phone)}</a>` : ""}
          ${contact?.email ? `<a class="site-footer__link" href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>` : ""}
          ${hours ? `<p class="site-footer__hours">${esc(hours)}</p>` : ""}
        </div>`
                : ""
        }
      </div>

      <div class="site-footer__base">
        <span>&copy; ${esc(year)} ${esc(brand)}. All rights reserved.</span>
        <span class="site-footer__legal"><a href="#top">Back to top</a></span>
      </div>
    </div>
  </footer>`;
    },

    __footer_columns: ({ brand, tagline, columns = [], contact, social = [], year = 2026 }) => `
  <footer class="site-footer">
    <div class="container site-footer__grid">
      <div>
        <div class="site-footer__brand">${esc(brand)}</div>
        ${tagline ? `<p class="site-footer__tagline">${esc(tagline)}</p>` : ""}
      </div>
      ${columns
          .map(
              (c) => `<div>
        <div class="site-footer__heading">${esc(c.title)}</div>
        ${(c.links || []).map((l) => `<a class="site-footer__link" href="${esc(l.href)}">${esc(l.label)}</a>`).join("\n        ")}
      </div>`
          )
          .join("\n      ")}
      ${
          contact
              ? `<div>
        <div class="site-footer__heading">Contact</div>
        ${contact.address ? `<p class="site-footer__tagline">${esc(contact.address)}</p>` : ""}
        ${contact.phone ? `<a class="site-footer__link" href="tel:${esc(String(contact.phone).replace(/[^\d+]/g, ""))}">${esc(contact.phone)}</a>` : ""}
        ${contact.email ? `<a class="site-footer__link" href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>` : ""}
      </div>`
              : ""
      }
    </div>
    <div class="container site-footer__base">
      <span>&copy; ${esc(year)} ${esc(brand)}. All rights reserved.</span>
      ${social.length ? `<span class="site-footer__social">${social.map((s) => `<a href="${esc(s.href)}">${esc(s.label)}</a>`).join("")}</span>` : ""}
    </div>
  </footer>`,

    __footer_centered: ({ brand, tagline, contact, social = [], year = 2026 }) => {
        const telHref = contact?.phone ? `tel:${String(contact.phone).replace(/[^\d+]/g, "")}` : null;
        return `
  <footer class="site-footer site-footer--centered">
    <div class="container">
      <div class="site-footer__brand">${esc(brand)}</div>
      ${tagline ? `<p class="site-footer__tagline">${esc(tagline)}</p>` : ""}
      ${telHref ? `<a class="site-footer__phone" href="${esc(telHref)}">${esc(contact.phone)}</a>` : ""}
      ${social.length ? `<div class="site-footer__social">${social.map((s) => `<a href="${esc(s.href)}">${esc(s.label)}</a>`).join("")}</div>` : ""}
      <div class="site-footer__base site-footer__base--centered">
        <span>&copy; ${esc(year)} ${esc(brand)}. All rights reserved.</span>
      </div>
    </div>
  </footer>`;
    },

};

/* ─── Section-specific CSS ──────────────────────────────────── */

export const SECTION_CSS = `
/* Header */
.site-header { position: sticky; top: 0; z-index: 100; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); }
.site-header__inner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 72px; }
.site-header__brand { font-family: var(--font-display); font-size: 1.35rem; font-weight: 600; letter-spacing: -.01em; }
.site-nav { display: none; align-items: center; gap: clamp(1.25rem, 2.5vw, 2.25rem); }
.site-nav a { font-size: .95rem; color: var(--text-muted); transition: color .2s ease; }
.site-nav a:hover { color: var(--accent); }
.site-nav__cta { color: var(--accent-contrast) !important; padding: .6rem 1.15rem; font-size: .875rem; }
.site-nav__cta:hover { color: var(--accent-contrast) !important; }
.site-header__toggle { display: inline-flex; flex-direction: column; justify-content: center; gap: 5px; width: 44px; height: 44px; padding: 0 10px; background: none; border: 0; cursor: pointer; }
.site-header__toggle span { display: block; height: 2px; background: var(--text); transition: transform .25s ease, opacity .25s ease; }
.site-header__toggle[aria-expanded="true"] span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.site-header__toggle[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
.site-header__toggle[aria-expanded="true"] span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
.site-nav.is-open { display: flex; position: absolute; left: 0; right: 0; top: 100%; flex-direction: column; align-items: flex-start; gap: 1.1rem; padding: 1.5rem var(--gutter) 2rem; background: var(--bg); border-bottom: 1px solid var(--border); }
@media (min-width: 860px) {
  .site-nav { display: flex; }
  .site-header__toggle { display: none; }
  .site-nav.is-open { position: static; flex-direction: row; padding: 0; border: 0; background: none; }
}

/* Hero */
.hero { position: relative; display: grid; align-items: end; min-height: min(78vh, 720px); overflow: hidden; }
.hero__media { position: absolute; inset: 0; }
.hero__media img { width: 100%; height: 100%; border-radius: 0; }
.hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, color-mix(in srgb, var(--bg) 35%, transparent) 0%, color-mix(in srgb, var(--bg) 92%, transparent) 78%, var(--bg) 100%); }
.hero__inner { position: relative; z-index: 1; padding-block: clamp(3.5rem, 9vw, 7rem); }
.hero__lede { max-width: 46ch; }
.hero__actions { display: flex; flex-wrap: wrap; gap: .875rem; margin-top: 1.75rem; }
.hero-split__inner { align-items: center; }

/* Stats */
.stats__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(1.5rem, 4vw, 3rem); text-align: center; }
@media (min-width: 760px) { .stats__grid { grid-template-columns: repeat(4, 1fr); } }
.stats__value { font-family: var(--font-display); font-size: clamp(1.9rem, 4vw, 2.9rem); color: var(--accent); line-height: 1; }
.stats__label { font-size: .8rem; letter-spacing: .12em; text-transform: uppercase; color: var(--text-muted); margin-top: .5rem; }

/* Shared heading block */
.section__head { max-width: 62ch; margin-bottom: clamp(2rem, 4vw, 3.25rem); }
.card__icon { font-size: 1.75rem; margin-bottom: .75rem; }
.card__meta { color: var(--accent); font-weight: 600; margin: 0; }
.card h3 { margin-top: .85rem; }
.card p { margin-bottom: .5rem; color: var(--text-muted); }

/* Split */
.split { align-items: center; }
.split--reverse .split__media { order: 2; }
@media (max-width: 699px) { .split--reverse .split__media { order: 0; } }

/* Testimonial */
.testimonial__inner { max-width: 56rem; text-align: center; margin-inline: auto; }
.testimonial__quote { font-family: var(--font-display); font-size: clamp(1.35rem, 3vw, 2.1rem); line-height: 1.35; margin: 0 0 2rem; }
.testimonial__quote::before { content: "\\201C"; }
.testimonial__quote::after { content: "\\201D"; }
.testimonial__person { display: flex; align-items: center; justify-content: center; gap: .875rem; }
.testimonial__avatar { width: 52px; height: 52px; border-radius: 999px; object-fit: cover; }
.testimonial__author { font-weight: 600; }
.testimonial__role { font-size: .875rem; color: var(--text-muted); }

/* CTA band */
.cta-band { background: var(--surface-2); text-align: center; }
.cta-band__inner { max-width: 46rem; margin-inline: auto; }
.cta-band .hero__actions { justify-content: center; }
.cta-band p { margin-inline: auto; }


/* ── Editorial hero ─────────────────────────────────────────
   The headline carries the design, so it gets real scale and a second tone.
   Asymmetric two-column on desktop, stacked on mobile. */
.hero-editorial { padding-block: clamp(4rem, 11vw, 9rem); }
.hero-editorial__inner { display: grid; grid-template-columns: 1fr; gap: clamp(2rem, 5vw, 4rem); align-items: end; }
@media (min-width: 900px) { .hero-editorial__inner { grid-template-columns: 1.45fr 1fr; } }
.hero-editorial__title { font-size: clamp(2.75rem, 8.5vw, 6.5rem); line-height: .96; letter-spacing: -0.035em; margin: 0; }
.hero-editorial__title .tone { color: var(--text-muted); }
.hero-editorial__aside .lede { margin-bottom: 1.75rem; }
.hero-editorial__meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; margin: 2.25rem 0 0; }
.hero-editorial__meta dt { font-size: .7rem; letter-spacing: .16em; text-transform: uppercase; color: var(--text-muted); }
.hero-editorial__meta dd { margin: .25rem 0 0; font-family: var(--font-display); font-size: 1.35rem; }

/* ── Skyline caption ─────────────────────────────────────── */
.skyline-band__caption { font-size: .75rem; letter-spacing: .16em; text-transform: uppercase; color: var(--text-muted); margin-bottom: .75rem; }

/* ── Numbered index rows ─────────────────────────────────── */
.numbered { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
.numbered__row { display: grid; grid-template-columns: auto 1fr; gap: 1rem clamp(1rem, 3vw, 2.5rem); align-items: start; padding: clamp(1.5rem, 3.5vw, 2.5rem) 0; border-bottom: 1px solid var(--border); transition: background-color .3s ease; }
@media (min-width: 800px) { .numbered__row { grid-template-columns: auto 1fr auto; align-items: center; } }
.numbered__row:hover { background: var(--surface); }
.numbered__index { font-family: var(--font-display); font-size: clamp(1.5rem, 3vw, 2.25rem); color: var(--accent); line-height: 1; }
.numbered__body h3 { margin: 0 0 .35rem; }
.numbered__body p { margin: 0; color: var(--text-muted); }
.numbered__meta { grid-column: 2; font-weight: 600; color: var(--accent); white-space: nowrap; }
@media (min-width: 800px) { .numbered__meta { grid-column: auto; } }

/* ── Marquee ─────────────────────────────────────────────── */
.marquee { overflow: hidden; padding-block: clamp(1.25rem, 2.5vw, 2rem); border-block: 1px solid var(--border); background: var(--surface); }
.marquee__track { display: flex; width: max-content; will-change: transform; }
.marquee__run { display: flex; align-items: center; gap: clamp(1.5rem, 3vw, 2.75rem); padding-right: clamp(1.5rem, 3vw, 2.75rem); font-family: var(--font-display); font-size: clamp(1.1rem, 2.4vw, 1.9rem); white-space: nowrap; }
.marquee__run i { color: var(--accent); font-style: normal; }
/* Without JS the track is static — visible, just not moving. */
@media (prefers-reduced-motion: reduce) { .marquee__track { animation: none !important; transform: none !important; } }

/* ── Gallery ─────────────────────────────────────────────── */
.gallery { display: grid; grid-template-columns: 1fr; gap: clamp(1rem, 2vw, 1.75rem); }
@media (min-width: 700px) { .gallery { grid-template-columns: repeat(3, 1fr); } .gallery__item--wide { grid-column: span 2; } }
.gallery__item { margin: 0; }
.gallery__item figcaption { display: flex; justify-content: space-between; gap: 1rem; margin-top: .75rem; font-size: .9rem; }
.gallery__item figcaption span { color: var(--text-muted); }

/* ── Process ─────────────────────────────────────────────── */
.process { display: grid; grid-template-columns: 1fr; gap: clamp(1.5rem, 3vw, 2.5rem); counter-reset: step; }
@media (min-width: 800px) { .process { grid-template-columns: repeat(4, 1fr); } }
.process__step { position: relative; padding-top: 1.75rem; border-top: 2px solid var(--border); }
.process__step::after { content: ""; position: absolute; top: -2px; left: 0; width: 0; height: 2px; background: var(--accent); transition: width .8s ease; }
.process__step.is-visible::after { width: 100%; }
.process__num { font-family: var(--font-display); font-size: 1rem; color: var(--accent); margin-bottom: .5rem; }
.process__step h3 { margin: 0 0 .4rem; font-size: 1.15rem; }
.process__step p { margin: 0; color: var(--text-muted); font-size: .95rem; }

/* ── FAQ ─────────────────────────────────────────────────── */
.faq { max-width: 52rem; }
.faq__item { border-bottom: 1px solid var(--border); padding: 1.25rem 0; }
.faq__item summary { cursor: pointer; font-family: var(--font-display); font-size: 1.1rem; list-style: none; display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
.faq__item summary::-webkit-details-marker { display: none; }
.faq__item summary::after { content: "+"; color: var(--accent); font-size: 1.5rem; line-height: 1; transition: transform .25s ease; }
.faq__item[open] summary::after { transform: rotate(45deg); }
.faq__item p { margin: .85rem 0 0; color: var(--text-muted); }



/* ── 3D hero ─────────────────────────────────────────────── */
.hero--3d { display: grid; align-items: center; min-height: min(82vh, 760px); padding-block: clamp(4rem, 9vw, 7rem); }
.hero-3d__inner { text-align: center; max-width: 60rem; margin-inline: auto; }
.hero-3d__title { font-size: clamp(2.5rem, 7.5vw, 5.5rem); line-height: 1.02; letter-spacing: -0.03em; margin: 0 0 1rem; }
.hero-3d__title .tone { color: var(--accent); }
.hero--3d .hero__lede { margin-inline: auto; }
.hero--3d .hero__actions { justify-content: center; }

/* ── Rich footer ─────────────────────────────────────────────
   The brand column is wider than the link columns and the rest auto-fit, so
   the footer looks composed with two link columns or with five. */
.site-footer--rich { padding-block: clamp(3.5rem, 7vw, 6rem) 2rem; background: var(--surface); }
.site-footer__top { display: grid; grid-template-columns: 1fr; gap: clamp(2rem, 4vw, 3.5rem); }
@media (min-width: 640px)  { .site-footer__top { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1000px) { .site-footer__top { grid-template-columns: 1.6fr repeat(auto-fit, minmax(150px, 1fr)); } }

.site-footer__brandcol { max-width: 34ch; }
.site-footer__phone {
  display: inline-block; margin-top: .85rem;
  font-family: var(--font-display); font-size: clamp(1.2rem, 2.2vw, 1.55rem);
  color: var(--accent); transition: color .2s ease;
}
.site-footer__phone:hover { color: var(--accent-hover); }

.site-footer__col { min-width: 0; }
.site-footer__col .site-footer__heading { margin-top: 0; }
.site-footer__heading {
  font-family: var(--font-body); font-size: .72rem; font-weight: 600;
  letter-spacing: .15em; text-transform: uppercase;
  color: var(--text-muted); margin: 0 0 1rem;
}

.site-footer__areas { list-style: none; margin: 0; padding: 0; }
.site-footer__areas li { font-size: .925rem; color: var(--text-muted); margin-bottom: .5rem; }

.site-footer__address { font-style: normal; font-size: .925rem; color: var(--text-muted); margin-bottom: .6rem; }
.site-footer__hours { font-size: .875rem; color: var(--text-muted); margin: .75rem 0 0; }

/* Underline grows from the left on hover rather than switching on abruptly. */
.site-footer__link { position: relative; display: inline-block; font-size: .925rem; margin-bottom: .6rem; transition: color .2s ease; }
.site-footer__link::after {
  content: ""; position: absolute; left: 0; bottom: -2px;
  width: 0; height: 1px; background: var(--accent); transition: width .25s ease;
}
.site-footer__link:hover { color: var(--accent); }
.site-footer__link:hover::after { width: 100%; }

.site-footer--rich .site-footer__social { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem; }
.site-footer--rich .site-footer__social a { font-size: .875rem; color: var(--text-muted); transition: color .2s ease; }
.site-footer--rich .site-footer__social a:hover { color: var(--accent); }

.site-footer--rich .site-footer__base {
  display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between;
  margin-top: clamp(2.5rem, 5vw, 4rem); padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  font-size: .85rem; color: var(--text-muted);
}
.site-footer__legal a { transition: color .2s ease; }
.site-footer__legal a:hover { color: var(--accent); }

/* ── Centered footer ────────────────────────────────────────── */
.site-footer--centered { text-align: center; padding-block: clamp(3rem, 6vw, 4.5rem) 2rem; }
.site-footer--centered .site-footer__tagline { margin-inline: auto; }
.site-footer--centered .site-footer__social { display: flex; justify-content: center; gap: 1.25rem; margin-top: 1.25rem; }
.site-footer__base--centered { justify-content: center; border-top: 1px solid var(--border); margin-top: 2.5rem; padding-top: 1.5rem; }

/* Footer */
.site-footer { border-top: 1px solid var(--border); padding-block: clamp(3rem, 6vw, 4.5rem) 2rem; }
.site-footer__grid { display: grid; grid-template-columns: 1fr; gap: 2.5rem; }
@media (min-width: 700px) { .site-footer__grid { grid-template-columns: 2fr repeat(auto-fit, minmax(140px, 1fr)); } }
.site-footer__brand { font-family: var(--font-display); font-size: 1.25rem; margin-bottom: .5rem; }
.site-footer__tagline { color: var(--text-muted); font-size: .925rem; max-width: 34ch; }
.site-footer__heading { font-size: .75rem; letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); margin-bottom: .9rem; }
.site-footer__link { display: block; font-size: .925rem; margin-bottom: .55rem; transition: color .2s ease; }
.site-footer__link:hover { color: var(--accent); }
.site-footer__base { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); font-size: .85rem; color: var(--text-muted); }
.site-footer__social { display: flex; gap: 1.25rem; }
`;

/* ─── Behaviour ─────────────────────────────────────────────── */

export const SECTION_JS = `// Adding .js here (not in the HTML) means every reveal stays visible if this
// script never runs — the page degrades to "no animation", never to "blank".
// The .js class is what enables the CSS hidden state for .reveal elements,
// so it must only be added when this page can actually animate. In a
// background tab requestAnimationFrame is suspended and IntersectionObserver
// may not fire, which would leave every revealed section invisible until the
// visitor focused the tab. Defer until the page is genuinely visible.
function enableMotionClass() { document.documentElement.classList.add('js'); }
if (document.hidden) {
  document.addEventListener('visibilitychange', function once() {
    if (document.hidden) return;
    document.removeEventListener('visibilitychange', once);
    enableMotionClass();
  });
} else {
  enableMotionClass();
}

document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  var reveals = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry, i) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      setTimeout(function () { el.classList.add('is-visible'); }, Math.min(i * 90, 360));
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  reveals.forEach(function (el) { io.observe(el); });
});
`;

/* ─── Page assembly ─────────────────────────────────────────── */

/**
 * Render a complete page from a content plan.
 *
 * `plan.sections` is an ordered list of { type, ...props }. Unknown types are
 * skipped rather than throwing — a model naming a section that doesn't exist
 * should cost that section, not the whole page.
 */
export function renderPage(plan, archetype) {
    const t = tokensFor(archetype);

    // Artwork is generated here, not requested from the model — it has no way
    // to draw and no way to know which piece suits which palette. Seeded from
    // the brand name so a given business always gets the same illustration
    // rather than a different one on every regeneration.
    const seed = seedFrom(plan.brand || plan.title || "site");
    const art = artFor(t.name, seed);

    const body = (plan.sections || [])
        .map((s) => {
            const fn = SECTIONS[s.type];
            if (!fn) {
                console.warn(`[Sections] Unknown section type "${s.type}" — skipped`);
                return "";
            }
            try {
                // Sections that take artwork get it injected; the model never
                // supplies it, so anything it happened to send is ignored.
                if (s.type === "heroEditorial") return fn({ ...s, art: art.hero });
                // The scene comes from the archetype, not the model.
                if (s.type === "hero3d") return fn({ ...s, scene: sceneFor(t.name) });
                if (s.type === "artBand") return fn({ ...s, art: art.band });
                return fn(s);
            } catch (err) {
                console.warn(`[Sections] Failed to render "${s.type}": ${err?.message}`);
                return "";
            }
        })
        .filter(Boolean)
        .join("\n");

    // Three.js is ~150kB and only worth downloading when a 3D hero is
    // actually on the page. Most pages don't have one, and a landing page for
    // a roofer should not pay for a library it never uses.
    const uses3d = (plan.sections || []).some((s) => s.type === "hero3d");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(plan.title || plan.brand || "Website")}</title>
  <meta name="description" content="${esc(plan.metaDescription || "")}">
  <link rel="stylesheet" href="styles.css">
${MOTION_CDN}${uses3d ? "\n" + WEBGL_CDN : ""}
</head>
<body>
${body}
  <script src="script.js" defer></script>
  <script src="motion.js" defer></script>${uses3d ? '\n  <script src="scene.js" defer></script>' : ""}
</body>
</html>
`;

    const files = {
        "/index.html": html,
        "/styles.css": baseStylesheet(t.name, plan.brand || "") + SECTION_CSS + ART_CSS + WEBGL_CSS + MOTION_CSS,
        "/script.js": SECTION_JS,
        "/motion.js": MOTION_JS,
    };
    if (uses3d) files["/scene.js"] = WEBGL_JS;
    return files;
}

// __-prefixed entries are internal helpers, not selectable sections.
export const SECTION_TYPES = Object.keys(SECTIONS).filter((k) => !k.startsWith("__"));

/*
 * Structural rules a page must satisfy, enforced in code.
 *
 * The content-plan prompt states each of these ("always start with nav",
 * "exactly one hero"), and the model mostly complies — but "mostly" reaches
 * the user as a broken page. Measured: a plan containing BOTH heroEditorial
 * and heroImage, giving the document two <h1> elements and two id="top"
 * anchors. Same lesson as images and archetypes: instruct, then enforce.
 */
const HERO_TYPES = new Set(["heroImage", "heroSplit", "heroEditorial", "hero3d"]);

export function sanitizePlan(plan) {
    const notes = [];
    let sections = (plan.sections || []).filter((s) => s && s.type);

    // Exactly one hero — the first one wins, the rest are dropped. A second
    // hero is never what was wanted; it is the model hedging between two
    // options it was asked to choose between.
    let seenHero = false;
    sections = sections.filter((s) => {
        if (!HERO_TYPES.has(s.type)) return true;
        if (seenHero) {
            notes.push(`dropped duplicate hero "${s.type}"`);
            return false;
        }
        seenHero = true;
        return true;
    });

    // nav leads, footer closes.
    const navs = sections.filter((s) => s.type === "nav");
    const footers = sections.filter((s) => s.type === "footer");
    const middle = sections.filter((s) => s.type !== "nav" && s.type !== "footer");
    if (navs.length > 1) notes.push(`dropped ${navs.length - 1} duplicate nav`);
    if (footers.length > 1) notes.push(`dropped ${footers.length - 1} duplicate footer`);
    sections = [...navs.slice(0, 1), ...middle, ...footers.slice(0, 1)];

    // Duplicate anchor ids break in-page navigation silently.
    const usedIds = new Set();
    for (const s of sections) {
        if (!s.id) continue;
        if (usedIds.has(s.id)) {
            let n = 2;
            while (usedIds.has(`${s.id}-${n}`)) n++;
            notes.push(`renamed duplicate id "${s.id}" → "${s.id}-${n}"`);
            s.id = `${s.id}-${n}`;
        }
        usedIds.add(s.id);
    }

    // A nav link pointing at an anchor that doesn't exist is a dead click.
    const anchors = new Set(sections.map((s) => s.id).filter(Boolean).map((id) => `#${id}`));
    anchors.add("#top");
    for (const nav of sections.filter((s) => s.type === "nav")) {
        if (!Array.isArray(nav.links)) continue;
        const before = nav.links.length;
        nav.links = nav.links.filter((l) => !l.href?.startsWith("#") || anchors.has(l.href));
        if (nav.links.length !== before) notes.push(`removed ${before - nav.links.length} nav link(s) pointing at missing sections`);
    }

    return { plan: { ...plan, sections }, notes };
}

/*
 * Describe what a revision actually changed, by diffing the plan.
 *
 * The revision endpoint used to answer every edit with one hardcoded
 * sentence ("Updated the page and re-rendered it..."), which was true but
 * useless — identical whether the edit rewrote half the copy or did nothing
 * at all. A user asking for two different changes got the same reply twice
 * and reasonably concluded it wasn't listening.
 *
 * Comparing the before/after plan is exact: it knows precisely which
 * sections were added, removed or reworded, and can say so — including the
 * important case where NOTHING changed, which the old message actively hid.
 */
export function describePlanChange(before, after, request) {
    const beforeTypes = (before.sections || []).map((s) => s.type);
    const afterTypes = (after.sections || []).map((s) => s.type);

    const added = afterTypes.filter((t) => !beforeTypes.includes(t));
    const removed = beforeTypes.filter((t) => !afterTypes.includes(t));

    // Which surviving sections had their content edited.
    const edited = [];
    for (const a of after.sections || []) {
        const b = (before.sections || []).find((x) => x.type === a.type && (x.id || "") === (a.id || ""));
        if (!b) continue;
        if (JSON.stringify(b) !== JSON.stringify(a)) edited.push(a.title || a.type);
    }

    const parts = [];
    if (added.length) parts.push(`added ${added.join(", ")}`);
    if (removed.length) parts.push(`removed ${removed.join(", ")}`);
    if (edited.length) parts.push(`updated ${edited.slice(0, 4).join(", ")}${edited.length > 4 ? ` and ${edited.length - 4} more` : ""}`);
    if (before.styleArchetype !== after.styleArchetype) parts.push(`switched the visual style to ${after.styleArchetype}`);

    if (parts.length === 0) {
        // Requests for things the rendering system already guarantees land
        // here. Saying "done!" would be a lie; say what is actually true and
        // what the user can usefully ask for instead.
        const asksForBuiltIn = /animat|motion|responsiv|mobile|scroll|hover|transition|3d/i.test(request || "");
        return asksForBuiltIn
            ? "Nothing changed — scroll animations, hover states, smooth scrolling and full responsive layout are already built into every page this makes, so there was nothing to add. If you want a different feel, tell me what specifically: bigger headline, a different section order, more or fewer sections, or different colours."
            : "Nothing changed — I couldn't work out what to alter from that. Try naming the section and what you want it to say, e.g. \"change the footer tagline to X\" or \"add a FAQ about pricing\".";
    }

    return `Done — ${parts.join("; ")}. Layout, responsiveness and the scroll animations are part of the rendering system, so they stay intact through every edit.`;
}
