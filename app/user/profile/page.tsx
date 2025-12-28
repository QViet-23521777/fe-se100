"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type CustomerProfile = {
  _id?: string;
  id?: string;
  email?: string;
  username?: string;
  phoneNumber?: string;
  genderId?: string;
  accountBalance?: number;
  loyaltyPoints?: number;
  bankName?: string;
  description?: string;
};

type Message = { type: "success" | "error"; text: string };

function hashToSixDigits(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return String(hash % 1_000_000).padStart(6, "0");
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
  const [redirecting, setRedirecting] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    phoneNumber: "",
    genderId: "",
    bankName: "",
    description: "",
  });

  // ✅ FIX: Fetch profile - chỉ phụ thuộc vào auth state
  const fetchProfile = useCallback(async () => {
    if (!token) {
      console.log("❌ No token, skipping fetch");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const apiUrl = gameStoreApiUrl("/customers/me");
      console.log("📡 Fetching profile:", apiUrl);
      console.log("📡 Token:", token.substring(0, 20) + "...");

      const res = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      console.log("📡 Response status:", res.status);

      // Handle 401
      if (res.status === 401) {
        console.log("❌ Unauthorized - logging out");
        logout();
        router.replace(
          `/user/login?next=${encodeURIComponent("/user/profile")}`
        );
        return;
      }

      // Handle 404
      if (res.status === 404) {
        console.log("❌ Profile endpoint not found");
        setMessage({
          type: "error",
          text: "Profile endpoint not found. Please contact support.",
        });
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ HTTP Error:", res.status, errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log("✅ Profile loaded:", data);

      setProfile(data);
      setForm({
        username: data.username ?? user?.name ?? "",
        email: data.email ?? user?.email ?? "",
        phoneNumber: data.phoneNumber ?? "",
        genderId: data.genderId ?? "",
        bankName: data.bankName ?? "",
        description: data.description ?? "",
      });
    } catch (err) {
      console.error("❌ Profile load error:", err);
      setMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to load profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [token, user, logout, router]);

  // ✅ Auth check effect
  useEffect(() => {
    if (authLoading) {
      console.log("⏳ Auth loading...");
      return;
    }

    if (!token || !user) {
      console.log("❌ Not authenticated, redirecting to login");
      setRedirecting(true);
      router.replace(`/user/login?next=${encodeURIComponent("/user/profile")}`);
      return;
    }

    console.log("✅ Authenticated, user:", user);
  }, [authLoading, token, user, router]);

  // ✅ Fetch profile effect - separate from auth check
  useEffect(() => {
    if (authLoading || !token || !user) {
      return;
    }

    console.log("🔄 Triggering profile fetch");
    fetchProfile();
  }, [authLoading, token, user?.id, fetchProfile]);

  const gamerNumber = useMemo(() => {
    const input =
      profile?._id ?? profile?.id ?? user?.id ?? user?.email ?? "gamer";
    return hashToSixDigits(String(input));
  }, [profile, user]);

  const namePlaceholder = useMemo(() => {
    const base = (form.username || user?.name || "Gamer").trim() || "Gamer";
    return `${base}-#${gamerNumber}`;
  }, [form.username, gamerNumber, user]);

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

      console.log("💾 Saving profile:", payload);

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
      console.log("✅ Profile saved:", updated);
      setProfile(updated);

      // Update form with server response
      setForm({
        username: updated.username ?? form.username,
        email: updated.email ?? form.email,
        phoneNumber: updated.phoneNumber ?? form.phoneNumber,
        genderId: updated.genderId ?? form.genderId,
        bankName: updated.bankName ?? form.bankName,
        description: updated.description ?? form.description,
      });

      // Update auth context
      if (user) {
        login({ ...user, name: updated.username }, token);
      }

      setMessage({ type: "success", text: "Saved successfully." });
    } catch (err) {
      console.error("❌ Save error:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save profile.",
      });
    } finally {
      setSaving(false);
    }
  }, [token, form, logout, router, login, user]);

  // ✅ Loading state
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

  // ✅ Not logged in
  if (!token || !user || redirecting) {
    return null;
  }

  // ✅ Profile loading
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="text-white/60">Loading your profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Main UI
  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          {/* Sidebar */}
          <aside className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 shadow-2xl backdrop-blur">
            <div className="bg-white/10 px-6 py-6">
              <p className="text-2xl font-semibold">My Account</p>
              <p className="mt-1 text-sm text-white/60">Account Management</p>
            </div>
            <div className="divide-y divide-white/10">
              <Link
                href="/user/profile"
                className="relative block px-6 py-5 bg-white/10"
              >
                <span className="absolute left-0 top-0 h-full w-2 bg-white/20" />
                <p className="text-lg font-semibold text-white/60">
                  Personal Information
                </p>
                <p className="mt-1 text-sm text-white/55">
                  Modify Your Personal Information
                </p>
              </Link>
              <Link
                href="/user/orders"
                className="block px-6 py-5 hover:bg-white/5"
              >
                <p className="text-lg font-semibold text-white">My Orders</p>
                <p className="mt-1 text-sm text-white/55">
                  View Your Previous Orders
                </p>
              </Link>
              <Link
                href="/wishlist"
                className="block px-6 py-5 hover:bg-white/5"
              >
                <p className="text-lg font-semibold text-white">Wishlist</p>
                <p className="mt-1 text-sm text-white/55">
                  View Games You Added in Wishlist
                </p>
              </Link>
              <Link
                href="/user/payment-methods"
                className="block px-6 py-5 hover:bg-white/5"
              >
                <p className="text-lg font-semibold text-white">
                  Payment Methods
                </p>
                <p className="mt-1 text-sm text-white/55">
                  Adjust Your Payment Method
                </p>
              </Link>
            </div>
          </aside>

          {/* Main Form */}
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

              {message && (
                <div
                  className={`rounded-[12px] border px-4 py-3 text-sm ${
                    message.type === "success"
                      ? "border-green-500/40 bg-green-500/10 text-green-200"
                      : "border-red-500/40 bg-red-500/10 text-red-200"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="h-11 w-[110px] rounded-full bg-white text-sm font-semibold text-[#1b1a55] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
