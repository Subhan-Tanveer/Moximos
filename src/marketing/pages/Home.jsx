import { useEffect, useRef } from "react";
import { ArrowUpRight, ArrowDown, Radar, Sparkles, Send, Quote } from "lucide-react";
import CTAButton from "../components/CTAButton";
import OrbitLogo from "../components/OrbitLogo";
import { Eyebrow, Hairline, Lede, Section, SectionTitle, StatReadout, TiltCard } from "../components/Primitives";
import { gsap, materializeHeading, revealScope, useGsapScope } from "../animations/useGsap";
import { useMotionPrefs } from "../animations/useMotionPrefs";
import { scrollTo } from "../animations/useSmoothScroll";
import { ENGINES, HOME_STATS, NICHES, TESTIMONIALS } from "../data/content";

const ENGINE_ICONS = { scrape: Radar, build: Sparkles, send: Send };

const TONE = {
    ion: { text: "text-ion", ring: "border-ion/35", glow: "rgba(76,224,255,0.45)", fill: "bg-ion" },
    violet: { text: "text-violet", ring: "border-violet/35", glow: "rgba(139,92,246,0.45)", fill: "bg-violet" },
    solar: { text: "text-solar", ring: "border-solar/35", glow: "rgba(255,184,76,0.45)", fill: "bg-solar" },
};

/* ─────────────────────────────────────────────────────────────
   HERO
   ───────────────────────────────────────────────────────────── */
function Hero() {
    const headingRef = useRef(null);
    const { animate } = useMotionPrefs();

    useEffect(() => {
        if (!animate || !headingRef.current) return undefined;
        // Fires immediately rather than on scroll — the hero is already in view
        // and the assembly IS the first impression.
        const cleanup = materializeHeading(headingRef.current, { stagger: 0.06, delay: 0.15 });
        return cleanup;
    }, [animate]);

    const scope = useGsapScope(
        () => {
            gsap.fromTo(
                "[data-hero-fade]",
                { opacity: 0, y: 26 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 1.1,
                    ease: "power3.out",
                    stagger: 0.11,
                    delay: 0.75,
                }
            );
            gsap.fromTo(
                "[data-hero-mark]",
                { opacity: 0, scale: 0.72 },
                { opacity: 1, scale: 1, duration: 1.4, ease: "expo.out" }
            );
        },
        { enabled: animate }
    );

    return (
        <section
            ref={scope}
            className="relative flex min-h-[100svh] flex-col items-center justify-center px-5 pb-20 pt-32 text-center sm:px-8"
        >
            <div data-hero-mark className={animate ? "opacity-0" : ""}>
                <OrbitLogo size={44} />
            </div>

            <div data-hero-fade className={`mt-8 ${animate ? "opacity-0" : ""}`}>
                <Eyebrow tone="violet">The agency machine</Eyebrow>
            </div>

            <h1
                ref={headingRef}
                className="font-display mx-auto mt-7 max-w-5xl text-[clamp(2.6rem,8vw,6.5rem)] text-starlight"
            >
                Send them their website before you ever say hello.
            </h1>

            <p
                data-hero-fade
                className={`mx-auto mt-8 max-w-2xl text-[1.08rem] leading-relaxed text-dust md:text-[1.22rem] ${
                    animate ? "opacity-0" : ""
                }`}
            >
                Moximos finds the businesses that need a website, builds each one a custom site with AI, and
                emails it to them from your inbox. You just take the calls.
            </p>

            <div
                data-hero-fade
                className={`mt-11 flex flex-col items-center gap-3.5 sm:flex-row ${animate ? "opacity-0" : ""}`}
            >
                <CTAButton to="/signup" size="lg" icon={ArrowUpRight}>
                    Start free
                </CTAButton>
                <CTAButton to="/showcase" variant="secondary" size="lg">
                    See a site it built
                </CTAButton>
            </div>

            {/* Mission-control readout: names the three engines before the
                visitor has scrolled once. */}
            <div
                data-hero-fade
                className={`mt-16 flex flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:gap-x-5 ${
                    animate ? "opacity-0" : ""
                }`}
            >
                {ENGINES.map((engine, i) => (
                    <div key={engine.id} className="flex items-center gap-3 sm:gap-5">
                        <div className="glass-panel flex items-center gap-2.5 rounded-full px-4 py-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${TONE[engine.tone].fill}`} />
                            <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-dust">
                                {engine.title}
                            </span>
                        </div>
                        {i < ENGINES.length - 1 && (
                            <span className="hidden h-px w-6 bg-gradient-to-r from-white/25 to-white/5 sm:block" />
                        )}
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={() => scrollTo("#engines")}
                data-hero-fade
                className={`group absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 ${
                    animate ? "opacity-0" : ""
                }`}
                aria-label="Scroll to how it works"
            >
                <span className="label-mono transition-colors group-hover:text-dust">Scroll</span>
                <ArrowDown
                    size={15}
                    className="animate-bounce text-faint transition-colors group-hover:text-starlight"
                />
            </button>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
   NICHE MARQUEE
   ───────────────────────────────────────────────────────────── */
function NicheMarquee() {
    const row = [...NICHES, ...NICHES];
    return (
        <div className="relative border-y border-white/8 bg-abyss/40 py-5 backdrop-blur-sm">
            <div className="masked-marquee overflow-hidden">
                <div className="animate-marquee">
                    {row.map((niche, i) => (
                        <span key={`${niche}-${i}`} className="flex items-center gap-8 px-8">
                            <span className="font-mono text-[0.78rem] uppercase tracking-[0.2em] text-faint">
                                {niche}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-violet/45" />
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   ENGINE FLY-THROUGH
   A tall scroll track with a sticky stage. As the visitor scrolls,
   each engine panel warps in from depth, holds, then blows past the
   camera — so the three engines read as stations you fly between.
   ───────────────────────────────────────────────────────────── */
function EngineOrbit({ progressRef }) {
    return (
        <svg
            viewBox="0 0 620 620"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[125vmin] w-[125vmin] -translate-x-1/2 -translate-y-1/2 opacity-60"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="orbit-a" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#4CE0FF" stopOpacity="0.75" />
                    <stop offset="55%" stopColor="#8B5CF6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#C23FDB" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="orbit-b" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C23FDB" stopOpacity="0.6" />
                    <stop offset="60%" stopColor="#5B3AA0" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#4CE0FF" stopOpacity="0" />
                </linearGradient>
            </defs>

            <g ref={progressRef} style={{ transformOrigin: "310px 310px" }}>
                <ellipse cx="310" cy="310" rx="296" ry="112" stroke="url(#orbit-a)" strokeWidth="1" fill="none" />
                <ellipse
                    cx="310"
                    cy="310"
                    rx="296"
                    ry="112"
                    stroke="url(#orbit-b)"
                    strokeWidth="1"
                    fill="none"
                    transform="rotate(60 310 310)"
                />
                <ellipse
                    cx="310"
                    cy="310"
                    rx="296"
                    ry="112"
                    stroke="url(#orbit-a)"
                    strokeWidth="1"
                    fill="none"
                    transform="rotate(120 310 310)"
                />
                <ellipse
                    cx="310"
                    cy="310"
                    rx="196"
                    ry="196"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1"
                    strokeDasharray="3 9"
                    fill="none"
                />
            </g>
        </svg>
    );
}

function EnginePanel({ engine, index, pinned = false }) {
    const Icon = ENGINE_ICONS[engine.id];
    const tone = TONE[engine.tone];

    return (
        <article
            data-engine-panel
            // Pinned: every panel stacks on the same spot and GSAP fades between
            // them. Unpinned (mobile / reduced motion): they're just three cards
            // in normal flow, all visible.
            className={
                pinned
                    ? "absolute inset-x-0 top-1/2 mx-auto w-full max-w-3xl -translate-y-1/2 px-5 sm:px-8"
                    : "relative mx-auto w-full max-w-3xl"
            }
            style={pinned && index !== 0 ? { opacity: 0 } : undefined}
        >
            <div className="glass-panel noise-overlay relative overflow-hidden rounded-3xl p-7 sm:p-11">
                <div
                    className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"
                    style={{ background: tone.glow }}
                    aria-hidden="true"
                />

                <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <span
                            className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-white/[0.04] ${tone.ring} ${tone.text}`}
                        >
                            <Icon size={19} />
                        </span>
                        <div className="text-left">
                            <span className="label-mono block">{engine.code}</span>
                            <span className={`font-display text-2xl ${tone.text}`}>{engine.title}</span>
                        </div>
                    </div>
                    <span className="font-mono text-4xl font-light text-white/10 sm:text-6xl">{engine.index}</span>
                </div>

                <h3 className="font-display mt-8 text-left text-[clamp(1.6rem,3.4vw,2.5rem)] text-starlight">
                    {engine.headline}
                </h3>
                <p className="mt-5 text-left text-[1rem] leading-relaxed text-dust sm:text-[1.08rem]">
                    {engine.body}
                </p>
                <p className={`mt-4 text-left text-[0.95rem] font-medium ${tone.text}`}>{engine.detail}</p>

                <Hairline className="my-7" />

                <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-left sm:grid-cols-4">
                    {engine.readouts.map((r) => (
                        <div key={r.label}>
                            <dt className="label-mono">{r.label}</dt>
                            <dd className="mt-1.5 font-mono text-[0.9rem] text-starlight">{r.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </article>
    );
}

function EngineSequence() {
    const { cinematic } = useMotionPrefs();
    const orbitRef = useRef(null);
    const railRefs = useRef([]);

    const scope = useGsapScope(
        (self) => {
            const panels = self.selector("[data-engine-panel]");
            const track = self.selector("[data-engine-track]")[0];
            const stage = self.selector("[data-engine-stage]")[0];

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: track,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 0.7,
                },
            });

            const SEG = 1; // one time-unit per engine
            panels.forEach((panel, i) => {
                const at = i * SEG;

                if (i > 0) {
                    // Warp in from depth.
                    tl.fromTo(
                        panel,
                        { opacity: 0, scale: 0.74, y: 90, filter: "blur(16px)" },
                        {
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            filter: "blur(0px)",
                            duration: SEG * 0.42,
                            ease: "power2.out",
                        },
                        at
                    );
                }

                if (i < panels.length - 1) {
                    // Blow past the camera.
                    tl.to(
                        panel,
                        {
                            opacity: 0,
                            scale: 1.42,
                            y: -110,
                            filter: "blur(18px)",
                            duration: SEG * 0.4,
                            ease: "power2.in",
                        },
                        at + SEG * 0.6
                    );
                }

                // Rail indicator tracks the active engine.
                const rail = railRefs.current[i];
                if (rail) {
                    tl.to(rail, { scaleY: 1, opacity: 1, duration: SEG * 0.3 }, at);
                    if (i < panels.length - 1) {
                        tl.to(rail, { opacity: 0.28, duration: SEG * 0.3 }, at + SEG * 0.7);
                    }
                }
            });

            // Orbit rotates through the whole descent.
            if (orbitRef.current) {
                tl.fromTo(orbitRef.current, { rotate: 0 }, { rotate: 132, ease: "none", duration: SEG * panels.length }, 0);
            }

            // Subtle push-in on the whole stage sells the forward camera move.
            if (stage) {
                tl.fromTo(stage, { scale: 0.96 }, { scale: 1.05, ease: "none", duration: SEG * panels.length }, 0);
            }
        },
        { enabled: cinematic }
    );

    return (
        <section id="engines" ref={scope} className="relative">
            {/* Static heading above the fly-through. */}
            <Section className="pb-0 text-center">
                <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
                    <Eyebrow tone="ion">Three engines, one pipeline</Eyebrow>
                    <SectionTitle gradient>Scrape. Build. Send.</SectionTitle>
                    <Lede className="text-center">
                        Most tools give you one piece and leave you to bolt the rest together. Moximos runs the
                        whole chain — from an empty city to a booked call — without you in the middle of it.
                    </Lede>
                </div>
            </Section>

            {/* Scroll track: height controls how long the fly-through lasts.
                Below 768px, or with reduced motion, this collapses to three
                plain stacked cards — a pinned full-height stage on a phone
                clips its own content and costs the most scroll jank. */}
            {cinematic ? (
                <div data-engine-track className="relative h-[300vh]">
                    <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
                        <EngineOrbit progressRef={orbitRef} />

                        {/* Progress rail */}
                        <div className="absolute left-5 top-1/2 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
                            {ENGINES.map((engine, i) => (
                                <div key={engine.id} className="flex items-center gap-3">
                                    <span
                                        ref={(el) => (railRefs.current[i] = el)}
                                        className={`h-10 w-[2px] origin-top rounded-full ${TONE[engine.tone].fill}`}
                                        style={{ transform: "scaleY(0.25)", opacity: i === 0 ? 1 : 0.28 }}
                                    />
                                    <span className="label-mono">{engine.index}</span>
                                </div>
                            ))}
                        </div>

                        <div data-engine-stage className="relative h-full w-full">
                            {ENGINES.map((engine, i) => (
                                <EnginePanel key={engine.id} engine={engine} index={i} pinned />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <Section>
                    <div className="flex flex-col gap-6">
                        {ENGINES.map((engine, i) => (
                            <EnginePanel key={engine.id} engine={engine} index={i} />
                        ))}
                    </div>
                </Section>
            )}
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
   STATS
   ───────────────────────────────────────────────────────────── */
function Stats() {
    const { animate } = useMotionPrefs();
    const scope = useGsapScope((self) => revealScope(self), { enabled: animate });

    return (
        <section ref={scope} className="relative">
            <Section className="py-20 md:py-24">
                <div className="glass-panel grid grid-cols-2 gap-x-6 gap-y-10 rounded-3xl px-7 py-11 sm:px-11 lg:grid-cols-4">
                    {HOME_STATS.map((stat) => (
                        <StatReadout key={stat.label} value={stat.value} label={stat.label} tone={stat.tone} />
                    ))}
                </div>
            </Section>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
   PROOF — what the prospect actually receives
   ───────────────────────────────────────────────────────────── */
function ProofSection() {
    const { animate } = useMotionPrefs();
    const scope = useGsapScope((self) => revealScope(self), { enabled: animate });

    return (
        <section ref={scope}>
            <Section>
                <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
                    <div className="flex flex-col items-start gap-6">
                        <Eyebrow tone="solar">What lands in their inbox</Eyebrow>
                        <SectionTitle>
                            They open a website that already has their name on it.
                        </SectionTitle>
                        <Lede>
                            No deck. No discovery call. No "can I show you some examples?" — just a short note and
                            a link to a finished site built for their business, their reviews, their trade.
                        </Lede>
                        <Lede>
                            That's a fundamentally different conversation. You're not asking them to imagine what
                            you could do. You're asking what they think of what you already did.
                        </Lede>
                        <div className="mt-2">
                            <CTAButton to="/showcase" variant="secondary" icon={ArrowUpRight}>
                                Browse the gallery
                            </CTAButton>
                        </div>
                    </div>

                    {/* Mock email — the actual artefact the prospect receives. */}
                    <TiltCard className="group" intensity={6}>
                        <div className="glass-panel noise-overlay relative overflow-hidden rounded-2xl" data-reveal>
                            <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                                <span className="ml-3 font-mono text-[0.7rem] text-faint">New message</span>
                            </div>

                            <div className="space-y-4 px-6 py-6 text-left sm:px-8">
                                <div className="space-y-1.5 font-mono text-[0.76rem] text-faint">
                                    <p>
                                        <span className="text-dust">To:</span> hillcountryroofing@gmail.com
                                    </p>
                                    <p>
                                        <span className="text-dust">Subject:</span> built you something (2 min look)
                                    </p>
                                </div>

                                <Hairline />

                                <div className="space-y-3.5 text-[0.95rem] leading-relaxed text-dust">
                                    <p>Hi — saw Hill Country Roofing has 214 five-star reviews and no website.</p>
                                    <p>
                                        That bugged me, so I built you one. It's live, nothing to sign up for, just
                                        click it:
                                    </p>
                                    <p className="font-mono text-[0.88rem] text-ion underline decoration-ion/40 underline-offset-4">
                                        moximos.com/hillcountryroofing
                                    </p>
                                    <p>If you like it, it's yours. If not, no hard feelings.</p>
                                    <p className="text-faint">— Marcus</p>
                                </div>
                            </div>
                        </div>
                    </TiltCard>
                </div>
            </Section>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
   TESTIMONIALS
   ───────────────────────────────────────────────────────────── */
function SocialProof() {
    const { animate } = useMotionPrefs();
    const scope = useGsapScope((self) => revealScope(self), { enabled: animate });

    return (
        <section ref={scope}>
            <Section>
                <div className="mx-auto mb-16 flex max-w-3xl flex-col items-center gap-6 text-center">
                    <Eyebrow tone="magenta">Subscribers</Eyebrow>
                    <SectionTitle>People who stopped cold calling.</SectionTitle>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {TESTIMONIALS.map((t, i) => (
                        <TiltCard key={t.name} className="group" intensity={5}>
                            <figure
                                data-reveal
                                data-reveal-delay={i * 0.09}
                                className="glass-panel glass-panel-hover flex h-full flex-col rounded-2xl p-7"
                            >
                                <Quote size={20} className="text-violet/70" />
                                <blockquote className="mt-5 flex-1 text-[1rem] leading-relaxed text-starlight">
                                    {t.quote}
                                </blockquote>
                                <Hairline className="my-6" />
                                <figcaption className="flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-[0.92rem] font-semibold text-starlight">{t.name}</p>
                                        <p className="mt-0.5 text-[0.8rem] text-faint">{t.role}</p>
                                    </div>
                                    <span className="whitespace-nowrap font-mono text-[0.72rem] text-solar">
                                        {t.stat}
                                    </span>
                                </figcaption>
                            </figure>
                        </TiltCard>
                    ))}
                </div>
            </Section>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
   CLOSING CTA
   ───────────────────────────────────────────────────────────── */
export function FinalCTA({
    eyebrow = "Ready when you are",
    title = "Pick a city. Let it run.",
    body = "Start free, scrape your first list, and watch the AI build sites for businesses in your area tonight.",
}) {
    const { animate } = useMotionPrefs();
    const scope = useGsapScope((self) => revealScope(self), { enabled: animate });

    return (
        <section ref={scope} className="relative">
            <Section className="py-28 md:py-40">
                <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-7 text-center">
                    <div
                        // Capped below 100vw on purpose: a centred element wider
                        // than the viewport pushes the document scroll width out
                        // on both sides. body{overflow-x:hidden} would mask it,
                        // but that's unreliable on iOS Safari.
                        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[620px] max-w-[88vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-45 blur-[100px]"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(91,58,160,0.85) 0%, rgba(194,63,219,0.35) 45%, transparent 70%)",
                        }}
                        aria-hidden="true"
                    />
                    <div className="relative flex flex-col items-center gap-7">
                        <Eyebrow tone="solar">{eyebrow}</Eyebrow>
                        <SectionTitle gradient className="max-w-3xl">
                            {title}
                        </SectionTitle>
                        <Lede className="text-center">{body}</Lede>
                        <div className="mt-3 flex flex-col items-center gap-3.5 sm:flex-row" data-reveal>
                            <CTAButton to="/signup" size="lg" icon={ArrowUpRight}>
                                Start free
                            </CTAButton>
                            <CTAButton to="/pricing" variant="secondary" size="lg">
                                See pricing
                            </CTAButton>
                        </div>
                        <p className="label-mono mt-2" data-reveal>
                            No card required · Cancel anytime
                        </p>
                    </div>
                </div>
            </Section>
        </section>
    );
}

export default function Home() {
    return (
        <>
            <Hero />
            <NicheMarquee />
            <EngineSequence />
            <Stats />
            <ProofSection />
            <SocialProof />
            <FinalCTA />
        </>
    );
}
