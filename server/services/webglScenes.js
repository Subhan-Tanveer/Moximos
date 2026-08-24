/*
 * Hand-written WebGL hero backdrops.
 *
 * The reference sites the client keeps sending (myshaky.com, saifullah.dev)
 * get their impact from live 3D scenes. I said repeatedly that a model can't
 * produce one — true, and irrelevant, because it doesn't have to. The same
 * argument that justifies the section library applies here: write the scene
 * ONCE, by hand, and let generation pick between finished ones.
 *
 * Four scenes, each a real Three.js render loop:
 *
 *   particles  drifting point-field with depth parallax — dark archetypes
 *   waves      displaced plane, slow swell — organic/natural brands
 *   grid       perspective grid receding to a horizon — futuristic/tech
 *   orbs       slow-rotating translucent icosahedra — luxury/premium
 *
 * NON-NEGOTIABLES, because a 3D backdrop must never cost a lead:
 *
 *   - It is a BACKDROP. All of it sits behind content at a negative z-index,
 *     pointer-events:none, aria-hidden. It can never intercept a tap on the
 *     "call now" button.
 *   - No WebGL, no Three.js, or reduced-motion → the CSS gradient underneath
 *     is what shows. The page is complete without it; nothing is hidden
 *     waiting for a canvas that may never initialise.
 *   - Device pixel ratio is capped at 1.5 and geometry counts drop on small
 *     screens. A phone on mobile data should not burn battery on a hero.
 *   - The loop stops when the hero scrolls out of view and when the tab is
 *     hidden. An animation nobody is looking at is pure cost.
 */

export const WEBGL_CDN = `  <script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js" defer></script>`;

export const WEBGL_CSS = `
/* The canvas is a backdrop and nothing else. Negative z-index plus
   pointer-events:none means it cannot swallow a click on the CTA. */
.scene3d { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.scene3d canvas { display: block; width: 100%; height: 100%; }

/* Shown until — or instead of — WebGL. On a device without it, or with
   reduced motion, THIS is the hero background and the page looks finished. */
.scene3d__fallback {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%),
    radial-gradient(ellipse 70% 50% at 90% 20%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 55%),
    var(--bg);
}

.hero--3d { position: relative; isolation: isolate; overflow: hidden; }
.hero--3d > *:not(.scene3d) { position: relative; z-index: 1; }
`;

export const WEBGL_JS = `/* WebGL hero backdrops — see webglScenes.js. Degrades to a CSS gradient on
   any failure, so the hero is never blank. */
(function () {
  'use strict';

  var host = document.querySelector('[data-scene]');
  if (!host) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;                       // gradient fallback stays

  // Wait briefly for the deferred Three.js tag; give up quietly if blocked.
  var waited = 0;
  (function wait() {
    if (window.THREE) return init();
    if ((waited += 60) > 3000) return;       // CDN blocked — gradient stays
    setTimeout(wait, 60);
  })();

  function init() {
    var THREE = window.THREE;
    var kind = host.getAttribute('data-scene') || 'particles';
    var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#888888';

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch (e) {
      return;                                 // no WebGL — gradient stays
    }

    var small = window.innerWidth < 720;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    host.appendChild(renderer.domElement);

    // Measured, not assumed. This script is deferred, so it can run before
    // the hero has been laid out — host.clientWidth was 0 on a real load and
    // the canvas was sized 0x549, rendering the whole scene invisible. Fall
    // back through progressively coarser measurements and never accept 0.
    function measure() {
      var w = host.clientWidth || host.offsetWidth || host.getBoundingClientRect().width || window.innerWidth;
      var h = host.clientHeight || host.offsetHeight || host.getBoundingClientRect().height || Math.round(window.innerHeight * 0.8);
      return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
    }

    function resize() {
      var m = measure();
      camera.aspect = m.w / m.h;
      camera.updateProjectionMatrix();
      renderer.setSize(m.w, m.h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
    }

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
    camera.position.z = 14;
    resize();

    // Layout can settle after this runs (fonts, images, the hero's own grid).
    // A ResizeObserver corrects the canvas whenever that happens, which is
    // what a one-shot measurement at load cannot do.
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host);
    window.addEventListener('load', resize);

    var color = new THREE.Color(accent);
    var built = build(kind, THREE, scene, color, small);

    // Pointer parallax, damped. Mouse only — no motion tied to touch, which
    // would fight scrolling on a phone.
    var px = 0, py = 0, tx = 0, ty = 0;
    if (!small) {
      window.addEventListener('mousemove', function (e) {
        tx = (e.clientX / window.innerWidth - 0.5) * 2;
        ty = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    var running = true, raf = null, t0 = performance.now();

    function frame(now) {
      if (!running) return;
      var t = (now - t0) / 1000;
      px += (tx - px) * 0.04;
      py += (ty - py) * 0.04;
      built.update(t, px, py);
      camera.position.x = px * 1.6;
      camera.position.y = -py * 1.0;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; t0 = performance.now(); raf = requestAnimationFrame(frame); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

    // Stop when scrolled away or the tab is hidden — an animation nobody can
    // see is wasted battery.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }, { threshold: 0.01 }).observe(host);
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    }, { passive: true });

    running = false;
    start();
  }

  function build(kind, THREE, scene, color, small) {
    if (kind === 'waves') return waves(THREE, scene, color, small);
    if (kind === 'grid')  return grid(THREE, scene, color, small);
    if (kind === 'orbs')  return orbs(THREE, scene, color, small);
    return particles(THREE, scene, color, small);
  }

  /* Drifting point field. Depth gives parallax as the camera shifts. */
  function particles(THREE, scene, color, small) {
    var count = small ? 420 : 1100;
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 46;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: color, size: small ? 0.10 : 0.075,
      transparent: true, opacity: 0.75, sizeAttenuation: true, depthWrite: false
    }));
    scene.add(pts);
    return { update: function (t) { pts.rotation.y = t * 0.035; pts.rotation.x = Math.sin(t * 0.14) * 0.06; } };
  }

  /* A plane displaced into a slow swell. Wireframe so it reads as a
     structure rather than a solid, and stays cheap to draw. */
  function waves(THREE, scene, color, small) {
    var seg = small ? 26 : 46;
    var geo = new THREE.PlaneGeometry(56, 32, seg, seg);
    var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: color, wireframe: true, transparent: true, opacity: 0.24
    }));
    mesh.rotation.x = -Math.PI / 2.5;
    mesh.position.y = -3.5;
    scene.add(mesh);
    var base = geo.attributes.position.array.slice();
    return {
      update: function (t) {
        var a = geo.attributes.position.array;
        for (var i = 0; i < a.length; i += 3) {
          a[i + 2] = base[i + 2]
            + Math.sin((base[i] * 0.22) + t * 0.75) * 1.15
            + Math.cos((base[i + 1] * 0.26) + t * 0.55) * 0.85;
        }
        geo.attributes.position.needsUpdate = true;
      }
    };
  }

  /* Perspective grid receding to a horizon, scrolling toward the viewer. */
  function grid(THREE, scene, color, small) {
    var g = new THREE.GridHelper(70, small ? 22 : 40, color, color);
    g.material.transparent = true;
    g.material.opacity = 0.18;
    g.position.y = -6;
    scene.add(g);
    var g2 = g.clone();
    g2.position.y = 8;
    g2.material = g.material.clone();
    g2.material.opacity = 0.09;
    scene.add(g2);
    return {
      update: function (t) {
        g.position.z = (t * 2.2) % 3.5;
        g2.position.z = -(t * 1.4) % 3.5;
      }
    };
  }

  /* Slow-turning translucent icosahedra. Restrained — right for premium
     brands where motion should read as expensive, not busy. */
  function orbs(THREE, scene, color, small) {
    var group = new THREE.Group();
    var n = small ? 3 : 5;
    for (var i = 0; i < n; i++) {
      var m = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.6 + Math.random() * 2.4, 1),
        new THREE.MeshBasicMaterial({ color: color, wireframe: true, transparent: true, opacity: 0.20 })
      );
      m.position.set((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 14);
      m.userData.spin = 0.06 + Math.random() * 0.12;
      group.add(m);
    }
    scene.add(group);
    return {
      update: function (t) {
        group.rotation.y = t * 0.05;
        group.children.forEach(function (m, i) {
          m.rotation.x = t * m.userData.spin;
          m.rotation.y = t * m.userData.spin * 0.7;
          m.position.y += Math.sin(t * 0.5 + i) * 0.004;
        });
      }
    };
  }
})();
`;

// Which scene suits which archetype. Motion should agree with the brand:
// a receding neon grid is wrong for a landscaper, a slow swell is wrong for
// a crypto product.
const SCENE_BY_ARCHETYPE = {
    Futuristic: "grid",
    Luxury: "orbs",
    Editorial: "particles",
    Minimal: "particles",
    Corporate: "grid",
    Organic: "waves",
    Playful: "orbs",
    Bold: "grid",
};

export function sceneFor(archetype) {
    return SCENE_BY_ARCHETYPE[archetype] || "particles";
}
