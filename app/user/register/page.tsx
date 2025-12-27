"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

const hero = "/assets/1d6d5ae07fe3da8267a6f757f03f02f18eff9f08.png";

type Message = { type: "error" | "success"; text: string };

function safeNextPath(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

function isValidPhoneNumber(value: string) {
  return /^(0|\+84)[0-9]{9,10}$/.test(value.trim());
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, login } = useAuth();

  const [nextPath, setNextPath] = useState("/");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    gender: "",
    agree: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    try {
      const next = new URLSearchParams(window.location.search).get("next");
      setNextPath(safeNextPath(next));
    } catch {
      setNextPath("/");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    router.replace(nextPath);
  }, [nextPath, router, user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = "checked" in target ? target.checked : false;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!form.agree) {
      setMessage({
        type: "error",
        text: "Please agree to the Terms and Privacy policy.",
      });
      return;
    }

    if (form.password.length < 8) {
      setMessage({
        type: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    if (!isValidPhoneNumber(form.phoneNumber)) {
      setMessage({
        type: "error",
        text: "Phone number must start with 0 or +84 and have 10–12 digits total.",
      });
      return;
    }

    if (!form.gender) {
      setMessage({
        type: "error",
        text: "Please select your gender.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        email: form.email.trim(),
        username: form.fullName.trim(),
        password: form.password,
        phoneNumber: form.phoneNumber.trim(),
        genderId: form.gender,
      };

      const res = await fetch(gameStoreApiUrl("/auth/customer/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!res.ok) {
        setMessage({
          type: "error",
          text:
            data?.message ||
            "Sign up failed. Please check your info and try again.",
        });
        return;
      }

      const loginRes = await fetch(gameStoreApiUrl("/auth/customer/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
        }),
      });

      const loginData = (await loginRes.json().catch(() => null)) as {
        token?: string;
        user?: unknown;
        message?: string;
      } | null;

      if (loginRes.ok && loginData?.token && loginData?.user) {
        login(loginData.user as any, loginData.token);
        router.push(nextPath);
        return;
      }

      setMessage({
        type: "success",
        text: "Account created! Please log in to continue.",
      });
      router.push(`/user/login?next=${encodeURIComponent(nextPath)}`);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Server connection error." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white flex items-center justify-center px-6 py-10">
      <div className="relative w-full max-w-6xl">
        {/* Close button - Fixed position */}

        {/* Main content grid */}
        <div className="grid w-full gap-8 lg:grid-cols-[520px_minmax(0,1fr)] items-center">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 max-w-[520px]"
          >
            <h1 className="text-4xl font-semibold mb-2">Create an account</h1>
            <p className="text-white/70 mb-2">
              Sign up to continue to checkout and wishlist.
            </p>

            <input
              name="fullName"
              type="text"
              placeholder="Full Name"
              value={form.fullName}
              onChange={handleChange}
              minLength={3}
              required
              className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            />

            <input
              name="email"
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            />

            <input
              name="phoneNumber"
              type="tel"
              placeholder="Phone Number (0xxxxxxxxx or +84xxxxxxxxx)"
              value={form.phoneNumber}
              onChange={handleChange}
              pattern="^(0|\\+84)[0-9]{9,10}$"
              required
              className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            />

            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              required
              className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <option value="" disabled>
                Select Gender
              </option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>

            <input
              name="password"
              type="password"
              placeholder="Password (min 8 characters)"
              value={form.password}
              onChange={handleChange}
              minLength={8}
              required
              className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            />

            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            />

            <label className="flex items-center gap-3 text-sm text-white/85">
              <input
                type="checkbox"
                name="agree"
                checked={form.agree}
                onChange={handleChange}
                className="h-4 w-4 rounded border-white/50 bg-transparent"
                required
              />
              I agree with the{" "}
              <Link href="/terms" className="underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline">
                Privacy policy
              </Link>
            </label>

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
              className="w-full rounded-[10px] bg-[#1b1a55] px-4 py-3 text-center text-lg font-semibold text-white shadow disabled:opacity-60 hover:bg-[#1b1a55]/90 transition-colors"
            >
              {isLoading ? "Creating account..." : "Sign up"}
            </button>

            <p className="text-sm text-white/80">
              Already have an account?{" "}
              <Link
                href={`/user/login?next=${encodeURIComponent(nextPath)}`}
                className="font-semibold underline"
              >
                Log in
              </Link>
            </p>
          </form>

          <div className="hidden overflow-hidden rounded-[25px] shadow-2xl lg:block">
            <img
              src={hero}
              alt="Signup background"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
