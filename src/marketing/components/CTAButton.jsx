import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { useMotionPrefs } from "../animations/useMotionPrefs";

/**
 * Magnetic call-to-action.
 *
 * The button leans toward the cursor while it's nearby and springs back on
 * exit. `variant="primary"` is the only place amber appears in the whole
 * system — that's what makes buy-moments read as buy-moments.
 */
export default function CTAButton({
    children,
    to,
    href,
    onClick,
    variant = "primary",
    size = "md",
    icon: Icon,
    className = "",
    type,
    disabled,
    ...rest
}) {
    const ref = useRef(null);
    const { animate } = useMotionPrefs();
    const [hovered, setHovered] = useState(false);

    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const x = useSpring(mx, { stiffness: 260, damping: 18, mass: 0.4 });
    const y = useSpring(my, { stiffness: 260, damping: 18, mass: 0.4 });
    // The label trails the button slightly for a bit of depth.
    const labelX = useTransform(x, (v) => v * 0.35);
    const labelY = useTransform(y, (v) => v * 0.35);

    const handleMove = (e) => {
        if (!animate || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);
        mx.set(relX * 0.28);
        my.set(relY * 0.42);
    };

    const handleLeave = () => {
        mx.set(0);
        my.set(0);
        setHovered(false);
    };

    const sizes = {
        sm: "px-5 py-2.5 text-sm",
        md: "px-7 py-3.5 text-[0.95rem]",
        lg: "px-9 py-4.5 text-base",
    };

    const variants = {
        primary:
            "bg-solar text-void font-bold shadow-[0_0_0_0_rgba(255,184,76,0.5)] hover:shadow-[0_10px_40px_-6px_rgba(255,184,76,0.55)]",
        secondary:
            "glass-panel text-starlight font-semibold hover:border-violet/55 hover:bg-violet/10",
        ghost: "text-dust font-semibold hover:text-starlight",
    };

    const inner = (
        <>
            {/* Sheen sweep on hover — primary only, so it stays special. */}
            {variant === "primary" && (
                <span
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                    aria-hidden="true"
                />
            )}
            <motion.span
                style={animate ? { x: labelX, y: labelY } : undefined}
                className="relative z-10 inline-flex items-center gap-2.5 whitespace-nowrap"
            >
                {children}
                {Icon && (
                    <Icon
                        size={size === "lg" ? 19 : 17}
                        className={`transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                            hovered ? "translate-x-1" : ""
                        }`}
                    />
                )}
            </motion.span>
        </>
    );

    const classes = `group relative inline-flex items-center justify-center overflow-hidden rounded-full transition-colors duration-300 ${
        sizes[size]
    } ${variants[variant]} ${disabled ? "pointer-events-none opacity-45" : ""} ${className}`;

    const motionProps = {
        ref,
        className: classes,
        style: animate ? { x, y } : undefined,
        onPointerMove: handleMove,
        onPointerEnter: () => setHovered(true),
        onPointerLeave: handleLeave,
    };

    if (to) {
        return (
            <motion.div {...motionProps} style={{ ...motionProps.style, display: "inline-flex" }}>
                <Link to={to} onClick={onClick} className="contents" {...rest}>
                    {inner}
                </Link>
            </motion.div>
        );
    }

    if (href) {
        return (
            <motion.a
                {...motionProps}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer noopener" : undefined}
                onClick={onClick}
                {...rest}
            >
                {inner}
            </motion.a>
        );
    }

    return (
        <motion.button {...motionProps} onClick={onClick} type={type || "button"} disabled={disabled} {...rest}>
            {inner}
        </motion.button>
    );
}
