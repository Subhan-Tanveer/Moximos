import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    Check,
    ChevronDown,
    ExternalLink,
    Loader2,
    MapPin,
    Phone,
    Search,
    Sparkles,
    Star,
    X,
    XCircle,
} from "lucide-react";
import api from "../api";
import { ALL_CITIES, COUNTRIES, citiesForCountries } from "../data/countries";
import CountryFlag from "./CountryFlag";

const RATING_OPTIONS = [0, 1, 2, 3, 4, 5];
const SITE_STATUS_OPTIONS = [
    { value: "any", label: "Any" },
    { value: "none", label: "Without website" },
    { value: "has", label: "With website" },
];

// One request to /api/leads does all three of these in sequence server-side
// (Places search, then a real fetch of every business's site, then ranking
// by opportunity) — this is a cosmetic staged readout of that single
// request, not a separately polled backend job. Timings are tuned to how
// long each phase has actually taken in testing: the Places lookup usually
// resolves in under a second, and evaluating each site's real website is
// the part that takes the next few seconds.
const SEARCH_STAGES = [
    { label: "Finding businesses nearby...", atMs: 0 },
    { label: "Opening each of their websites...", atMs: 700 },
    { label: "Ranking the best leads...", atMs: 2400 },
];

// Every popover in this file needs the same "close when you click elsewhere"
// behavior — one hook instead of repeating the ref/listener dance per dropdown.
function useClickOutside(ref, onOutside, active) {
    useEffect(() => {
        if (!active) return undefined;
        const onClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onOutside();
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [active, ref, onOutside]);
}

// Shared panel styling for every dropdown popover below. Deliberately a
// solid, near-opaque background rather than the glass-panel translucency
// used elsewhere — a floating menu that lets the content behind it show
// through reads as broken, not stylish.
const POPOVER_CLASS =
    "absolute z-30 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-white/12 bg-[#0c0c12] p-1.5 shadow-2xl shadow-black/60";

function Stars({ count, size = 12 }) {
    return (
        <span className="flex items-center gap-0.5">
            {Array.from({ length: count }).map((_, i) => (
                <Star key={i} size={size} className="fill-yellow-400 text-yellow-400" />
            ))}
        </span>
    );
}

function RatingDropdown({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useClickOutside(ref, () => setOpen(false), open);

    return (
        <div ref={ref} className="relative w-36">
            <label className="label-mono mb-1.5 block">Min rating</label>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 text-[0.9rem] text-starlight focus:border-violet/50 focus:outline-none"
            >
                <span className="flex items-center gap-1.5">
                    {value === 0 ? (
                        <span>Any</span>
                    ) : (
                        <>
                            <span>{value}+</span>
                            <Stars count={value} />
                        </>
                    )}
                </span>
                <ChevronDown size={14} className={`shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className={`${POPOVER_CLASS} w-full min-w-[150px]`}>
                    {RATING_OPTIONS.map((r) => (
                        <button
                            key={r}
                            type="button"
                            onClick={() => {
                                onChange(r);
                                setOpen(false);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.86rem] text-dust transition-colors hover:bg-white/[0.05] hover:text-starlight"
                        >
                            {r === 0 ? (
                                <span>Any rating</span>
                            ) : (
                                <>
                                    <span className="w-5">{r}+</span>
                                    <Stars count={r} />
                                </>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Real business search — Google Places API (New), via /api/leads.
 *
 * Unlike project generation, every search here costs real money past a
 * small free monthly allowance, and the backend enforces a hard daily cap
 * (see server/services/places.js). The usage readout is fetched alongside
 * every search so the cap is never a surprise.
 */
export default function LeadSearch({ onBuildSite }) {
    const [countryOpen, setCountryOpen] = useState(false);
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [city, setCity] = useState("");
    const [cityOpen, setCityOpen] = useState(false);
    const [niches, setNiches] = useState([]);
    const [nicheInput, setNicheInput] = useState("");
    const [minRating, setMinRating] = useState(4);
    const [minReviews, setMinReviews] = useState(50);
    const [siteStatus, setSiteStatus] = useState("any");
    const [leads, setLeads] = useState(null);
    const [totalFound, setTotalFound] = useState(0);
    const [fromCache, setFromCache] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeStage, setActiveStage] = useState(0);
    const [error, setError] = useState("");
    const [usage, setUsage] = useState(null);

    // Advances the staged checklist on a timer while a search is in flight.
    // If the real response comes back before a later stage's time, that
    // stage is skipped straight to "done" rather than left half-checked —
    // a cache hit especially can resolve before "opening each site" would
    // otherwise have appeared.
    useEffect(() => {
        if (!loading) {
            setActiveStage(0);
            return undefined;
        }
        const timers = SEARCH_STAGES.slice(1).map((stage, i) =>
            window.setTimeout(() => setActiveStage(i + 1), stage.atMs)
        );
        return () => timers.forEach(window.clearTimeout);
    }, [loading]);

    const countryPickerRef = useRef(null);
    useClickOutside(countryPickerRef, () => setCountryOpen(false), countryOpen);

    const cityPickerRef = useRef(null);
    useClickOutside(cityPickerRef, () => setCityOpen(false), cityOpen);

    useEffect(() => {
        api.get("/api/leads/usage")
            .then(({ data }) => setUsage(data))
            .catch(() => {});
    }, []);

    // City is always free text — Places API can search literally any real
    // city name, and a static list can only ever cover a handful of major
    // cities per country (a genuinely complete list is hundreds of thousands
    // of rows). These are suggestions, not the only valid options: narrowed
    // to the selected countries when any are picked, otherwise drawn from
    // every country so autocomplete still works before a country is chosen.
    const suggestionSource = useMemo(
        () => (selectedCountries.length > 0 ? citiesForCountries(selectedCountries) : ALL_CITIES),
        [selectedCountries]
    );
    const citySuggestions = useMemo(() => {
        const q = city.trim().toLowerCase();
        const list = q ? suggestionSource.filter((c) => c.city.toLowerCase().includes(q)) : suggestionSource;
        return list.slice(0, 30);
    }, [suggestionSource, city]);

    const toggleCountry = (code) => {
        setSelectedCountries((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
    };

    const addNiche = () => {
        const trimmed = nicheInput.trim();
        if (!trimmed || niches.includes(trimmed)) {
            setNicheInput("");
            return;
        }
        setNiches((prev) => [...prev, trimmed]);
        setNicheInput("");
    };

    const removeNiche = (word) => setNiches((prev) => prev.filter((n) => n !== word));

    const capReached = usage && usage.used >= usage.cap;
    const canSearch = city && niches.length > 0 && !loading && !capReached;

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!canSearch) return;
        setLoading(true);
        setError("");
        try {
            // Cities like "London" or "Dublin" exist in more than one country —
            // appending the country name disambiguates the query before it
            // becomes a real, billed API call. Works whether the city came
            // from a suggestion or was typed freely: if exactly one country
            // is selected, that's an unambiguous context regardless of how
            // the city text was entered.
            const singleCountry =
                selectedCountries.length === 1 ? COUNTRIES.find((c) => c.code === selectedCountries[0]) : null;
            const matchedSuggestion = suggestionSource.find((c) => c.city === city);
            const countryName = singleCountry?.name || matchedSuggestion?.countryName;
            const cityQuery = countryName ? `${city}, ${countryName}` : city;

            const { data } = await api.get("/api/leads", {
                params: {
                    city: cityQuery,
                    niche: niches.join(", "),
                    minRating,
                    minReviews,
                    siteStatus,
                },
            });
            setLeads(data.leads);
            setTotalFound(data.totalFound ?? data.leads.length);
            setFromCache(data.fromCache);
            setUsage(data.usage);
        } catch (err) {
            setError(err?.response?.data?.error || "Search failed — try again.");
        } finally {
            setLoading(false);
        }
    };

    const selectedCountryObjs = COUNTRIES.filter((c) => selectedCountries.includes(c.code));

    return (
        <div className="h-full overflow-y-auto p-6 md:p-10">
            <div className="mx-auto max-w-4xl">
                <h2 className="font-display text-[1.6rem] text-starlight">Find real businesses to build for.</h2>
                <p className="mt-2 max-w-xl text-[0.92rem] leading-relaxed text-dust">
                    Real lookups via Google Places — rated by star and review count, and whether they already
                    have a website.
                </p>

                {usage && (
                    <p className="mt-4 font-mono text-[0.72rem] text-faint">
                        {usage.used}/{usage.cap} searches used today
                        {capReached && <span className="ml-2 text-magenta">— daily cap reached</span>}
                    </p>
                )}

                <form onSubmit={handleSearch} className="glass-panel mt-6 flex flex-col gap-4 rounded-2xl p-4">
                    {/* Row 1: Country + City */}
                    <div className="flex flex-wrap gap-3">
                        {/* Country multi-select */}
                        <div ref={countryPickerRef} className="relative min-w-[220px] flex-1">
                            <label className="label-mono mb-1.5 block">Country</label>
                            <button
                                type="button"
                                onClick={() => setCountryOpen((v) => !v)}
                                className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 text-left text-[0.9rem] text-starlight focus:border-violet/50 focus:outline-none"
                            >
                                {selectedCountryObjs.length === 0 ? (
                                    <span className="truncate text-faint">Select countries</span>
                                ) : selectedCountryObjs.length === 1 ? (
                                    <span className="flex min-w-0 items-center gap-2">
                                        <CountryFlag code={selectedCountryObjs[0].code} />
                                        <span className="truncate">{selectedCountryObjs[0].name}</span>
                                    </span>
                                ) : (
                                    <span className="flex min-w-0 items-center gap-2">
                                        <CountryFlag code={selectedCountryObjs[0].code} />
                                        <span className="truncate">
                                            {selectedCountryObjs[0].name}
                                            <span className="text-dust"> +{selectedCountryObjs.length - 1} more</span>
                                        </span>
                                    </span>
                                )}
                                <ChevronDown size={15} className={`shrink-0 text-faint transition-transform ${countryOpen ? "rotate-180" : ""}`} />
                            </button>

                            {countryOpen && (
                                <div className={`${POPOVER_CLASS} w-full min-w-[240px]`}>
                                    {COUNTRIES.map((country) => {
                                        const checked = selectedCountries.includes(country.code);
                                        return (
                                            <button
                                                key={country.code}
                                                type="button"
                                                onClick={() => toggleCountry(country.code)}
                                                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.86rem] text-dust transition-colors hover:bg-white/[0.05] hover:text-starlight"
                                            >
                                                <span
                                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                                        checked ? "border-violet bg-violet" : "border-white/20"
                                                    }`}
                                                >
                                                    {checked && <span className="h-1.5 w-1.5 rounded-sm bg-void" />}
                                                </span>
                                                <CountryFlag code={country.code} />
                                                <span className="truncate">{country.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* City — free text, with suggestions from the selected
                            country(s). Any real city can be typed; the list
                            below is an assist, not the only valid input. */}
                        <div ref={cityPickerRef} className="relative min-w-[200px] flex-1">
                            <label className="label-mono mb-1.5 block">City</label>
                            <input
                                value={city}
                                onChange={(e) => {
                                    setCity(e.target.value);
                                    setCityOpen(true);
                                }}
                                onFocus={() => setCityOpen(true)}
                                placeholder="Type any city — e.g. Karachi"
                                className="w-full rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 text-[0.9rem] text-starlight placeholder:text-faint focus:border-violet/50 focus:outline-none"
                            />

                            {cityOpen && citySuggestions.length > 0 && (
                                <div className={`${POPOVER_CLASS} w-full min-w-[220px]`}>
                                    {citySuggestions.map((c) => (
                                        <button
                                            key={`${c.countryCode}-${c.city}`}
                                            type="button"
                                            onClick={() => {
                                                setCity(c.city);
                                                setCityOpen(false);
                                            }}
                                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.86rem] text-dust transition-colors hover:bg-white/[0.05] hover:text-starlight"
                                        >
                                            <CountryFlag code={c.countryCode} />
                                            <span className="truncate">{c.city}</span>
                                            <span className="ml-auto shrink-0 text-[0.72rem] text-faint">
                                                {c.countryName}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Niche keyword tags */}
                    <div>
                        <label className="label-mono mb-1.5 block">Niche keywords</label>
                        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.03] px-2.5 py-2 focus-within:border-violet/50">
                            {niches.map((word) => (
                                <span
                                    key={word}
                                    className="flex items-center gap-1.5 rounded-full bg-violet/18 px-2.5 py-1 text-[0.8rem] text-starlight"
                                >
                                    {word}
                                    <button
                                        type="button"
                                        onClick={() => removeNiche(word)}
                                        className="text-faint transition-colors hover:text-starlight"
                                        aria-label={`Remove ${word}`}
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            <input
                                value={nicheInput}
                                onChange={(e) => setNicheInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addNiche();
                                    } else if (e.key === "Backspace" && !nicheInput && niches.length > 0) {
                                        removeNiche(niches[niches.length - 1]);
                                    }
                                }}
                                onBlur={addNiche}
                                placeholder={niches.length === 0 ? "Type a keyword, press Enter — e.g. roofing" : "Add another..."}
                                className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1 text-[0.9rem] text-starlight placeholder:text-faint focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Row 3: Rating, reviews, website status */}
                    <div className="flex flex-wrap items-end gap-3">
                        <RatingDropdown value={minRating} onChange={setMinRating} />

                        <div className="w-32">
                            <label className="label-mono mb-1.5 block">Min reviews</label>
                            <input
                                type="number"
                                min={0}
                                step={10}
                                value={minReviews}
                                onChange={(e) => setMinReviews(parseInt(e.target.value, 10) || 0)}
                                className="w-full rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 text-[0.9rem] text-starlight focus:border-violet/50 focus:outline-none"
                            />
                        </div>
                        <div className="min-w-[160px] flex-1">
                            <label className="label-mono mb-1.5 block">Website status</label>
                            <select
                                value={siteStatus}
                                onChange={(e) => setSiteStatus(e.target.value)}
                                className="w-full rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 text-[0.9rem] text-starlight focus:border-violet/50 focus:outline-none"
                            >
                                {SITE_STATUS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value} className="bg-[#0c0c12]">
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={!canSearch}
                            className="flex h-[38px] items-center gap-2 rounded-lg bg-solar px-4 text-[0.88rem] font-semibold text-void transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                            Search
                        </button>
                    </div>
                </form>

                {loading && (
                    <div className="glass-panel mt-6 rounded-2xl p-5">
                        <div className="space-y-3">
                            {SEARCH_STAGES.map((stage, i) => {
                                const done = i < activeStage;
                                const active = i === activeStage;
                                return (
                                    <div key={stage.label} className="flex items-center gap-2.5">
                                        {done ? (
                                            <Check size={14} className="shrink-0 text-ion" />
                                        ) : active ? (
                                            <Loader2 size={14} className="shrink-0 animate-spin text-violet" />
                                        ) : (
                                            <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/15" />
                                        )}
                                        <span
                                            className={`text-[0.9rem] ${
                                                done ? "text-dust" : active ? "font-medium text-starlight" : "text-faint"
                                            }`}
                                        >
                                            {stage.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="mt-4 text-[0.78rem] text-faint">
                            Usually a few seconds — we open each business's real website and check it.
                        </p>
                    </div>
                )}

                {error && (
                    <p className="mt-4 flex items-center gap-2 text-[0.88rem] text-magenta">
                        <AlertTriangle size={14} />
                        {error}
                    </p>
                )}

                {leads && (
                    <div className="mt-8">
                        <p className="mb-4 flex items-center gap-2.5">
                            <span className="label-mono">{leads.length} results</span>
                            {fromCache && (
                                <span className="flex items-center gap-1 rounded-full border border-ion/30 bg-ion/10 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider text-ion">
                                    <Sparkles size={9} />
                                    From cache — no quota used
                                </span>
                            )}
                        </p>
                        {leads.length === 0 ? (
                            <p className="text-[0.9rem] text-faint">
                                {totalFound > 0
                                    ? `Google found ${totalFound} ${totalFound === 1 ? "business" : "businesses"} for this search, but none matched your rating, review, or website filters — try lowering the rating/review threshold or switching website status to "Any".`
                                    : "Google didn't find any businesses for that niche and city — try a broader niche keyword or a nearby city."}
                            </p>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {leads.map((lead) => (
                                    <div key={`${lead.name}-${lead.phone}`} className="glass-panel rounded-xl p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="text-[0.96rem] font-semibold text-starlight">{lead.name}</h3>
                                            <span
                                                className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider ${
                                                    lead.site === "none"
                                                        ? "border-ion/35 bg-ion/10 text-ion"
                                                        : "border-white/12 bg-white/[0.03] text-faint"
                                                }`}
                                            >
                                                {lead.site === "none" ? <XCircle size={9} /> : null}
                                                {lead.site === "none" ? "No site" : "Has site"}
                                            </span>
                                        </div>
                                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.8rem] text-dust">
                                            {lead.rating != null && (
                                                <span className="flex items-center gap-1">
                                                    <Star size={11} className="fill-yellow-400 text-yellow-400" />
                                                    <span className="font-mono text-starlight">{lead.rating.toFixed(1)}</span>
                                                    <span className="text-faint">({lead.reviews})</span>
                                                </span>
                                            )}
                                            {lead.address && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={11} className="text-faint" />
                                                    <span className="truncate">{lead.address}</span>
                                                </span>
                                            )}
                                        </div>
                                        {lead.phone && (
                                            <span className="mt-2.5 flex items-center gap-1.5 font-mono text-[0.72rem] text-faint">
                                                <Phone size={11} />
                                                {lead.phone}
                                            </span>
                                        )}

                                        {lead.evalReason && (
                                            <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2">
                                                <span
                                                    className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[0.58rem] font-semibold uppercase tracking-wider ${
                                                        lead.outdatedScore >= 80
                                                            ? "bg-ion/20 text-ion"
                                                            : lead.outdatedScore >= 40
                                                              ? "bg-solar/20 text-solar"
                                                              : "bg-white/10 text-faint"
                                                    }`}
                                                >
                                                    {lead.outdatedScore >= 80
                                                        ? "Prime opportunity"
                                                        : lead.outdatedScore >= 40
                                                          ? "Good opportunity"
                                                          : "Lower priority"}
                                                </span>
                                                <span className="text-[0.76rem] leading-snug text-faint">{lead.evalReason}</span>
                                            </div>
                                        )}

                                        <div className="mt-3.5 flex items-center gap-2 border-t border-white/8 pt-3.5">
                                            {lead.website && (
                                                <a
                                                    href={lead.website}
                                                    target="_blank"
                                                    rel="noreferrer noopener"
                                                    className="flex items-center gap-1.5 rounded-lg border border-white/12 px-2.5 py-1.5 text-[0.76rem] text-dust transition-colors hover:border-white/25 hover:text-starlight"
                                                >
                                                    <ExternalLink size={11} />
                                                    Visit current site
                                                </a>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => onBuildSite?.(lead)}
                                                className="ml-auto flex items-center gap-1.5 rounded-lg bg-solar px-2.5 py-1.5 text-[0.76rem] font-semibold text-void transition-opacity hover:opacity-90"
                                            >
                                                <Sparkles size={11} />
                                                Build site
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
