import { useState } from "react";
import { ArrowUpRight, CalendarClock, Check, Mail, MessageSquare } from "lucide-react";
import CTAButton from "../components/CTAButton";
import { Eyebrow, Hairline, Section } from "../components/Primitives";

/**
 * Contact is the conversion page: it loads fast, has no scroll choreography,
 * and asks for four fields. Nothing here waits on an animation to be readable.
 */

/*
 * Where the form posts.
 *
 * Left empty deliberately — this static bundle has no backend of its own. With
 * no endpoint set, submitting composes the message in the visitor's own mail
 * client, which works everywhere with zero infrastructure. To take submissions
 * server-side instead, set this to a Formspree URL or your own API route; the
 * handler below will POST JSON to it.
 */
const CONTACT_ENDPOINT = "";
const CONTACT_EMAIL = "hello@moximos.com";

const ROLES = [
    "Freelancer / solo",
    "Agency owner",
    "Side hustle, going full time",
    "Just exploring",
];

export default function Contact() {
    const [form, setForm] = useState({ name: "", email: "", role: ROLES[0], message: "" });
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");

    const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!CONTACT_ENDPOINT) {
            const body = `Name: ${form.name}\nEmail: ${form.email}\nI'm a: ${form.role}\n\n${form.message}`;
            window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                `Moximos enquiry — ${form.name || "new"}`
            )}&body=${encodeURIComponent(body)}`;
            setStatus("sent");
            return;
        }

        setStatus("sending");
        try {
            const res = await fetch(CONTACT_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            setStatus("sent");
        } catch (err) {
            setStatus("idle");
            setError(`Couldn't send that — email us at ${CONTACT_EMAIL} instead.`);
        }
    };

    const inputClass =
        "w-full rounded-xl border border-white/12 bg-white/[0.03] px-4 py-3 text-[0.95rem] text-starlight placeholder:text-faint transition-colors duration-300 focus:border-violet/60 focus:outline-none focus:ring-2 focus:ring-violet/25";

    return (
        <>
            <Section className="pb-16 pt-36 md:pb-20 md:pt-44">
                <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
                    {/* Left: context and alternatives */}
                    <div>
                        <Eyebrow tone="ion">Contact</Eyebrow>
                        <h1 className="font-display mt-6 text-[clamp(2.2rem,5.4vw,3.9rem)] text-starlight">
                            Talk to a person about it.
                        </h1>
                        <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-dust">
                            Questions about whether this fits your market, your niche, or the way you already
                            work? Ask. We answer these ourselves, usually the same day.
                        </p>

                        <Hairline className="my-9" />

                        <div className="space-y-3">
                            <a
                                href={`mailto:${CONTACT_EMAIL}`}
                                className="glass-panel glass-panel-hover flex items-center gap-4 rounded-xl p-4"
                            >
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-ion/30 text-ion">
                                    <Mail size={17} />
                                </span>
                                <span>
                                    <span className="block text-[0.92rem] font-semibold text-starlight">
                                        Email us
                                    </span>
                                    <span className="block font-mono text-[0.78rem] text-faint">
                                        {CONTACT_EMAIL}
                                    </span>
                                </span>
                            </a>

                            <div className="glass-panel flex items-center gap-4 rounded-xl p-4">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet/30 text-violet">
                                    <CalendarClock size={17} />
                                </span>
                                <span>
                                    <span className="block text-[0.92rem] font-semibold text-starlight">
                                        Book a call
                                    </span>
                                    <span className="block font-mono text-[0.78rem] text-faint">
                                        20 minutes, no pitch
                                    </span>
                                </span>
                            </div>

                            <div className="glass-panel flex items-center gap-4 rounded-xl p-4">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-solar/30 text-solar">
                                    <MessageSquare size={17} />
                                </span>
                                <span>
                                    <span className="block text-[0.92rem] font-semibold text-starlight">
                                        Already a subscriber?
                                    </span>
                                    <span className="block font-mono text-[0.78rem] text-faint">
                                        Support is in the dashboard
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: the form */}
                    <div className="glass-panel rounded-3xl p-7 sm:p-9">
                        {status === "sent" ? (
                            <div className="flex min-h-[420px] flex-col items-center justify-center gap-5 text-center">
                                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-ion/40 bg-ion/10 text-ion">
                                    <Check size={24} strokeWidth={2.5} />
                                </span>
                                <h2 className="font-display text-3xl text-starlight">Message ready.</h2>
                                <p className="max-w-sm text-[0.98rem] leading-relaxed text-dust">
                                    {CONTACT_ENDPOINT
                                        ? "Thanks — we'll come back to you shortly, usually the same day."
                                        : `We've opened your mail app with everything filled in. Hit send and it lands with us at ${CONTACT_EMAIL}.`}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setStatus("idle")}
                                    className="font-mono text-[0.78rem] text-violet underline underline-offset-4"
                                >
                                    Send another
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="name" className="label-mono mb-2.5 block">
                                            Name
                                        </label>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            required
                                            autoComplete="name"
                                            value={form.name}
                                            onChange={update("name")}
                                            placeholder="Marcus Ellery"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="label-mono mb-2.5 block">
                                            Email
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            value={form.email}
                                            onChange={update("email")}
                                            placeholder="you@youragency.com"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="role" className="label-mono mb-2.5 block">
                                        What you do
                                    </label>
                                    <select
                                        id="role"
                                        name="role"
                                        value={form.role}
                                        onChange={update("role")}
                                        className={`${inputClass} appearance-none`}
                                    >
                                        {ROLES.map((role) => (
                                            <option key={role} value={role} className="bg-abyss">
                                                {role}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="message" className="label-mono mb-2.5 block">
                                        What do you want to know?
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required
                                        rows={6}
                                        value={form.message}
                                        onChange={update("message")}
                                        placeholder="I run a small agency in Denver doing mostly HVAC and roofing clients. Wondering how this handles…"
                                        className={`${inputClass} resize-none`}
                                    />
                                </div>

                                {error && (
                                    <p role="alert" className="text-[0.85rem] text-magenta">
                                        {error}
                                    </p>
                                )}

                                <div className="flex flex-col items-start gap-4 pt-1 sm:flex-row sm:items-center">
                                    <CTAButton
                                        type="submit"
                                        size="lg"
                                        icon={ArrowUpRight}
                                        disabled={status === "sending"}
                                    >
                                        {status === "sending" ? "Sending…" : "Send message"}
                                    </CTAButton>
                                    <p className="font-mono text-[0.7rem] leading-relaxed text-faint">
                                        We reply to everything.
                                        <br />
                                        No sequences, no drip.
                                    </p>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </Section>

            {/* Low-key closer — this page converts, it doesn't dazzle. */}
            <Section className="border-t border-white/6 py-16">
                <div className="flex flex-col items-center gap-5 text-center">
                    <p className="text-[1.05rem] text-dust">Would rather just try it?</p>
                    <CTAButton to="/signup" icon={ArrowUpRight}>
                        Start free
                    </CTAButton>
                </div>
            </Section>
        </>
    );
}
