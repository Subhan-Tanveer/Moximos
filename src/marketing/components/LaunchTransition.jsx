import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { triggerWarp } from "../animations/motionState";
import { useMotionPrefs } from "../animations/useMotionPrefs";

/**
 * Route-change "launch sequence".
 *
 * A short nebula wipe crosses the viewport while the new route mounts, and the
 * starfield gets a warp impulse at the same moment so the background reads as
 * accelerating rather than cutting. Deliberately brief — 620ms total — because
 * a transition the visitor has to wait through stops being a flourish.
 */
export default function LaunchTransition() {
    const location = useLocation();
    const { animate } = useMotionPrefs();
    const [wiping, setWiping] = useState(false);

    useEffect(() => {
        // Always land at the top of the new page, transition or not.
        if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
        else window.scrollTo(0, 0);

        if (!animate) return undefined;

        triggerWarp(2.4);
        setWiping(true);
        const id = window.setTimeout(() => setWiping(false), 620);
        return () => window.clearTimeout(id);
    }, [location.pathname, animate]);

    if (!animate) return null;

    return (
        <AnimatePresence>
            {wiping && (
                <motion.div
                    key={location.pathname}
                    className="pointer-events-none fixed inset-0 z-[60]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.24 }}
                >
                    <motion.div
                        className="absolute inset-0"
                        style={{
                            background:
                                "linear-gradient(96deg, transparent 0%, rgba(91,58,160,0.72) 32%, rgba(194,63,219,0.55) 52%, rgba(76,224,255,0.3) 68%, transparent 100%)",
                        }}
                        initial={{ x: "-120%" }}
                        animate={{ x: "120%" }}
                        transition={{ duration: 0.62, ease: [0.65, 0, 0.35, 1] }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
