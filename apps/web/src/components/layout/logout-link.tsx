"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { clearStoredToken } from "@/services/api";

export function LogoutLink() {
  const router = useRouter();

  return (
    <button
      className="flex items-center gap-2 text-sm font-medium text-ink/70"
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
