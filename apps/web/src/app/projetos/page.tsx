"use client";

import { Plus, RefreshCcw, Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiPost } from "@/services/api";
import type { Project } from "@/types/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("Hospital Central");
  const [client, setClient] = useState("Cliente Demo");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    setError(null);
    try {
      await apiPost<Project>("/projects", { name, client, status: "em_preparacao" });
      setName("");
      setClient("");
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar projeto.");
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  const visibleProjects = projects.filter((project) =>
    `${project.name} ${project.client}`.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projetos</h1>
          <p className="text-sm text-ink/65">Cadastro, acompanhamento e status dos modelos IFC.</p>
        </div>
        <Button onClick={() => void loadProjects()} variant="secondary">
          <RefreshCcw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Novo projeto</h2>
          <form className="space-y-3" onSubmit={createProject}>
            <input
              className="h-10 w-full rounded-md border border-line px-3 outline-none"
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do projeto"
              value={name}
            />
            <input
              className="h-10 w-full rounded-md border border-line px-3 outline-none"
              onChange={(event) => setClient(event.target.value)}
              placeholder="Cliente"
              value={client}
            />
            <Button className="w-full" type="submit">
              <Plus className="h-4 w-4" />
              Criar projeto
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2 rounded-md border border-line px-3">
            <Search className="h-4 w-4 text-ink/45" />
            <input
              className="h-10 w-full bg-transparent outline-none"
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filtrar projetos"
              value={filter}
            />
          </div>
          {error && <p className="mb-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
          <div className="overflow-hidden rounded-md border border-line">
            {loading ? (
              <div className="px-4 py-3 text-sm text-ink/60">Carregando projetos...</div>
            ) : visibleProjects.length === 0 ? (
              <div className="px-4 py-3 text-sm text-ink/60">Nenhum projeto encontrado.</div>
            ) : (
              visibleProjects.map((project) => (
                <div
                  key={project.id}
                  className="grid gap-3 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-4"
                >
                  <strong>{project.name}</strong>
                  <span className="text-ink/65">{project.client}</span>
                  <span>{project.status}</span>
                  <span className="text-right font-semibold text-steel">
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
