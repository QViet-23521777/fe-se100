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

type Message = { type: "success" | "error" | "info"; text: string };

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
      className={`relative block px-6 py-5 transition ${active ? "bg-white/10" : "hover:bg-white/5"}`}
    >
      {active ? <span className="absolute left-0 top-0 h-full w-2 bg-white/20" /> : null}
      <p className={`text-lg font-semibold ${active ? "text-white/60" : "text-white"}`}>{title}</p>
      <p className="mt-1 text-sm text-white/55">{subtitle}</p>
    </Link>
  );
}

export default function WalletPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace(`/user/login?next=${encodeURIComponent("/user/payment-methods")}`);
    }
  }, [mounted, router, token]);

  const isCustomer = user?.accountType === "customer";

  const walletLabel = useMemo(() => {
    const bal = walletBalance;
    if (typeof bal !== "number" || !Number.isFinite(bal)) return "$0.00";
    return `$${bal.toFixed(2)}`;
  }, [walletBalance]);

  const refreshWallet = async () => {
    if (!token || !isCustomer) return;
    setWalletLoading(true);
    setWalletError(null);
    setMessage(null);
    try {
      const res = await fetch(gameStoreApiUrl("/customers/me"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(data?.message || "Failed to load wallet balance.");
      const balance = typeof data?.accountBalance === "number" ? data.accountBalance : 0;
      setWalletBalance(balance);
    } catch (err) {
      setWalletBalance(null);
      setWalletError(err instanceof Error ? err.message : "Failed to load wallet balance.");
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (!token) return;
    if (!isCustomer) return;
    void refreshWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, token, isCustomer]);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-6 text-white/70 shadow-xl">
            Loading wallet...
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-6 text-white/70 shadow-xl">
            Redirecting to login...
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
              <p className="text-2xl font-semibold">My Account</p>
              <p className="mt-1 text-sm text-white/60">Account Management</p>
            </div>

            <div className="divide-y divide-white/10">
              <AccountSidebarItem
                title="Personal Information"
                subtitle="Modify your personal information"
                href="/user/profile"
              />
              <AccountSidebarItem title="My Orders" subtitle="View your previous orders" href="/user/orders" />
              <AccountSidebarItem title="Wishlist" subtitle="View your saved games" href="/wishlist" />
              <AccountSidebarItem title="Wallet" subtitle="View your wallet balance" href="/user/payment-methods" active />
              <AccountSidebarItem title="My Reports" subtitle="Track reports you submitted" href="/user/reports" />
            </div>
          </aside>

          <main className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Wallet</h1>
                <p className="text-sm text-white/70">Wallet balance is used for checkout.</p>
              </div>
              <button
                type="button"
                onClick={refreshWallet}
                disabled={!isCustomer || walletLoading}
                className={`rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white ${
                  !isCustomer || walletLoading ? "opacity-60" : "hover:bg-white/10"
                }`}
              >
                {walletLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {message ? (
              <div
                className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-200"
                    : message.type === "error"
                      ? "border-red-500/40 bg-red-500/10 text-red-100"
                      : "border-white/10 bg-white/5 text-white/80"
                }`}
              >
                {message.text}
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              {!isCustomer ? (
                <p className="text-sm text-white/80">Wallet is available for customer accounts only.</p>
              ) : walletError ? (
                <p className="text-sm text-red-200">{walletError}</p>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-white/70">Current balance</span>
                  <span className="text-2xl font-semibold text-white">{walletLabel}</span>
                </div>
              )}

              {isCustomer ? (
                <p className="mt-3 text-xs text-white/70">
                  Ask an admin to add money to your wallet before buying games.
                </p>
              ) : null}
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
              GameVerse — Where every gamer levels up! From epic AAA adventures to indie gems, grab the hottest deals on
              PC, Xbox, PlayStation & Nintendo. Play more, pay less.
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
            <p className="text-sm text-white/70">Copyright GameVerse.com 2025, all rights reserved</p>
            <div className="flex items-center gap-3">
              {socials.map((icon) => (
                <img key={icon} src={icon} alt="social" className="h-8 w-8" loading="lazy" />
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
