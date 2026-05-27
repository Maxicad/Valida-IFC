"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderKanban,
  RefreshCcw,
  Upload,
  View,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet } from "@/services/api";
import type { CriteriaSet, Project } from "@/types/api";
import type { Metric } from "@/types/dashboard";

type MetricConfig = Metric & { tone: "moss" | "steel" | "amber" | "coral"; icon: typeof FolderKanban };

function formatStatus(status: string): string {
  return status.replaceAll("_", " ");
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [loadedProjects, loadedCriteriaSets] = await Promise.all([
        apiGet<Project[]>("/projects"),
        apiGet<CriteriaSet[]>("/criteria-sets"),
      ]);
      setProjects(loadedProjects);
      setCriteriaSets(loadedCriteriaSets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const metrics = useMemo<MetricConfig[]>(
    () => [
      {
        label: "Projetos ativos",
        value: String(projects.length),
        detail: "Cadastro operacional",
        tone: "steel",
        icon: FolderKanban,
      },
      {
        label: "Conjuntos de critérios",
        value: String(criteriaSets.length),
        detail: "Regras disponíveis",
        tone: "moss",
        icon: ClipboardCheck,
      },
      {
        label: "Auditorias pendentes",
        value: "-",
        detail: "Fila de processamento",
        tone: "amber",
        icon: FileText,
      },
      {
        label: "Falhas críticas",
        value: "-",
        detail: "Após auditoria",
        tone: "coral",
        icon: AlertTriangle,
      },
    ],
    [criteriaSets.length, projects.length],
  );

  const quickActions = [
    { href: "/projetos", label: "Projetos", icon: FolderKanban },
    { href: "/projetos/modelos", label: "Modelos IFC", icon: Upload },
    { href: "/criterios", label: "Critérios", icon: ClipboardCheck },
    { href: "/auditorias", label: "Auditorias", icon: CheckCircle2 },
    { href: "/visualizador", label: "Visualizador", icon: View },
  ];

  return (
    <AppShell>
      <section className="rounded-lg border border-line bg-panel p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-steel">Painel Operacional</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Dashboard de validação IFC</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink/65">
              Acompanhe projetos, conjuntos de critérios e o andamento da validação de forma centralizada.
            </p>
          </div>
          <Button onClick={() => void loadDashboard()} type="button" variant="secondary">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar dados
          </Button>
        </div>
      </section>

      {error && <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const toneMap = {
            moss: "text-moss bg-moss/10 border-moss/20",
            steel: "text-steel bg-steel/10 border-steel/20",
            amber: "text-amber bg-amber/10 border-amber/20",
            coral: "text-coral bg-coral/10 border-coral/20",
          };
          return (
            <Card className="p-4 md:p-5" key={metric.label}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-ink/60">{metric.label}</p>
                  <strong className="mt-2 block text-3xl font-semibold text-ink">{metric.value}</strong>
                </div>
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md border ${toneMap[metric.tone]}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-sm text-ink/60">{metric.detail}</p>
            </Card>
          );
        })}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Projetos recentes</h2>
            <Link className="inline-flex items-center gap-1 text-sm font-medium text-steel hover:text-ink" href="/projetos">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-line">
            <div className="hidden grid-cols-[1.6fr_1fr_0.8fr] border-b border-line bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink/55 md:grid">
              <span>Projeto</span>
              <span>Cliente</span>
              <span className="text-right">Status</span>
            </div>

            {projects.length === 0 ? (
              <div className="px-4 py-4 text-sm text-ink/60">Nenhum projeto cadastrado.</div>
            ) : (
              projects.slice(0, 6).map((project) => (
                <div
                  key={project.id}
                  className="grid gap-2 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-[1.6fr_1fr_0.8fr] md:items-center"
                >
                  <Link
                    className="font-medium text-ink hover:text-steel hover:underline"
                    href={{ pathname: "/projetos/modelos", query: { project_id: project.id } }}
                  >
                    {project.name}
                  </Link>
                  <span className="text-ink/70">{project.client}</span>
                  <span className="text-left text-xs font-semibold uppercase tracking-wide text-steel md:text-right">
                    {formatStatus(project.status)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <h2 className="text-lg font-semibold text-ink">Conjuntos de critérios</h2>
          <div className="mt-4 space-y-2">
            {criteriaSets.length === 0 ? (
              <p className="rounded-md bg-surface px-3 py-3 text-sm text-ink/60">Nenhum conjunto cadastrado.</p>
            ) : (
              criteriaSets.slice(0, 6).map((criteriaSet) => (
                <div
                  className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-3 text-sm"
                  key={criteriaSet.id}
                >
                  <span className="font-medium text-ink">{criteriaSet.name}</span>
                  <span className="rounded-md bg-moss/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-moss">
                    {criteriaSet.source_type}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-panel p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-ink">Ações rápidas</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                className="inline-flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink/85 transition hover:border-steel/40 hover:bg-white hover:text-ink"
                href={action.href}
                key={action.href}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4 text-steel" />
                  {action.label}
                </span>
                <ArrowRight className="h-4 w-4 text-ink/35" />
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
