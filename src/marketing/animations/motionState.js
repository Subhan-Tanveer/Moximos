/**
 * Shared, render-free motion state.
 *
 * The WebGL backdrop needs scroll + pointer values every frame, but routing
 * those through React state would re-render the whole tree 60 times a second.
 * Instead Lenis and the pointer listener write into this mutable singleton and
 * `useFrame` reads it directly. Nothing here ever triggers a React render.
 */
export const motionState = {
    /** Absolute scroll position in px. */
    scrollY: 0,
    /** 0 → 1 progress through the current document. */
    progress: 0,
    /** Signed scroll velocity, used to bend the starfield on fast flicks. */
    velocity: 0,
    /** Pointer position normalised to -1 → 1 on both axes. */
    pointerX: 0,
    pointerY: 0,
    /** Bumped on route change so the scene can fire a warp impulse. */
    warp: 0,
};

export function triggerWarp(amount = 1) {
    motionState.warp = amount;
}
