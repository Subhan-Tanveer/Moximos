import { useLayoutEffect, useRef } from "react";

/**
 * Grows a textarea to fit its content, up to a cap.
 *
 * Both prompt inputs had a fixed `rows` and `resize-none`, so anything longer
 * than two or three lines scrolled inside a small box — you could not see the
 * start of what you had written while typing the end. For an input whose whole
 * purpose is a paragraph-length brief, that is the wrong default.
 *
 * The height is reset to "auto" BEFORE measuring on every change. Without that
 * step scrollHeight only ever reports the current (already-grown) height, so
 * the box grows and never shrinks back when text is deleted.
 *
 * useLayoutEffect rather than useEffect: the resize is applied in the same
 * frame as the render, so the box never paints at the wrong height first.
 *
 * @param {string} value    the controlled value — resize runs whenever it changes
 * @param {number} maxHeight px cap; past this the textarea scrolls internally
 *                           instead of pushing the send button off screen
 */
export function useAutoGrow(value, maxHeight = 260) {
    const ref = useRef(null);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        el.style.height = "auto";
        const next = Math.min(el.scrollHeight, maxHeight);
        el.style.height = `${next}px`;
        // Only show a scrollbar once the cap is actually reached, so the
        // common case has no scrollbar at all.
        el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [value, maxHeight]);

    return ref;
}
