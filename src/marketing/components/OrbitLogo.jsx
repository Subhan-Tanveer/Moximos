/**
 * The Moximos mark, animated.
 *
 * The existing logo is four rotated trapezoids that already read as orbit
 * paths, so rather than replacing it we let each face drift on its own cycle
 * and ring it with a counter-rotating orbit. Paths are inlined (not an <img>)
 * because they need to be individually animated and colour-shifted.
 */
export default function OrbitLogo({ size = 34, className = "", orbit = true, glow = true }) {
    return (
        <span
            className={`relative inline-flex items-center justify-center ${className}`}
            style={{ width: size * 1.5, height: size * 1.5 }}
        >
            {orbit && (
                <>
                    <span
                        className="animate-orbit absolute inset-0 rounded-full border border-violet/25"
                        style={{ animationDuration: "18s" }}
                    >
                        <span className="absolute -top-[2px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-ion shadow-[0_0_8px_2px_rgba(76,224,255,0.9)]" />
                    </span>
                    <span
                        className="animate-orbit absolute inset-[14%] rounded-full border border-magenta/20"
                        style={{ animationDuration: "11s", animationDirection: "reverse" }}
                    >
                        <span className="absolute -bottom-[2px] left-1/2 h-[2px] w-[2px] -translate-x-1/2 rounded-full bg-magenta shadow-[0_0_6px_2px_rgba(194,63,219,0.8)]" />
                    </span>
                </>
            )}

            <svg
                width={size}
                height={size * (71 / 63)}
                viewBox="0 0 63 71"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative"
                style={glow ? { filter: "drop-shadow(0 0 10px rgba(139,92,246,0.55))" } : undefined}
            >
                <path
                    d="M0.87793 22.8482V40.4288L11.7198 34.2753V23.4334L28.1291 14.0567L17.5814 7.61719L5.98284 14.1282C2.82985 15.8982 0.87793 19.2324 0.87793 22.8482Z"
                    fill="currentColor"
                    className="text-starlight"
                />
                <path
                    d="M63 47.4682V29.8876L52.1581 36.0411V46.883L35.7488 56.2597L46.2965 62.6992L57.8951 56.1882C61.0481 54.4182 63 51.084 63 47.4682Z"
                    fill="currentColor"
                    className="text-starlight"
                />
                <path
                    d="M62.5224 22.1214L62.707 24.614L51.8652 30.4744V23.4419L21.0977 6.43948L31.6454 0L57.3558 14.0907C60.3274 15.7193 62.2721 18.742 62.5224 22.1214Z"
                    fill="currentColor"
                    className="text-starlight"
                />
                <path
                    d="M0.184636 48.7927L0 46.3001L10.8419 40.4396V47.4722L41.6093 64.4746L31.0616 70.9141L5.35122 56.8233C2.37962 55.1947 0.434958 52.172 0.184636 48.7927Z"
                    fill="currentColor"
                    className="text-starlight"
                />
            </svg>
        </span>
    );
}
