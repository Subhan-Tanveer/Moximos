import { Suspense, lazy, useEffect, useState } from "react";
import { useMotionPrefs } from "../animations/useMotionPrefs";

// three.js + the scene are ~450kb of the bundle. Keeping them behind a lazy
// boundary means mobile and reduced-motion visitors never download them at all.
const StarfieldScene = lazy(() => import("./StarfieldScene"));

/**
 * The one and only space layer, mounted once at the layout root and fixed
 * behind every page. Deliberately NOT remounted per route — tearing down and
 * rebuilding a WebGL context on navigation is both slow and visibly ugly.
 */
export default function SpaceBackdrop() {
    const { webgl } = useMotionPrefs();
    const [mountScene, setMountScene] = useState(false);

    useEffect(() => {
        if (!webgl) {
            setMountScene(false);
            return undefined;
        }
        // Let the hero paint first. The CSS starfield covers this window, so
        // the handoff is invisible — but LCP lands before WebGL work begins.
        //
        // A plain timer, deliberately: requestIdleCallback is throttled to the
        // point of never firing in a backgrounded tab, which would leave those
        // visitors on the fallback forever.
        const id = window.setTimeout(() => setMountScene(true), 300);
        return () => window.clearTimeout(id);
    }, [webgl]);

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-void" aria-hidden="true">
            {/* Always present: instant paint, and the permanent experience on
                mobile / reduced-motion. */}
            <div className="css-starfield" />

            {mountScene && (
                <Suspense fallback={null}>
                    <div className="absolute inset-0 animate-[fadeIn_1.2s_ease-out_forwards] opacity-0">
                        <StarfieldScene />
                    </div>
                </Suspense>
            )}

            {/* Grounding gradient so text always has contrast to sit against. */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,transparent_0%,rgba(5,5,7,0.55)_70%,rgba(5,5,7,0.9)_100%)]" />

            <style>{`@keyframes fadeIn { to { opacity: 1 } }`}</style>
        </div>
    );
}
