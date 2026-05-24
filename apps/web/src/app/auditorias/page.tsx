"use client";

import { CheckCircle2, FileText, Loader2, Play, RefreshCcw, Sparkles, XCircle } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { API_BASE_URL, apiGet, apiPost } from "@/services/api";
import type { AuditResult, AuditRun, CriteriaSet, IfcFile, Project } from "@/types/api";

function statusTone(status: string): string {
  if (status === "completed") {
    return "bg-moss/10 text-moss";
  }
  if (status === "failed") {
    return "bg-coral/10 text-coral";
  }
  if (status === "running") {
    return "bg-amber/10 text-amber";
  }
  return "bg-steel/10 text-steel";
}

function dateValue(value?: string | null): number {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function newestProject(projects: Project[]): Project | undefined {
  return [...projects].sort((a, b) => dateValue(b.updated_at) - dateValue(a.updated_at))[0];
}

function newestIfcFile(ifcFiles: IfcFile[]): IfcFile | undefined {
  return [...ifcFiles].sort((a, b) => dateValue(b.uploaded_at) - dateValue(a.uploaded_at))[0];
}

function newestCriteriaSet(criteriaSets: CriteriaSet[]): CriteriaSet | undefined {
  return [...criteriaSets].sort((a, b) => dateValue(b.updated_at) - dateValue(a.updated_at))[0];
}

export default function AuditsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ifcFiles, setIfcFiles] = useState<IfcFile[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedIfcFileId, setSelectedIfcFileId] = useState("");
  const [selectedCriteriaSetId, setSelectedCriteriaSetId] = useState("");
  const [auditRun, setAuditRun] = useState<AuditRun | null>(null);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const summaryRows = useMemo(() => auditResults.filter((result) => result.is_summary), [auditResults]);
  const elementRows = useMemo(() => auditResults.filter((result) => !result.is_summary), [auditResults]);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const selectedIfcFile = useMemo(
    () => ifcFiles.find((ifcFile) => ifcFile.id === selectedIfcFileId),
    [ifcFiles, selectedIfcFileId],
  );
  const selectedCriteriaSet = useMemo(
    () => criteriaSets.find((criteriaSet) => criteriaSet.id === selectedCriteriaSetId),
    [criteriaSets, selectedCriteriaSetId],
  );
  const quickModeReady = Boolean(selectedProject && selectedIfcFile && selectedCriteriaSet);
  const quickModeMessage = useMemo(() => {
    if (loadingData) {
      return "Carregando as opcoes mais recentes...";
    }
    if (!selectedProject) {
      return "Cadastre um projeto para liberar a auditoria rapida.";
    }
    if (!selectedIfcFile) {
      return "Envie um IFC para este projeto antes de executar.";
    }
    if (!selectedCriteriaSet) {
      return "Importe ou cadastre criterios antes de executar.";
    }
    return "Pronto para executar com os dados mais recentes.";
  }, [loadingData, selectedCriteriaSet, selectedIfcFile, selectedProject]);

  async function loadInitialData() {
    setLoadingData(true);
    setError(null);
    try {
      const [loadedProjects, loadedCriteriaSets] = await Promise.all([
        apiGet<Project[]>("/projects"),
        apiGet<CriteriaSet[]>("/criteria-sets"),
      ]);
      setProjects(loadedProjects);
      setCriteriaSets(loadedCriteriaSets);
      setSelectedProjectId((current) =>
        loadedProjects.some((project) => project.id === current) ? current : newestProject(loadedProjects)?.id || "",
      );
      setSelectedCriteriaSetId((current) =>
        loadedCriteriaSets.some((criteriaSet) => criteriaSet.id === current)
          ? current
          : newestCriteriaSet(loadedCriteriaSets)?.id || "",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar dados de auditoria.");
    } finally {
      setLoadingData(false);
    }
  }

  async function loadIfcFiles(projectId: string) {
    if (!projectId) {
      setIfcFiles([]);
      setSelectedIfcFileId("");
      return;
    }

    try {
      const files = await apiGet<IfcFile[]>(`/projects/${projectId}/ifc-files`);
      setIfcFiles(files);
      setSelectedIfcFileId((current) =>
        files.some((ifcFile) => ifcFile.id === current) ? current : newestIfcFile(files)?.id || "",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar arquivos IFC.");
    }
  }

  async function runAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProjectId || !selectedIfcFileId || !selectedCriteriaSetId) {
      setError("Selecione projeto, arquivo IFC e conjunto de criterios.");
      return;
    }

    wsRef.current?.close();
    setLoading(true);
    setError(null);
    setStatusMessage("Enfileirando auditoria...");
    setAuditResults([]);

    try {
      const createdAudit = await apiPost<AuditRun>("/audits?mode=async", {
        project_id: selectedProjectId,
        ifc_file_id: selectedIfcFileId,
        criteria_set_id: selectedCriteriaSetId,
      });
      setAuditRun(createdAudit);
      connectAuditWebSocket(createdAudit.id);

      await waitUntilAuditFinishes(createdAudit.id);
      const [finalAudit, results] = await Promise.all([
        apiGet<AuditRun>(`/audits/${createdAudit.id}`),
        apiGet<AuditResult[]>(`/audits/${createdAudit.id}/results`),
      ]);
      setAuditRun(finalAudit);
      setAuditResults(results);
      setStatusMessage(finalAudit.status === "completed" ? "Auditoria concluida." : "Auditoria finalizada com falha.");
      if (finalAudit.status === "failed") {
        setError(finalAudit.error_message ?? "Falha ao executar auditoria.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel executar auditoria.");
    } finally {
      setLoading(false);
    }
  }

  function connectAuditWebSocket(auditId: string) {
    const wsUrl = API_BASE_URL.replace("http://", "ws://").replace("https://", "wss://");
    const token = typeof window !== "undefined" ? window.localStorage.getItem("valida-ifc-token") : null;
    const websocket = new WebSocket(`${wsUrl}/audits/${auditId}/ws${token ? `?token=${token}` : ""}`);
    wsRef.current = websocket;
    websocket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { status: string; error_message?: string };
      setStatusMessage(`Status: ${payload.status}`);
      if (payload.status === "failed" && payload.error_message) {
        setError(payload.error_message);
      }
    };
  }

  async function waitUntilAuditFinishes(auditId: string) {
    for (let attempt = 0; attempt < 180; attempt += 1) {
      const status = await apiGet<{ status: string; error_message?: string }>(`/audits/${auditId}/status`);
      if (status.status === "completed" || status.status === "failed") {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("Timeout aguardando processamento da auditoria.");
  }

  useEffect(() => {
    void loadInitialData();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    void loadIfcFiles(selectedProjectId);
  }, [selectedProjectId]);

  return (
    <AppShell>
      <section className="rounded-lg border border-line bg-panel p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-steel">Execucao de Regras</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Auditorias IFC</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink/65">
              Execute a auditoria com os dados mais recentes ou ajuste a selecao quando precisar.
            </p>
          </div>
          <Button onClick={() => void loadInitialData()} type="button" variant="secondary">
            <RefreshCcw className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`} />
            Atualizar base
          </Button>
        </div>
      </section>

      {error && <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

      <section className="mt-4 grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Auditoria rapida</h2>
              <p className="mt-1 text-sm text-ink/60">{quickModeMessage}</p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-steel/20 bg-steel/10 text-steel">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>

          <form className="mt-4 space-y-4" onSubmit={runAudit}>
            <div className="rounded-md border border-line bg-surface p-3">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink/55">Projeto</dt>
                  <dd className="mt-1 truncate font-medium text-ink">{selectedProject?.name ?? "Nenhum projeto"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink/55">Arquivo IFC</dt>
                  <dd className="mt-1 truncate font-medium text-ink">
                    {selectedIfcFile ? `${selectedIfcFile.file_name} (${selectedIfcFile.ifc_schema ?? "sem schema"})` : "Nenhum IFC"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink/55">Criterios</dt>
                  <dd className="mt-1 truncate font-medium text-ink">{selectedCriteriaSet?.name ?? "Nenhum conjunto"}</dd>
                </div>
              </dl>
            </div>

            {statusMessage && (
              <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink/80">
                {loading ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
                {statusMessage}
              </p>
            )}

            <Button className="w-full" disabled={loading || loadingData || !quickModeReady} type="submit">
              <Play className="h-4 w-4" />
              {loading ? "Processando..." : "Executar auditoria"}
            </Button>

            <div className="rounded-md border border-line p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">Ajustes opcionais</h3>
                <span className="text-xs font-medium text-ink/55">Defaults: mais recentes</span>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-ink/90">
                  Projeto
                  <select
                    className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 outline-none focus:ring-2 focus:ring-steel/25"
                    onChange={(event) => {
                      setSelectedProjectId(event.target.value);
                      setSelectedIfcFileId("");
                    }}
                    value={selectedProjectId}
                  >
                    <option value="">Selecione</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-ink/90">
                  Arquivo IFC
                  <select
                    className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 outline-none focus:ring-2 focus:ring-steel/25"
                    onChange={(event) => setSelectedIfcFileId(event.target.value)}
                    value={selectedIfcFileId}
                  >
                    <option value="">Selecione</option>
                    {ifcFiles.map((ifcFile) => (
                      <option key={ifcFile.id} value={ifcFile.id}>
                        {ifcFile.file_name} ({ifcFile.ifc_schema ?? "sem schema"})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-ink/90">
                  Conjunto de criterios
                  <select
                    className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 outline-none focus:ring-2 focus:ring-steel/25"
                    onChange={(event) => setSelectedCriteriaSetId(event.target.value)}
                    value={selectedCriteriaSetId}
                  >
                    <option value="">Selecione</option>
                    {criteriaSets.map((criteriaSet) => (
                      <option key={criteriaSet.id} value={criteriaSet.id}>
                        {criteriaSet.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </form>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-ink">Resultado da ultima execucao</h2>
            <span className={`inline-flex w-fit rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone(auditRun?.status ?? "pending")}`}>
              {auditRun?.status ?? "pending"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-line bg-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">Score</p>
              <strong className="mt-2 block text-3xl font-semibold text-ink">
                {auditRun?.score_percent != null ? `${auditRun.score_percent}%` : "-"}
              </strong>
            </div>
            <div className="rounded-md border border-line bg-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">Aprovados</p>
              <strong className="mt-2 block text-3xl font-semibold text-moss">{auditRun?.approved_criteria ?? "-"}</strong>
            </div>
            <div className="rounded-md border border-line bg-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">Reprovados</p>
              <strong className="mt-2 block text-3xl font-semibold text-coral">{auditRun?.failed_criteria ?? "-"}</strong>
            </div>
          </div>

          {selectedIfcFileId && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink/80 hover:bg-white"
                href={`/visualizador?ifc_file_id=${selectedIfcFileId}`}
              >
                <FileText className="h-4 w-4 text-steel" />
                Abrir visualizador
              </Link>

              {auditRun && (
                <>
                  <a
                    className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink/80 hover:bg-white"
                    href={`${API_BASE_URL}/audits/${auditRun.id}/report/html`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Relatorio HTML
                  </a>
                  <a
                    className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink/80 hover:bg-white"
                    href={`${API_BASE_URL}/audits/${auditRun.id}/report/pdf`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Relatorio PDF
                  </a>
                </>
              )}
            </div>
          )}

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink/55">Resumo por criterio</h3>
          <div className="mt-2 overflow-hidden rounded-md border border-line">
            {summaryRows.length === 0 ? (
              <div className="px-4 py-3 text-sm text-ink/60">Nenhuma auditoria executada nesta sessao.</div>
            ) : (
              summaryRows.map((result) => (
                <div
                  className="grid gap-2 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-[90px_120px_100px_1fr]"
                  key={`${result.criteria_id}-${result.code}`}
                >
                  <strong>{result.code}</strong>
                  <span className={result.status === "approved" ? "text-moss" : "text-coral"}>
                    {result.status === "approved" ? <CheckCircle2 className="mr-1 inline h-4 w-4" /> : <XCircle className="mr-1 inline h-4 w-4" />}
                    {result.status}
                  </span>
                  <span className="capitalize">{result.severity}</span>
                  <span className="text-ink/70">{result.message}</span>
                </div>
              ))
            )}
          </div>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink/55">Detalhes por elemento</h3>
          <div className="mt-2 max-h-[340px] overflow-y-auto rounded-md border border-line">
            {elementRows.length === 0 ? (
              <div className="px-4 py-3 text-sm text-ink/60">Nenhum detalhe por elemento para esta auditoria.</div>
            ) : (
              elementRows.map((result, index) => (
                <div
                  className="grid gap-2 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-[130px_110px_90px_1fr]"
                  key={`${result.criteria_id}-${result.element_guid ?? "no-guid"}-${index}`}
                >
                  <span className="font-mono text-xs text-ink/70">{result.element_guid ?? "sem-guid"}</span>
                  <span className={result.status === "approved" ? "text-moss" : "text-coral"}>{result.status}</span>
                  <span className="capitalize">{result.severity}</span>
                  <span className="text-ink/70">
                    {result.message}
                    {result.fix_suggestion ? ` Sugestao: ${result.fix_suggestion}.` : ""}
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
