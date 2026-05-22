"use client";

import {
  BarChart3,
  ClipboardCheck,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Upload,
  View,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LogoutLink } from "@/components/layout/logout-link";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/projetos/upload", label: "Upload IFC", icon: Upload },
  { href: "/criterios", label: "Criterios", icon: ClipboardCheck },
  { href: "/auditorias", label: "Auditorias", icon: BarChart3 },
  { href: "/visualizador", label: "Visualizador", icon: View },
  { href: "/relatorios", label: "Relatorios", icon: FileText },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-panel px-4 py-5 lg:block">
        <Link href="/dashboard" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-sm font-bold text-white">
            IFC
          </span>
          <span>
            <strong className="block text-base">Valida IFC</strong>
            <span className="text-xs text-ink/60">Auditoria BIM</span>
          </span>
        </Link>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  active ? "bg-ink text-white" : "text-ink/75 hover:bg-surface hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-panel/95 px-5 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium text-ink/70">
            <Upload className="h-4 w-4" />
            MVP base
          </div>
          <LogoutLink />
        </header>
        <main className="mx-auto w-full max-w-7xl px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
