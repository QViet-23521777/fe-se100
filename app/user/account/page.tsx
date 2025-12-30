"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";

const logo = "/assets/figma-logo.svg";
const socials = [
  "/assets/figma-social-28-2108.svg",
  "/assets/figma-social-28-2109.svg",
  "/assets/figma-social-28-2110.svg",
  "/assets/figma-social-28-2111.svg",
];

function hashToSixDigits(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  const value = hash % 1_000_000;
  return String(value).padStart(6, "0");
}

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
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
    </svg>
  );
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

function WalletIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M17 7H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a3 3 0 0 0 3-3V10a3 3 0 0 0-3-3Z" />
      <path d="M17 7V5a2 2 0 0 0-2-2H6" />
      <path d="M20 12h-4a2 2 0 0 0 0 4h4" />
    </svg>
  );
}

type Option = {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
};

function SidebarItem({
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
      className={`block px-6 py-5 transition ${
        active ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-white/55">{subtitle}</p>
    </Link>
  );
}

function ActionCard({ option }: { option: Option }) {
  return (
    <Link
      href={option.href}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-7 shadow-xl backdrop-blur transition hover:border-white/20"
    >
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-white">
          {option.icon({ className: "h-10 w-10" })}
        </div>
        <div className="space-y-1">
          <p className="text-xl font-semibold">{option.title}</p>
          <p className="text-sm text-white/55">{option.subtitle}</p>
        </div>
      </div>
    </Link>
  );
}

export default function AccountOptionsPage() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace(`/user/login?next=${encodeURIComponent("/user/account")}`);
    }
  }, [mounted, router, token]);

  const gamerNumber = useMemo(() => {
    const input = user?.id ?? user?.email ?? user?.name ?? "gamer";
    return hashToSixDigits(String(input));
  }, [user?.email, user?.id, user?.name]);

  const options: Option[] = useMemo(() => {
    if (user?.accountType === "admin") {
      return [
        {
          key: "personal",
          title: "Personal Information",
          subtitle: "Modify your personal information",
          href: "/user/profile",
          icon: (props) => <UserIcon {...props} />,
        },
        {
          key: "admin-accounts",
          title: "Manage Accounts",
          subtitle: "Create or edit admin/publisher accounts",
          href: "/admin/accounts",
          icon: (props) => <UserIcon {...props} />,
        },
        {
          key: "games",
          title: "Manage Games",
          subtitle: "Create or edit games",
          href: "/publisher/game/create",
          icon: (props) => <CartIcon {...props} />,
        },
        {
          key: "promos",
          title: "Manage Promo Codes",
          subtitle: "Create and manage promotions",
          href: "/admin/promotions",
          icon: (props) => <WalletIcon {...props} />,
        },
      ];
    }

    if (user?.accountType === "publisher") {
      return [
        {
          key: "personal",
          title: "Personal Information",
          subtitle: "Modify Your Personal Information",
          href: "/user/profile",
          icon: (props) => <UserIcon {...props} />,
        },
        {
          key: "games",
          title: "Manage Games",
          subtitle: "Create or edit games",
          href: "/publisher/game/create",
          icon: (props) => <CartIcon {...props} />,
        },
        {
          key: "orders",
          title: "Orders",
          subtitle: "View orders for your games",
          href: "/user/orders",
          icon: (props) => <CartIcon {...props} />,
        },
      ];
    }

    return [
      {
        key: "personal",
        title: "Personal Information",
        subtitle: "Modify Your Personal Information",
        href: "/user/profile",
        icon: (props) => <UserIcon {...props} />,
      },
      {
        key: "orders",
        title: "My Orders",
        subtitle: "Manage Your Previous Orders",
        href: "/user/orders",
        icon: (props) => <CartIcon {...props} />,
      },
      {
        key: "wishlist",
        title: "Wishlist",
        subtitle: "View Games You Added in Wishlist",
        href: "/wishlist",
        icon: (props) => <HeartIcon {...props} />,
      },
      {
        key: "payments",
        title: "Payment Methods",
        subtitle: "Adjust Your Payment Method",
        href: "/user/payment-methods",
        icon: (props) => <WalletIcon {...props} />,
      },
    ];
  }, [user?.accountType]);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-6 text-white/70 shadow-xl">
            Loading account…
          </div>
        </div>
      </div>
    );
  }

  const displayName = user?.name ?? "Gamer";

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
              {options.map((option) => (
                <SidebarItem
                  key={option.key}
                  title={option.title}
                  subtitle={option.subtitle}
                  href={option.href}
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

          <main className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-8 shadow-2xl backdrop-blur">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold">
                Hello {displayName}-#{gamerNumber}
              </h1>
              <p className="text-white/60">What do you want to do?</p>
              <div className="h-px w-full bg-white/10" />
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {options.map((option) => (
                <ActionCard key={option.key} option={option} />
              ))}
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
              GameVerse — Where every gamer levels up! From epic AAA adventures to indie
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

