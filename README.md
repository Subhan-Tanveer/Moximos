# Moximos

Marketing site + product shell for Moximos — the done-for-you agency machine
(scrape Google Maps → AI-build a demo site → send it from your Gmail).

## Commands

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static bundle into dist/
npm run preview  # serve dist/ locally to check the production build
```

## Structure

```
src/
├── main.jsx              entry
├── router.jsx            all routes, every page code-split
├── index.css             Tailwind v4 @theme — the space palette lives here
├── marketing/            the public site
│   ├── MarketingLayout   nav + footer + persistent backdrop + smooth scroll
│   ├── pages/            Home, HowItWorks, Builder, LeadExplorer, Outreach,
│   │                     Showcase, Pricing, About, Contact, NotFound
│   ├── scenes/           SpaceBackdrop (picks WebGL vs CSS) + StarfieldScene
│   ├── components/       Nav, Footer, CTAButton, OrbitLogo, Primitives, …
│   ├── animations/       motion prefs, Lenis, GSAP helpers, shared motion state
│   └── data/content.js   all marketing copy and sample data
└── app/                  the product (pre-existing code, preserved)
    ├── api.js            axios client + localStorage-backed mock adapter
    ├── AppShell.jsx      dashboard mounted at /app
    ├── AuthLayout.jsx    brand shell for login/signup
    ├── pages/            Login, Signup
    ├── components/       AgentProgressDashboard
    ├── utils/            exportProject, sandpackUtils
    └── server/services/  AI pipeline modules (Node-side, not bundled)
```

## Motion and performance

`useMotionPrefs()` is the single gate for everything animated:

| flag        | condition                                        | controls                        |
|-------------|--------------------------------------------------|---------------------------------|
| `animate`   | no reduced-motion **and** tab visible             | all GSAP/Framer choreography    |
| `cinematic` | `animate` **and** ≥768px                          | pinned scroll sequences         |
| `webgl`     | `cinematic` **and** a real WebGL context          | the three.js starfield          |

Below 768px, or with `prefers-reduced-motion`, the WebGL scene is replaced by a
pure-CSS starfield and pinned sequences fall back to stacked sections. Nothing
is ever hidden by CSS — GSAP applies hidden "from" states only when frames are
actually available, so content can't get stranded invisible (this also covers
pages opened into a background tab, where `requestAnimationFrame` is suspended).

three.js is behind a dynamic import and is deliberately **not** in
`manualChunks` — naming it there pulls it into the entry graph and Vite emits a
modulepreload for it, forcing ~217 kB gzip on every visitor. Initial payload is
~178 kB gzipped; the 225 kB scene chunk loads only where it's used.

## Deploying to Hostinger

1. `npm run build`
2. Upload the **contents** of `dist/` to `public_html/` (hPanel File Manager,
   FTP, or Git deploy).

`public/.htaccess` ships with the build and is required: without its rewrite
rule, only `/` works and every deep link (`/pricing`, a refresh on `/showcase`)
returns 404. It also sets immutable caching on hashed assets and no-cache on
`index.html`.

## Not wired up yet

These need a decision or a real backend — each is marked in the source:

- **Contact form** — `CONTACT_ENDPOINT` in `marketing/pages/Contact.jsx` is
  empty, so submitting composes the message in the visitor's mail client. Set it
  to a Formspree URL or your own API route to take submissions server-side.
- **Auth** — `Login`/`Signup` POST to `/api/auth/login` and `/api/auth/register`.
  Those are currently answered by the mock adapter at the bottom of `app/api.js`.
  Point `VITE_BASE_URL` at the real backend and delete that adapter block.
- **The AI generation backend** — `app/server/services/*` are Node modules and
  are not part of this static bundle. They need to run as a separate service;
  the static site does not host them.
- **Builder page demo** — the device frame currently runs a live simulation of
  the build pipeline. Swap in a screen capture when one exists.
