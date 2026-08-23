import { ArrowUpRight } from "lucide-react";
import CTAButton from "../components/CTAButton";
import OrbitLogo from "../components/OrbitLogo";
import { Eyebrow } from "../components/Primitives";
import { NAV_LINKS } from "../components/Nav";
import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <section className="flex min-h-[92svh] flex-col items-center justify-center px-5 py-32 text-center sm:px-8">
            <OrbitLogo size={40} />

            <p className="font-mono mt-10 text-[clamp(4rem,14vw,9rem)] font-light leading-none text-white/10">
                404
            </p>

            <div className="-mt-4">
                <Eyebrow tone="magenta">Signal lost</Eyebrow>
            </div>

            <h1 className="font-display mt-6 max-w-2xl text-[clamp(1.9rem,5vw,3.2rem)] text-starlight">
                Nothing in orbit at this address.
            </h1>
            <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-dust">
                The page you're looking for either moved or never existed. Here's the rest of the system.
            </p>

            <div className="mt-10 flex flex-col gap-3.5 sm:flex-row">
                <CTAButton to="/" icon={ArrowUpRight}>
                    Back to home
                </CTAButton>
                <CTAButton to="/pricing" variant="secondary">
                    See pricing
                </CTAButton>
            </div>

            <nav className="mt-14 flex max-w-lg flex-wrap justify-center gap-x-6 gap-y-3" aria-label="Site sections">
                {NAV_LINKS.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className="font-mono text-[0.75rem] text-faint transition-colors duration-300 hover:text-starlight"
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
        </section>
    );
}
