"use client";

import { PublisherProvider } from "@/app/context/PublisherContext";
import { TopBar } from "@/components/TopBar";

export default function PublisherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublisherProvider>
      {/* TopBar ở trên cùng */}
      <div className="container mx-auto px-4 py-4">
        <TopBar active="upload" />
      </div>

      {/* Nội dung chính */}
      <main className="container mx-auto px-4">{children}</main>
    </PublisherProvider>
  );
}
