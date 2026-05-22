import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { PrintButton } from "@/components/ui/print-button";

export default function ReportsPage() {
  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Relatorio HTML</h1>
          <p className="text-sm text-ink/65">Resumo executivo, criticidade e inconformidades.</p>
        </div>
        <PrintButton />
      </div>

      <Card>
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <section>
            <h2 className="text-xl font-semibold">Auditoria IFC - modelo-demo.ifc</h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              O modelo apresenta conformidade parcial. A principal inconformidade registrada esta associada
              a ambientes sem nome preenchido, com criticidade moderada.
            </p>
          </section>
          <aside className="rounded-md bg-surface p-4">
            <span className="text-sm text-ink/60">Percentual geral</span>
            <strong className="mt-2 block text-4xl">66.67%</strong>
            <span className="mt-2 block text-sm font-semibold text-amber">Reprovado parcialmente</span>
          </aside>
        </div>

        <div className="mt-8 overflow-hidden rounded-md border border-line">
          {[
            ["IFC-001", "Aprovado", "alta", "Arquivo esta em IFC4."],
            ["IFC-005", "Reprovado", "moderada", "Ambiente sem nome preenchido."],
          ].map(([code, status, severity, message]) => (
            <div key={code} className="grid gap-3 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-[120px_120px_120px_1fr]">
              <strong>{code}</strong>
              <span>{status}</span>
              <span className="capitalize">{severity}</span>
              <span className="text-ink/70">{message}</span>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
