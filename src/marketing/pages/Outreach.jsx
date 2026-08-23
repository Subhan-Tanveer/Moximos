import { useRef } from "react";
import { ArrowUpRight, Inbox, Mail, ShieldCheck, Timer, UserCheck } from "lucide-react";
import PageHero from "../components/PageHero";
import CTAButton from "../components/CTAButton";
import { Eyebrow, Hairline, Lede, Section, SectionTitle } from "../components/Primitives";
import { FinalCTA } from "./Home";
import { gsap, revealScope, useGsapScope } from "../animations/useGsap";
import { useMotionPrefs } from "../animations/useMotionPrefs";

const BEAM_PATH = "M110 250 C 300 90, 700 90, 890 250";

const STATIONS = [
    {
        icon: UserCheck,
        title: "Your Gmail, not ours",
        body: "You connect the account once with Google's own OAuth screen. Messages send from your address, replies come back to your inbox, and your domain — not a shared sending pool — carries the reputation.",
        tone: "solar",
    },
    {
        icon: Mail,
        title: "Written for that one business",
        body: "The message references what their reviews actually say, the fact they have no site, and the link to the one Moximos just built them. Nothing about it reads like a merge field.",
        tone: "violet",
    },
    {
        icon: Timer,
        title: "Paced like a person",
        body: "Sends are throttled and spread across working hours with randomised gaps. No 200-at-once blast, because that's what gets an address flagged.",
        tone: "ion",
    },
    {
        icon: Inbox,
        title: "Replies land where you already are",
        body: "There's no separate inbox to babysit. They reply to your email like anyone else emailing you, and you answer from your phone.",
        tone: "magenta",
    },
];

const TONE = {
    solar: "text-solar border-solar/30",
    violet: "text-violet border-violet/30",
    ion: "text-ion border-ion/30",
    magenta: "text-magenta border-magenta/30",
};

/* ─────────────────────────────────────────────────────────────
   TRANSMISSION
   The beam draws itself as the section scrolls past and the two
   stations light up in sequence — so the graphic tells the story
   at the pace the visitor reads it, rather than looping regardless.
   ───────────────────────────────────────────────────────────── */
function Transmission() {
    const { animate } = useMotionPrefs();
    const beamRef = useRef(null);

    const scope = useGsapScope(
        (self) => {
            const beam = beamRef.current;
            const section = self.selector("[data-transmission]")[0];
            const length = beam.getTotalLength();

            gsap.set(beam, { strokeDasharray: length, strokeDashoffset: length });

            gsap.to(beam, {
                strokeDashoffset: 0,
                ease: "none",
                scrollTrigger: { trigger: section, start: "top 78%", end: "bottom 62%", scrub: 0.8 },
            });

            gsap.fromTo(
                self.selector("[data-station-source]"),
                { opacity: 0.35, scale: 0.9 },
                {
                    opacity: 1,
                    scale: 1,
                    ease: "power2.out",
                    scrollTrigger: { trigger: section, start: "top 78%", end: "top 50%", scrub: 0.8 },
                }
            );

            gsap.fromTo(
                self.selector("[data-station-target]"),
                { opacity: 0.35, scale: 0.9 },
                {
                    opacity: 1,
                    scale: 1,
                    ease: "power2.out",
                    scrollTrigger: { trigger: section, start: "center 68%", end: "bottom 62%", scrub: 0.8 },
                }
            );
        },
        { enabled: animate }
    );

    return (
        <div ref={scope} data-transmission className="relative">
            <svg
                viewBox="0 0 1000 340"
                className="w-full"
                role="img"
                aria-label="A message travelling from your Gmail account to a business inbox"
            >
                <defs>
                    <linearGradient id="beam-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#FFB84C" />
                        <stop offset="45%" stopColor="#C23FDB" />
                        <stop offset="100%" stopColor="#4CE0FF" />
                    </linearGradient>
                    <filter id="beam-glow" x="-30%" y="-60%" width="160%" height="260%">
                        <feGaussianBlur stdDeviation="7" result="b" />
                        <feMerge>
                            <feMergeNode in="b" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Faint guide, so the arc exists before it's drawn */}
                <path d={BEAM_PATH} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />

                {/* Scroll-drawn beam */}
                <path
                    ref={beamRef}
                    d={BEAM_PATH}
                    fill="none"
                    stroke="url(#beam-grad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    filter="url(#beam-glow)"
                />

                {/* Packets in flight */}
                {[0, 1.6, 3.2].map((delay) => (
                    <g key={delay}>
                        <circle r="4.5" fill="#FFB84C">
                            <animateMotion dur="4.8s" begin={`${delay}s`} repeatCount="indefinite" path={BEAM_PATH} />
                        </circle>
                        <circle r="11" fill="#FFB84C" opacity="0.18">
                            <animateMotion dur="4.8s" begin={`${delay}s`} repeatCount="indefinite" path={BEAM_PATH} />
                        </circle>
                    </g>
                ))}

                {/* Source station */}
                <g data-station-source style={{ transformOrigin: "110px 250px" }}>
                    <circle cx="110" cy="250" r="46" fill="rgba(255,184,76,0.07)" stroke="rgba(255,184,76,0.4)" />
                    <circle
                        cx="110"
                        cy="250"
                        r="62"
                        fill="none"
                        stroke="rgba(255,184,76,0.14)"
                        className="animate-pulse-glow"
                        style={{ transformOrigin: "110px 250px" }}
                    />
                    <circle cx="110" cy="250" r="9" fill="#FFB84C" />
                    <text x="110" y="322" textAnchor="middle" fill="#A5A5B8" fontSize="13" fontFamily="ui-monospace, monospace" letterSpacing="2">
                        YOUR GMAIL
                    </text>
                </g>

                {/* Target station */}
                <g data-station-target style={{ transformOrigin: "890px 250px" }}>
                    <circle cx="890" cy="250" r="46" fill="rgba(76,224,255,0.07)" stroke="rgba(76,224,255,0.4)" />
                    <circle
                        cx="890"
                        cy="250"
                        r="62"
                        fill="none"
                        stroke="rgba(76,224,255,0.14)"
                        className="animate-pulse-glow"
                        style={{ animationDelay: "1.4s", transformOrigin: "890px 250px" }}
                    />
                    <circle cx="890" cy="250" r="9" fill="#4CE0FF" />
                    <text x="890" y="322" textAnchor="middle" fill="#A5A5B8" fontSize="13" fontFamily="ui-monospace, monospace" letterSpacing="2">
                        THEIR INBOX
                    </text>
                </g>

                {/* Payload label riding the apex */}
                <text x="500" y="128" textAnchor="middle" fill="#6B6B80" fontSize="12" fontFamily="ui-monospace, monospace" letterSpacing="2.5">
                    moximos.com/hillcountryroofing
                </text>
            </svg>
        </div>
    );
}

export default function Outreach() {
    const { animate } = useMotionPrefs();
    const scope = useGsapScope((self) => revealScope(self), { enabled: animate });

    return (
        <div ref={scope}>
            <PageHero
                eyebrow="Outreach Automation"
                tone="solar"
                title="The pitch sends itself, from your own inbox."
                lede="Connect Gmail once. From then on, every site the AI builds gets delivered to the business it was built for — from your address, at a human pace, with replies coming straight back to you."
            >
                <div className="flex flex-col gap-3.5 sm:flex-row">
                    <CTAButton to="/signup" icon={ArrowUpRight}>
                        Connect Gmail
                    </CTAButton>
                    <CTAButton to="/how-it-works" variant="secondary">
                        See the full pipeline
                    </CTAButton>
                </div>
            </PageHero>

            <Section className="py-10 md:py-16">
                <Transmission />
            </Section>

            {/* Stations */}
            <Section className="pt-0">
                <div className="mb-14 max-w-3xl">
                    <Eyebrow tone="solar">How the send works</Eyebrow>
                    <SectionTitle className="mt-6">Automated, but not automated-looking.</SectionTitle>
                    <Lede className="mt-6">
                        The reason this works is that nothing about it looks like software. It's your address,
                        your name, a message about their business specifically, and a link to something real.
                    </Lede>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    {STATIONS.map((station, i) => (
                        <div
                            key={station.title}
                            data-reveal
                            data-reveal-delay={i * 0.08}
                            className="glass-panel glass-panel-hover rounded-2xl p-7"
                        >
                            <span
                                className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-white/[0.04] ${
                                    TONE[station.tone]
                                }`}
                            >
                                <station.icon size={19} />
                            </span>
                            <h3 className="font-display mt-6 text-2xl text-starlight">{station.title}</h3>
                            <p className="mt-3.5 text-[0.97rem] leading-relaxed text-dust">{station.body}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* The message itself */}
            <Section className="border-t border-white/6">
                <div className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
                    <div>
                        <Eyebrow tone="violet">The message</Eyebrow>
                        <SectionTitle className="mt-6">Short enough to actually get read.</SectionTitle>
                        <Lede className="mt-6">
                            Four sentences, one link, no attachment, no calendar embed, no pitch. The site does
                            the selling — the email just has to get them to click once.
                        </Lede>

                        <Hairline className="my-8" />

                        <dl className="space-y-4">
                            {[
                                ["Average length", "62 words"],
                                ["Links", "One — the demo site"],
                                ["Attachments", "None"],
                                ["Send window", "9am–4pm, their timezone"],
                            ].map(([k, v]) => (
                                <div key={k} className="flex items-center justify-between border-b border-white/8 pb-3">
                                    <dt className="label-mono">{k}</dt>
                                    <dd className="font-mono text-[0.85rem] text-starlight">{v}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    <div data-reveal className="glass-panel noise-overlay relative overflow-hidden rounded-2xl">
                        <div className="flex items-center justify-between border-b border-white/8 px-6 py-3.5">
                            <span className="flex items-center gap-2.5">
                                <Mail size={14} className="text-solar" />
                                <span className="font-mono text-[0.7rem] text-dust">Sending as you</span>
                            </span>
                            <span className="flex items-center gap-1.5 font-mono text-[0.66rem] text-ion">
                                <ShieldCheck size={11} />
                                OAuth connected
                            </span>
                        </div>

                        <div className="space-y-4 px-6 py-7 sm:px-8">
                            <div className="space-y-1.5 font-mono text-[0.74rem] text-faint">
                                <p>
                                    <span className="text-dust">From:</span> you@youragency.com
                                </p>
                                <p>
                                    <span className="text-dust">To:</span> info@sonorancooling.com
                                </p>
                                <p>
                                    <span className="text-dust">Subject:</span> built you a new site (took 4 min)
                                </p>
                            </div>

                            <Hairline />

                            <div className="space-y-3.5 text-[0.96rem] leading-relaxed text-dust">
                                <p>Hi — 502 reviews at 4.8 stars is genuinely rare for HVAC in Phoenix.</p>
                                <p>
                                    Your site doesn't really show that, so I rebuilt it. It's live already, nothing
                                    to sign up for:
                                </p>
                                <p className="font-mono text-[0.88rem] text-ion underline decoration-ion/40 underline-offset-4">
                                    moximos.com/sonorancooling
                                </p>
                                <p>Have a look on your phone — that's where most of your calls come from.</p>
                                <p className="text-faint">— Dylan</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Guardrails */}
            <Section>
                <div className="glass-panel rounded-3xl p-8 sm:p-12">
                    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
                        <div>
                            <Eyebrow tone="ion">Guardrails</Eyebrow>
                            <h2 className="font-display mt-5 text-[clamp(1.7rem,3.4vw,2.5rem)] text-starlight">
                                Your address is the asset. It gets protected like one.
                            </h2>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[
                                ["Daily cap", "Stays well under Gmail's limit"],
                                ["Randomised gaps", "No detectable send rhythm"],
                                ["One touch per business", "No sequences, no chasing"],
                                ["Instant opt-out", "One reply and they're excluded"],
                                ["Bounce handling", "Dead addresses auto-removed"],
                                ["Full send log", "Every message, timestamped"],
                            ].map(([title, body]) => (
                                <div key={title} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                                    <p className="text-[0.9rem] font-semibold text-starlight">{title}</p>
                                    <p className="mt-1.5 text-[0.82rem] leading-relaxed text-dust">{body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Section>

            <FinalCTA
                eyebrow="Send the first one"
                title="Let it introduce you."
                body="Connect Gmail, pick a list, and let the sites you built go find their owners."
            />
        </div>
    );
}
