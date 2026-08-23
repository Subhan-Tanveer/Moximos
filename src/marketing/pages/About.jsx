import { ArrowUpRight } from "lucide-react";
import PageHero from "../components/PageHero";
import CTAButton from "../components/CTAButton";
import { Eyebrow, Hairline, Section, SectionTitle, StatReadout } from "../components/Primitives";
import { FinalCTA } from "./Home";
import { revealScope, useGsapScope } from "../animations/useGsap";
import { useMotionPrefs } from "../animations/useMotionPrefs";

/* About is the slow page. Editorial measure, generous leading, one column,
   almost no motion — the pacing is the point. */

const BELIEFS = [
    {
        title: "Proof beats persuasion.",
        body: "Every hour spent writing a proposal is an hour spent asking someone to imagine something. Showing them the finished thing skips the imagination entirely — and the imagination is where deals die.",
    },
    {
        title: "The bottleneck was never the selling.",
        body: "Freelancers don't fail because they can't close. They fail because producing something worth showing takes a week, so they can only show a handful of people a month. Fix production and the pipeline stops being a numbers problem.",
    },
    {
        title: "Small businesses aren't the problem.",
        body: "A roofer with 214 five-star reviews and no website isn't lazy or cheap. They're busy, and every agency that approached them opened with a discovery call. Lead with the work and the conversation changes completely.",
    },
];

const MILESTONES = [
    { year: "The problem", body: "Six weeks of cold outreach for two replies. The work was good; nobody was seeing it." },
    { year: "The first hack", body: "Building a free demo site by hand before reaching out. Reply rate jumped — but each one took two days." },
    { year: "The realisation", body: "The demo was doing all the work. If the demo could be automated, the whole agency could be." },
    { year: "Moximos", body: "Scraping, building and sending, wired into one loop that runs whether or not anyone is watching it." },
];

export default function About() {
    const { animate } = useMotionPrefs();
    const scope = useGsapScope((self) => revealScope(self, { y: 24 }), { enabled: animate });

    return (
        <div ref={scope}>
            <PageHero
                eyebrow="About"
                tone="magenta"
                title="We built the thing we wished existed when we were the ones cold calling."
                lede="Moximos started as a workaround for a problem we had ourselves: the only outreach that ever worked was the kind that took too long to do at scale."
            />

            <Section className="pt-4">
                <div className="mx-auto max-w-3xl">
                    <div className="space-y-7 text-[1.1rem] leading-[1.85] text-dust" data-reveal>
                        <p>
                            The best-converting thing we ever sent was an email with a link to a website we'd
                            already built for someone who never asked for it. No pitch, no deck, no
                            "do you have fifteen minutes Thursday." Just: here's your business, online, have a
                            look.
                        </p>
                        <p>
                            It worked almost every time. It also took two full days per prospect, which meant we
                            could do it roughly twice a week, which meant it wasn't a business — it was a party
                            trick.
                        </p>
                        <p className="text-starlight">
                            So the question stopped being "how do we sell more websites" and became "how do we
                            make the two-day part take four minutes."
                        </p>
                        <p>
                            That's the whole company. Find the businesses where the gap is obvious, close the gap
                            before you introduce yourself, and let the work make the argument. Everything in
                            Moximos exists to compress that loop until one person can run it across a whole city
                            in an afternoon.
                        </p>
                    </div>

                    <Hairline className="my-14" />

                    <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
                        <StatReadout value="4 min" label="Was two days" tone="ion" />
                        <StatReadout value="1" label="Person needed" tone="magenta" />
                        <StatReadout value="0" label="Cold calls" tone="solar" />
                        <StatReadout value="∞" label="Cities" tone="starlight" />
                    </div>
                </div>
            </Section>

            {/* Beliefs */}
            <Section className="border-t border-white/6">
                <div className="mx-auto max-w-4xl">
                    <Eyebrow tone="violet">What we think is true</Eyebrow>
                    <SectionTitle className="mt-6">Three things the whole product rests on.</SectionTitle>

                    <div className="mt-14 space-y-12">
                        {BELIEFS.map((belief, i) => (
                            <div key={belief.title} data-reveal data-reveal-delay={i * 0.06}>
                                <div className="flex items-baseline gap-5">
                                    <span className="font-mono text-sm text-faint">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <h3 className="font-display text-[clamp(1.4rem,2.9vw,2.1rem)] text-starlight">
                                        {belief.title}
                                    </h3>
                                </div>
                                <p className="mt-4 max-w-2xl pl-10 text-[1.03rem] leading-[1.8] text-dust">
                                    {belief.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* How it got here */}
            <Section>
                <div className="mx-auto max-w-4xl">
                    <Eyebrow tone="ion">How it got here</Eyebrow>
                    <SectionTitle className="mt-6">Four steps, in the wrong order.</SectionTitle>

                    <ol className="mt-14 space-y-0">
                        {MILESTONES.map((m, i) => (
                            <li
                                key={m.year}
                                data-reveal
                                data-reveal-delay={i * 0.05}
                                className="grid gap-3 border-t border-white/8 py-7 sm:grid-cols-[200px_1fr] sm:gap-10"
                            >
                                <span className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-violet">
                                    {m.year}
                                </span>
                                <p className="text-[1.02rem] leading-relaxed text-dust">{m.body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </Section>

            {/* Where it's going */}
            <Section className="border-t border-white/6">
                <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
                    <Eyebrow tone="solar">Where it goes</Eyebrow>
                    <SectionTitle gradient>
                        One person should be able to out-produce an agency.
                    </SectionTitle>
                    <p className="max-w-2xl text-[1.05rem] leading-[1.8] text-dust">
                        Not by working harder or hiring — by owning a machine that does the part that never
                        scaled. That's the version of this we're building toward, and it's most of the way there
                        already.
                    </p>
                    <div className="mt-4">
                        <CTAButton to="/contact" variant="secondary" icon={ArrowUpRight}>
                            Talk to us
                        </CTAButton>
                    </div>
                </div>
            </Section>

            <FinalCTA
                eyebrow="Join in"
                title="Run it for a week and see."
                body="Start free. If it doesn't produce something worth sending, you've lost an afternoon."
            />
        </div>
    );
}
