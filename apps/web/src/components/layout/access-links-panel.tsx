"use client";

import { ExternalLink, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/services/api";

function cleanUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function AccessLinksPanel() {
  const [appBaseUrl, setAppBaseUrl] = useState("http://localhost:3000");
  const apiBaseUrl = cleanUrl(API_BASE_URL);

  useEffect(() => {
    setAppBaseUrl(window.location.origin);
  }, []);

  const links = [
    { label: "Frontend", href: appBaseUrl, external: true },
    { label: "Login", href: `${appBaseUrl}/login`, external: true },
    { label: "Dashboard", href: `${appBaseUrl}/dashboard`, external: true },
    { label: "API Base", href: apiBaseUrl, external: true },
    { label: "API Health", href: `${apiBaseUrl}/health`, external: true },
    { label: "API Docs", href: `${apiBaseUrl}/docs`, external: true },
  ];

  return (
    <aside className="fixed right-4 top-20 z-20 hidden w-64 rounded-lg border border-line bg-panel/95 p-3 shadow-soft backdrop-blur xl:block">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface text-ink/80">
          <Link2 className="h-4 w-4" />
        </span>
        <div>
          <strong className="block text-sm text-ink">Acesso rapido</strong>
          <span className="text-xs text-ink/60">Links do ambiente</span>
        </div>
      </div>

      <div className="space-y-2">
        {links.map((item) => (
          <a
            className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink/85 transition hover:border-steel/40 hover:bg-white hover:text-ink"
            href={item.href}
            key={item.label}
            rel={item.external ? "noreferrer" : undefined}
            target={item.external ? "_blank" : undefined}
          >
            <span>{item.label}</span>
            <ExternalLink className="h-3.5 w-3.5 text-ink/45" />
          </a>
        ))}
      </div>
    </aside>
  );
}
