"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Use shared login; no separate admin welcome screen.
    router.replace("/user/login?role=admin");
  }, [router]);

  return null;
}
