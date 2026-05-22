"use client";

import { AlertTriangle, CheckCircle2, FileText, FolderKanban } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { apiGet } from "@/services/api";
import type { CriteriaSet, Project } from "@/types/api";
import type { Metric } from "@/types/dashboard";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [loadedProjects, loadedCriteriaSets] = await Promise.all([
          apiGet<Project[]>("/projects"),
          apiGet<CriteriaSet[]>("/criteria-sets"),
        ]);
        setProjects(loadedProjects);
        setCriteriaSets(loadedCriteriaSets);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nao foi possivel carregar dashboard.");
      }
    }

    void loadDashboard();
  }, []);

  const metrics: Metric[] = useMemo(
    () => [
      { label: "Projetos", value: String(projects.length), detail: "Cadastrados no banco" },
      { label: "Arquivos IFC", value: "-", detail: "Veja por projeto em Upload IFC" },
      { label: "Conjuntos", value: String(criteriaSets.length), detail: "Criterios cadastrados" },
      { label: "Pendencias altas", value: "-", detail: "Disponivel apos auditoria real" },
    ],
    [criteriaSets.length, projects.length],
  );

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-ink/65">
          Visao operacional dos projetos, arquivos IFC e auditorias em andamento.
        </p>
      </div>
      {error && <p className="mb-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

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
            {projects.length === 0 ? (
              <div className="px-4 py-3 text-sm text-ink/60">Nenhum projeto cadastrado.</div>
            ) : (
              projects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="grid grid-cols-3 border-b border-line px-4 py-3 text-sm last:border-0"
                >
                  <span className="font-medium">{project.name}</span>
                  <span className="text-ink/65">{project.discipline ?? project.client}</span>
                  <span className="text-right text-steel">{project.status}</span>
                </div>
              ))
            )}
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Conjuntos de criterios</h2>
          <div className="mt-4 space-y-3 text-sm">
            {criteriaSets.length === 0 ? (
              <p className="rounded-md bg-surface px-3 py-2 text-ink/60">Nenhum conjunto cadastrado.</p>
            ) : (
              criteriaSets.slice(0, 5).map((criteriaSet) => (
                <div
                  key={criteriaSet.id}
                  className="flex items-center justify-between rounded-md bg-surface px-3 py-2"
                >
                  <span>{criteriaSet.name}</span>
                  <span className="font-semibold text-moss">{criteriaSet.source_type}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <h2 className="text-lg font-semibold">Fluxo ponta a ponta</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="rounded-md bg-surface px-3 py-2">1. Registro e login</div>
            <div className="rounded-md bg-surface px-3 py-2">2. Criar projeto</div>
            <div className="rounded-md bg-surface px-3 py-2">3. Upload IFC</div>
            <div className="rounded-md bg-surface px-3 py-2">4. Importar criterios</div>
            <div className="rounded-md bg-surface px-3 py-2">5. Rodar auditoria</div>
            <div className="rounded-md bg-surface px-3 py-2">6. Ver resultado no visualizador</div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Acoes rapidas</h2>
          <div className="mt-4 grid gap-2 text-sm">
            <Link className="rounded-md border border-line px-3 py-2 hover:bg-surface" href="/projetos">
              Criar ou editar projetos
            </Link>
            <Link className="rounded-md border border-line px-3 py-2 hover:bg-surface" href="/projetos/upload">
              Enviar arquivo IFC
            </Link>
            <Link className="rounded-md border border-line px-3 py-2 hover:bg-surface" href="/criterios">
              Importar criterios
            </Link>
            <Link className="rounded-md border border-line px-3 py-2 hover:bg-surface" href="/auditorias">
              Executar auditoria
            </Link>
            <Link className="rounded-md border border-line px-3 py-2 hover:bg-surface" href="/visualizador">
              Abrir visualizador
            </Link>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
