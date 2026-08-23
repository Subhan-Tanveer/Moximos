import { useState } from "react";
import { ArrowUpRight, Check, ChevronDown } from "lucide-react";
import PageHero from "../components/PageHero";
import CTAButton from "../components/CTAButton";
import { Eyebrow, Hairline, Section, SectionTitle, TiltCard } from "../components/Primitives";
import { FinalCTA } from "./Home";
import { revealScope, useGsapScope } from "../animations/useGsap";
import { useMotionPrefs } from "../animations/useMotionPrefs";
import { PRICING_FAQ, PRICING_TIERS } from "../data/content";

/* Pricing is the page that has to convert, so the motion budget here is
   deliberately small: a hover tilt and a reveal, nothing that delays reading. */

function TierCard({ tier, annual }) {
    const price = annual ? Math.round(tier.price * 0.8) : tier.price;

    return (
        <TiltCard className="group h-full" intensity={tier.highlight ? 6 : 4}>
            <div
                data-reveal
                className={`relative flex h-full flex-col overflow-hidden rounded-3xl p-7 sm:p-8 ${
                    tier.highlight
                        ? "border border-violet/45 bg-gradient-to-b from-violet/[0.14] to-white/[0.02]"
                        : "glass-panel"
                }`}
            >
                {tier.highlight && (
                    <>
                        <div
                            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet/35 blur-3xl"
                            aria-hidden="true"
                        />
                        <span className="absolute right-6 top-6 rounded-full bg-violet/25 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-starlight ring-1 ring-violet/40">
                            Most picked
                        </span>
                    </>
                )}

                <div className="relative">
                    <span className="label-mono">{tier.code}</span>
                    <h2 className="font-display mt-2.5 text-3xl text-starlight">{tier.name}</h2>
                    <p className="mt-2 text-[0.92rem] leading-relaxed text-dust">{tier.tagline}</p>

                    <div className="mt-7 flex items-end gap-1.5">
                        <span className="font-mono text-[3rem] font-light leading-none text-starlight">
                            ${price}
                        </span>
                        <span className="pb-1.5 font-mono text-[0.8rem] text-faint">/mo</span>
                    </div>
                    {annual && (
                        <p className="mt-2 font-mono text-[0.7rem] text-solar">
                            ${price * 12} billed yearly · save ${(tier.price - price) * 12}
                        </p>
                    )}

                    <div className="mt-7">
                        <CTAButton
                            to={tier.cta === "Talk to us" ? "/contact" : "/signup"}
                            variant={tier.highlight ? "primary" : "secondary"}
                            className="w-full"
                            icon={ArrowUpRight}
                        >
                            {tier.cta}
                        </CTAButton>
                    </div>

                    <Hairline className="my-7" />

                    <ul className="space-y-3">
                        {tier.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2.5">
                                <Check
                                    size={14}
                                    strokeWidth={2.5}
                                    className={`mt-0.5 shrink-0 ${
                                        tier.highlight ? "text-violet" : "text-ion"
                                    }`}
                                />
                                <span className="text-[0.92rem] leading-relaxed text-dust">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </TiltCard>
    );
}

function FaqItem({ item, open, onToggle }) {
    return (
        <div className="border-b border-white/8">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-6 py-5 text-left"
            >
                <span className="text-[1.02rem] font-medium text-starlight">{item.q}</span>
                <ChevronDown
                    size={17}
                    className={`shrink-0 text-faint transition-transform duration-400 ${
                        open ? "rotate-180 text-violet" : ""
                    }`}
                />
            </button>
            {/* Grid-rows trick: animates height without measuring the content. */}
            <div
                className="grid transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
                <div className="overflow-hidden">
                    <p className="pb-6 pr-10 text-[0.96rem] leading-relaxed text-dust">{item.a}</p>
                </div>
            </div>
        </div>
    );
}

export default function Pricing() {
    const { animate } = useMotionPrefs();
    const [annual, setAnnual] = useState(false);
    const [openFaq, setOpenFaq] = useState(0);
    const scope = useGsapScope((self) => revealScope(self), { enabled: animate });

    return (
        <div ref={scope}>
            <PageHero
                eyebrow="Pricing"
                tone="solar"
                align="center"
                title="One subscription. However many clients you want."
                lede="Moximos is your cost of production, not a per-site fee. What you charge on top of it is entirely your call — most subscribers cover a month in their first close."
            >
                {/* Billing toggle */}
                <div className="flex justify-center">
                    <div className="glass-panel inline-flex items-center gap-1 rounded-full p-1">
                        {[
                            { id: false, label: "Monthly" },
                            { id: true, label: "Yearly · −20%" },
                        ].map((option) => (
                            <button
                                key={String(option.id)}
                                type="button"
                                onClick={() => setAnnual(option.id)}
                                aria-pressed={annual === option.id}
                                className={`rounded-full px-5 py-2 text-[0.85rem] font-medium transition-all duration-300 ${
                                    annual === option.id
                                        ? "bg-white/12 text-starlight"
                                        : "text-dust hover:text-starlight"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </PageHero>

            <Section className="pt-0">
                <div className="grid items-stretch gap-6 lg:grid-cols-3">
                    {PRICING_TIERS.map((tier) => (
                        <TierCard key={tier.name} tier={tier} annual={annual} />
                    ))}
                </div>

                <p className="mt-8 text-center font-mono text-[0.75rem] text-faint">
                    All tiers include the Lead Engine, the AI Website Builder and the Outreach Engine. No setup
                    fee. Cancel from the dashboard at any time.
                </p>
            </Section>

            {/* Unit economics */}
            <Section className="border-t border-white/6">
                <div className="glass-panel noise-overlay relative overflow-hidden rounded-3xl p-8 sm:p-12">
                    <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
                        <div>
                            <Eyebrow tone="solar">The maths</Eyebrow>
                            <SectionTitle className="mt-5">One client covers the year.</SectionTitle>
                            <p className="mt-5 max-w-lg text-[1.02rem] leading-relaxed text-dust">
                                A single website build at the low end of what subscribers charge pays for more
                                than a year of Orbit. Everything after that is margin — and the pipeline doesn't
                                stop producing while you're delivering.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {[
                                ["Orbit, yearly", "$2,851", "text-dust"],
                                ["One build at $3,500", "+$3,500", "text-ion"],
                                ["A $400/mo retainer, 12 months", "+$4,800", "text-ion"],
                                ["Net, on two clients", "$5,449", "text-solar"],
                            ].map(([label, value, tone], i, arr) => (
                                <div
                                    key={label}
                                    className={`flex items-center justify-between gap-6 rounded-xl px-4 py-3.5 ${
                                        i === arr.length - 1
                                            ? "border border-solar/30 bg-solar/[0.07]"
                                            : "border border-white/8 bg-white/[0.02]"
                                    }`}
                                >
                                    <span className="text-[0.92rem] text-dust">{label}</span>
                                    <span className={`font-mono text-[0.98rem] ${tone}`}>{value}</span>
                                </div>
                            ))}
                            <p className="pt-1 font-mono text-[0.68rem] leading-relaxed text-faint">
                                Illustrative, using pricing subscribers commonly report. Your results depend on
                                your market and your close rate.
                            </p>
                        </div>
                    </div>
                </div>
            </Section>

            {/* FAQ */}
            <Section>
                <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
                    <div>
                        <Eyebrow tone="violet">Questions</Eyebrow>
                        <SectionTitle className="mt-6">Before you sign up.</SectionTitle>
                        <p className="mt-6 text-[1rem] leading-relaxed text-dust">
                            Still unsure about something? Ask us directly — a person answers.
                        </p>
                        <div className="mt-7">
                            <CTAButton to="/contact" variant="secondary" icon={ArrowUpRight}>
                                Talk to a human
                            </CTAButton>
                        </div>
                    </div>

                    <div>
                        {PRICING_FAQ.map((item, i) => (
                            <FaqItem
                                key={item.q}
                                item={item}
                                open={openFaq === i}
                                onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
                            />
                        ))}
                    </div>
                </div>
            </Section>

            <FinalCTA
                eyebrow="Start"
                title="Try it before you pay for it."
                body="Free to start, no card required. Scrape a city and build your first site tonight."
            />
        </div>
    );
}
