import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import OrbitLogo from "../marketing/components/OrbitLogo";

/**
 * Auth shell.
 *
 * Restyled to the marketing brand — but only the shell. Once the visitor is
 * through this door the product goes back to being a clean working tool, so
 * this is the last place the space theme appears.
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
    return (
        <div className="relative flex min-h-screen bg-void">
            {/* Cheap CSS space — no WebGL on the auth path, it has to be instant. */}
            <div className="css-starfield fixed inset-0" aria-hidden="true" />
            <div
                className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_60%_at_30%_20%,transparent_0%,rgba(5,5,7,0.7)_75%)]"
                aria-hidden="true"
            />

            {/* Brand column */}
            <aside className="relative z-10 hidden w-[42%] max-w-xl flex-col justify-between border-r border-white/8 p-12 lg:flex">
                <Link to="/" className="flex items-center gap-2.5" aria-label="Moximos home">
                    <OrbitLogo size={24} />
                    <span className="font-display text-xl tracking-tight text-starlight">Moximos</span>
                </Link>

                <div>
                    <h2 className="font-display text-[clamp(2rem,3.2vw,2.9rem)] text-starlight">
                        Scrape. Build. Send.
                    </h2>
                    <p className="mt-5 max-w-sm text-[1rem] leading-relaxed text-dust">
                        Find the businesses that need a website, build each one a custom site with AI, and email
                        it to them from your inbox.
                    </p>

                    <ul className="mt-9 space-y-3.5">
                        {[
                            "No card required to start",
                            "Your first site built in about four minutes",
                            "Cancel from the dashboard, any time",
                        ].map((point) => (
                            <li key={point} className="flex items-center gap-3">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-ion/35 text-ion">
                                    <Check size={11} strokeWidth={3} />
                                </span>
                                <span className="text-[0.94rem] text-dust">{point}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="font-mono text-[0.7rem] text-faint">
                    © {new Date().getFullYear()} Moximos. All systems nominal.
                </p>
            </aside>

            {/* Form column */}
            <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-16 sm:px-10">
                <div className="w-full max-w-md">
                    <Link to="/" className="mb-10 flex items-center gap-2.5 lg:hidden" aria-label="Moximos home">
                        <OrbitLogo size={22} />
                        <span className="font-display text-lg tracking-tight text-starlight">Moximos</span>
                    </Link>

                    <h1 className="font-display text-[clamp(1.9rem,4vw,2.6rem)] text-starlight">{title}</h1>
                    {subtitle && <p className="mt-3 text-[0.98rem] leading-relaxed text-dust">{subtitle}</p>}

                    <div className="mt-9">{children}</div>

                    {footer && <div className="mt-7 text-center text-[0.92rem] text-dust">{footer}</div>}
                </div>
            </main>
        </div>
    );
}

/** Shared field styling for both auth forms. */
export const authInputClass =
    "w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[0.95rem] text-starlight placeholder:text-faint transition-colors duration-300 focus:border-violet/60 focus:outline-none focus:ring-2 focus:ring-violet/25";
