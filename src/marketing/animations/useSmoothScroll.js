import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motionState } from "./motionState";

gsap.registerPlugin(ScrollTrigger);

/**
 * Site-wide inertia scrolling, wired into GSAP's ticker so ScrollTrigger and
 * Lenis advance on the same frame. Without this handshake, pinned sections
 * visibly lag the smooth-scrolled content by a frame or two.
 *
 * Skipped entirely when the visitor prefers reduced motion — native scrolling
 * is the accessible behaviour, and ScrollTrigger still works against it.
 */
export function useSmoothScroll(enabled = true) {
    useEffect(() => {
        if (!enabled) {
            // Still keep motionState fed so any parallax that survives
            // reduced-motion has sane values.
            const onScroll = () => {
                motionState.scrollY = window.scrollY;
                const max = document.documentElement.scrollHeight - window.innerHeight;
                motionState.progress = max > 0 ? window.scrollY / max : 0;
            };
            onScroll();
            window.addEventListener("scroll", onScroll, { passive: true });
            return () => window.removeEventListener("scroll", onScroll);
        }

        const lenis = new Lenis({
            duration: 1.05,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            touchMultiplier: 1.6,
        });

        lenis.on("scroll", ({ scroll, progress, velocity }) => {
            motionState.scrollY = scroll;
            motionState.progress = progress || 0;
            motionState.velocity = velocity || 0;
            ScrollTrigger.update();
        });

        const raf = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);

        // Expose for programmatic anchor scrolling from nav links.
        window.__lenis = lenis;

        return () => {
            gsap.ticker.remove(raf);
            lenis.destroy();
            delete window.__lenis;
        };
    }, [enabled]);
}

/** Scroll to an element or offset, using Lenis when it's active. */
export function scrollTo(target, options = {}) {
    if (window.__lenis) {
        window.__lenis.scrollTo(target, { offset: -80, duration: 1.2, ...options });
        return;
    }
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
}
