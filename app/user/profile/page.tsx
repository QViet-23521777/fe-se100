"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl, GAME_STORE_API_BASE_URL } from "@/lib/game-store-api";

const logo = "/assets/figma-logo.svg";
const socials = [
  "/assets/figma-social-28-2108.svg",
  "/assets/figma-social-28-2109.svg",
  "/assets/figma-social-28-2110.svg",
  "/assets/figma-social-28-2111.svg",
];

type CustomerProfile = {
  _id?: string;
  id?: string;
  email?: string;
  username?: string;
  phoneNumber?: string;
  genderId?: string;
  registrationDate?: string;
  accountStatus?: string;
  accountBalance?: number;
  loyaltyPoints?: number;
  bankName?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Message = { type: "success" | "error"; text: string };

function hashToSixDigits(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  const value = hash % 1_000_000;
  return String(value).padStart(6, "0");
}

function AccountSidebarItem({
  title,
  subtitle,
  href,
  active,
}: {
  title: string;
  subtitle: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative block px-6 py-5 transition ${
        active ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      {active ? (
        <span className="absolute left-0 top-0 h-full w-2 bg-white/20" />
      ) : null}
      <p
        className={`text-lg font-semibold ${
          active ? "text-white/60" : "text-white"
        }`}
      >
        {title}
      </p>
      <p className="mt-1 text-sm text-white/55">{subtitle}</p>
    </Link>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  readOnly,
  name,
}: {
  name: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      name={name}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      className={`h-11 w-full rounded-[10px] bg-[#535c91] px-4 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 ${
        readOnly ? "opacity-80" : ""
      }`}
    />
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, login, logout, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  const [form, setForm] = useState({
    username: user?.name ?? "",
    email: user?.email ?? "",
    phoneNumber: "",
    genderId: "",
    bankName: "",
    description: "",
  });

  const hasFetchedProfile = useRef(false);
  const hasCheckedAuth = useRef(false);

  // Effect 1: Redirect if not logged in
  useEffect(() => {
    if (hasCheckedAuth.current || authLoading) return;

    if (!token || !user) {
      hasCheckedAuth.current = true;
      router.replace(`/user/login?next=${encodeURIComponent("/user/profile")}`);
    }
  }, [authLoading, token, user, router]);

  // Effect 2: Load profile
  useEffect(() => {
    if (authLoading) return;
    if (!token) return;
    if (hasFetchedProfile.current) return;

    hasFetchedProfile.current = true;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setMessage(null);

      try {
        const apiUrl = gameStoreApiUrl("/customers/me");
        console.log("🔍 GAME_STORE_API_BASE_URL:", GAME_STORE_API_BASE_URL);
        console.log("🔍 Full API URL:", apiUrl);
        console.log(
          "🔍 Token:",
          token ? `${token.substring(0, 30)}...` : "MISSING"
        );

        const res = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        console.log("📡 Response status:", res.status);
        console.log(
          "📡 Response headers:",
          Object.fromEntries(res.headers.entries())
        );

        if (cancelled) return;

        // Handle 404
        if (res.status === 404) {
          console.error("❌ API endpoint not found. Check backend routes.");
          setMessage({
            type: "error",
            text: "Profile endpoint not found. Please contact support.",
          });
          setLoading(false);
          return;
        }

        // Handle 401
        if (res.status === 401) {
          logout();
          router.replace(
            `/user/login?next=${encodeURIComponent("/user/profile")}`
          );
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await res.json();

        if (cancelled) return;

        setProfile(data);
        setForm({
          username: data.username ?? form.username,
          email: data.email ?? form.email,
          phoneNumber: data.phoneNumber ?? "",
          genderId: data.genderId ?? "",
          bankName: data.bankName ?? "",
          description: data.description ?? "",
        });
      } catch (err) {
        if (cancelled) return;

        console.error("Profile load error:", err);
        setMessage({
          type: "error",
          text: "Failed to load profile. Please try again.",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, token]);

  const gamerNumber = useMemo(() => {
    const input =
      profile?._id ??
      profile?.id ??
      user?.id ??
      profile?.email ??
      user?.email ??
      "gamer";
    return hashToSixDigits(String(input));
  }, [profile?._id, profile?.id, profile?.email, user?.email, user?.id]);

  const namePlaceholder = useMemo(() => {
    const base = (form.username || user?.name || "Gamer").trim() || "Gamer";
    return `${base}-#${gamerNumber}`;
  }, [form.username, gamerNumber, user?.name]);

  const onSave = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        username: form.username.trim(),
        phoneNumber: form.phoneNumber.trim(),
        genderId: form.genderId.trim() || undefined,
        bankName: form.bankName.trim() || undefined,
        description: form.description.trim() || undefined,
      };

      const res = await fetch(gameStoreApiUrl("/customers/me"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        logout();
        router.replace(
          `/user/login?next=${encodeURIComponent("/user/profile")}`
        );
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save profile");
      }

      const updated = await res.json();

      setProfile(updated);
      setForm({
        username: updated.username ?? form.username,
        email: updated.email ?? form.email,
        phoneNumber: updated.phoneNumber ?? form.phoneNumber,
        genderId: updated.genderId ?? form.genderId,
        bankName: updated.bankName ?? form.bankName,
        description: updated.description ?? form.description,
      });

      login(updated, token);
      setMessage({ type: "success", text: "Saved successfully." });
    } catch (err) {
      console.error("Save error:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save profile.",
      });
    } finally {
      setSaving(false);
    }
  }, [token, form, logout, router, login]);

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="flex items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />

          <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
            <aside className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 shadow-2xl backdrop-blur">
              <div className="bg-white/10 px-6 py-6">
                <div className="h-8 w-32 bg-white/20 rounded animate-pulse" />
                <div className="h-4 w-40 bg-white/10 rounded mt-2 animate-pulse" />
              </div>
              <div className="divide-y divide-white/10">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="px-6 py-5">
                    <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-56 bg-white/5 rounded mt-2 animate-pulse" />
                  </div>
                ))}
              </div>
            </aside>

            <main className="rounded-3xl border border-white/10 bg-[#1b1a55]/60 p-8 shadow-2xl backdrop-blur">
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-6 w-32 bg-white/20 rounded animate-pulse" />
                    <div className="h-11 w-full bg-[#535c91]/50 rounded-[10px] animate-pulse" />
                  </div>
                ))}
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          <aside className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 shadow-2xl backdrop-blur">
            <div className="bg-white/10 px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold">My Account</p>
                  <p className="mt-1 text-sm text-white/60">
                    Account Management
                  </p>
                </div>
                {loading && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                )}
              </div>
            </div>

            <div className="divide-y divide-white/10">
              <AccountSidebarItem
                title="Personal Information"
                subtitle="Modify Your Personal Information"
                href="/user/profile"
                active
              />
              <AccountSidebarItem
                title="My Orders"
                subtitle="View Your Previous Orders"
                href="/user/orders"
              />
              <AccountSidebarItem
                title="Wishlist"
                subtitle="View Games You Added in Wishlist"
                href="/wishlist"
              />
              <AccountSidebarItem
                title="Payment Methods"
                subtitle="Adjust Your Payment Method"
                href="/user/payment-methods"
              />
            </div>
          </aside>

          <main className="rounded-3xl border border-white/10 bg-[#1b1a55]/60 p-8 shadow-2xl backdrop-blur">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-2xl font-semibold">Your Name</p>
                <Input
                  name="username"
                  value={form.username}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, username: value }))
                  }
                  placeholder={namePlaceholder}
                />
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xl font-semibold">Email Address</p>
                  <Input
                    name="email"
                    value={form.email}
                    readOnly
                    placeholder="emailaddress@gmail.com"
                  />
                  <p className="text-xs text-cyan-300">Email Verified</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xl font-semibold">Mobile</p>
                  <Input
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, phoneNumber: value }))
                    }
                    placeholder="+201000000000"
                  />
                  <p className="text-xs text-cyan-300">Number Verified</p>
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xl font-semibold">Gender</p>
                  <Input
                    name="genderId"
                    value={form.genderId}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, genderId: value }))
                    }
                    placeholder="Male/Female/Other"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xl font-semibold">Bank Name</p>
                  <Input
                    name="bankName"
                    value={form.bankName}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, bankName: value }))
                    }
                    placeholder="Your bank name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xl font-semibold">Description</p>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full rounded-[10px] bg-[#535c91] px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
                />
              </div>

              {profile?.accountBalance !== undefined && (
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xl font-semibold">Account Balance</p>
                    <div className="h-11 flex items-center rounded-[10px] bg-[#535c91]/50 px-4 text-sm text-white/80">
                      ${profile.accountBalance.toFixed(2)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xl font-semibold">Loyalty Points</p>
                    <div className="h-11 flex items-center rounded-[10px] bg-[#535c91]/50 px-4 text-sm text-white/80">
                      {profile.loyaltyPoints ?? 0} points
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xl font-semibold">Password</p>
                <Link
                  href="/user/forgot"
                  className="text-sm text-cyan-300 hover:underline"
                >
                  Recover password
                </Link>
              </div>

              {message ? (
                <div
                  className={`rounded-[12px] border px-4 py-3 text-sm ${
                    message.type === "success"
                      ? "border-green-500/40 bg-green-500/10 text-green-200"
                      : "border-red-500/40 bg-red-500/10 text-red-200"
                  }`}
                >
                  {message.text}
                </div>
              ) : null}

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="h-11 w-[110px] rounded-full bg-white text-sm font-semibold text-[#1b1a55] disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </main>
        </div>

        <footer className="mt-6 space-y-6 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="GameVerse" className="h-10 w-10" />
              <span className="text-xl font-semibold">GameVerse</span>
            </div>
            <div className="space-y-2 max-w-xl text-sm text-white/80">
              GameVerse — Where every gamer levels up! From epic AAA adventures
              to indie gems, grab the hottest deals on PC, Xbox, PlayStation &
              Nintendo. Play more, pay less.
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm">
              <div className="space-y-2">
                <p className="text-base font-semibold text-white">My Account</p>
                <Link href="/user/account" className="block text-white/80">
                  My Account
                </Link>
                <Link href="/user/orders" className="block text-white/80">
                  My Orders
                </Link>
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold text-white">Support</p>
                <Link href="/terms" className="block text-white/80">
                  Terms and conditions
                </Link>
                <Link href="/privacy" className="block text-white/80">
                  Privacy and cookie policy
                </Link>
                <Link href="/refunds" className="block text-white/80">
                  Refund policy
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <p className="text-sm text-white/70">
              Copyright GameVerse.com 2025, all rights reserved
            </p>
            <div className="flex items-center gap-3">
              {socials.map((icon) => (
                <img
                  key={icon}
                  src={icon}
                  alt="social"
                  className="h-8 w-8"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
