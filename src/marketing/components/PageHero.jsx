import { useEffect, useRef } from "react";
import { Eyebrow, Lede } from "./Primitives";
import { materializeHeading } from "../animations/useGsap";
import { useMotionPrefs } from "../animations/useMotionPrefs";

/**
 * Standard hero for interior pages. Same materialise treatment as the home
 * headline so navigating between pages feels like one continuous system, but
 * sized down — the home hero stays the loudest moment on the site.
 */
export default function PageHero({ eyebrow, title, lede, tone = "violet", children, align = "left" }) {
    const headingRef = useRef(null);
    const { animate } = useMotionPrefs();

    useEffect(() => {
        if (!animate || !headingRef.current) return undefined;
        return materializeHeading(headingRef.current, { stagger: 0.05, delay: 0.1 });
    }, [animate, title]);

    const centered = align === "center";

    return (
        <section
            className={`relative px-5 pb-16 pt-36 sm:px-8 md:pb-24 md:pt-44 lg:px-12 ${
                centered ? "text-center" : ""
            }`}
        >
            <div className={`mx-auto w-full max-w-7xl ${centered ? "flex flex-col items-center" : ""}`}>
                <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
                <h1
                    ref={headingRef}
                    className="font-display mt-6 max-w-4xl text-[clamp(2.3rem,6.4vw,4.8rem)] text-starlight"
                >
                    {title}
                </h1>
                {lede && <Lede className={`mt-7 ${centered ? "text-center" : ""}`}>{lede}</Lede>}
                {children && <div className="mt-10">{children}</div>}
            </div>
        </section>
    );
}
