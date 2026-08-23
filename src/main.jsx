import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./index.css";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <Suspense fallback={<div className="min-h-screen bg-void" />}>
            {/* v7_startTransition is a RouterProvider flag, not a
                createBrowserRouter one — the rest live on the router itself. */}
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </Suspense>
    </StrictMode>
);
