/*
 * The motion layer.
 *
 * Written by hand, once, so every generated site gets real choreography
 * instead of whatever a model improvises. This is the piece that separates a
 * page that merely renders from one that feels built: a load sequence, headline
 * reveals split to the word, scroll-scrubbed parallax, staggered card entrances,
 * counting stats, a nav that reacts to scroll, and Lenis smoothing it together.
 *
 * THE RULE THIS FILE IS BUILT AROUND: content must never be stranded invisible.
 *
 * Every hidden "from" state is applied by JS at runtime via gsap.set(), and only
 * AFTER GSAP is confirmed loaded. Nothing is hidden in CSS. So if the CDN is
 * blocked, the script errors, the tab is backgrounded (rAF suspended), or the
 * visitor has reduced-motion on, the page renders as plain static content —
 * complete and readable. The failure mode is "no animation", never "blank page".
 * That is the opposite of what the old pipeline produced, where a model would
 * write `opacity: 0` into the stylesheet and rely on a scroll handler that
 * sometimes never fired.
 *
 * Uses only free GSAP: SplitText and ScrollSmoother are paid Club plugins, so
 * word-splitting is done manually below and smooth scroll comes from Lenis.
 */

export const MOTION_CDN = `  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>`;

/* Only styles that are safe when JS never runs. Nothing here hides content. */
export const MOTION_CSS = `
/* Word-splitting wrappers. Visible by default — the clip only engages once
   JS has added .is-split, which only happens when GSAP is confirmed present. */
.split-line { display: inline-block; }
.is-split .split-line { overflow: hidden; vertical-align: top; }
.is-split .split-word { display: inline-block; will-change: transform; }

/* Parallax target. Scale gives the transform room to move without exposing
   an edge; it is inert until GSAP animates the y position. */
.parallax-media img { transform: scale(1.12); will-change: transform; }

/* Nav reacts to scroll depth. */
.site-header { transition: box-shadow .3s ease, background-color .3s ease; }
.site-header.is-scrolled { box-shadow: 0 10px 30px -12px rgba(0,0,0,.45); background: color-mix(in srgb, var(--bg) 96%, transparent); }

.btn { will-change: transform; }

@media (prefers-reduced-motion: reduce) {
  .parallax-media img { transform: none; }
  .is-split .split-line { overflow: visible; }
}
`;

export const MOTION_JS = `/* Motion layer — see motionLayer.js. Safe by construction: every hidden state
   is set here at runtime, so a failure to load leaves the page fully visible. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    // GSAP is loaded with defer, so it may not be parsed yet on fast loads.
    // Poll briefly rather than assuming either way; give up gracefully.
    var waited = 0;
    (function waitForGsap() {
      if (window.gsap && window.ScrollTrigger) return start();
      if ((waited += 50) > 3000) return; // CDN blocked — page stays static and visible
      setTimeout(waitForGsap, 50);
    })();
  });

  function start() {
    // A page opened in a BACKGROUND TAB gets no animation frames:
    // requestAnimationFrame is suspended, so GSAP's ticker never advances.
    // Measured directly — document.hidden true, 0 rAF callbacks in 1.5s,
    // gsap.ticker.frame stuck at 0. Everything below applies hidden "from"
    // states SYNCHRONOUSLY, so starting while hidden would leave the whole
    // page invisible until the visitor happened to focus the tab. Wait for
    // the page to actually be visible before hiding anything.
    if (document.hidden) {
      document.addEventListener('visibilitychange', function onVisible() {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', onVisible);
        start();
      });
      return;
    }

    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    // ── Smooth scroll ─────────────────────────────────────────
    // Lenis is optional; if it didn't load, native scrolling is fine.
    if (window.Lenis && !reduced) {
      var lenis = new window.Lenis({ duration: 1.05, smoothWheel: true });
      lenis.on('scroll', window.ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // Reduced motion: no animation at all, but ensure everything is visible
    // and the scroll-dependent classes still behave.
    if (reduced) {
      gsap.set('.reveal, .split-word, .numbered__row', { clearProps: 'all', opacity: 1, y: 0, x: 0 });
      document.querySelectorAll('.process__step').forEach(function (s) { s.classList.add('is-visible'); });
      initNavState();
      return;
    }

    splitHeadlines();
    heroIntro();
    revealOnScroll();
    parallax();
    countStats();
    magneticButtons();
    marquees();
    clipReveals();
    numberedRows();
    processSteps();
    tiltCards();
    initNavState();

    // Layout shifts as fonts and lazy images land; recalculate so triggers
    // don't fire against stale positions.
    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  }

  /* Split headlines into words, each wrapped in an overflow-hidden line so it
     can rise into place from behind its own mask. Done manually because GSAP's
     SplitText is a paid plugin.

     Walks child NODES rather than reading textContent. The earlier version
     flattened the headline to a string, which silently destroyed inline
     markup — including the <span class="tone"> that gives the editorial hero
     its two-tone headline, the whole point of that section. Element children
     are cloned and their words split INSIDE them, so styling survives. */
  function splitHeadlines() {
    var nodes = document.querySelectorAll('h1, h2.split, .hero h2, .cta-band h2, .hero-editorial__title');

    function appendWords(parent, text) {
      var words = text.split(/\\s+/).filter(Boolean);
      words.forEach(function (w) {
        var line = document.createElement('span');
        line.className = 'split-line';
        line.setAttribute('aria-hidden', 'true');
        var word = document.createElement('span');
        word.className = 'split-word';
        word.textContent = w;
        line.appendChild(word);
        parent.appendChild(line);
        parent.appendChild(document.createTextNode(' '));
      });
    }

    Array.prototype.forEach.call(nodes, function (el) {
      if (el.dataset.split === 'done' || !el.textContent.trim()) return;
      // The visual split is decorative; keep the real text as the accessible name.
      el.setAttribute('aria-label', el.textContent.replace(/\\s+/g, ' ').trim());

      var frag = document.createDocumentFragment();
      Array.prototype.forEach.call(el.childNodes, function (node) {
        if (node.nodeType === 3) {
          appendWords(frag, node.textContent);
        } else if (node.nodeType === 1) {
          // Preserve the wrapper (e.g. .tone) and split its words inside it.
          var clone = node.cloneNode(false);
          appendWords(clone, node.textContent);
          frag.appendChild(clone);
        }
      });

      while (el.firstChild) el.removeChild(el.firstChild);
      el.appendChild(frag);
      el.classList.add('is-split');
      el.dataset.split = 'done';
    });
  }

  /* Page-load sequence: the hero assembles itself rather than just appearing. */
  function heroIntro() {
    var hero = document.querySelector('.hero, .hero-split, .hero-editorial');
    if (!hero) return;

    var words = hero.querySelectorAll('.split-word');
    var bits = hero.querySelectorAll('.eyebrow, .hero__lede, .lede, .hero__actions');
    var media = hero.querySelector('.hero__media img, .hero-split img');

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (media) tl.from(media, { scale: 1.22, duration: 1.5, ease: 'power2.out' }, 0);
    if (words.length) tl.from(words, { yPercent: 115, duration: 1, stagger: 0.045 }, 0.15);
    if (bits.length) tl.from(bits, { y: 22, opacity: 0, duration: 0.75, stagger: 0.09 }, 0.5);
  }

  /* Section entrances. .reveal already ends visible via CSS; the hidden state
     is applied here so a JS failure can't strand it. */
  function revealOnScroll() {
    var items = document.querySelectorAll('.reveal');
    Array.prototype.forEach.call(items, function (el) {
      gsap.set(el, { opacity: 0, y: 26 });
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.85, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    // Cards inside a grid stagger against their siblings rather than each
    // firing its own identical animation.
    document.querySelectorAll('.grid').forEach(function (grid) {
      var cards = grid.querySelectorAll('.card');
      if (cards.length < 2) return;
      gsap.set(cards, { opacity: 0, y: 34 });
      gsap.to(cards, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.12,
        scrollTrigger: { trigger: grid, start: 'top 82%', once: true }
      });
    });
  }

  /* Scrubbed parallax. yPercent only — moving the image vertically inside an
     overflow-hidden parent can never introduce horizontal scroll. */
  function parallax() {
    var media = document.querySelectorAll('.hero__media, .parallax-media, .split__media');
    Array.prototype.forEach.call(media, function (wrap) {
      var img = wrap.querySelector('img');
      if (!img) return;
      wrap.classList.add('parallax-media');
      gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* Stats count up. Parses the number out of e.g. "400+" or "4.9" and keeps
     whatever prefix/suffix was written around it. */
  function countStats() {
    document.querySelectorAll('.stats__value').forEach(function (el) {
      var raw = el.textContent.trim();
      var match = raw.match(/^([^\\d]*)([\\d.,]+)(.*)$/);
      if (!match) return;
      var prefix = match[1], target = parseFloat(match[2].replace(/,/g, '')), suffix = match[3];
      if (!isFinite(target)) return;
      var decimals = (match[2].split('.')[1] || '').length;
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () { el.textContent = prefix + obj.v.toFixed(decimals) + suffix; },
        onComplete: function () { el.textContent = raw; }
      });
    });
  }

  /* Buttons lean toward the cursor. Pointer-fine only — on touch this would
     fight the tap. */
  function magneticButtons() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        gsap.to(btn, {
          x: (e.clientX - r.left - r.width / 2) * 0.22,
          y: (e.clientY - r.top - r.height / 2) * 0.32,
          duration: 0.4, ease: 'power3.out'
        });
      });
      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  /* Header gains depth once the page has moved.
     Driven by ScrollTrigger where available, NOT by a bare scroll listener:
     Lenis takes over scrolling and a programmatic scroll doesn't reliably
     emit a native 'scroll' event, so the class silently never applied
     (measured: scrollY 3193, class absent). ScrollTrigger is already
     synchronised with Lenis via the ticker above, so it always sees the
     real position. The native listener stays as the no-GSAP fallback. */
  function initNavState() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var apply = function (scrolled) { header.classList.toggle('is-scrolled', scrolled); };

    if (window.ScrollTrigger) {
      window.ScrollTrigger.create({
        start: 'top -24',
        end: 99999,
        onToggle: function (self) { apply(self.isActive); }
      });
    }
    apply(window.scrollY > 24);
    window.addEventListener('scroll', function () { apply(window.scrollY > 24); }, { passive: true });
  }

  /* Marquee: a real GSAP loop rather than a CSS animation, so its speed is
     tied to content width and it can be paused. xPercent -50 works because
     the track holds two identical runs — when the first has fully scrolled
     past, the second is exactly where the first began, so the reset is
     invisible. */
  function marquees() {
    document.querySelectorAll('.marquee__track').forEach(function (track) {
      var run = track.querySelector('.marquee__run');
      if (!run) return;
      var distance = run.offsetWidth;
      if (!distance) return;
      var tween = gsap.to(track, {
        xPercent: -50,
        ease: 'none',
        duration: Math.max(12, distance / 55),
        repeat: -1
      });
      // Slow down while hovered rather than stopping dead.
      track.addEventListener('mouseenter', function () { gsap.to(tween, { timeScale: 0.25, duration: .4 }); });
      track.addEventListener('mouseleave', function () { gsap.to(tween, { timeScale: 1, duration: .4 }); });
    });
  }

  /* Clip-path reveal for images: the picture wipes into view rather than
     fading, which reads as deliberate art direction instead of a default. */
  function clipReveals() {
    document.querySelectorAll('.gallery__item img, .split__media img').forEach(function (el) {
      gsap.fromTo(el,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
  }

  /* Numbered rows slide in from the side, staggered against their siblings. */
  function numberedRows() {
    var lists = document.querySelectorAll('.numbered');
    Array.prototype.forEach.call(lists, function (list) {
      var rows = list.querySelectorAll('.numbered__row');
      if (!rows.length) return;
      gsap.set(rows, { opacity: 0, x: -24 });
      gsap.to(rows, {
        opacity: 1, x: 0, duration: .7, ease: 'power2.out', stagger: .09,
        scrollTrigger: { trigger: list, start: 'top 82%', once: true }
      });
    });
  }

  /* Process steps draw their progress bar as they enter. The bar is a CSS
     transition keyed off .is-visible, so this only has to add the class. */
  function processSteps() {
    document.querySelectorAll('.process__step').forEach(function (step, i) {
      window.ScrollTrigger.create({
        trigger: step, start: 'top 85%', once: true,
        onEnter: function () { setTimeout(function () { step.classList.add('is-visible'); }, i * 120); }
      });
    });
  }

  /* Cards tilt slightly toward the pointer. Fine-pointer only. */
  function tiltCards() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('.card, .gallery__item').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        gsap.to(card, {
          rotateY: ((e.clientX - r.left) / r.width - .5) * 6,
          rotateX: ((e.clientY - r.top) / r.height - .5) * -6,
          transformPerspective: 900, duration: .5, ease: 'power2.out'
        });
      });
      card.addEventListener('mouseleave', function () {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: .6, ease: 'power2.out' });
      });
    });
  }

})();
`;
