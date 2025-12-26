"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";

export default function OrdersPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) router.replace(`/user/login?next=${encodeURIComponent("/user/orders")}`);
  }, [mounted, router, token]);

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">My Orders</h1>
          <p className="text-white/70">Order history is coming soon.</p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-6 text-white/75 shadow-xl">
          <p className="mb-4">
            This page will show your previous purchases once the backend orders API is
            connected.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/browse"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1b1a55]"
            >
              Browse games
            </Link>
            <Link
              href="/user/account"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white"
            >
              Back to account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

