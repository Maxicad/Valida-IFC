import { Plus, Search } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const projects = [
  { name: "Hospital Central", client: "Saude SP", status: "Em auditoria", score: "78%" },
  { name: "Campus Norte", client: "Universidade", status: "Aguardando IFC", score: "-" },
  { name: "Edificio Comercial", client: "Incorpora", status: "Auditado", score: "91%" },
];

export default function ProjectsPage() {
  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projetos</h1>
          <p className="text-sm text-ink/65">Cadastro, acompanhamento e status dos modelos IFC.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Novo projeto
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2 rounded-md border border-line px-3">
          <Search className="h-4 w-4 text-ink/45" />
          <input className="h-10 w-full bg-transparent outline-none" placeholder="Filtrar projetos" />
        </div>
        <div className="overflow-hidden rounded-md border border-line">
          {projects.map((project) => (
            <div key={project.name} className="grid gap-3 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-4">
              <strong>{project.name}</strong>
              <span className="text-ink/65">{project.client}</span>
              <span>{project.status}</span>
              <span className="text-right font-semibold text-steel">{project.score}</span>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
