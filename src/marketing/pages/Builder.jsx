import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import {
    ArrowUpRight,
    CheckCircle2,
    CircleDashed,
    Code2,
    FileCode2,
    Loader2,
    ShieldCheck,
    Sparkles,
    Rocket,
} from "lucide-react";
import PageHero from "../components/PageHero";
import CTAButton from "../components/CTAButton";
import { Eyebrow, Hairline, Lede, Section, SectionTitle, TiltCard } from "../components/Primitives";
import { FinalCTA } from "./Home";
import { revealScope, useGsapScope } from "../animations/useGsap";
import { useMotionPrefs } from "../animations/useMotionPrefs";

/* The agent roster mirrors the real pipeline in src/app/server/services:
   a planning pass, a per-file code pass, then validation and repair. */
const AGENTS = [
    {
        icon: FileCode2,
        name: "Planner",
        code: "AGENT-01",
        body: "Reads the business — trade, city, review themes, tone — and writes the file plan: which pages exist, which components each one needs, what the site is actually for.",
        tone: "ion",
    },
    {
        icon: Code2,
        name: "Builder",
        code: "AGENT-02",
        body: "Writes every file in the plan as production React, in parallel. Real components, real copy about that specific business, real responsive layout — not a template with the name swapped.",
        tone: "violet",
    },
    {
        icon: ShieldCheck,
        name: "Validator",
        code: "AGENT-03",
        body: "Compiles the result, catches broken imports, missing files and malformed JSX, and sends anything defective back to be rewritten before a human ever sees it.",
        tone: "magenta",
    },
];

const TONE = {
    ion: "text-ion border-ion/30",
    violet: "text-violet border-violet/30",
    magenta: "text-magenta border-magenta/30",
};

const BUILD_FILES = [
    "/App.js",
    "/components/Header.js",
    "/components/Hero.js",
    "/components/Services.js",
    "/components/Reviews.js",
    "/components/Gallery.js",
    "/components/Contact.js",
    "/components/Footer.js",
    "/styles.css",
];

/* ─────────────────────────────────────────────────────────────
   LIVE BUILD SIMULATION
   A running dramatisation of what the builder does, built from the
   same file list and states the real AgentProgressDashboard tracks.
   Cheap to render and never goes stale, unlike a screen recording.
   ───────────────────────────────────────────────────────────── */
function BuildSimulation() {
    const { animate } = useMotionPrefs();
    const [step, setStep] = useState(animate ? 0 : BUILD_FILES.length);

    useEffect(() => {
        if (!animate) return undefined;
        const id = window.setInterval(() => {
            setStep((s) => (s >= BUILD_FILES.length + 2 ? 0 : s + 1));
        }, 900);
        return () => window.clearInterval(id);
    }, [animate]);

    const done = Math.min(step, BUILD_FILES.length);
    const pct = Math.round((done / BUILD_FILES.length) * 100);
    const finished = step > BUILD_FILES.length;

    return (
        <div className="flex h-full flex-col bg-abyss">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-3 truncate font-mono text-[0.68rem] text-faint">
                    moximos.com/hillcountryroofing
                </span>
            </div>

            <div className="grid flex-1 grid-cols-1 sm:grid-cols-[1.1fr_1fr]">
                {/* Agent progress */}
                <div className="border-white/8 p-5 sm:border-r">
                    <div className="flex items-center gap-2.5">
                        {finished ? (
                            <Rocket size={15} className="text-solar" />
                        ) : (
                            <Loader2 size={15} className="animate-spin text-violet" />
                        )}
                        <span className="text-[0.85rem] font-semibold text-starlight">
                            {finished ? "Published" : "AI agent is building…"}
                        </span>
                    </div>
                    <p className="mt-1 font-mono text-[0.66rem] text-faint">
                        Hill Country Roofing Co. · Austin, TX
                    </p>

                    <div className="mt-5">
                        <div className="mb-2 flex justify-between">
                            <span className="label-mono">Progress</span>
                            <span className="font-mono text-[0.68rem] text-dust">{pct}%</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-ion to-violet transition-[width] duration-700 ease-out"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>

                    <ul className="mt-5 space-y-2 overflow-hidden">
                        {BUILD_FILES.map((file, i) => {
                            const state = i < done ? "done" : i === done && !finished ? "active" : "idle";
                            return (
                                <li key={file} className="flex items-center gap-2.5">
                                    {state === "done" ? (
                                        <CheckCircle2 size={12} className="shrink-0 text-ion" />
                                    ) : state === "active" ? (
                                        <Loader2 size={12} className="shrink-0 animate-spin text-violet" />
                                    ) : (
                                        <CircleDashed size={12} className="shrink-0 text-faint/50" />
                                    )}
                                    <span
                                        className={`truncate font-mono text-[0.7rem] transition-colors duration-500 ${
                                            state === "idle" ? "text-faint/60" : "text-dust"
                                        }`}
                                    >
                                        {file}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Preview pane */}
                <div className="relative hidden overflow-hidden p-5 sm:block">
                    <span className="label-mono">Live preview</span>
                    <div className="mt-3 space-y-2.5">
                        <div
                            className="h-16 rounded-lg bg-gradient-to-br from-ion/25 to-violet/10 transition-opacity duration-700"
                            style={{ opacity: done > 1 ? 1 : 0.12 }}
                        />
                        <div
                            className="h-2.5 w-3/4 rounded bg-white/12 transition-opacity duration-700"
                            style={{ opacity: done > 2 ? 1 : 0.12 }}
                        />
                        <div
                            className="h-2.5 w-1/2 rounded bg-white/8 transition-opacity duration-700"
                            style={{ opacity: done > 2 ? 1 : 0.12 }}
                        />
                        <div className="grid grid-cols-3 gap-2 pt-1.5">
                            {[3, 4, 5].map((n) => (
                                <div
                                    key={n}
                                    className="h-12 rounded-lg bg-white/[0.07] transition-opacity duration-700"
                                    style={{ opacity: done > n ? 1 : 0.12 }}
                                />
                            ))}
                        </div>
                        <div
                            className="h-10 rounded-lg bg-gradient-to-r from-violet/22 to-magenta/12 transition-opacity duration-700"
                            style={{ opacity: done > 6 ? 1 : 0.12 }}
                        />
                    </div>

                    {finished && (
                        <div className="absolute inset-x-5 bottom-5 rounded-lg border border-solar/35 bg-solar/10 px-3.5 py-2.5">
                            <p className="font-mono text-[0.66rem] text-solar">
                                ✓ Live · built in 3m 51s
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   FLOATING DEVICE FRAME
   Tilts back as it enters the viewport and levels out as it centres,
   plus a small mouse-driven yaw. The scroll component is what makes
   it feel like an object in the scene rather than a screenshot.
   ───────────────────────────────────────────────────────────── */
function DeviceFrame({ children }) {
    const ref = useRef(null);
    const { animate } = useMotionPrefs();

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });

    // Tilted → flat → tilted the other way, as it passes through.
    const scrollRotateX = useTransform(scrollYProgress, [0, 0.5, 1], [17, 0, -12]);
    const scrollY = useTransform(scrollYProgress, [0, 0.5, 1], [50, 0, -40]);
    const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.94, 1, 0.97]);

    const rx = useSpring(scrollRotateX, { stiffness: 120, damping: 26 });
    const ty = useSpring(scrollY, { stiffness: 120, damping: 26 });
    const sc = useSpring(scale, { stiffness: 120, damping: 26 });

    const mouseYaw = useMotionValue(0);
    const ry = useSpring(mouseYaw, { stiffness: 150, damping: 22 });

    const onMove = (e) => {
        if (!animate || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mouseYaw.set(((e.clientX - (r.left + r.width / 2)) / r.width) * 14);
    };

    return (
        <div
            ref={ref}
            onPointerMove={onMove}
            onPointerLeave={() => mouseYaw.set(0)}
            style={{ perspective: 1600 }}
            className="relative mx-auto w-full max-w-5xl"
        >
            {/* Under-glow: the frame reads as hovering above the void. */}
            <div
                className="pointer-events-none absolute inset-x-10 bottom-0 h-40 opacity-60 blur-[70px]"
                style={{
                    background:
                        "radial-gradient(ellipse at center, rgba(139,92,246,0.75) 0%, rgba(76,224,255,0.28) 45%, transparent 72%)",
                }}
                aria-hidden="true"
            />

            <motion.div
                style={
                    animate
                        ? { rotateX: rx, rotateY: ry, y: ty, scale: sc, transformStyle: "preserve-3d" }
                        : undefined
                }
                className="glass-panel relative aspect-[16/10] overflow-hidden rounded-2xl shadow-[0_50px_120px_-30px_rgba(0,0,0,0.95)]"
            >
                {children}
            </motion.div>
        </div>
    );
}

export default function Builder() {
    const { animate } = useMotionPrefs();
    const scope = useGsapScope((self) => revealScope(self), { enabled: animate });

    return (
        <div ref={scope}>
            <PageHero
                eyebrow="AI Website Builder"
                tone="violet"
                title="A real site for every lead, in about four minutes."
                lede="Not a template with their logo dropped in. A multi-agent system reads the business, plans the architecture, writes every component, and validates the code before it ships — one custom site per prospect, at a scale no human agency can match."
            >
                <div className="flex flex-col gap-3.5 sm:flex-row">
                    <CTAButton to="/signup" icon={ArrowUpRight}>
                        Build your first site
                    </CTAButton>
                    <CTAButton to="/showcase" variant="secondary">
                        See finished sites
                    </CTAButton>
                </div>
            </PageHero>

            <Section className="py-8 md:py-12" container={false}>
                <div className="px-5 sm:px-8 lg:px-12">
                    <DeviceFrame>
                        <BuildSimulation />
                    </DeviceFrame>
                </div>
            </Section>

            {/* Agent roster */}
            <Section>
                <div className="mx-auto mb-16 flex max-w-3xl flex-col items-center gap-6 text-center">
                    <Eyebrow tone="violet">Inside the build</Eyebrow>
                    <SectionTitle gradient>Three agents, one codebase.</SectionTitle>
                    <Lede className="text-center">
                        Splitting the work is what makes the output usable. One model asked to write a whole
                        website in a single pass produces something that looks right and doesn't compile. Three
                        specialists checking each other produce something you can actually send.
                    </Lede>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {AGENTS.map((agent, i) => (
                        <TiltCard key={agent.name} className="group" intensity={6}>
                            <div
                                data-reveal
                                data-reveal-delay={i * 0.09}
                                className="glass-panel glass-panel-hover flex h-full flex-col rounded-2xl p-7"
                            >
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-white/[0.04] ${
                                            TONE[agent.tone]
                                        }`}
                                    >
                                        <agent.icon size={19} />
                                    </span>
                                    <span className="label-mono">{agent.code}</span>
                                </div>
                                <h3 className="font-display mt-6 text-2xl text-starlight">{agent.name}</h3>
                                <p className="mt-3.5 text-[0.96rem] leading-relaxed text-dust">{agent.body}</p>
                            </div>
                        </TiltCard>
                    ))}
                </div>
            </Section>

            {/* What ships */}
            <Section className="border-t border-white/6">
                <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
                    <div>
                        <Eyebrow tone="ion">What actually ships</Eyebrow>
                        <SectionTitle className="mt-6">
                            Every site is a real codebase, and it's yours.
                        </SectionTitle>
                        <Lede className="mt-6">
                            Sites publish instantly to a live URL with no login wall, so a prospect can look at
                            theirs the second they open your email. When they say yes, you export the whole
                            project as a React codebase and host it wherever you want.
                        </Lede>
                        <div className="mt-9">
                            <CTAButton to="/pricing" variant="secondary" icon={ArrowUpRight}>
                                See what's included
                            </CTAButton>
                        </div>
                    </div>

                    <ul className="grid gap-4 sm:grid-cols-2">
                        {[
                            ["Fully responsive", "Every breakpoint handled, not just the desktop mock."],
                            ["Animated by default", "Scroll reveals and motion built in, not bolted on."],
                            ["Their real content", "Trade, city, reviews and hours pulled from the listing."],
                            ["Live URL instantly", "moximos.com/theirbusiness, no signup to view."],
                            ["Editable without code", "Change copy, colours and sections in the builder."],
                            ["Exportable project", "Download the React source as a zip whenever you like."],
                        ].map(([title, body], i) => (
                            <li
                                key={title}
                                data-reveal
                                data-reveal-delay={i * 0.06}
                                className="glass-panel rounded-xl p-5"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Sparkles size={14} className="text-violet" />
                                    <h3 className="text-[0.95rem] font-semibold text-starlight">{title}</h3>
                                </div>
                                <p className="mt-2 text-[0.88rem] leading-relaxed text-dust">{body}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </Section>

            {/* Revision loop */}
            <Section>
                <div className="glass-panel noise-overlay relative overflow-hidden rounded-3xl p-8 sm:p-12">
                    <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
                        <div>
                            <Eyebrow tone="magenta">Revisions</Eyebrow>
                            <h2 className="font-display mt-5 text-[clamp(1.7rem,3.6vw,2.7rem)] text-starlight">
                                "Make the hero darker and add a financing section."
                            </h2>
                            <p className="mt-5 max-w-2xl text-[1rem] leading-relaxed text-dust">
                                Ask in plain English. The revision agent reads the existing codebase, works out
                                which files need to change, rewrites only those, and re-validates — so a small
                                change stays a small change instead of regenerating the whole site.
                            </p>
                        </div>
                        <Hairline className="lg:hidden" />
                        <div className="flex flex-col gap-3 font-mono text-[0.72rem] text-faint lg:min-w-[220px]">
                            {[
                                ["Diff", "3 files changed"],
                                ["Untouched", "6 files"],
                                ["Re-validated", "Pass"],
                                ["Turnaround", "~40s"],
                            ].map(([k, v]) => (
                                <div key={k} className="flex items-center justify-between gap-6 border-b border-white/8 pb-2.5">
                                    <span>{k}</span>
                                    <span className="text-starlight">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Section>

            <FinalCTA
                eyebrow="See it build"
                title="Watch it build a site for a business near you."
                body="Start free, drop in a business name, and watch the agents write the whole thing in real time."
            />
        </div>
    );
}
