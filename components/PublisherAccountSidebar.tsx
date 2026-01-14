"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";

type SidebarItem = {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  show?: boolean;
};

function Item({ item, active }: { item: SidebarItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`relative block px-6 py-5 transition ${
        active ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      {active ? <span className="absolute left-0 top-0 h-full w-2 bg-white/20" /> : null}
      <p className={`text-lg font-semibold ${active ? "text-white/60" : "text-white"}`}>{item.title}</p>
      <p className="mt-1 text-sm text-white/55">{item.subtitle}</p>
    </Link>
  );
}

export function PublisherAccountSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const items = useMemo<SidebarItem[]>(() => {
    const isPublisher = mounted && user?.accountType === "publisher";
    return [
      {
        key: "profile",
        title: "Personal Information",
        subtitle: "Modify publisher account info",
        href: "/publisher/profile",
        show: isPublisher,
      },
      {
        key: "dashboard",
        title: "Dashboard",
        subtitle: "Overview for your games",
        href: "/publisher/dashboard",
        show: isPublisher,
      },
      {
        key: "statistics",
        title: "Statistics",
        subtitle: "Revenue and sales reports",
        href: "/publisher/statistics",
        show: isPublisher,
      },
      {
        key: "manage-games",
        title: "Manage Games",
        subtitle: "Create and edit your games",
        href: "/user/manage-games",
        show: isPublisher,
      },
      {
        key: "game-sale",
        title: "Game Sale",
        subtitle: "Create and manage promo codes",
        href: "/user/manage-promos",
        show: isPublisher,
      },
      {
        key: "my-reports",
        title: "My Reports",
        subtitle: "Track reports you submitted",
        href: "/user/reports",
        show: isPublisher,
      },
    ];
  }, [mounted, user?.accountType]);

  return (
    <aside className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 shadow-2xl backdrop-blur">
      <div className="bg-white/10 px-6 py-6">
        <p className="text-2xl font-semibold">Publisher</p>
        <p className="mt-1 text-sm text-white/60">Account Management</p>
      </div>

      <div className="divide-y divide-white/10">
        {items
          .filter((i) => i.show !== false)
          .map((item) => (
            <Item key={item.key} item={item} active={pathname === item.href} />
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
  );
}
