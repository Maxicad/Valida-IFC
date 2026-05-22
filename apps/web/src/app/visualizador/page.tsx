import { Eye, Filter, MousePointer2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export default function ViewerPage() {
  return (
    <AppShell>
      <h1 className="mb-2 text-2xl font-semibold">Visualizador IFC</h1>
      <p className="mb-6 text-sm text-ink/65">Estrutura inicial para viewer 3D, selecao e cores por resultado.</p>

      <section className="grid min-h-[620px] gap-4 xl:grid-cols-[1fr_360px]">
        <div className="relative overflow-hidden rounded-lg border border-line bg-[#dfe5de]">
          <div className="absolute left-4 top-4 flex gap-2">
            <span className="rounded-md bg-panel px-3 py-2 text-xs font-semibold shadow-soft">Modelo IFC</span>
            <span className="rounded-md bg-panel px-3 py-2 text-xs font-semibold shadow-soft">Status por cor</span>
          </div>
          <div className="flex h-full min-h-[520px] items-center justify-center">
            <div className="grid h-72 w-96 grid-cols-3 gap-2 opacity-80">
              <div className="rounded-md bg-moss/70" />
              <div className="rounded-md bg-coral/70" />
              <div className="rounded-md bg-amber/70" />
              <div className="rounded-md bg-steel/70" />
              <div className="rounded-md bg-ink/20" />
              <div className="rounded-md bg-moss/70" />
            </div>
          </div>
        </div>

        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MousePointer2 className="h-5 w-5 text-steel" />
              <h2 className="font-semibold">Elemento selecionado</h2>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink/60">GlobalId</dt>
                <dd className="font-mono">2K9xDemoGlobalId</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/60">Tipo IFC</dt>
                <dd>IfcSpace</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/60">Status</dt>
                <dd className="font-semibold text-coral">Reprovado</dd>
              </div>
            </dl>
            <div className="border-t border-line pt-4">
              <div className="mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-semibold">Filtros</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {["Aprovado", "Alta", "Moderada", "Baixa"].map((filter) => (
                  <button key={filter} className="rounded-md border border-line px-3 py-2 text-left hover:bg-surface">
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-surface p-3 text-sm text-ink/70">
              <Eye className="h-4 w-4" />
              Viewer real sera integrado com web-ifc ou That Open Components.
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
