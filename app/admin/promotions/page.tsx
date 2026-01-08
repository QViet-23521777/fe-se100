"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function AdminPromotionsPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || !token || user.accountType !== "admin") {
      router.replace("/admin/login");
    }
  }, [router, token, user]);

  return (
    <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Create Promo Codes</h1>
            <p className="text-white/70">Admin-only area wired to the new /admin/promotions API.</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Back to Home
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0c143d]/70 p-6 shadow-xl">
          <h2 className="text-2xl font-semibold mb-3">What’s ready</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/80">
            <li>Admin login and account dropdown already route here.</li>
            <li>Backend exposes <code>GET /admin/promotions</code>, <code>GET /admin/promotions/:id</code>, and <code>POST /admin/promotions</code> (admin JWT required).</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-yellow-400/30 bg-yellow-500/10 p-6 text-yellow-50 shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Next step to hook UI</h2>
          <ol className="list-decimal space-y-2 pl-5 text-yellow-50/90">
            <li>Build a form here that POSTs to <code>/admin/promotions</code> (fields: name, discountType, scope, dates, quantityIssued, status, publisherId).</li>
            <li>Render the list by calling <code>/admin/promotions</code> and show status/badges.</li>
            <li>Add edit/delete (PATCH/DELETE) later if you want full CRUD.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
