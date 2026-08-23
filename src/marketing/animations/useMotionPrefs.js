import { useEffect, useState } from "react";

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const DESKTOP_QUERY = "(min-width: 768px)";

function read(query) {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
}

function subscribe(query, onChange) {
    if (typeof window === "undefined" || !window.matchMedia) return () => {};
    const mql = window.matchMedia(query);
    const handler = (e) => onChange(e.matches);
    // Safari <14 only supports the deprecated signature.
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler);
    return () => {
        if (mql.removeEventListener) mql.removeEventListener("change", handler);
        else mql.removeListener(handler);
    };
}

/**
 * Single source of truth for "how much motion is this visitor allowed?".
 *
 *  - `reducedMotion` — the visitor asked the OS for less animation.
 *  - `isDesktop`     — viewport is >= 768px.
 *  - `webgl`         — render the real three.js scene. Requires a desktop
 *                      viewport, no reduced-motion preference, and an actual
 *                      WebGL context. Everything else gets the CSS starfield.
 *  - `animate`       — run GSAP/Framer choreography at all.
 *  - `cinematic`     — run the *pinned* scroll sequences (sticky stages, camera
 *                      fly-throughs). Desktop only: those layouts assume a tall
 *                      viewport, and pinning a full-height stage on a phone
 *                      both clips content and costs the most scroll jank.
 *                      Mobile still gets reveals and micro-interactions.
 */
export function useMotionPrefs() {
    const [reducedMotion, setReducedMotion] = useState(() => read(MOTION_QUERY));
    const [isDesktop, setIsDesktop] = useState(() => read(DESKTOP_QUERY));
    const [hasWebGL, setHasWebGL] = useState(true);
    // Frames only exist while the tab is actually on screen.
    const [visible, setVisible] = useState(
        () => typeof document === "undefined" || document.visibilityState === "visible"
    );

    useEffect(() => subscribe(MOTION_QUERY, setReducedMotion), []);
    useEffect(() => subscribe(DESKTOP_QUERY, setIsDesktop), []);

    // A page opened into a background tab has requestAnimationFrame suspended,
    // so GSAP's ticker never advances and anything animating in from opacity 0
    // would stay invisible. Treating "hidden" as "no motion" means such a load
    // renders plainly readable, then upgrades to the full choreography the
    // moment the visitor actually looks at it.
    useEffect(() => {
        const onChange = () => setVisible(document.visibilityState === "visible");
        document.addEventListener("visibilitychange", onChange);
        return () => document.removeEventListener("visibilitychange", onChange);
    }, []);

    useEffect(() => {
        // Probe once. A device that can't give us a context (or is throttling
        // GPU work) should never be handed the heavy scene.
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
            setHasWebGL(Boolean(gl));
            if (gl) {
                const lose = gl.getExtension("WEBGL_lose_context");
                if (lose) lose.loseContext();
            }
        } catch {
            setHasWebGL(false);
        }
    }, []);

    return {
        reducedMotion,
        isDesktop,
        hasWebGL,
        webgl: isDesktop && !reducedMotion && hasWebGL && visible,
        animate: !reducedMotion && visible,
        cinematic: isDesktop && !reducedMotion && visible,
    };
}
