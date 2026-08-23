import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        // The frontend calls relative /api/... paths (see src/app/api.js).
        // Proxying keeps that same-origin in dev, so the real backend
        // (npm run server, default port 8787) needs no CORS config and the
        // session cookie isn't a cross-site cookie at all.
        proxy: {
            "/api": {
                target: `http://localhost:${process.env.API_PORT || 8787}`,
                changeOrigin: true,
            },
        },
    },
    build: {
        rollupOptions: {
            output: {
                // Only libraries that are genuinely part of the first paint get
                // named chunks. three.js is deliberately NOT listed: naming it
                // here pulls it into the entry's static graph, so Vite emits a
                // modulepreload for it and every visitor downloads ~217kB gzip
                // of WebGL they may never use. Left unnamed, Rollup splits it
                // at the dynamic import in SpaceBackdrop, which is the point.
                manualChunks: {
                    "vendor-react": ["react", "react-dom", "react-router-dom"],
                    "vendor-motion": ["gsap", "framer-motion", "lenis"],
                },
            },
        },
        chunkSizeWarningLimit: 900,
    },
});
