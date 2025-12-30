"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar active="news" />
        <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-8 shadow-xl">
          <h1 className="text-3xl font-semibold mb-3">News</h1>
          <p className="text-white/80 leading-relaxed">
            Placeholder page to prevent 404s. Replace with real news content when ready.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1b1a55]"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
