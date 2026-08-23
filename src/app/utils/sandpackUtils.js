// Packages whose "latest" tag is a real risk, not just an unpinned version —
// live-tested: @react-three/fiber's newer major versions require React 19,
// while this app's live preview and export template are both pinned to
// React 18. Mismatched majors across this ecosystem load two copies of
// React into the bundle, which surfaces as a cryptic runtime crash
// ("Cannot read properties of undefined (reading 'ReactCurrentDispatcher')")
// with no indication the actual cause was a version mismatch. Pin the whole
// three.js/react-three ecosystem to versions verified compatible with React 18.
const VERSION_OVERRIDES = {
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.99.0",
    "@react-spring/three": "^9.7.0",
    "@react-spring/web": "^9.7.0",
    three: "^0.160.0",
};

// Scans source files to detect npm dependencies from import statements
export function detectDependencies(files) {
    const deps = {};
    if (!files) return deps;

    const allCode = Object.values(files).join("\n");
    const filePaths = Object.keys(files);

    const isLocalFileOrFolder = (pkgName) => {
        const name = pkgName.startsWith("@/") ? pkgName.substring(2) : pkgName;
        return (
            pkgName.startsWith("@/") ||
            pkgName === "@" ||
            filePaths.some(p =>
                p === `/${name}` ||
                p.startsWith(`/${name}/`) ||
                p.replace(/\.[^/.]+$/, "") === `/${name}`
            )
        );
    };

    const importRegex = /from\s+['"]([^./][^'"]*)['"]/g;
    let match;
    while ((match = importRegex.exec(allCode)) !== null) {
        const rawImport = match[1];

        // Scoped packages like @scope/package, normal packages like package
        const pkg = rawImport.startsWith("@") && !rawImport.startsWith("@/")
            ? rawImport.split("/").slice(0, 2).join("/")
            : rawImport.split("/")[0];

        // Skip react (included in template), react-dom, and local modules
        if (pkg !== "react" && pkg !== "react-dom" && !isLocalFileOrFolder(pkg)) {
            deps[pkg] = VERSION_OVERRIDES[pkg] || "latest";
        }
    }
    return deps;
}
