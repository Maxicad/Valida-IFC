"use client";

import {
  Check,
  CheckCircle2,
  Eye,
  FileUp,
  Gauge,
  Layers3,
  Loader2,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadOrCreateViewerFragment } from "@/lib/fragments-cache";
import { apiGet, apiPut, apiUploadWithProgress } from "@/services/api";
import type { IfcFile, IfcWorkspace, Project, ViewerFragmentCache } from "@/types/api";

const disciplineOptions = [
  { value: "auto", label: "Automatica" },
  { value: "arquitetura", label: "Arquitetura" },
  { value: "estrutura", label: "Estrutura" },
  { value: "instalacoes", label: "Instalacoes" },
  { value: "coordenacao", label: "Coordenacao" },
];

function detectDisciplineFromName(fileName: string): string {
  const name = fileName.toLowerCase();
  if (name.includes("arq") || name.includes("arquitet") || name.includes("arch")) {
    return "arquitetura";
  }
  if (name.includes("estrut") || name.includes("struc") || name.includes("struct")) {
    return "estrutura";
  }
  if (
    name.includes("inst") ||
    name.includes("mep") ||
    name.includes("hidra") ||
    name.includes("eletr") ||
    name.includes("hvac")
  ) {
    return "instalacoes";
  }
  if (name.includes("coord")) {
    return "coordenacao";
  }
  return "auto";
}

function disciplineTone(discipline?: string | null): string {
  const key = (discipline ?? "").toLowerCase();
  if (key === "arquitetura") {
    return "bg-cyan-100 text-cyan-800";
  }
  if (key === "estrutura") {
    return "bg-amber-100 text-amber-800";
  }
  if (key === "instalacoes") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (key === "coordenacao") {
    return "bg-violet-100 text-violet-800";
  }
  return "bg-slate-100 text-slate-700";
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

export default function UploadPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState("auto");
  const [ifcFiles, setIfcFiles] = useState<IfcFile[]>([]);
  const [selectedFederatedIds, setSelectedFederatedIds] = useState<string[]>([]);
  const [cachedFragmentIds, setCachedFragmentIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [loadingCacheStatus, setLoadingCacheStatus] = useState(false);
  const [preparingFragmentId, setPreparingFragmentId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [updatingDisciplineId, setUpdatingDisciplineId] = useState<string | null>(null);

  async function loadProjects() {
    try {
      const data = await apiGet<Project[]>("/projects");
      const requestedProjectId =
        typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("project_id") ?? "";
      setProjects(data);
      setSelectedProjectId((current) => {
        if (current) {
          return current;
        }
        if (requestedProjectId && data.some((project) => project.id === requestedProjectId)) {
          return requestedProjectId;
        }
        return data[0]?.id || "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar projetos.");
    }
  }

  const refreshFragmentCaches = useCallback(async (files: IfcFile[]) => {
    if (files.length === 0) {
      setCachedFragmentIds(new Set());
      return;
    }
    setLoadingCacheStatus(true);
    try {
      const statuses = await Promise.all(
        files.map(async (ifcFile) => {
          try {
            return await apiGet<ViewerFragmentCache>(`/ifc-files/${ifcFile.id}/viewer-fragment-cache`);
          } catch {
            return null;
          }
        }),
      );
      setCachedFragmentIds(new Set(statuses.flatMap((status) => (status?.cached ? [status.ifc_file_id] : []))));
    } finally {
      setLoadingCacheStatus(false);
    }
  }, []);

  const loadWorkspace = useCallback(async (projectId: string) => {
    if (!projectId) {
      setIfcFiles([]);
      setSelectedFederatedIds([]);
      setCachedFragmentIds(new Set());
      return;
    }
    setLoadingWorkspace(true);
    try {
      const workspace = await apiGet<IfcWorkspace>(`/projects/${projectId}/ifc-workspace`);
      setIfcFiles(workspace.ifc_files);
      setSelectedFederatedIds((current) =>
        current.length > 0 && current.every((id) => workspace.ifc_files.some((row) => row.id === id))
          ? current
          : workspace.ifc_files.map((row) => row.id),
      );
      void refreshFragmentCaches(workspace.ifc_files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar arquivos IFC.");
    } finally {
      setLoadingWorkspace(false);
    }
  }, [refreshFragmentCaches]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProjectId || !selectedFile) {
      setError("Selecione um projeto e um arquivo IFC.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);
    if (selectedDiscipline !== "auto") {
      formData.append("discipline", selectedDiscipline);
    }

    try {
      const uploaded = await apiUploadWithProgress<IfcFile>(
        `/projects/${selectedProjectId}/ifc/upload`,
        formData,
        setUploadProgress,
      );
      setSelectedFile(null);
      setSelectedDiscipline("auto");
      setUploadProgress(100);
      setSuccessMessage(`Arquivo ${uploaded.file_name} enviado com sucesso.`);
      await loadWorkspace(selectedProjectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel enviar o IFC.");
    } finally {
      setLoading(false);
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setSelectedDiscipline(detectDisciplineFromName(file.name));
    }
    setUploadProgress(0);
    setSuccessMessage(null);
  }

  async function updateDiscipline(ifcFileId: string, nextDiscipline: string) {
    setUpdatingDisciplineId(ifcFileId);
    setError(null);
    try {
      const updated = await apiPut<IfcFile>(`/ifc-files/${ifcFileId}/discipline`, {
        discipline: nextDiscipline === "auto" ? null : nextDiscipline,
      });
      setIfcFiles((current) => current.map((row) => (row.id === ifcFileId ? updated : row)));
      setSuccessMessage(`Disciplina atualizada para ${updated.file_name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar a disciplina.");
    } finally {
      setUpdatingDisciplineId(null);
    }
  }

  async function prepareViewerCache(ifcFile: IfcFile) {
    setPreparingFragmentId(ifcFile.id);
    setError(null);
    setSuccessMessage(null);
    try {
      await loadOrCreateViewerFragment(ifcFile.id);
      setCachedFragmentIds((current) => {
        const next = new Set(current);
        next.add(ifcFile.id);
        return next;
      });
      setSuccessMessage(`Viewer rapido pronto para ${ifcFile.file_name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel preparar o viewer rapido.");
    } finally {
      setPreparingFragmentId(null);
    }
  }

  function toggleFederatedSelection(ifcFileId: string) {
    setSelectedFederatedIds((current) =>
      current.includes(ifcFileId) ? current.filter((id) => id !== ifcFileId) : [...current, ifcFileId],
    );
  }

  const federatedViewerUrl = useMemo(() => {
    if (selectedFederatedIds.length === 0) {
      return "/visualizador";
    }
    return `/visualizador?ifc_file_ids=${selectedFederatedIds.join(",")}`;
  }, [selectedFederatedIds]);

  const readyCount = ifcFiles.filter((ifcFile) => cachedFragmentIds.has(ifcFile.id)).length;

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    void loadWorkspace(selectedProjectId);
  }, [loadWorkspace, selectedProjectId]);

  return (
    <AppShell>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-steel">Modelos IFC</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Preparar, revisar e abrir modelos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink/80 transition hover:bg-surface"
            href="/auditorias"
          >
            <PlayCircle className="h-4 w-4 text-coral" />
            Rodar auditoria
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white transition hover:bg-moss"
            href={federatedViewerUrl}
          >
            <Eye className="h-4 w-4" />
            Abrir selecionados
          </Link>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <Card className="p-0">
            <div className="border-b border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-steel/10 text-steel">
                  <FileUp className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-ink">Enviar IFC</h2>
                  <p className="text-sm text-ink/60">Projeto, disciplina e arquivo em uma etapa.</p>
                </div>
              </div>
            </div>

            <form className="px-5 py-5" onSubmit={submit}>
              <label className="block text-sm font-medium text-ink/90">
                Projeto
                <select
                  className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-steel/30"
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  value={selectedProjectId}
                >
                  <option value="">Selecione um projeto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block text-sm font-medium text-ink/90">
                Disciplina
                <select
                  className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-steel/30"
                  onChange={(event) => setSelectedDiscipline(event.target.value)}
                  value={selectedDiscipline}
                >
                  {disciplineOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-surface px-4 py-6 text-center transition hover:border-steel/60 hover:bg-white">
                <UploadCloud className="h-7 w-7 text-steel" />
                <span className="mt-2 text-sm font-semibold text-ink">
                  {selectedFile ? selectedFile.name : "Selecionar arquivo IFC"}
                </span>
                <span className="mt-1 text-xs text-ink/55">
                  {selectedFile ? formatBytes(selectedFile.size) : "Formato .ifc"}
                </span>
                <input accept=".ifc" className="sr-only" onChange={selectFile} type="file" />
              </label>

              {loading && (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-ink/65">
                    <span>Enviando arquivo</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full bg-steel transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {error && <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
              {successMessage && (
                <p className="mt-4 rounded-md bg-moss/10 px-3 py-2 text-sm text-moss">{successMessage}</p>
              )}

              <Button className="mt-5 w-full" disabled={loading} type="submit" variant="primary">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {loading ? "Enviando..." : "Enviar arquivo"}
              </Button>
            </form>
          </Card>

          <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-moss" />
              <h2 className="font-semibold text-ink">Validacoes de entrada</h2>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-ink/70">
              {["Assinatura ISO-10303-21", "FILE_SCHEMA identificado", "Limite de tamanho", "Projeto e disciplina vinculados"].map(
                (item) => (
                  <span className="inline-flex items-center gap-2" key={item}>
                    <CheckCircle2 className="h-4 w-4 text-moss" />
                    {item}
                  </span>
                ),
              )}
            </div>
          </section>
        </div>

        <Card className="p-0">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-amber/10 text-amber">
                <Layers3 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-ink">Modelos do projeto</h2>
                <p className="text-sm text-ink/60">
                  {loadingWorkspace ? "Atualizando lista..." : `${ifcFiles.length} arquivo(s), ${readyCount} viewer(s) rapido(s)`}
                </p>
              </div>
            </div>
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink/80 transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedProjectId || loadingCacheStatus}
              onClick={() => void refreshFragmentCaches(ifcFiles)}
              type="button"
            >
              {loadingCacheStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar status
            </button>
          </div>

          <div className="grid gap-3 p-5">
            {ifcFiles.length === 0 ? (
              <p className="rounded-md border border-line bg-surface px-3 py-3 text-sm text-ink/60">
                Nenhum IFC enviado para este projeto.
              </p>
            ) : (
              ifcFiles.map((ifcFile) => {
                const viewerReady = cachedFragmentIds.has(ifcFile.id);
                const preparing = preparingFragmentId === ifcFile.id;
                return (
                  <article
                    className="grid gap-3 rounded-lg border border-line bg-surface px-3 py-3 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-center"
                    key={ifcFile.id}
                  >
                    <label className="flex min-w-0 items-start gap-3">
                      <input
                        checked={selectedFederatedIds.includes(ifcFile.id)}
                        className="mt-1 h-4 w-4"
                        onChange={() => toggleFederatedSelection(ifcFile.id)}
                        type="checkbox"
                      />
                      <span className="min-w-0">
                        <strong className="block truncate text-ink">{ifcFile.file_name}</strong>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/65">
                          <span>{ifcFile.ifc_schema ?? "Schema nao identificado"}</span>
                          <span>{formatBytes(ifcFile.file_size)}</span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold uppercase ${
                              viewerReady ? "bg-moss/10 text-moss" : "bg-amber/10 text-amber"
                            }`}
                          >
                            {viewerReady ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Gauge className="h-3.5 w-3.5" />}
                            {viewerReady ? "viewer pronto" : "preparar viewer"}
                          </span>
                        </span>
                      </span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2 2xl:justify-end">
                      <select
                        className={`h-9 rounded-md border border-line px-2 text-xs font-semibold uppercase ${disciplineTone(
                          ifcFile.discipline,
                        )}`}
                        disabled={updatingDisciplineId === ifcFile.id}
                        onChange={(event) => void updateDiscipline(ifcFile.id, event.target.value)}
                        value={ifcFile.discipline ?? "auto"}
                      >
                        {disciplineOptions.map((option) => (
                          <option key={`${ifcFile.id}-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {updatingDisciplineId === ifcFile.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-steel" />
                      ) : (
                        <Check className="h-4 w-4 text-moss" />
                      )}
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink/80 transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={preparingFragmentId !== null}
                        onClick={() => void prepareViewerCache(ifcFile)}
                        type="button"
                      >
                        {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-amber" />}
                        {viewerReady ? "Repreparar" : preparing ? "Preparando..." : "Preparar viewer"}
                      </button>
                      <Link
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white transition hover:bg-moss"
                        href={`/visualizador?ifc_file_id=${ifcFile.id}`}
                      >
                        <Eye className="h-4 w-4" />
                        Abrir
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white transition hover:bg-moss"
              href={federatedViewerUrl}
            >
              <Eye className="h-4 w-4" />
              Abrir visualizador federado
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink/80 transition hover:bg-surface"
              href="/criterios"
            >
              <CheckCircle2 className="h-4 w-4 text-moss" />
              Importar criterios
            </Link>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
