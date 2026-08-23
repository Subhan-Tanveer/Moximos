import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import AuthLayout, { authInputClass } from "../AuthLayout";
import CTAButton from "../../marketing/components/CTAButton";
import api from "../api";

export default function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            // Posts to /api/auth/login. Today that's served by the mock adapter
            // in api.js; pointing VITE_BASE_URL at the real backend and removing
            // that adapter is the only change needed to hit a live server.
            await api.post("/api/auth/login", form);
            navigate("/app");
        } catch (err) {
            setError(err?.response?.data?.error || "Couldn't sign you in. Check your details and try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome back."
            subtitle="Pick up where the pipeline left off."
            footer={
                <>
                    No account yet?{" "}
                    <Link to="/signup" className="font-medium text-violet underline underline-offset-4">
                        Create one
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="email" className="label-mono mb-2.5 block">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={form.email}
                        onChange={update("email")}
                        placeholder="you@youragency.com"
                        className={authInputClass}
                    />
                </div>

                <div>
                    <div className="mb-2.5 flex items-center justify-between">
                        <label htmlFor="password" className="label-mono">
                            Password
                        </label>
                        <Link to="/contact" className="font-mono text-[0.68rem] text-faint hover:text-dust">
                            Forgot?
                        </Link>
                    </div>
                    <input
                        id="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={form.password}
                        onChange={update("password")}
                        placeholder="••••••••"
                        className={authInputClass}
                    />
                </div>

                {error && (
                    <p role="alert" className="text-[0.85rem] text-magenta">
                        {error}
                    </p>
                )}

                <CTAButton type="submit" size="lg" icon={ArrowUpRight} className="w-full" disabled={busy}>
                    {busy ? "Signing in…" : "Sign in"}
                </CTAButton>
            </form>

            <p className="mt-6 text-center font-mono text-[0.7rem] leading-relaxed text-faint">
                Demo build — the mock backend accepts any email and password.
            </p>
        </AuthLayout>
    );
}
