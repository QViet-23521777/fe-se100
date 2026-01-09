"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    // Small timeout so the context clears before navigating away.
    const timer = setTimeout(() => router.replace("/"), 150);
    return () => clearTimeout(timer);
  }, [logout, router]);

  return (
    <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />
        <div className="rounded-3xl border border-white/10 bg-[#0c143d]/70 p-6 text-white/80 shadow-xl">
          Signing you out…
        </div>
      </div>
    </div>
  );
}
