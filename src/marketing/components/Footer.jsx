import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import OrbitLogo from "./OrbitLogo";
import CTAButton from "./CTAButton";
import { Hairline } from "./Primitives";

const COLUMNS = [
    {
        title: "Product",
        links: [
            { label: "How It Works", to: "/how-it-works" },
            { label: "AI Website Builder", to: "/ai-website-builder" },
            { label: "Lead Explorer", to: "/lead-explorer" },
            { label: "Outreach Automation", to: "/outreach" },
        ],
    },
    {
        title: "Company",
        links: [
            { label: "Showcase", to: "/showcase" },
            { label: "Pricing", to: "/pricing" },
            { label: "About", to: "/about" },
            { label: "Contact", to: "/contact" },
        ],
    },
    {
        title: "Account",
        links: [
            { label: "Log in", to: "/login" },
            { label: "Create account", to: "/signup" },
            { label: "Open the app", to: "/app" },
        ],
    },
];

export default function Footer() {
    return (
        <footer className="relative mt-12 overflow-hidden border-t border-white/8 bg-abyss/70 backdrop-blur-sm">
            {/* Horizon glow — the site "lands" here rather than just stopping. */}
            <div
                className="pointer-events-none absolute inset-x-0 -top-px h-64 opacity-70"
                style={{
                    background:
                        "radial-gradient(ellipse 65% 100% at 50% 0%, rgba(91,58,160,0.42) 0%, transparent 72%)",
                }}
                aria-hidden="true"
            />

            <div className="relative mx-auto w-full max-w-7xl px-5 pb-12 pt-20 sm:px-8 lg:px-12">
                <div className="flex flex-col gap-14 lg:flex-row lg:justify-between">
                    <div className="max-w-sm">
                        <Link to="/" className="flex items-center gap-2.5" aria-label="Moximos home">
                            <OrbitLogo size={24} />
                            <span className="font-display text-xl tracking-tight text-starlight">Moximos</span>
                        </Link>
                        <p className="mt-5 text-[0.95rem] leading-relaxed text-dust">
                            The agency machine. Find the businesses that need a website, build each one a
                            custom site with AI, and send it to them — automatically.
                        </p>
                        <div className="mt-7">
                            <CTAButton to="/signup" icon={ArrowUpRight} size="sm">
                                Start free
                            </CTAButton>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:gap-16">
                        {COLUMNS.map((col) => (
                            <div key={col.title}>
                                <h3 className="label-mono mb-5">{col.title}</h3>
                                <ul className="space-y-3">
                                    {col.links.map((link) => (
                                        <li key={link.to + link.label}>
                                            <Link
                                                to={link.to}
                                                className="text-[0.92rem] text-dust transition-colors duration-300 hover:text-starlight"
                                            >
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <Hairline className="my-10" />

                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <p className="font-mono text-xs text-faint">
                        © {new Date().getFullYear()} Moximos. All systems nominal.
                    </p>
                    <div className="flex gap-6">
                        <Link to="/contact" className="font-mono text-xs text-faint transition-colors hover:text-dust">
                            Privacy
                        </Link>
                        <Link to="/contact" className="font-mono text-xs text-faint transition-colors hover:text-dust">
                            Terms
                        </Link>
                        <Link to="/contact" className="font-mono text-xs text-faint transition-colors hover:text-dust">
                            Support
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
