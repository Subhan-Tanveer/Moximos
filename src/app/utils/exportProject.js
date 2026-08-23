import { detectDependencies } from "./sandpackUtils";

function flattenFiles(files) {
    const flat = {};
    for (const [path, content] of Object.entries(files || {})) {
        flat[path] = typeof content === "string" ? content : content?.content || "";
    }
    return flat;
}

function slugify(name) {
    return (name || "website").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Plain HTML/CSS/JS needs no build tooling at all — the files the AI wrote
// (already using real <script>/<link> tags per HTML_RULES in
// server/services/prompts.js) are ready to open directly in a browser or
// drop on any static host as-is.
function writeHtmlZip(zip, fileMap) {
    for (const [path, content] of Object.entries(fileMap)) {
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;
        zip.file(cleanPath, content);
    }
}

// Next.js App Router expects /app at the project root, alongside a real
// package.json — the AI's own /app/layout.js already carries the Tailwind/
// Font Awesome CDN tags per NEXTJS_RULES, so no synthesized HTML shell is
// needed here the way the React export needs one.
function writeNextjsZip(zip, fileMap, project) {
    zip.file(
        "package.json",
        JSON.stringify(
            {
                name: slugify(project.name),
                private: true,
                version: "0.1.0",
                scripts: {
                    dev: "next dev",
                    build: "next build",
                    start: "next start",
                },
                dependencies: {
                    next: "^14.2.0",
                    react: "^18.2.0",
                    "react-dom": "^18.2.0",
                },
            },
            null,
            2,
        ),
    );

    for (const [path, content] of Object.entries(fileMap)) {
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;
        zip.file(cleanPath, content);
    }
}

// React (Vite) — the original export shape this app always used.
function writeReactZip(zip, fileMap, project) {
    const detectedDeps = detectDependencies(fileMap);

    zip.file(
        "package.json",
        JSON.stringify(
            {
                name: slugify(project.name),
                private: true,
                version: "0.1.0",
                type: "module",
                scripts: {
                    dev: "vite",
                    build: "vite build",
                    preview: "vite preview",
                },
                dependencies: {
                    react: "^18.2.0",
                    "react-dom": "^18.2.0",
                    ...detectedDeps,
                },
                devDependencies: {
                    "@vitejs/plugin-react": "^4.2.0",
                    vite: "^5.0.0",
                    tailwindcss: "^3.4.0",
                    autoprefixer: "^10.4.0",
                    postcss: "^8.4.0",
                },
            },
            null,
            2,
        ),
    );

    zip.file(
        "vite.config.js",
        `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src\\/.*\\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
});
`,
    );

    zip.file(
        "index.html",
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.name || "My Website"}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/index.jsx"></script>
</body>
</html>
`,
    );

    zip.file(
        "src/index.jsx",
        `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')).render(<App />);
`,
    );

    for (const [path, content] of Object.entries(fileMap)) {
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;
        zip.file(`src/${cleanPath}`, content);
    }
}

export async function exportProjectZip(project) {
    if (!project) return;
    try {
        const JSZip = (await import("jszip")).default;
        const { saveAs } = await import("file-saver");

        const zip = new JSZip();
        const fileMap = flattenFiles(project.files);
        const stack = project.stack || "react";

        if (stack === "html") {
            writeHtmlZip(zip, fileMap);
        } else if (stack === "nextjs") {
            writeNextjsZip(zip, fileMap, project);
        } else {
            writeReactZip(zip, fileMap, project);
        }

        const blob = await zip.generateAsync({ type: "blob" });
        const fileName = `${slugify(project.name)}.zip`;
        saveAs(blob, fileName);
    } catch (error) {
        console.error("Export project error:", error);
    }
}
