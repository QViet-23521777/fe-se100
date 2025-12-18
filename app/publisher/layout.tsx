"use client";

import { PublisherProvider } from "@/app/context/PublisherContext";

export default function PublisherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublisherProvider>{children}</PublisherProvider>;
}
