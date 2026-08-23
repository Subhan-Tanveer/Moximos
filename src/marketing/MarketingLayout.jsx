import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import LaunchTransition from "./components/LaunchTransition";
import SpaceBackdrop from "./scenes/SpaceBackdrop";
import { useSmoothScroll } from "./animations/useSmoothScroll";
import { usePointerTracking } from "./animations/usePointerTracking";
import { useMotionPrefs } from "./animations/useMotionPrefs";

/** Shown while a lazily-loaded route chunk arrives. */
function RouteFallback() {
    return (
        <div className="flex min-h-[70vh] items-center justify-center">
            <div className="flex items-center gap-3">
                <span className="h-2 w-2 animate-pulse-glow rounded-full bg-violet" />
                <span className="label-mono">Establishing uplink</span>
            </div>
        </div>
    );
}

/**
 * Shell for every marketing route: persistent nav, persistent WebGL backdrop,
 * smooth scroll, and the route-change launch sequence. The backdrop lives here
 * (not inside pages) so it survives navigation without rebuilding its context.
 */
export default function MarketingLayout() {
    const { animate } = useMotionPrefs();

    useSmoothScroll(animate);
    usePointerTracking(animate);

    return (
        <div className="relative min-h-screen">
            <SpaceBackdrop />
            <LaunchTransition />
            <Nav />

            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-solar focus:px-5 focus:py-2.5 focus:font-semibold focus:text-void"
            >
                Skip to content
            </a>

            <main id="main" className="relative z-10">
                <Suspense fallback={<RouteFallback />}>
                    <Outlet />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
