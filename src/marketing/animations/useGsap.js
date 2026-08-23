import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Whether it is safe to hide content behind an animation right now.
 *
 * In a background tab the browser suspends requestAnimationFrame, which freezes
 * GSAP's ticker — so anything we set to `opacity: 0` as a "from" state would
 * stay invisible until the tab is focused. Same story for crawlers and link
 * preview bots that render with a short frame budget.
 *
 * When we can't guarantee frames, we skip the animation and leave the content
 * plainly readable. A missed flourish is always cheaper than missing copy.
 */
export function canAnimateNow() {
    return typeof document === "undefined" || document.visibilityState === "visible";
}

/**
 * Scopes a GSAP timeline to a container and reverts every tween + ScrollTrigger
 * it created on unmount. `gsap.context` is what makes route changes safe: without
 * it, ScrollTriggers from a previous page keep measuring detached DOM nodes.
 *
 * When `enabled` is false (reduced motion) the callback never runs, so elements
 * keep the readable state the CSS backstop gives them.
 */
export function useGsapScope(callback, { enabled = true, deps = [] } = {}) {
    const scope = useRef(null);

    useIsomorphicLayoutEffect(() => {
        if (!enabled || !scope.current) return undefined;
        const ctx = gsap.context(callback, scope);

        // Layout settles after fonts land; a refresh keeps pin math honest.
        const refresh = () => ScrollTrigger.refresh();
        const id = window.setTimeout(refresh, 240);

        // A tab that loads in the background has frozen frames and stale
        // measurements. Recompute once it's actually on screen.
        const onVisible = () => {
            if (document.visibilityState === "visible") ScrollTrigger.refresh();
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            window.clearTimeout(id);
            document.removeEventListener("visibilitychange", onVisible);
            ctx.revert();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, ...deps]);

    return scope;
}

/**
 * The house reveal: content rises and fades in as it crosses into view.
 * Applied to any descendant carrying `data-reveal`. `data-reveal-delay`
 * staggers an individual element without needing its own timeline.
 */
export function revealChildren(targetsOrScope, { y = 34, duration = 1 } = {}) {
    // Accepts either the array from `self.selector("[data-reveal]")` or a
    // container element to search within.
    const targets = Array.isArray(targetsOrScope)
        ? targetsOrScope
        : gsap.utils.toArray("[data-reveal]", targetsOrScope);

    // No frames available — leave the copy visible rather than hiding it
    // behind a tween that cannot run.
    if (!canAnimateNow()) return targets;

    targets.forEach((el) => {
        gsap.fromTo(
            el,
            { opacity: 0, y },
            {
                opacity: 1,
                y: 0,
                duration,
                ease: "power3.out",
                delay: parseFloat(el.dataset.revealDelay || 0),
                scrollTrigger: {
                    trigger: el,
                    start: "top 88%",
                    once: true,
                },
            }
        );
    });
    return targets;
}

/** Convenience: reveal every `[data-reveal]` inside a `gsap.context` scope. */
export function revealScope(self, options) {
    return revealChildren(self.selector("[data-reveal]"), options);
}

/**
 * Splits a headline into word spans and materialises them: each word warps in
 * from below with a slight blur, so the line assembles rather than fading.
 * Returns a cleanup that restores the original markup.
 */
export function materializeHeading(el, { trigger, stagger = 0.045, delay = 0 } = {}) {
    if (!el || el.dataset.split === "true") return () => {};
    // Headlines are the last thing that should ever be invisible.
    if (!canAnimateNow()) return () => {};
    const original = el.innerHTML;
    const words = el.textContent.trim().split(/\s+/);

    el.innerHTML = words
        .map(
            (w) =>
                `<span class="inline-block overflow-hidden align-bottom"><span class="inline-block will-change-transform">${w}</span></span>`
        )
        .join(" ");
    el.dataset.split = "true";

    const inner = el.querySelectorAll("span > span");
    gsap.fromTo(
        inner,
        { yPercent: 118, opacity: 0, filter: "blur(8px)" },
        {
            yPercent: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1.15,
            ease: "expo.out",
            stagger,
            delay,
            scrollTrigger: trigger
                ? { trigger: trigger || el, start: "top 85%", once: true }
                : undefined,
        }
    );

    return () => {
        el.innerHTML = original;
        delete el.dataset.split;
    };
}

export { gsap, ScrollTrigger };
