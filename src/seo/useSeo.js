import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SITE, seoFor } from "./pages";

function upsert(selector, create, attr, value) {
    let el = document.head.querySelector(selector);
    if (!el) {
        el = document.createElement(create.tag);
        Object.entries(create.attrs).forEach(([k, v]) => el.setAttribute(k, v));
        document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
}

/** Keeps title, description, canonical and robots correct as the SPA navigates. */
export function useSeo() {
    const { pathname } = useLocation();
    useEffect(() => {
        const seo = seoFor(pathname);
        const url = SITE.url + (seo.path === "/" ? "/" : seo.path);
        document.title = seo.title;
        upsert('meta[name="description"]', { tag: "meta", attrs: { name: "description" } }, "content", seo.description);
        upsert('link[rel="canonical"]', { tag: "link", attrs: { rel: "canonical" } }, "href", url);
        upsert('meta[property="og:title"]', { tag: "meta", attrs: { property: "og:title" } }, "content", seo.title);
        upsert('meta[property="og:description"]', { tag: "meta", attrs: { property: "og:description" } }, "content", seo.description);
        upsert('meta[property="og:url"]', { tag: "meta", attrs: { property: "og:url" } }, "content", url);
        upsert(
            'meta[name="robots"]',
            { tag: "meta", attrs: { name: "robots" } },
            "content",
            seo.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"
        );
    }, [pathname]);
}
