import { useEffect } from "react";
import { motionState } from "./motionState";

/**
 * Feeds normalised pointer coordinates into the shared motion state so the
 * WebGL camera can drift toward the cursor. Passive listener, no React state,
 * no work at all when motion is disabled.
 */
export function usePointerTracking(enabled = true) {
    useEffect(() => {
        if (!enabled) {
            motionState.pointerX = 0;
            motionState.pointerY = 0;
            return undefined;
        }

        const onMove = (e) => {
            motionState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
            motionState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        return () => window.removeEventListener("pointermove", onMove);
    }, [enabled]);
}
