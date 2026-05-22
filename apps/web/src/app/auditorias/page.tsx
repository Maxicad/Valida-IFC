import { Play, RefreshCcw } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AuditsPage() {
  return (
    <AppShell>
      <h1 className="mb-2 text-2xl font-semibold">Auditorias</h1>
      <p className="mb-6 text-sm text-ink/65">Selecione arquivo IFC, conjunto de criterios e execute a validacao.</p>

      <section className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card>
          <label className="block text-sm font-medium">
            Arquivo IFC
            <select className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3">
              <option>modelo-demo.ifc</option>
            </select>
          </label>
          <label className="mt-4 block text-sm font-medium">
            Conjunto de criterios
            <select className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3">
              <option>Criterios BIM Basicos</option>
            </select>
          </label>
          <Button className="mt-5 w-full">
            <Play className="h-4 w-4" />
            Executar auditoria
          </Button>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Resultado resumido</h2>
            <RefreshCcw className="h-4 w-4 text-ink/50" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-md bg-surface p-4">
              <span className="text-sm text-ink/60">Percentual</span>
              <strong className="mt-2 block text-3xl">66.67%</strong>
            </div>
            <div className="rounded-md bg-surface p-4">
              <span className="text-sm text-ink/60">Aprovados</span>
              <strong className="mt-2 block text-3xl">2</strong>
            </div>
            <div className="rounded-md bg-surface p-4">
              <span className="text-sm text-ink/60">Reprovados</span>
              <strong className="mt-2 block text-3xl">1</strong>
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
