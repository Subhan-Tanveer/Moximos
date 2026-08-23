import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useMotionPrefs } from "../animations/useMotionPrefs";

/**
 * Shared marketing primitives.
 *
 * Everything here is presentational and renders fully visible by default. The
 * `data-reveal` attribute is only a hook: GSAP applies the hidden "from" state
 * at runtime, and only when useMotionPrefs says frames are actually available.
 * Nothing is hidden by CSS, so content can never be stranded invisible.
 */

/** Small monospace eyebrow with a leading status dot. Used to head sections. */
export function Eyebrow({ children, className = "", tone = "violet" }) {
    const dot = {
        violet: "bg-violet shadow-[0_0_8px_2px_rgba(139,92,246,0.7)]",
        ion: "bg-ion shadow-[0_0_8px_2px_rgba(76,224,255,0.7)]",
        solar: "bg-solar shadow-[0_0_8px_2px_rgba(255,184,76,0.7)]",
        magenta: "bg-magenta shadow-[0_0_8px_2px_rgba(194,63,219,0.7)]",
    }[tone];

    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`} data-reveal>
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            <span className="label-mono">{children}</span>
        </span>
    );
}

/** Section headline. `as` lets pages keep a sane heading order. */
export function SectionTitle({ children, as: Tag = "h2", className = "", gradient = false }) {
    return (
        <Tag
            data-reveal
            className={`font-display text-[clamp(2.1rem,5.2vw,4.05rem)] ${
                gradient ? "text-nebula-gradient" : "text-starlight"
            } ${className}`}
        >
            {children}
        </Tag>
    );
}

/** Body copy at the size the space theme needs to stay readable on black. */
export function Lede({ children, className = "" }) {
    return (
        <p
            data-reveal
            className={`max-w-2xl text-[1.05rem] leading-relaxed text-dust md:text-[1.15rem] ${className}`}
        >
            {children}
        </p>
    );
}

/** Full-bleed section wrapper with consistent vertical rhythm. */
export function Section({ children, className = "", id, container = true }) {
    return (
        <section id={id} className={`relative w-full px-5 py-24 sm:px-8 md:py-32 lg:px-12 ${className}`}>
            {container ? <div className="mx-auto w-full max-w-7xl">{children}</div> : children}
        </section>
    );
}

/**
 * Card that tilts toward the cursor in 3D. Rotation is deliberately small —
 * past about 9° it stops reading as depth and starts reading as a gimmick.
 */
export function TiltCard({ children, className = "", intensity = 7, glare = true }) {
    const ref = useRef(null);
    const { animate } = useMotionPrefs();

    const px = useMotionValue(0.5);
    const py = useMotionValue(0.5);
    const sx = useSpring(px, { stiffness: 200, damping: 22 });
    const sy = useSpring(py, { stiffness: 200, damping: 22 });

    const rotateX = useTransform(sy, [0, 1], [intensity, -intensity]);
    const rotateY = useTransform(sx, [0, 1], [-intensity, intensity]);
    const glareX = useTransform(sx, [0, 1], ["0%", "100%"]);
    const glareY = useTransform(sy, [0, 1], ["0%", "100%"]);
    const glareBg = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, rgba(139,92,246,0.17), transparent 62%)`;

    const onMove = (e) => {
        if (!animate || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
    };

    const onLeave = () => {
        px.set(0.5);
        py.set(0.5);
    };

    return (
        <motion.div
            ref={ref}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            style={
                animate
                    ? { rotateX, rotateY, transformStyle: "preserve-3d", perspective: 1000 }
                    : undefined
            }
            className={`relative ${className}`}
        >
            {children}
            {glare && animate && (
                <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: glareBg }}
                />
            )}
        </motion.div>
    );
}

/** Hairline divider that fades out at both ends. */
export function Hairline({ className = "" }) {
    return (
        <div
            className={`h-px w-full bg-gradient-to-r from-transparent via-white/12 to-transparent ${className}`}
        />
    );
}

/** Monospace stat readout — the "mission control" texture. */
export function StatReadout({ value, label, tone = "starlight" }) {
    const toneClass = {
        starlight: "text-starlight",
        ion: "text-ion",
        solar: "text-solar",
        magenta: "text-magenta",
    }[tone];

    return (
        <div data-reveal className="flex flex-col gap-1.5">
            <span className={`font-mono text-[clamp(1.7rem,3.4vw,2.6rem)] font-medium tracking-tight ${toneClass}`}>
                {value}
            </span>
            <span className="label-mono">{label}</span>
        </div>
    );
}
