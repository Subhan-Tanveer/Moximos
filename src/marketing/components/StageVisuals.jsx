/**
 * Per-stage diagrams for How It Works.
 *
 * All three are hand-built SVG rather than images: they need to be themeable,
 * they need to animate on scroll, and they need to stay crisp at any size
 * without shipping a single raster asset.
 */

/* ── 01 · Radar sweep, businesses lighting up as it passes ── */
export function ScrapeVisual() {
    const pins = [
        { x: 118, y: 96, r: 4.5, delay: "0s" },
        { x: 196, y: 62, r: 3.5, delay: "0.4s" },
        { x: 232, y: 148, r: 5, delay: "0.9s" },
        { x: 92, y: 186, r: 4, delay: "1.4s" },
        { x: 168, y: 214, r: 3.5, delay: "1.9s" },
        { x: 258, y: 92, r: 4, delay: "2.3s" },
        { x: 64, y: 128, r: 3, delay: "2.7s" },
    ];

    return (
        <svg viewBox="0 0 320 280" className="h-full w-full" role="img" aria-label="Radar sweeping a city for businesses">
            <defs>
                <radialGradient id="radar-sweep" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#4CE0FF" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#4CE0FF" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="radar-arm" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4CE0FF" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#4CE0FF" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Range rings */}
            {[42, 78, 114].map((r) => (
                <circle key={r} cx="160" cy="140" r={r} fill="none" stroke="rgba(76,224,255,0.16)" strokeWidth="1" />
            ))}
            <circle cx="160" cy="140" r="114" fill="url(#radar-sweep)" opacity="0.35" />

            {/* Cross-hairs */}
            <line x1="46" y1="140" x2="274" y2="140" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <line x1="160" y1="26" x2="160" y2="254" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />

            {/* Sweeping arm */}
            <g className="animate-orbit" style={{ transformOrigin: "160px 140px", animationDuration: "5s" }}>
                <path d="M160 140 L274 140 A114 114 0 0 0 245 62 Z" fill="url(#radar-arm)" opacity="0.5" />
                <line x1="160" y1="140" x2="274" y2="140" stroke="#4CE0FF" strokeWidth="1.5" opacity="0.9" />
            </g>

            {/* Detected businesses */}
            {pins.map((p) => (
                <g key={`${p.x}-${p.y}`}>
                    <circle
                        cx={p.x}
                        cy={p.y}
                        r={p.r * 2.6}
                        fill="#4CE0FF"
                        opacity="0.14"
                        className="animate-pulse-glow"
                        style={{ animationDelay: p.delay, transformOrigin: `${p.x}px ${p.y}px` }}
                    />
                    <circle cx={p.x} cy={p.y} r={p.r} fill="#4CE0FF" />
                </g>
            ))}

            <circle cx="160" cy="140" r="5" fill="#F5F5F7" />
        </svg>
    );
}

/* ── 02 · Wireframe blocks assembling into a page ── */
export function BuildVisual() {
    const blocks = [
        { x: 74, y: 44, w: 172, h: 34, delay: "0s" },
        { x: 74, y: 88, w: 108, h: 12, delay: "0.25s" },
        { x: 74, y: 108, w: 80, h: 12, delay: "0.4s" },
        { x: 74, y: 136, w: 52, h: 52, delay: "0.6s" },
        { x: 134, y: 136, w: 52, h: 52, delay: "0.75s" },
        { x: 194, y: 136, w: 52, h: 52, delay: "0.9s" },
        { x: 74, y: 200, w: 172, h: 40, delay: "1.1s" },
    ];

    return (
        <svg viewBox="0 0 320 280" className="h-full w-full" role="img" aria-label="A website assembling itself block by block">
            <defs>
                <linearGradient id="build-fill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#C23FDB" stopOpacity="0.14" />
                </linearGradient>
            </defs>

            {/* Browser chrome */}
            <rect x="56" y="18" width="208" height="244" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" />
            <line x1="56" y1="34" x2="264" y2="34" stroke="rgba(255,255,255,0.12)" />
            {[66, 76, 86].map((cx) => (
                <circle key={cx} cx={cx} cy="26" r="2.5" fill="rgba(255,255,255,0.22)" />
            ))}

            {blocks.map((b) => (
                <rect
                    key={`${b.x}-${b.y}`}
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                    rx="4"
                    fill="url(#build-fill)"
                    stroke="rgba(139,92,246,0.5)"
                    strokeWidth="0.75"
                    className="animate-pulse-glow"
                    style={{ animationDelay: b.delay, animationDuration: "3.6s", transformOrigin: `${b.x + b.w / 2}px ${b.y + b.h / 2}px` }}
                />
            ))}

            {/* Agent cursor stitching it together */}
            <circle cx="246" cy="212" r="3.5" fill="#4CE0FF" className="animate-pulse-glow" style={{ transformOrigin: "246px 212px" }} />
        </svg>
    );
}

/* ── 03 · Message travelling from Moximos to a business ── */
export function SendVisual() {
    return (
        <svg viewBox="0 0 320 280" className="h-full w-full" role="img" aria-label="A message travelling from Moximos to a business inbox">
            <defs>
                <linearGradient id="send-path" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FFB84C" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#FFB84C" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#FFB84C" stopOpacity="0.1" />
                </linearGradient>
            </defs>

            {/* Transmission arc */}
            <path
                id="send-arc"
                d="M62 196 C 116 88, 204 88, 258 196"
                fill="none"
                stroke="url(#send-path)"
                strokeWidth="1.5"
                strokeDasharray="5 7"
                className="animate-dash-flow"
            />

            {/* Source node — you */}
            <g>
                <circle cx="62" cy="196" r="24" fill="rgba(255,184,76,0.1)" stroke="rgba(255,184,76,0.45)" />
                <circle cx="62" cy="196" r="34" fill="none" stroke="rgba(255,184,76,0.16)" className="animate-pulse-glow" style={{ transformOrigin: "62px 196px" }} />
                <circle cx="62" cy="196" r="6" fill="#FFB84C" />
                <text x="62" y="244" textAnchor="middle" fill="#6B6B80" fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="1.6">
                    YOUR GMAIL
                </text>
            </g>

            {/* Destination node — the business */}
            <g>
                <circle cx="258" cy="196" r="24" fill="rgba(76,224,255,0.09)" stroke="rgba(76,224,255,0.45)" />
                <circle
                    cx="258"
                    cy="196"
                    r="34"
                    fill="none"
                    stroke="rgba(76,224,255,0.16)"
                    className="animate-pulse-glow"
                    style={{ animationDelay: "1.2s", transformOrigin: "258px 196px" }}
                />
                <circle cx="258" cy="196" r="6" fill="#4CE0FF" />
                <text x="258" y="244" textAnchor="middle" fill="#6B6B80" fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="1.6">
                    THEIR INBOX
                </text>
            </g>

            {/* Packet in flight */}
            <circle r="4" fill="#FFB84C">
                <animateMotion dur="3.4s" repeatCount="indefinite" path="M62 196 C 116 88, 204 88, 258 196" />
            </circle>
            <circle r="9" fill="#FFB84C" opacity="0.22">
                <animateMotion dur="3.4s" repeatCount="indefinite" path="M62 196 C 116 88, 204 88, 258 196" />
            </circle>
        </svg>
    );
}
