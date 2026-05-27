"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { clearStoredToken } from "@/services/api";

export function LogoutLink() {
  const router = useRouter();

  return (
    <button
      className="flex h-10 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
      onClick={() => {
        clearStoredToken();
        router.push("/login");
      }}
      type="button"
    >
      <LogOut className="h-4 w-4" />
      Sair
    </button>
  );
}
