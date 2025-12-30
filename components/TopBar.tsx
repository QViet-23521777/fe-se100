"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TopBarSearch } from "@/components/TopBarSearch";
import { useStore } from "@/app/context/StoreContext";
import { useAuth } from "@/app/context/AuthContext";

type Props = {
  active?: "home" | "browse" | "publisher" | "about";
};

const logo = "/assets/figma-logo.svg";

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

  // State để lưu các href được tính toán từ client
  const [loginHref, setLoginHref] = useState("/user/login");
  const [registerHref, setRegisterHref] = useState("/user/register");
  const [accountHref, setAccountHref] = useState("/user/account");
  const [uploadGamesHref, setUploadGamesHref] = useState("/publisher/login");

  useEffect(() => {
    setMounted(true);

    // Tính toán currentPath từ window (chỉ chạy trên client)
    const currentPath = `${window.location.pathname}${window.location.search}`;

    // Cập nhật các href với currentPath thực
    setLoginHref(`/user/login?next=${encodeURIComponent(currentPath)}`);
    setRegisterHref(`/user/register?next=${encodeURIComponent(currentPath)}`);

    // Account href
    if (user && token) {
      setAccountHref("/user/account");
    } else {
      setAccountHref(`/user/login?next=${encodeURIComponent("/user/account")}`);
    }

    // Upload games href
    if (user?.accountType === "publisher" && token && user.id) {
      setUploadGamesHref(`/publisher/game/${user.id}`);
    } else {
      setUploadGamesHref(
        `/publisher/login?next=${encodeURIComponent("/publisher/game/create")}`
      );
    }
  }, [pathname, user, token]);

  const showAuthed = mounted && Boolean(user) && Boolean(token);

  const links: { href: string; label: string; key: Props["active"] }[] = [
    { href: "/", label: "Home", key: "home" },
    { href: "/browse", label: "Browse", key: "browse" },
    { href: uploadGamesHref, label: "Upload games", key: "publisher" },
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
                active === link.key
                  ? "font-semibold text-white"
                  : "text-white/75"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <TopBarSearch className="hidden flex-1 max-w-md sm:block" />

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
          href="/wishlist"
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
