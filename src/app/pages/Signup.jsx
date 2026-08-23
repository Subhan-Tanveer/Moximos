import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import AuthLayout, { authInputClass } from "../AuthLayout";
import CTAButton from "../../marketing/components/CTAButton";
import api from "../api";

export default function Signup() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password.length < 8) {
            setError("Use at least 8 characters.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            await api.post("/api/auth/register", form);
            navigate("/app");
        } catch (err) {
            setError(err?.response?.data?.error || "Couldn't create that account. Try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthLayout
            title="Start free."
            subtitle="No card. Scrape a city and build your first site tonight."
            footer={
                <>
                    Already have an account?{" "}
                    <Link to="/login" className="font-medium text-violet underline underline-offset-4">
                        Sign in
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="name" className="label-mono mb-2.5 block">
                        Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        required
                        autoComplete="name"
                        value={form.name}
                        onChange={update("name")}
                        placeholder="Marcus Ellery"
                        className={authInputClass}
                    />
                </div>

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
                    <label htmlFor="password" className="label-mono mb-2.5 block">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={update("password")}
                        placeholder="At least 8 characters"
                        className={authInputClass}
                    />
                </div>

                {error && (
                    <p role="alert" className="text-[0.85rem] text-magenta">
                        {error}
                    </p>
                )}

                <CTAButton type="submit" size="lg" icon={ArrowUpRight} className="w-full" disabled={busy}>
                    {busy ? "Creating account…" : "Create account"}
                </CTAButton>

                <p className="text-center font-mono text-[0.68rem] leading-relaxed text-faint">
                    By continuing you agree to the terms and privacy policy.
                </p>
            </form>
        </AuthLayout>
    );
}
