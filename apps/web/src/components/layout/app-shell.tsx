"use client";

import {
  BarChart3,
  ClipboardCheck,
  FileText,
  FolderKanban,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Upload,
  View,
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LogoutLink } from "@/components/layout/logout-link";
import { getStoredToken } from "@/services/api";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/projetos/modelos", label: "Modelos IFC", icon: Upload },
  { href: "/criterios", label: "Criterios", icon: ClipboardCheck },
  { href: "/auditorias", label: "Auditorias", icon: BarChart3 },
  { href: "/visualizador", label: "Visualizador", icon: View },
  { href: "/relatorios", label: "Relatorios", icon: FileText },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/projetos/modelos") {
    return pathname === "/projetos/modelos" || pathname === "/projetos/upload";
  }
  return pathname === href;
}

type AppShellProps = Readonly<{
  children: React.ReactNode;
  variant?: "default" | "workspace";
}>;

export function AppShell({ children, variant = "default" }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const workspace = variant === "workspace";

  useEffect(() => {
    const ensureSession = () => {
      const token = getStoredToken();
      if (!token) {
        setReady(false);
        router.replace("/login");
        return;
      }
      setReady(true);
    };

    ensureSession();
    window.addEventListener("valida-ifc-auth-cleared", ensureSession);
    return () => {
      window.removeEventListener("valida-ifc-auth-cleared", ensureSession);
    };
  }, [router]);

  useEffect(() => {
    const stored = window.localStorage.getItem("valida-ifc-sidebar-collapsed");
    setSidebarCollapsed(stored === null ? workspace : stored === "true");
  }, [workspace]);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("valida-ifc-sidebar-collapsed", String(next));
      return next;
    });
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e9efec] px-5 text-sm text-[#5d6a62]">
        Validando sessao...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#e9efec] text-[#203a33]">
      <header className="sticky top-0 z-20 border-b border-[#d3ded8] bg-[#203a33] text-white shadow-[0_12px_32px_rgba(32,58,51,0.18)]">
        <div
          className={clsx(
            "mx-auto flex h-auto min-h-16 w-full flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5",
            "max-w-none",
          )}
        >
          <div className="flex items-center gap-3">
            <Link className="flex items-center gap-3" href="/dashboard">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-sm font-bold text-[#203a33]">
                IFC
              </span>
              <span>
                <strong className="block text-base">Valida IFC</strong>
                <span className="text-xs text-white/65">Fluxo assistido de auditoria</span>
              </span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-[#203a33] transition hover:bg-[#eef5f2]"
              href="/projetos/modelos"
            >
              <Plus className="h-4 w-4" />
              Nova validacao
            </Link>
            <LogoutLink />
          </div>
        </div>
      </header>

      <div
        className={clsx(
          "mx-auto grid w-full gap-4",
          workspace ? "max-w-none px-2 py-2 md:px-3" : "max-w-none px-4 py-5 md:px-5",
          sidebarCollapsed ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[280px_1fr]",
        )}
      >
        <aside
          className={clsx(
            "rounded-lg border border-[#d3ded8] bg-white p-3 shadow-[0_12px_32px_rgba(45,42,35,0.07)] transition-all lg:sticky lg:top-24 lg:self-start",
            sidebarCollapsed && "lg:p-2",
          )}
        >
          <div className={clsx("flex items-center gap-2", sidebarCollapsed ? "justify-center" : "justify-between")}>
            {!sidebarCollapsed && <h2 className="text-sm font-semibold uppercase text-[#6a6f2f]">Menu</h2>}
            <button
              aria-label={sidebarCollapsed ? "Expandir painel lateral" : "Ocultar painel lateral"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d3ded8] text-[#203a33] transition hover:bg-[#eef5f2]"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expandir painel lateral" : "Ocultar painel lateral"}
              type="button"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
          <nav className={clsx("grid gap-2", sidebarCollapsed ? "mt-3" : "mt-4")}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  className={clsx(
                    "flex min-h-10 items-center rounded-md text-sm font-medium transition",
                    sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3",
                    active ? "bg-[#203a33] text-white" : "text-[#203a33] hover:bg-[#eef5f2]",
                  )}
                  href={item.href}
                  key={item.href}
                  title={item.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
