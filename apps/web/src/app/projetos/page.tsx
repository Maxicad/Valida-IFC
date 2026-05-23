"use client";

import { FolderKanban, Plus, RefreshCcw, Search } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiPost } from "@/services/api";
import type { Project } from "@/types/api";

function formatStatus(status: string): string {
  return status.replaceAll("_", " ");
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("Hospital Central");
  const [client, setClient] = useState("Cliente Demo");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      setProjects(await apiGet<Project[]>("/projects"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar projetos.");
    } finally {
      setLoading(false);
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost<Project>("/projects", { name, client, status: "em_preparacao" });
      setName("");
      setClient("");
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar projeto.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  const visibleProjects = useMemo(
    () =>
      projects.filter((project) =>
        `${project.name} ${project.client} ${project.status}`.toLowerCase().includes(filter.toLowerCase()),
      ),
    [filter, projects],
  );

  return (
    <AppShell>
      <section className="rounded-lg border border-line bg-panel p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-steel">Base de Projetos</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Projetos IFC</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink/65">
              Cadastre e acompanhe os modelos que serao usados nas auditorias e no visualizador.
            </p>
          </div>
          <Button onClick={() => void loadProjects()} type="button" variant="secondary">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </section>

      {error && <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

      <section className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="p-4 md:p-5">
          <h2 className="text-lg font-semibold text-ink">Novo projeto</h2>
          <p className="mt-1 text-sm text-ink/60">Informacoes basicas para iniciar uploads e auditorias.</p>

          <form className="mt-4 space-y-3" onSubmit={createProject}>
            <label className="block text-sm font-medium text-ink/90">
              Nome do projeto
              <input
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 outline-none focus:ring-2 focus:ring-steel/25"
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: Edificio Corporate A"
                value={name}
              />
            </label>
            <label className="block text-sm font-medium text-ink/90">
              Cliente
              <input
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 outline-none focus:ring-2 focus:ring-steel/25"
                onChange={(event) => setClient(event.target.value)}
                placeholder="Ex: Construtora Alpha"
                value={client}
              />
            </label>
            <Button className="mt-2 w-full" disabled={saving} type="submit">
              <Plus className="h-4 w-4" />
              {saving ? "Salvando..." : "Criar projeto"}
            </Button>
          </form>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
              <input
                className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-steel/25"
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filtrar por nome, cliente ou status"
                value={filter}
              />
            </div>
            <span className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink/70">
              <FolderKanban className="h-4 w-4 text-steel" />
              {visibleProjects.length} projeto(s)
            </span>
          </div>

          <div className="overflow-hidden rounded-md border border-line">
            <div className="hidden grid-cols-[1.5fr_1fr_0.9fr_0.9fr] border-b border-line bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink/55 md:grid">
              <span>Projeto</span>
              <span>Cliente</span>
              <span>Status</span>
              <span className="text-right">Criado em</span>
            </div>

            {loading ? (
              <div className="px-4 py-4 text-sm text-ink/60">Carregando projetos...</div>
            ) : visibleProjects.length === 0 ? (
              <div className="px-4 py-4 text-sm text-ink/60">Nenhum projeto encontrado.</div>
            ) : (
              visibleProjects.map((project) => (
                <div
                  className="grid gap-2 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-[1.5fr_1fr_0.9fr_0.9fr] md:items-center"
                  key={project.id}
                >
                  <strong className="font-medium text-ink">{project.name}</strong>
                  <span className="text-ink/70">{project.client}</span>
                  <span className="inline-flex w-fit rounded-md bg-steel/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-steel">
                    {formatStatus(project.status)}
                  </span>
                  <span className="text-left text-ink/65 md:text-right">
                    {new Date(project.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
