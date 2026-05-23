"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getStoredToken } from "@/services/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getStoredToken() ? "/dashboard" : "/login");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 text-sm text-ink/65">
      Redirecionando...
    </main>
  );
}
