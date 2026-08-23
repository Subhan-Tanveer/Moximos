import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";
import OrbitLogo from "./OrbitLogo";
import CTAButton from "./CTAButton";
import { useMotionPrefs } from "../animations/useMotionPrefs";

export const NAV_LINKS = [
    { label: "How It Works", to: "/how-it-works" },
    { label: "AI Builder", to: "/ai-website-builder" },
    { label: "Lead Explorer", to: "/lead-explorer" },
    { label: "Outreach", to: "/outreach" },
    { label: "Showcase", to: "/showcase" },
    { label: "Pricing", to: "/pricing" },
];

export default function Nav() {
    const [condensed, setCondensed] = useState(false);
    const [open, setOpen] = useState(false);
    const { animate } = useMotionPrefs();
    const location = useLocation();

    // Condense past the fold. Read from window rather than motionState so the
    // nav behaves identically with Lenis on or off.
    useEffect(() => {
        const onScroll = () => setCondensed(window.scrollY > 40);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Close the drawer on navigation, and never leave the body locked.
    useEffect(() => setOpen(false), [location.pathname]);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <>
            <header
                className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    condensed ? "py-2.5" : "py-5"
                }`}
            >
                <div
                    className={`mx-auto flex w-[calc(100%-1.5rem)] max-w-7xl items-center justify-between rounded-full px-4 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-5 ${
                        condensed
                            ? "glass-panel py-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.9)]"
                            : "border border-transparent py-2.5"
                    }`}
                >
                    <Link to="/" className="group flex items-center gap-2.5" aria-label="Moximos home">
                        <OrbitLogo size={condensed ? 20 : 23} />
                        <span className="font-display text-[1.15rem] tracking-tight text-starlight">
                            Moximos
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
                        {NAV_LINKS.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) =>
                                    `relative rounded-full px-3.5 py-2 text-[0.875rem] font-medium transition-colors duration-300 ${
                                        isActive ? "text-starlight" : "text-dust hover:text-starlight"
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {link.label}
                                        {isActive && (
                                            <motion.span
                                                layoutId={animate ? "nav-active" : undefined}
                                                className="absolute inset-0 -z-10 rounded-full bg-white/[0.07] ring-1 ring-white/10"
                                                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                                            />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        <Link
                            to="/login"
                            className="hidden rounded-full px-4 py-2 text-[0.875rem] font-medium text-dust transition-colors duration-300 hover:text-starlight sm:block"
                        >
                            Log in
                        </Link>
                        <CTAButton to="/signup" size="sm" icon={ArrowUpRight} className="hidden sm:inline-flex">
                            Start free
                        </CTAButton>

                        <button
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            aria-label={open ? "Close menu" : "Open menu"}
                            aria-expanded={open}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-starlight transition-colors hover:bg-white/10 lg:hidden"
                        >
                            {open ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </header>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.28 }}
                        className="fixed inset-0 z-40 bg-void/96 backdrop-blur-xl lg:hidden"
                    >
                        <div className="flex h-full flex-col justify-center gap-1 px-7 pb-16 pt-24">
                            {NAV_LINKS.map((link, i) => (
                                <motion.div
                                    key={link.to}
                                    initial={{ opacity: 0, y: 22 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 + i * 0.045, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    <NavLink
                                        to={link.to}
                                        className="block border-b border-white/8 py-4 font-display text-3xl text-starlight"
                                    >
                                        {link.label}
                                    </NavLink>
                                </motion.div>
                            ))}
                            <motion.div
                                initial={{ opacity: 0, y: 22 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                className="mt-8 flex flex-col gap-3"
                            >
                                <CTAButton to="/signup" size="lg" icon={ArrowUpRight} className="w-full">
                                    Start free
                                </CTAButton>
                                <CTAButton to="/login" variant="secondary" size="lg" className="w-full">
                                    Log in
                                </CTAButton>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
