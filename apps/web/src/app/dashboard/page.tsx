import { AlertTriangle, CheckCircle2, FileText, FolderKanban } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import type { Metric } from "@/types/dashboard";

const metrics: Metric[] = [
  { label: "Projetos", value: "12", detail: "3 em auditoria" },
  { label: "Arquivos IFC", value: "34", detail: "8 enviados este mes" },
  { label: "Auditorias", value: "21", detail: "Media 82% conformidade" },
  { label: "Pendencias altas", value: "5", detail: "Revisao prioritaria" },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-ink/65">
          Visao operacional dos projetos, arquivos IFC e auditorias em andamento.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => {
          const icons = [FolderKanban, FileText, CheckCircle2, AlertTriangle];
          const Icon = icons[index];
          return (
            <Card key={metric.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-ink/60">{metric.label}</p>
                  <strong className="mt-2 block text-3xl">{metric.value}</strong>
                </div>
                <Icon className="h-5 w-5 text-steel" />
              </div>
              <p className="mt-4 text-sm text-ink/60">{metric.detail}</p>
            </Card>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="text-lg font-semibold">Projetos recentes</h2>
          <div className="mt-4 overflow-hidden rounded-md border border-line">
            {["Hospital Central", "Campus Norte", "Edificio Comercial"].map((project) => (
              <div key={project} className="grid grid-cols-3 border-b border-line px-4 py-3 text-sm last:border-0">
                <span className="font-medium">{project}</span>
                <span className="text-ink/65">Arquitetura</span>
                <span className="text-right text-steel">Aguardando IFC</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Ultimos relatorios</h2>
          <div className="mt-4 space-y-3 text-sm">
            {["IFC-2026-021", "IFC-2026-020", "IFC-2026-019"].map((report) => (
              <div key={report} className="flex items-center justify-between rounded-md bg-surface px-3 py-2">
                <span>{report}</span>
                <span className="font-semibold text-moss">Emitido</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
