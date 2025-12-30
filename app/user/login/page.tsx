"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

const wallpaper = "/assets/3dda024677e7245b10f9e299656e6b659ed0739d.png";

type Message = { type: "error" | "success"; text: string };

function safeNextPath(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path
          d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.88 5.09A10.3 10.3 0 0 1 12 5c6.4 0 10 7 10 7a17.1 17.1 0 0 1-2.64 3.78"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.34 6.34C3.8 8.16 2 12 2 12s3.6 7 10 7c1.2 0 2.3-.2 3.27-.55"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, token, login } = useAuth();

  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    try {
      const next = new URLSearchParams(window.location.search).get("next");
      setNextPath(safeNextPath(next));
    } catch {
      setNextPath("/");
    }
  }, []);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (!user || !token) return;
    router.replace(nextPath);
  }, [nextPath, router, token, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch(gameStoreApiUrl("/auth/customer/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { token?: string; user?: unknown; message?: string }
        | null;

      if (!res.ok || !data?.token || !data?.user) {
        setMessage({
          type: "error",
          text: data?.message || "Login failed. Please check your email/password.",
        });
        return;
      }

      login(data.user as any, data.token);
      setMessage({ type: "success", text: "Logged in! Redirecting..." });
      router.push(nextPath);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Server connection error." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070f2b] text-white flex items-center justify-center px-6 py-12">
      <div className="relative grid w-full items-center gap-10 lg:grid-cols-[540px_minmax(0,1fr)]">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="absolute left-2 top-2 text-white/70 text-2xl leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex flex-col gap-6">
          <h1 className="mt-10 text-5xl font-semibold">Welcome Back</h1>
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
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            <div className="flex justify-end text-sm font-semibold text-white">
              <Link href="/user/forgot" className="hover:underline">
                Forgot your password?
              </Link>
            </div>

            {message ? (
              <div
                className={`rounded-[10px] border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-200"
                    : "border-red-500/40 bg-red-500/10 text-red-200"
                }`}
              >
                {message.text}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-[10px] bg-[#1b1a55] px-4 py-3 text-center text-lg font-semibold text-white shadow disabled:opacity-60"
            >
              {isLoading ? "Logging in..." : "Log in"}
            </button>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/80">Don't have an account?</span>
              <Link
                href={`/user/register?next=${encodeURIComponent(nextPath)}`}
                className="font-bold underline"
              >
                Sign up
              </Link>
            </div>
          </form>
        </div>

        <div className="overflow-hidden rounded-[25px] shadow-2xl">
          <img
            src={wallpaper}
            alt="Login background"
            className="h-[720px] w-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
