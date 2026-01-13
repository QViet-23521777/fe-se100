"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

const logo = "/assets/figma-logo.svg";
const socials = [
  "/assets/figma-social-28-2108.svg",
  "/assets/figma-social-28-2109.svg",
  "/assets/figma-social-28-2110.svg",
  "/assets/figma-social-28-2111.svg",
];

type CustomerProfile = {
  id?: string;
  email?: string;
  username?: string;
  phoneNumber?: string;
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
  const { user, token, login, logout } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    phoneNumber: "",
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace(`/user/login?next=${encodeURIComponent("/user/profile")}`);
      return;
    }

    let active = true;
    (async () => {
      // For admin/publisher, skip customer endpoint and just show basic info
      if (user?.accountType && user.accountType !== "customer") {
        const fallback: CustomerProfile = {
          id: user.id,
          email: user.email,
          username: user.name,
          phoneNumber: "",
        };
        setProfile(fallback);
        setForm({
          username: fallback.username ?? "",
          email: fallback.email ?? "",
          phoneNumber: fallback.phoneNumber ?? "",
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(gameStoreApiUrl("/customers/me"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as
          | CustomerProfile
          | { message?: string }
          | null;

        if (!res.ok || !data || typeof (data as any) !== "object") {
          const errorText =
            (data as any)?.message ||
            "Failed to load profile. Please log in again.";
          throw new Error(errorText);
        }

        if (!active) return;
        const customer = data as CustomerProfile;
        setProfile(customer);
        setForm({
          username: customer.username ?? "",
          email: customer.email ?? "",
          phoneNumber: customer.phoneNumber ?? "",
        });
      } catch (err) {
        console.error(err);
        if (!active) return;
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load profile.",
        });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [mounted, router, token]);

  const gamerNumber = useMemo(() => {
    if (!mounted) return hashToSixDigits("gamer");
    const input =
      profile?.id ?? user?.id ?? profile?.email ?? user?.email ?? "gamer";
    return hashToSixDigits(String(input));
  }, [mounted, profile?.email, profile?.id, user?.email, user?.id]);

  const namePlaceholder = useMemo(() => {
    if (!mounted) return `Gamer-#${gamerNumber}`;
    const base = (form.username || user?.name || "Gamer").trim() || "Gamer";
    return `${base}-#${gamerNumber}`;
  }, [mounted, form.username, gamerNumber, user?.name]);

  const sidebarItems = useMemo(() => {
    if (user?.accountType === "admin") {
      return [
        { title: "Personal Information", subtitle: "Modify your personal information", href: "/user/profile" },
        { title: "Manage Accounts", subtitle: "Create or edit admin/publisher accounts", href: "/user/manage-accounts" },
        { title: "Manage Games", subtitle: "Create or edit games", href: "/user/manage-games" },
        { title: "Manage Promo Codes", subtitle: "Create and manage promotions", href: "/user/manage-promos" },
        { title: "Manage Orders", subtitle: "View customer purchases", href: "/user/manage-orders" },
        { title: "Manage Refunds", subtitle: "Review and process refunds", href: "/user/manage-refunds" },
        { title: "Manage Reviews", subtitle: "Moderate customer reviews", href: "/user/manage-reviews" },
        { title: "Manage Reports", subtitle: "Moderate reported content", href: "/user/manage-reports" },
      ];
    }
    if (user?.accountType === "publisher") {
      return [
        { title: "Personal Information", subtitle: "Modify Your Personal Information", href: "/user/profile" },
        { title: "Manage Games", subtitle: "Create or edit games", href: "/user/manage-games" },
        { title: "Manage Promo Codes", subtitle: "Create and manage promotions", href: "/user/manage-promos" },
      ];
    }
    return [
      { title: "Personal Information", subtitle: "Modify Your Personal Information", href: "/user/profile" },
      { title: "My Orders", subtitle: "View Your Previous Orders", href: "/user/orders" },
      { title: "Wishlist", subtitle: "View Games You Added in Wishlist", href: "/wishlist" },
      { title: "Payment Methods", subtitle: "Adjust Your Payment Method", href: "/user/payment-methods" },
    ];
  }, [user?.accountType]);

  async function onSave() {
    if (!token) return;
    if (user?.accountType && user.accountType !== "customer") {
      setMessage({
        type: "error",
        text: "Editing profile is only available for customer accounts.",
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        username: form.username.trim(),
        phoneNumber: form.phoneNumber.trim(),
      };

      const res = await fetch(gameStoreApiUrl("/customers/me"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as
        | CustomerProfile
        | { message?: string }
        | null;

      if (!res.ok) {
        throw new Error((data as any)?.message || "Failed to save profile.");
      }

      const updated = (data ?? {}) as CustomerProfile;
      setProfile(updated);
      setForm((prev) => ({
        ...prev,
        username: updated.username ?? prev.username,
        phoneNumber: updated.phoneNumber ?? prev.phoneNumber,
      }));
      login(updated as any, token);
      setMessage({ type: "success", text: "Saved successfully." });
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save profile.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          <aside className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 shadow-2xl backdrop-blur">
            <div className="bg-white/10 px-6 py-6">
              <p className="text-2xl font-semibold">My Account</p>
              <p className="mt-1 text-sm text-white/60">Account Management</p>
            </div>

            <div className="divide-y divide-white/10">
              {sidebarItems.map((item) => (
                <AccountSidebarItem
                  key={item.href}
                  title={item.title}
                  subtitle={item.subtitle}
                  href={item.href}
                  active={item.href === "/user/profile"}
                />
              ))}
            </div>
            <div className="px-6 py-6">
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Log out
              </button>
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
                  disabled={saving || loading}
                  className="h-11 w-[110px] rounded-full bg-white text-sm font-semibold text-[#1b1a55] disabled:opacity-60"
                >
                  {saving ? "Savingâ€¦" : "Save"}
                </button>

                {loading ? <span className="text-sm text-white/60">Loadingâ€¦</span> : null}
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
              GameVerse â€” Where every gamer levels up! From epic AAA adventures to indie
              gems, grab the hottest deals on PC, Xbox, PlayStation & Nintendo. Play
              more, pay less.
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



