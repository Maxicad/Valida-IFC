"use client";

import { Archive, Check, FolderKanban, Pencil, Plus, RefreshCcw, RotateCcw, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";
import type { Project } from "@/types/api";

function formatStatus(status: string): string {
  return status.replaceAll("_", " ");
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ativos");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [workingProjectId, setWorkingProjectId] = useState<string | null>(null);

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
      const normalizedDescription = description.trim();
      await apiPost<Project>("/projects", {
        name: name.trim(),
        client: client.trim(),
        description: normalizedDescription || null,
        status: "em_preparacao",
      });
      setName("");
      setClient("");
      setDescription("");
      setIsCreating(false);
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar o projeto.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(project: Project) {
    setEditingProjectId(project.id);
    setEditingName(project.name);
    setError(null);
  }

  function cancelEdit() {
    setEditingProjectId(null);
    setEditingName("");
  }

  async function saveProjectName(projectId: string) {
    const sanitizedName = editingName.trim();
    if (!sanitizedName) {
      setError("Informe um nome valido para o projeto.");
      return;
    }

    setWorkingProjectId(projectId);
    setError(null);
    try {
      await apiPut<Project>(`/projects/${projectId}`, { name: sanitizedName });
      await loadProjects();
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar o projeto.");
    } finally {
      setWorkingProjectId(null);
    }
  }

  async function toggleArchiveProject(project: Project) {
    const archived = project.status === "arquivado";
    const confirmed = window.confirm(
      archived
        ? `Reativar o projeto "${project.name}"?`
        : `Arquivar o projeto "${project.name}"? Ele saira da lista de ativos, mas os dados serao mantidos.`,
    );
    if (!confirmed) {
      return;
    }

    setWorkingProjectId(project.id);
    setError(null);
    try {
      await apiPut<Project>(`/projects/${project.id}`, { status: archived ? "em_preparacao" : "arquivado" });
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar o status do projeto.");
    } finally {
      setWorkingProjectId(null);
    }
  }

  async function removeProject(project: Project) {
    const confirmed = window.confirm(
      `Excluir o projeto "${project.name}"? Essa acao remove arquivos IFC e auditorias relacionadas.`,
    );
    if (!confirmed) {
      return;
    }

    setWorkingProjectId(project.id);
    setError(null);
    try {
      await apiDelete(`/projects/${project.id}`);
      await loadProjects();
      if (editingProjectId === project.id) {
        cancelEdit();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel excluir o projeto.");
    } finally {
      setWorkingProjectId(null);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  const visibleProjects = useMemo(() => {
    const projectNeedle = projectFilter.trim().toLowerCase();
    const clientNeedle = clientFilter.trim().toLowerCase();
    return projects.filter((project) => {
      if (statusFilter === "ativos" && project.status === "arquivado") {
        return false;
      }
      if (statusFilter === "arquivados" && project.status !== "arquivado") {
        return false;
      }
      if (projectNeedle && !project.name.toLowerCase().includes(projectNeedle)) {
        return false;
      }
      if (clientNeedle && !project.client.toLowerCase().includes(clientNeedle)) {
        return false;
      }
      return true;
    });
  }, [clientFilter, projectFilter, projects, statusFilter]);

  return (
    <AppShell>
      <section className="rounded-lg border border-line bg-panel p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-steel">Projetos</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Projetos IFC</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink/65">
              Crie um projeto para reunir arquivos IFC, criterios e resultados de auditoria.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsCreating((current) => !current)} type="button">
              {isCreating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isCreating ? "Fechar ficha" : "Novo projeto"}
            </Button>
            <Button onClick={() => void loadProjects()} type="button" variant="secondary">
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </section>

      {error && <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

      {isCreating && (
        <Card className="mt-4 p-4 md:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-ink">Ficha do novo projeto</h2>
            <p className="mt-1 text-sm text-ink/60">Preencha os dados principais e salve no final.</p>
          </div>

          <form className="grid gap-4 lg:grid-cols-2" onSubmit={createProject}>
            <label className="block text-sm font-medium text-ink/90">
              Nome do projeto
              <input
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 outline-none focus:ring-2 focus:ring-steel/25"
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: Edificio Corporate A"
                required
                value={name}
              />
            </label>
            <label className="block text-sm font-medium text-ink/90">
              Cliente
              <input
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 outline-none focus:ring-2 focus:ring-steel/25"
                onChange={(event) => setClient(event.target.value)}
                placeholder="Ex: Construtora Alpha"
                required
                value={client}
              />
            </label>
            <label className="block text-sm font-medium text-ink/90 lg:col-span-2">
              Descricao (opcional)
              <textarea
                className="mt-2 min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-steel/25"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Resumo do escopo, fase e objetivos do projeto."
                value={description}
              />
            </label>
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end lg:col-span-2">
              <Button onClick={() => setIsCreating(false)} type="button" variant="secondary">
                Cancelar
              </Button>
              <Button disabled={saving} type="submit">
                <Check className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar projeto"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <section className="mt-4">
        <Card className="p-4 md:p-5">
          <div className="mb-4 grid gap-3 xl:grid-cols-[1fr_1fr_180px_auto] xl:items-end">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink/55">
              Filtrar por projeto
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                <input
                  className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-steel/25"
                  onChange={(event) => setProjectFilter(event.target.value)}
                  placeholder="Nome do projeto"
                  value={projectFilter}
                />
              </div>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink/55">
              Filtrar por cliente
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                <input
                  className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-steel/25"
                  onChange={(event) => setClientFilter(event.target.value)}
                  placeholder="Nome do cliente"
                  value={clientFilter}
                />
              </div>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink/55">
              Status
              <select
                className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-steel/25"
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                <option value="ativos">Ativos</option>
                <option value="arquivados">Arquivados</option>
                <option value="todos">Todos</option>
              </select>
            </label>
            <div className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface px-3 text-sm text-ink/70">
              <FolderKanban className="h-4 w-4 text-steel" />
              {visibleProjects.length} projeto(s)
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-line">
            <div className="hidden grid-cols-[1.5fr_1fr_0.9fr_0.9fr_160px] border-b border-line bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink/55 md:grid">
              <span>Projeto</span>
              <span>Cliente</span>
              <span>Status</span>
              <span>Criado em</span>
              <span className="text-right">Acoes</span>
            </div>

            {loading ? (
              <div className="px-4 py-4 text-sm text-ink/60">Carregando projetos...</div>
            ) : visibleProjects.length === 0 ? (
              <div className="px-4 py-4 text-sm text-ink/60">Nenhum projeto encontrado.</div>
            ) : (
              visibleProjects.map((project) => (
                <div
                  className="grid gap-2 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-[1.5fr_1fr_0.9fr_0.9fr_160px] md:items-center"
                  key={project.id}
                >
                  {editingProjectId === project.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="h-9 w-full rounded-md border border-line bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-steel/25"
                        onChange={(event) => setEditingName(event.target.value)}
                        value={editingName}
                      />
                    </div>
                  ) : (
                    <Link
                      className="font-medium text-ink hover:text-steel hover:underline"
                      href={{ pathname: "/projetos/modelos", query: { project_id: project.id } }}
                    >
                      {project.name}
                    </Link>
                  )}
                  <span className="text-ink/70">{project.client}</span>
                  <span className="inline-flex w-fit rounded-md bg-steel/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-steel">
                    {formatStatus(project.status)}
                  </span>
                  <span className="text-left text-ink/65">
                    {new Date(project.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    {editingProjectId === project.id ? (
                      <>
                        <button
                          aria-label="Salvar nome"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-moss transition hover:bg-surface disabled:opacity-50"
                          disabled={workingProjectId === project.id}
                          onClick={() => void saveProjectName(project.id)}
                          type="button"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Cancelar edicao"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink/70 transition hover:bg-surface disabled:opacity-50"
                          disabled={workingProjectId === project.id}
                          onClick={cancelEdit}
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          aria-label="Editar nome do projeto"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-steel transition hover:bg-surface disabled:opacity-50"
                          disabled={workingProjectId === project.id}
                          onClick={() => startEdit(project)}
                          type="button"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          aria-label={project.status === "arquivado" ? "Reativar projeto" : "Arquivar projeto"}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-steel transition hover:bg-surface disabled:opacity-50"
                          disabled={workingProjectId === project.id}
                          onClick={() => void toggleArchiveProject(project)}
                          title={project.status === "arquivado" ? "Reativar projeto" : "Arquivar projeto"}
                          type="button"
                        >
                          {project.status === "arquivado" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </button>
                        <button
                          aria-label="Excluir projeto"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-coral transition hover:bg-coral/10 disabled:opacity-50"
                          disabled={workingProjectId === project.id}
                          onClick={() => void removeProject(project)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
