import { useRef } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import PageHero from "../components/PageHero";
import CTAButton from "../components/CTAButton";
import { Eyebrow, Hairline, Section } from "../components/Primitives";
import { BuildVisual, ScrapeVisual, SendVisual } from "../components/StageVisuals";
import { FinalCTA } from "./Home";
import { gsap, useGsapScope } from "../animations/useGsap";
import { useMotionPrefs } from "../animations/useMotionPrefs";
import { ENGINES } from "../data/content";

const VISUALS = { scrape: ScrapeVisual, build: BuildVisual, send: SendVisual };

const TONE = {
    ion: { text: "text-ion", border: "border-ion/30", flare: "rgba(76,224,255,0.55)" },
    violet: { text: "text-violet", border: "border-violet/30", flare: "rgba(139,92,246,0.55)" },
    solar: { text: "text-solar", border: "border-solar/30", flare: "rgba(255,184,76,0.55)" },
};

const STEPS = {
    scrape: [
        "Choose a city and a niche — or a whole metro and six niches at once.",
        "Moximos sweeps Google Maps for every matching business listing.",
        "Filters to 4.0★ and up with 50 or more reviews, so demand is already proven.",
        "Checks each one for a website, then grades what it finds: missing, broken, or badly out of date.",
        "Drops the qualified list into Lead Explorer with phone, hours, rating and review count attached.",
    ],
    build: [
        "A planning agent reads the business — trade, location, reviews, tone — and writes the site architecture.",
        "A code agent generates every component: hero, services, gallery, reviews, contact.",
        "A validation agent compiles the result, catches broken imports and missing files, and repairs them.",
        "The site publishes to moximos.com/theirbusiness with no login wall in front of it.",
        "You review it in the builder and change anything you want before it goes out.",
    ],
    send: [
        "Connect the Gmail account you want the outreach to come from.",
        "Moximos drafts a short, specific message referencing their reviews and their missing site.",
        "The link to their finished demo site goes in the body — nothing to sign up for.",
        "Sending is throttled and spaced across the day so it behaves like a person, not a blast.",
        "Replies land in your normal inbox. You take it from there.",
    ],
};

/* ─────────────────────────────────────────────────────────────
   STAGE
   Each stage owns a tall scroll track with a sticky panel inside.
   On exit the panel drops, shrinks and blurs while a thruster flare
   fires beneath it — the "stage separation" read.
   ───────────────────────────────────────────────────────────── */
function Stage({ engine, position, total }) {
    const Visual = VISUALS[engine.id];
    const tone = TONE[engine.tone];
    const { cinematic } = useMotionPrefs();
    const flareRef = useRef(null);

    const scope = useGsapScope(
        (self) => {
            const track = self.selector("[data-stage-track]")[0];
            const panel = self.selector("[data-stage-panel]")[0];
            const steps = self.selector("[data-step]");
            const isLast = position === total - 1;

            // Steps illuminate one by one through the first half of the track.
            gsap.fromTo(
                steps,
                { opacity: 0.25, x: -12 },
                {
                    opacity: 1,
                    x: 0,
                    stagger: 0.5,
                    ease: "none",
                    scrollTrigger: { trigger: track, start: "top top", end: "60% bottom", scrub: 0.6 },
                }
            );

            if (isLast) return;

            gsap.to(panel, {
                y: 130,
                scale: 0.86,
                opacity: 0,
                filter: "blur(12px)",
                ease: "power2.in",
                scrollTrigger: { trigger: track, start: "72% center", end: "bottom top", scrub: 0.8 },
            });

            gsap.fromTo(
                flareRef.current,
                { opacity: 0, scaleY: 0.2 },
                {
                    opacity: 1,
                    scaleY: 1,
                    ease: "power1.out",
                    scrollTrigger: { trigger: track, start: "72% center", end: "88% center", scrub: 0.8 },
                }
            );
        },
        { enabled: cinematic, deps: [engine.id] }
    );

    const content = (
        <div
            data-stage-panel
            className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12"
        >
            <div>
                <div className="flex items-center gap-4">
                    <span className={`font-mono text-6xl font-light ${tone.text} opacity-30 sm:text-7xl`}>
                        {engine.index}
                    </span>
                    <div>
                        <span className="label-mono block">{engine.code}</span>
                        <span className={`font-display text-3xl ${tone.text}`}>{engine.title}</span>
                    </div>
                </div>

                <h2 className="font-display mt-7 text-[clamp(1.8rem,4vw,3rem)] text-starlight">
                    {engine.headline}
                </h2>
                <p className="mt-5 max-w-xl text-[1.03rem] leading-relaxed text-dust">{engine.body}</p>

                <Hairline className="my-8" />

                <ol className="space-y-4">
                    {STEPS[engine.id].map((step, i) => (
                        <li key={step} data-step className="flex items-start gap-3.5">
                            <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${tone.border} ${tone.text}`}
                            >
                                <Check size={11} strokeWidth={3} />
                            </span>
                            <span className="text-[0.96rem] leading-relaxed text-dust">
                                <span className="font-mono text-[0.72rem] text-faint">
                                    {String(i + 1).padStart(2, "0")}
                                </span>{" "}
                                {step}
                            </span>
                        </li>
                    ))}
                </ol>
            </div>

            <div className="relative">
                <div className="glass-panel noise-overlay relative aspect-square w-full overflow-hidden rounded-3xl p-6 sm:p-10">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-45 blur-3xl"
                        style={{ background: `radial-gradient(circle at 50% 40%, ${tone.flare}, transparent 62%)` }}
                        aria-hidden="true"
                    />
                    <div className="relative h-full w-full">
                        <Visual />
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {engine.readouts.map((r) => (
                        <div key={r.label} className="glass-panel rounded-xl px-3.5 py-3">
                            <p className="label-mono">{r.label}</p>
                            <p className="mt-1 font-mono text-[0.8rem] text-starlight">{r.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // Mobile and reduced-motion get the same content as a plain stacked
    // section — no pin, no separation, nothing that can clip.
    if (!cinematic) {
        return <section className="border-t border-white/6 py-16 md:py-20">{content}</section>;
    }

    return (
        <section ref={scope} className="relative">
            <div data-stage-track className="relative h-[210vh]">
                <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden py-24">
                    {content}

                    <div
                        ref={flareRef}
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 origin-bottom opacity-0"
                        style={{
                            background: `linear-gradient(to top, ${tone.flare}, transparent 78%)`,
                            filter: "blur(28px)",
                        }}
                        aria-hidden="true"
                    />
                </div>
            </div>
        </section>
    );
}

export default function HowItWorks() {
    return (
        <>
            <PageHero
                eyebrow="How it works"
                tone="ion"
                title="Three stages. One button. No cold calls."
                lede="Each stage hands off to the next automatically. You set the city and the niche, and the pipeline runs from an empty list to a booked call without you in the middle of it."
            >
                <div className="flex flex-col gap-3.5 sm:flex-row">
                    <CTAButton to="/signup" icon={ArrowUpRight}>
                        Start free
                    </CTAButton>
                    <CTAButton to="/lead-explorer" variant="secondary">
                        See real leads
                    </CTAButton>
                </div>
            </PageHero>

            {ENGINES.map((engine, i) => (
                <Stage key={engine.id} engine={engine} position={i} total={ENGINES.length} />
            ))}

            <Section className="border-t border-white/6">
                <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
                    <Eyebrow tone="magenta">And then it repeats</Eyebrow>
                    <h2 className="font-display text-[clamp(1.9rem,4.4vw,3.2rem)] text-starlight">
                        Scrape Monday. Builds run overnight. Outreach goes Tuesday.
                    </h2>
                    <p className="max-w-2xl text-[1.05rem] leading-relaxed text-dust">
                        One city per week is enough to keep a calendar full. The whole loop takes about twenty
                        minutes of your actual attention — the rest is the machine working while you do something
                        else.
                    </p>
                </div>
            </Section>

            <FinalCTA
                eyebrow="Run the loop"
                title="Your first list is twenty minutes away."
                body="Start free, pick a city, and let the pipeline build its first sites tonight."
            />
        </>
    );
}
