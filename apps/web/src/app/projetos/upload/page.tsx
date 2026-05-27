"use client";

import { Check, Eye, FileUp, Layers3, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiPut, apiUploadWithProgress } from "@/services/api";
import type { IfcFile, IfcWorkspace, Project } from "@/types/api";

const disciplineOptions = [
  { value: "auto", label: "Automática (detectar)" },
  { value: "arquitetura", label: "Arquitetura" },
  { value: "estrutura", label: "Estrutura" },
  { value: "instalacoes", label: "Instalações" },
  { value: "coordenacao", label: "Coordenação" },
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

export default function UploadPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState("auto");
  const [ifcFiles, setIfcFiles] = useState<IfcFile[]>([]);
  const [selectedFederatedIds, setSelectedFederatedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
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
      setError(err instanceof Error ? err.message : "Não foi possível carregar projetos.");
    }
  }

  async function loadWorkspace(projectId: string) {
    if (!projectId) {
      setIfcFiles([]);
      setSelectedFederatedIds([]);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar arquivos IFC.");
    } finally {
      setLoadingWorkspace(false);
    }
  }

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
      setError(err instanceof Error ? err.message : "Não foi possível enviar o IFC.");
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
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a disciplina.");
    } finally {
      setUpdatingDisciplineId(null);
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

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    void loadWorkspace(selectedProjectId);
  }, [selectedProjectId]);

  return (
    <AppShell>
      <h1 className="mb-2 text-2xl font-semibold">Modelos IFC</h1>
      <p className="mb-6 text-sm text-ink/65">
        Cada projeto pode receber vários modelos IFC. Depois de carregar os modelos, abra no visualizador em modo federado.
      </p>

      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card className="p-4 md:p-5">
          <form
            className="flex flex-col rounded-lg border-2 border-dashed border-line bg-surface px-5 py-6"
            onSubmit={submit}
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-steel">
                <FileUp className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Escolha o arquivo IFC</h2>
                <p className="mt-1 text-sm text-ink/65">Informe a disciplina para coloração por modelo no visualizador.</p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-medium text-ink/90">
              Projeto
              <select
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
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

            <label className="mt-3 block text-sm font-medium text-ink/90">
              Disciplina do modelo
              <select
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
                onChange={(event) => setSelectedDiscipline(event.target.value)}
                value={selectedDiscipline}
              >
                {disciplineOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-ink/60">
                Ao selecionar um arquivo, a disciplina é sugerida automaticamente pelo nome.
              </span>
            </label>

            <input
              accept=".ifc"
              className="mt-3 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              onChange={selectFile}
              type="file"
            />

            {selectedFile && (
              <p className="mt-2 text-sm text-ink/70">
                Selecionado: <strong>{selectedFile.name}</strong> ({selectedFile.size} bytes)
              </p>
            )}

            {loading && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-ink/65">
                  <span>Carregando arquivo...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full bg-steel transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {error && <p className="mt-3 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
            {successMessage && (
              <p className="mt-3 rounded-md bg-moss/10 px-3 py-2 text-sm text-moss">{successMessage}</p>
            )}

            <Button className="mt-5" disabled={loading} type="submit" variant="secondary">
              {loading ? "Enviando..." : "Enviar arquivo"}
            </Button>
          </form>

          <aside className="mt-4 rounded-lg border border-line p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-moss" />
              <h2 className="font-semibold">Validacoes previstas</h2>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-ink/70">
              <li>Assinatura ISO-10303-21</li>
              <li>Presenca de FILE_SCHEMA</li>
              <li>Limite de tamanho por upload</li>
              <li>Vínculo do modelo ao projeto e disciplina</li>
            </ul>
          </aside>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-steel" />
              <h2 className="text-lg font-semibold text-ink">Modelos do projeto</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink/65">
              {loadingWorkspace ? "Atualizando..." : `${ifcFiles.length} arquivo(s)`}
            </span>
          </div>

          <div className="space-y-2">
            {ifcFiles.length === 0 ? (
              <p className="rounded-md border border-line bg-surface px-3 py-3 text-sm text-ink/60">
                Nenhum IFC enviado para este projeto.
              </p>
            ) : (
              ifcFiles.map((ifcFile) => (
                <div
                  className="flex flex-col gap-2 rounded-md border border-line bg-surface px-3 py-3 text-sm md:flex-row md:items-center md:justify-between"
                  key={ifcFile.id}
                >
                  <label className="inline-flex items-start gap-2">
                    <input
                      checked={selectedFederatedIds.includes(ifcFile.id)}
                      className="mt-1"
                      onChange={() => toggleFederatedSelection(ifcFile.id)}
                      type="checkbox"
                    />
                    <span>
                      <strong className="block text-ink">{ifcFile.file_name}</strong>
                      <span className="text-ink/65">
                        {ifcFile.ifc_schema ?? "Schema não identificado"} - {ifcFile.file_size} bytes
                      </span>
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <select
                      className={`h-8 rounded-md border border-line px-2 text-xs font-semibold uppercase ${disciplineTone(ifcFile.discipline)}`}
                      value={ifcFile.discipline ?? "auto"}
                      disabled={updatingDisciplineId === ifcFile.id}
                      onChange={(event) => void updateDiscipline(ifcFile.id, event.target.value)}
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
                    <Link
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink/80 hover:bg-surface"
                      href={`/visualizador?ifc_file_id=${ifcFile.id}`}
                    >
                      <Eye className="h-4 w-4 text-steel" />
                      Abrir
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-md border border-line bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-moss"
              href={federatedViewerUrl}
            >
              <Eye className="h-4 w-4" />
              Abrir visualizador federado
            </Link>
            <Link className="rounded-md border border-line px-3 py-2 text-sm hover:bg-white" href="/auditorias">
              Rodar auditoria
            </Link>
            <Link className="rounded-md border border-line px-3 py-2 text-sm hover:bg-white" href="/criterios">
              Importar critérios
            </Link>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
