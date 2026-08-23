import {
    US, CA, GB, AU, IE, NZ, IN, DE, FR, ES, NL, MX, BR, ZA, AE, SG, PH, PK,
} from "country-flag-icons/react/3x2";

// Unicode flag emoji don't render as actual flags on Windows Chrome/Edge —
// Windows' emoji font shows the bare two-letter code instead, since it
// lacks the flag ligature glyphs macOS/Android ship. Real SVGs render
// identically everywhere.
const FLAGS = { US, CA, GB, AU, IE, NZ, IN, DE, FR, ES, NL, MX, BR, ZA, AE, SG, PH, PK };

export default function CountryFlag({ code, className = "h-3.5 w-5 rounded-[2px]" }) {
    const Flag = FLAGS[code];
    if (!Flag) return null;
    return <Flag title={code} className={`shrink-0 object-cover ${className}`} />;
}
