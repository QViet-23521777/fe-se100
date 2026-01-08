"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

export default function AdminLoginPage() {
  const { user, token, login } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && token && user.accountType === "admin") {
      router.replace("/");
    }
  }, [router, token, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(gameStoreApiUrl("/auth/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.token || !data?.user) {
        setMessage(data?.message || "Login failed. Please check your email/password.");
        return;
      }

      login(data.user, data.token);
      router.push("/");
    } catch (err) {
      setMessage("Server connection error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070f2b] text-white flex items-center justify-center px-6 py-12">
      <div className="relative grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[540px_minmax(0,1fr)]">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="absolute left-2 top-2 text-white/70 text-3xl leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex flex-col gap-6">
          <h1 className="mt-10 text-5xl font-semibold">Welcome Back (Admin)</h1>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-[520px]">
            <div>
              <input
                name="email"
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>

            <div className="relative">
              <input
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>

            <div className="flex justify-end text-sm font-semibold text-white">
              <span>Admin access only</span>
            </div>

            {message ? (
              <div className="rounded-[10px] border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[10px] bg-[#1b1a55] px-4 py-3 font-semibold hover:bg-[#23225e] transition disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>
        </div>

        <div className="hidden justify-end lg:flex">
          <img
            src="/landing/hero-1.svg"
            alt=""
            className="max-h-[460px] w-full rounded-[20px] object-cover"
          />
        </div>
      </div>
    </div>
  );
}

