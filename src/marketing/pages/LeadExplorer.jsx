import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Globe2, MapPin, Phone, RotateCcw, Star, TriangleAlert, XCircle } from "lucide-react";
import PageHero from "../components/PageHero";
import CTAButton from "../components/CTAButton";
import { Eyebrow, Section, SectionTitle } from "../components/Primitives";
import { FinalCTA } from "./Home";
import { useMotionPrefs } from "../animations/useMotionPrefs";
import { LEAD_CITIES, LEAD_NICHES, SAMPLE_LEADS } from "../data/content";

const SITE_FILTERS = [
    { id: "all", label: "All" },
    { id: "none", label: "No website" },
    { id: "bad", label: "Bad website" },
];

const RATING_FILTERS = [
    { id: 0, label: "Any" },
    { id: 4.7, label: "4.7★+" },
    { id: 4.8, label: "4.8★+" },
    { id: 4.9, label: "4.9★+" },
];

/* ── Filter control ─────────────────────────────────────────── */
function FilterGroup({ label, options, value, onChange, getId = (o) => o, getLabel = (o) => o }) {
    return (
        <div>
            <p className="label-mono mb-3">{label}</p>
            <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                    const id = getId(option);
                    const active = value === id;
                    return (
                        <button
                            key={String(id)}
                            type="button"
                            onClick={() => onChange(id)}
                            aria-pressed={active}
                            className={`rounded-full border px-3.5 py-1.5 text-[0.82rem] font-medium transition-all duration-300 ${
                                active
                                    ? "border-violet/60 bg-violet/18 text-starlight"
                                    : "border-white/10 bg-white/[0.03] text-dust hover:border-white/25 hover:text-starlight"
                            }`}
                        >
                            {getLabel(option)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Lead card ──────────────────────────────────────────────── */
function LeadCard({ lead, index, animate }) {
    const noSite = lead.site === "none";

    return (
        <motion.article
            layout={animate}
            initial={animate ? { opacity: 0, y: 26, scale: 0.94 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={animate ? { opacity: 0, scale: 0.92, transition: { duration: 0.18 } } : undefined}
            transition={{
                duration: 0.55,
                ease: [0.16, 1, 0.3, 1],
                // Cards assemble in sequence rather than all at once.
                delay: animate ? Math.min(index * 0.035, 0.4) : 0,
                layout: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
            }}
            className="glass-panel glass-panel-hover group relative flex flex-col overflow-hidden rounded-2xl p-5"
        >
            <div
                className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 ${
                    noSite ? "bg-ion/30" : "bg-solar/25"
                }`}
                aria-hidden="true"
            />

            <div className="relative flex items-start justify-between gap-3">
                <h3 className="text-[1.02rem] font-semibold leading-snug text-starlight">{lead.name}</h3>
                <span
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider ${
                        noSite
                            ? "border-ion/35 bg-ion/10 text-ion"
                            : "border-solar/35 bg-solar/10 text-solar"
                    }`}
                >
                    {noSite ? <XCircle size={10} /> : <TriangleAlert size={10} />}
                    {noSite ? "No site" : "Bad site"}
                </span>
            </div>

            <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.82rem] text-dust">
                <span className="flex items-center gap-1.5">
                    <Star size={12} className="fill-solar text-solar" />
                    <span className="font-mono text-starlight">{lead.rating.toFixed(1)}</span>
                    <span className="text-faint">({lead.reviews})</span>
                </span>
                <span className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-faint" />
                    {lead.city}
                </span>
            </div>

            <div className="relative mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[0.66rem] text-dust">
                    {lead.niche}
                </span>
                <span className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[0.66rem] text-dust">
                    {lead.years}y in business
                </span>
            </div>

            <div className="relative mt-5 flex items-center justify-between border-t border-white/8 pt-4">
                <span className="flex items-center gap-1.5 font-mono text-[0.72rem] text-faint">
                    <Phone size={11} />
                    {lead.phone}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[0.66rem] text-violet opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Build site
                    <ArrowUpRight size={12} />
                </span>
            </div>
        </motion.article>
    );
}

export default function LeadExplorer() {
    const { animate } = useMotionPrefs();
    const [city, setCity] = useState("all");
    const [niche, setNiche] = useState("all");
    const [minRating, setMinRating] = useState(0);
    const [site, setSite] = useState("all");

    const filtered = useMemo(
        () =>
            SAMPLE_LEADS.filter(
                (lead) =>
                    (city === "all" || lead.city === city) &&
                    (niche === "all" || lead.niche === niche) &&
                    lead.rating >= minRating &&
                    (site === "all" || lead.site === site)
            ),
        [city, niche, minRating, site]
    );

    const isFiltered = city !== "all" || niche !== "all" || minRating !== 0 || site !== "all";

    const reset = () => {
        setCity("all");
        setNiche("all");
        setMinRating(0);
        setSite("all");
    };

    const totalReviews = filtered.reduce((sum, l) => sum + l.reviews, 0);
    const noSiteCount = filtered.filter((l) => l.site === "none").length;

    return (
        <>
            <PageHero
                eyebrow="Lead Explorer"
                tone="ion"
                title="Businesses that already have customers, and nowhere to send them."
                lede="This is what comes back from a scrape. Every one of these is rated 4 stars or higher with 50+ reviews, and every one of them is either missing a website or running something that's costing them work."
            />

            <Section className="pt-0">
                {/* Filter console */}
                <div className="glass-panel noise-overlay relative overflow-hidden rounded-3xl p-6 sm:p-8">
                    <div className="relative flex items-start justify-between gap-4">
                        <Eyebrow tone="ion">Filters</Eyebrow>
                        {isFiltered && (
                            <button
                                type="button"
                                onClick={reset}
                                className="flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 font-mono text-[0.68rem] text-dust transition-colors hover:border-white/30 hover:text-starlight"
                            >
                                <RotateCcw size={11} />
                                Reset
                            </button>
                        )}
                    </div>

                    <div className="relative mt-7 grid gap-7 lg:grid-cols-2">
                        <FilterGroup
                            label="City"
                            options={["all", ...LEAD_CITIES]}
                            value={city}
                            onChange={setCity}
                            getLabel={(o) => (o === "all" ? "All cities" : o)}
                        />
                        <FilterGroup
                            label="Niche"
                            options={["all", ...LEAD_NICHES]}
                            value={niche}
                            onChange={setNiche}
                            getLabel={(o) => (o === "all" ? "All niches" : o)}
                        />
                        <FilterGroup
                            label="Minimum rating"
                            options={RATING_FILTERS}
                            value={minRating}
                            onChange={setMinRating}
                            getId={(o) => o.id}
                            getLabel={(o) => o.label}
                        />
                        <FilterGroup
                            label="Website status"
                            options={SITE_FILTERS}
                            value={site}
                            onChange={setSite}
                            getId={(o) => o.id}
                            getLabel={(o) => o.label}
                        />
                    </div>
                </div>

                {/* Result readout */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-5">
                    <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
                        <span className="font-mono text-[0.8rem] text-starlight">
                            {filtered.length} <span className="text-faint">leads</span>
                        </span>
                        <span className="font-mono text-[0.8rem] text-ion">
                            {noSiteCount} <span className="text-faint">with no site at all</span>
                        </span>
                        <span className="font-mono text-[0.8rem] text-dust">
                            {totalReviews.toLocaleString()} <span className="text-faint">combined reviews</span>
                        </span>
                    </div>
                    <span className="label-mono">Sample data</span>
                </div>

                {/* Grid */}
                <motion.div layout={animate} className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((lead, i) => (
                            <LeadCard key={lead.name} lead={lead} index={i} animate={animate} />
                        ))}
                    </AnimatePresence>
                </motion.div>

                {filtered.length === 0 && (
                    <div className="mt-14 flex flex-col items-center gap-4 text-center">
                        <Globe2 size={26} className="text-faint" />
                        <p className="text-[1rem] text-dust">
                            Nothing matches that combination in the sample set.
                        </p>
                        <button
                            type="button"
                            onClick={reset}
                            className="font-mono text-[0.78rem] text-violet underline underline-offset-4"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </Section>

            {/* What you get per lead */}
            <Section className="border-t border-white/6">
                <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
                    <div>
                        <Eyebrow tone="violet">What comes back</Eyebrow>
                        <SectionTitle className="mt-6">Enough to build on, not just a name.</SectionTitle>
                        <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-dust">
                            Every record carries what the AI needs to write a site that sounds like it was made
                            for that business specifically — and what you need to know whether they're worth
                            approaching at all.
                        </p>
                        <div className="mt-9">
                            <CTAButton to="/signup" icon={ArrowUpRight}>
                                Scrape your city
                            </CTAButton>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {[
                            ["Business name", "Exactly as listed on Google Maps"],
                            ["Star rating", "Filtered to 4.0 and above"],
                            ["Review count", "Minimum 50, so demand is proven"],
                            ["Review themes", "What customers actually praise"],
                            ["Phone + hours", "Straight from the listing"],
                            ["Full address", "For local copy and service areas"],
                            ["Website status", "Missing, broken, or out of date"],
                            ["Years active", "How established they are"],
                        ].map(([title, body]) => (
                            <div key={title} className="glass-panel rounded-xl p-4">
                                <p className="text-[0.9rem] font-semibold text-starlight">{title}</p>
                                <p className="mt-1.5 text-[0.82rem] leading-relaxed text-dust">{body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            <FinalCTA
                eyebrow="Your turn"
                title="Point it at your city."
                body="Start free and pull your first qualified list in the next twenty minutes."
            />
        </>
    );
}
