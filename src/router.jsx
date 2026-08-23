import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import MarketingLayout from "./marketing/MarketingLayout";

/*
 * Every route is code-split. Home is the only page most visitors ever see, so
 * it must not carry the weight of the other nine — and the product app at /app
 * must never load on a marketing visit.
 */
const Home = lazy(() => import("./marketing/pages/Home"));
const HowItWorks = lazy(() => import("./marketing/pages/HowItWorks"));
const Builder = lazy(() => import("./marketing/pages/Builder"));
const LeadExplorer = lazy(() => import("./marketing/pages/LeadExplorer"));
const Outreach = lazy(() => import("./marketing/pages/Outreach"));
const Showcase = lazy(() => import("./marketing/pages/Showcase"));
const Pricing = lazy(() => import("./marketing/pages/Pricing"));
const About = lazy(() => import("./marketing/pages/About"));
const Contact = lazy(() => import("./marketing/pages/Contact"));
const NotFound = lazy(() => import("./marketing/pages/NotFound"));

const Login = lazy(() => import("./app/pages/Login"));
const Signup = lazy(() => import("./app/pages/Signup"));
const AppShell = lazy(() => import("./app/AppShell"));

const routes = [
    {
        element: <MarketingLayout />,
        children: [
            { path: "/", element: <Home /> },
            { path: "/how-it-works", element: <HowItWorks /> },
            { path: "/ai-website-builder", element: <Builder /> },
            { path: "/lead-explorer", element: <LeadExplorer /> },
            { path: "/outreach", element: <Outreach /> },
            { path: "/showcase", element: <Showcase /> },
            { path: "/pricing", element: <Pricing /> },
            { path: "/about", element: <About /> },
            { path: "/contact", element: <Contact /> },
            { path: "*", element: <NotFound /> },
        ],
    },
    // Auth sits outside the marketing shell: no nav, no footer, its own
    // full-height composition.
    { path: "/login", element: <Login /> },
    { path: "/signup", element: <Signup /> },
    // The product app. Each project is its own real, bookmarkable URL
    // rather than internal-only client state — /app is the composer/list,
    // /app/:projectId is one specific project.
    { path: "/app", element: <AppShell /> },
    { path: "/app/:projectId", element: <AppShell /> },
];

export const router = createBrowserRouter(routes, {
    // Opt into the v7 behaviours now so the console stays clean and the
    // upgrade is a version bump rather than a migration.
    future: {
        v7_relativeSplatPath: true,
        v7_fetcherPersist: true,
        v7_normalizeFormMethod: true,
        v7_partialHydration: true,
        v7_skipActionErrorRevalidation: true,
    },
});
