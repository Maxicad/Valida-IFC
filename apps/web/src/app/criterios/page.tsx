import { Bot, FileSpreadsheet, Plus } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const criteria = [
  ["IFC-001", "Versao minima IFC", "Metadados", "alta"],
  ["IFC-002", "Existencia de IfcProject", "Estrutura IFC", "alta"],
  ["IFC-005", "Ambientes com nome", "Espacos", "moderada"],
];

export default function CriteriaPage() {
  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Criterios</h1>
          <p className="text-sm text-ink/65">Importacao, cadastro manual e sugestoes por linguagem natural.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <FileSpreadsheet className="h-4 w-4" />
            Importar
          </Button>
          <Button>
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <div className="overflow-hidden rounded-md border border-line">
            {criteria.map(([code, name, category, severity]) => (
              <div key={code} className="grid gap-3 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-4">
                <strong>{code}</strong>
                <span>{name}</span>
                <span className="text-ink/65">{category}</span>
                <span className="text-right font-semibold capitalize text-coral">{severity}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-steel" />
            <h2 className="font-semibold">Sugestao assistida</h2>
          </div>
          <textarea
            className="mt-4 min-h-32 w-full rounded-md border border-line p-3 text-sm outline-none focus:ring-2 focus:ring-steel/25"
            placeholder="Verificar se todos os ambientes possuem nome preenchido."
          />
          <Button className="mt-3 w-full" variant="secondary">
            Gerar sugestao
          </Button>
        </Card>
      </section>
    </AppShell>
  );
}
