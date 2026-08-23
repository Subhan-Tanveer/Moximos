import { useRef } from "react";
import { ArrowUpRight, ImageOff, Star, Timer } from "lucide-react";
import PageHero from "../components/PageHero";
import CTAButton from "../components/CTAButton";
import { Eyebrow, Section, SectionTitle } from "../components/Primitives";
import { FinalCTA } from "./Home";
import { gsap, useGsapScope } from "../animations/useGsap";
import { useMotionPrefs } from "../animations/useMotionPrefs";
import { SHOWCASE_ITEMS } from "../data/content";

/* ─────────────────────────────────────────────────────────────
   MOCKS
   Both sides are drawn procedurally from each item's palette
   rather than shipped as screenshots — they stay sharp at any
   size, theme correctly, and cost nothing to download.
   ───────────────────────────────────────────────────────────── */

/** What the prospect has today: nothing, or something broken. */
function BeforeMock({ item }) {
    return (
        <div className="flex h-full w-full flex-col bg-[#0B0B0E]">
            <div className="flex items-center gap-2 border-b border-white/6 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="ml-3 truncate font-mono text-[0.66rem] text-faint/70">
                    no website found
                </span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center grayscale">
                <ImageOff size={30} className="text-white/15" />
                <p className="max-w-xs text-[0.9rem] leading-relaxed text-white/30">{item.before}</p>
                <div className="mt-2 flex items-center gap-2 rounded-full border border-white/8 px-3 py-1.5">
                    <Star size={11} className="fill-white/25 text-white/25" />
                    <span className="font-mono text-[0.68rem] text-white/30">
                        Great business. Invisible online.
                    </span>
                </div>
            </div>
        </div>
    );
}

/** What Moximos publishes: a full site, in that business's palette. */
function AfterMock({ item }) {
    const [deep, accent] = item.palette;

    return (
        <div className="flex h-full w-full flex-col" style={{ backgroundColor: deep }}>
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="ml-3 truncate font-mono text-[0.66rem]" style={{ color: accent }}>
                    moximos.com/{item.business.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 22)}
                </span>
            </div>

            <div className="flex-1 overflow-hidden p-5 sm:p-7">
                {/* Nav */}
                <div className="flex items-center justify-between">
                    <div className="h-2.5 w-20 rounded-full" style={{ backgroundColor: accent, opacity: 0.9 }} />
                    <div className="hidden gap-2.5 sm:flex">
                        {[26, 22, 30, 18].map((w, i) => (
                            <div key={i} className="h-1.5 rounded-full bg-white/25" style={{ width: w }} />
                        ))}
                    </div>
                </div>

                {/* Hero */}
                <div
                    className="mt-5 rounded-lg p-5 sm:p-6"
                    style={{ background: `linear-gradient(135deg, ${accent}38 0%, transparent 70%)` }}
                >
                    <div className="h-3 w-4/5 rounded-full bg-white/85" />
                    <div className="mt-2.5 h-3 w-3/5 rounded-full bg-white/60" />
                    <div className="mt-4 h-2 w-2/3 rounded-full bg-white/25" />
                    <div
                        className="mt-5 h-7 w-28 rounded-full"
                        style={{ backgroundColor: accent, opacity: 0.95 }}
                    />
                </div>

                {/* Services */}
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="rounded-lg bg-white/[0.07] p-3">
                            <div
                                className="h-4 w-4 rounded"
                                style={{ backgroundColor: accent, opacity: 0.75 }}
                            />
                            <div className="mt-2.5 h-1.5 w-full rounded-full bg-white/30" />
                            <div className="mt-1.5 h-1.5 w-2/3 rounded-full bg-white/15" />
                        </div>
                    ))}
                </div>

                {/* Review strip */}
                <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-white/[0.06] px-3.5 py-3">
                    <div className="flex gap-0.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <Star key={i} size={9} style={{ color: accent, fill: accent }} />
                        ))}
                    </div>
                    <div className="h-1.5 flex-1 rounded-full bg-white/20" />
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   SPLIT REVEAL
   The "after" is stacked on top of the "before" and clipped from
   the right. Scroll drives the clip open, so the new site literally
   wipes over the old one, with a lit seam riding the boundary.
   ───────────────────────────────────────────────────────────── */
function ShowcaseItem({ item, index }) {
    const { animate } = useMotionPrefs();
    const afterRef = useRef(null);
    const seamRef = useRef(null);

    const scope = useGsapScope(
        (self) => {
            const track = self.selector("[data-showcase-track]")[0];
            const proxy = { p: 0 };

            gsap.to(proxy, {
                p: 1,
                ease: "none",
                scrollTrigger: { trigger: track, start: "top 72%", end: "bottom 78%", scrub: 0.7 },
                onUpdate: () => {
                    const pct = (1 - proxy.p) * 100;
                    afterRef.current.style.clipPath = `inset(0 ${pct}% 0 0)`;
                    seamRef.current.style.left = `${proxy.p * 100}%`;
                    seamRef.current.style.opacity = proxy.p > 0.01 && proxy.p < 0.99 ? "1" : "0";
                },
            });
        },
        { enabled: animate, deps: [item.business] }
    );

    return (
        <section ref={scope} className="border-t border-white/6">
            <div data-showcase-track className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 md:py-28 lg:px-12">
                <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <span className="label-mono">
                            {String(index + 1).padStart(2, "0")} · {item.niche} · {item.city}
                        </span>
                        <h2 className="font-display mt-3 text-[clamp(1.7rem,3.8vw,2.8rem)] text-starlight">
                            {item.business}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5">
                        <Timer size={12} className="text-ion" />
                        <span className="font-mono text-[0.72rem] text-dust">Built in {item.buildTime}</span>
                    </div>
                </div>

                {/* Stage */}
                <div className="glass-panel relative aspect-[16/10] w-full overflow-hidden rounded-2xl sm:aspect-[16/9]">
                    <div className="absolute inset-0">
                        <BeforeMock item={item} />
                    </div>

                    <div
                        ref={afterRef}
                        className="absolute inset-0"
                        style={{ clipPath: animate ? "inset(0 100% 0 0)" : "inset(0 0% 0 0)" }}
                    >
                        <AfterMock item={item} />
                    </div>

                    {/* Lit seam riding the wipe boundary */}
                    <div
                        ref={seamRef}
                        className="pointer-events-none absolute inset-y-0 w-[2px] opacity-0"
                        style={{
                            left: "0%",
                            background: "linear-gradient(to bottom, transparent, #4CE0FF, transparent)",
                            boxShadow: "0 0 22px 5px rgba(76,224,255,0.6)",
                        }}
                        aria-hidden="true"
                    />

                    {/* Corner tags */}
                    <span className="pointer-events-none absolute left-4 top-14 rounded-full border border-white/12 bg-void/70 px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider text-faint backdrop-blur-sm">
                        Before
                    </span>
                    <span className="pointer-events-none absolute right-4 top-14 rounded-full border border-ion/35 bg-void/70 px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider text-ion backdrop-blur-sm">
                        After
                    </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                        <p className="label-mono">Before</p>
                        <p className="mt-2 text-[0.92rem] leading-relaxed text-dust">{item.before}</p>
                    </div>
                    <div className="rounded-xl border border-ion/20 bg-ion/[0.04] p-4">
                        <p className="label-mono text-ion/70">After</p>
                        <p className="mt-2 text-[0.92rem] leading-relaxed text-starlight">{item.after}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default function Showcase() {
    return (
        <>
            <PageHero
                eyebrow="Showcase"
                tone="magenta"
                title="Same business. Four minutes apart."
                lede="Every one of these was a Google Maps listing with great reviews and no website worth visiting. Scroll each one to wipe from what they had to what Moximos published for them."
            >
                <div className="flex flex-col gap-3.5 sm:flex-row">
                    <CTAButton to="/signup" icon={ArrowUpRight}>
                        Build one for free
                    </CTAButton>
                    <CTAButton to="/ai-website-builder" variant="secondary">
                        How the builder works
                    </CTAButton>
                </div>
            </PageHero>

            {SHOWCASE_ITEMS.map((item, i) => (
                <ShowcaseItem key={item.business} item={item} index={i} />
            ))}

            <Section className="border-t border-white/6">
                <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
                    <Eyebrow tone="ion">Why it closes</Eyebrow>
                    <SectionTitle>Nobody argues with something that already exists.</SectionTitle>
                    <p className="max-w-2xl text-[1.05rem] leading-relaxed text-dust">
                        A proposal asks someone to imagine an outcome and trust you to deliver it. A finished site
                        removes both. By the time they reply, the only thing left to discuss is price.
                    </p>
                </div>
            </Section>

            <FinalCTA
                eyebrow="Make one"
                title="Pick a business. See what it builds."
                body="Start free and put a real site in front of a real prospect tonight."
            />
        </>
    );
}
