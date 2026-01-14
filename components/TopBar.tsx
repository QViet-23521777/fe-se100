"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { TopBarSearch } from "@/components/TopBarSearch";
import { useStore } from "@/app/context/StoreContext";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type Props = {
  active?: "home" | "browse" | "news" | "publisher" | "about";
};

const logo = "/assets/figma-logo.svg";
const WALLET_CACHE_KEY = "gameverse_wallet_balance_cache_v1";
const WALLET_CACHE_TTL_MS = 60_000;

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

function readWalletCache(): { balance: number; ts: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WALLET_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const balance = (parsed as any).balance;
    const ts = (parsed as any).ts;
    if (typeof balance !== "number" || !Number.isFinite(balance)) return null;
    if (typeof ts !== "number" || !Number.isFinite(ts)) return null;
    return { balance, ts };
  } catch {
    return null;
  }
}

function writeWalletCache(balance: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify({ balance, ts: Date.now() }));
  } catch {
    // ignore
  }
}

function CartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 6h15l-1.5 9H7.5L6 6Z" />
      <path d="M6 6 5 3H2" />
      <path d="M8.5 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
      <path d="M17.5 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
  );
}

function HeartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20.8 4.6c-1.4-1.4-3.6-1.4-5 0L12 8.4 8.2 4.6c-1.4-1.4-3.6-1.4-5 0s-1.4 3.6 0 5l3.8 3.8L12 22l5-8.6 3.8-3.8c1.4-1.4 1.4-3.6 0-5z" />
    </svg>
  );
}

function UserCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      <path d="M4 20a8 8 0 0 1 16 0" />
      <path d="M22 12A10 10 0 1 0 12 22" />
    </svg>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[#1b1a55]">
      {label}
    </span>
  );
}

export function TopBar({ active = "home" }: Props) {
  const { cartCount, wishlistCount } = useStore();
  const { user, token } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const currentPath = useMemo(() => {
    if (!mounted) return pathname;
    try {
      return `${window.location.pathname}${window.location.search}`;
    } catch {
      return pathname;
    }
  }, [mounted, pathname]);

  const loginHref = useMemo(
    () => `/user/login?next=${encodeURIComponent(currentPath)}`,
    [currentPath]
  );
  const registerHref = useMemo(
    () => `/user/register?next=${encodeURIComponent(currentPath)}`,
    [currentPath]
  );
  const accountHref = useMemo(() => {
    if (!mounted || !user || !token) return `/user/login?next=${encodeURIComponent("/user/account")}`;
    return "/user/account";
  }, [mounted, token, user]);
  const wishlistHref = useMemo(
    () =>
      mounted && user && token && user.accountType === "customer"
        ? "/wishlist"
        : `/user/login?next=${encodeURIComponent("/wishlist")}`,
    [mounted, token, user]
  );

  const showAuthed = mounted && Boolean(user) && Boolean(token);
  const showWallet = showAuthed && user?.accountType === "customer";

  useEffect(() => {
    if (!mounted) return;
    if (!token || !showWallet) {
      setWalletBalance(null);
      setWalletLoading(false);
      return;
    }

    const cached = readWalletCache();
    if (cached && Date.now() - cached.ts < WALLET_CACHE_TTL_MS) {
      setWalletBalance(cached.balance);
    }

    let active = true;
    const load = async () => {
      setWalletLoading(true);
      try {
        const res = await fetch(gameStoreApiUrl("/customers/me"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        const balance = typeof (data as any)?.accountBalance === "number" ? (data as any).accountBalance : 0;
        if (!active) return;
        setWalletBalance(balance);
        writeWalletCache(balance);
      } finally {
        if (active) setWalletLoading(false);
      }
    };

    void load();

    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [mounted, showWallet, token]);

  const links: { href: string; label: string; key: Props["active"] }[] = [
    { href: "/", label: "Home", key: "home" },
    { href: "/browse", label: "Browse", key: "browse" },
    { href: "/about", label: "About", key: "about" },
  ];

  return (
    <div className="relative z-50 flex items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-[#0c143d]/70 px-5 py-4 shadow-md backdrop-blur">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3">
          <img src={logo} alt="GameVerse logo" className="h-10 w-10" />
          <span className="text-lg font-semibold text-white">GameVerse</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-white/80 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors ${
                active === link.key ? "font-semibold text-white" : "text-white/75"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <TopBarSearch className="hidden flex-1 max-w-md sm:block" />

        {showWallet ? (
          <Link
            href="/user/payment-methods"
            className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 sm:inline-flex"
            aria-label="Wallet balance"
            title="Wallet balance"
          >
            <span className="text-white/70">Wallet</span>
            <span className="font-martian-mono text-white">
              {walletLoading
                ? "..."
                : typeof walletBalance === "number" && Number.isFinite(walletBalance)
                  ? formatUsd(walletBalance)
                  : "$0.00"}
            </span>
          </Link>
        ) : null}

        {showAuthed ? null : (
          <>
            <Link
              href={loginHref}
              className="hidden rounded-full border border-white/70 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 sm:inline-block"
            >
              Log in
            </Link>
            <Link
              href={registerHref}
              className="hidden rounded-full bg-[#1b1a55] px-5 py-2 text-sm font-semibold text-white shadow sm:inline-block"
            >
              Register
            </Link>
          </>
        )}

        <Link
          href={wishlistHref}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/85"
          aria-label="Wishlist"
        >
          <HeartIcon className="h-5 w-5" />
          <CountBadge count={wishlistCount} />
        </Link>

        <Link
          href="/cart"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/85"
          aria-label="Cart"
        >
          <CartIcon className="h-5 w-5" />
          <CountBadge count={cartCount} />
        </Link>

        <Link
          href={accountHref}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/85"
          aria-label="Account"
        >
          <UserCircleIcon className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}

export default TopBar;
