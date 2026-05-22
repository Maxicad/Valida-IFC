"use client";

import { Play, RefreshCcw } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiPost } from "@/services/api";
import type { AuditResult, AuditRun, CriteriaSet, IfcFile, Project } from "@/types/api";

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
  const summaryRows = auditResults.filter((result) => result.is_summary);
  const elementRows = auditResults.filter((result) => !result.is_summary);

  async function loadInitialData() {
    setError(null);
    try {
      const [loadedProjects, loadedCriteriaSets] = await Promise.all([
        apiGet<Project[]>("/projects"),
        apiGet<CriteriaSet[]>("/criteria-sets"),
      ]);
      setProjects(loadedProjects);
      setCriteriaSets(loadedCriteriaSets);
      setSelectedProjectId((current) => current || loadedProjects[0]?.id || "");
      setSelectedCriteriaSetId((current) => current || loadedCriteriaSets[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar dados de auditoria.");
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
      setSelectedIfcFileId((current) => current || files[0]?.id || "");
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

    setLoading(true);
    setError(null);
    try {
      const createdAudit = await apiPost<AuditRun>("/audits", {
        project_id: selectedProjectId,
        ifc_file_id: selectedIfcFileId,
        criteria_set_id: selectedCriteriaSetId,
      });
      setAuditRun(createdAudit);
      const results = await apiGet<AuditResult[]>(`/audits/${createdAudit.id}/results`);
      setAuditResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel executar auditoria.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    void loadIfcFiles(selectedProjectId);
  }, [selectedProjectId]);

  return (
    <AppShell>
      <h1 className="mb-2 text-2xl font-semibold">Auditorias</h1>
      <p className="mb-6 text-sm text-ink/65">Selecione arquivo IFC, conjunto de criterios e execute a validacao.</p>

      <section className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card>
          <form onSubmit={runAudit}>
            <label className="block text-sm font-medium">
              Projeto
              <select
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3"
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
            <label className="mt-4 block text-sm font-medium">
              Arquivo IFC
              <select
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3"
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
            <label className="mt-4 block text-sm font-medium">
              Conjunto de criterios
              <select
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3"
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
            {error && <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
            <Button className="mt-5 w-full" disabled={loading} type="submit">
              <Play className="h-4 w-4" />
              {loading ? "Executando..." : "Executar auditoria"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Resultado resumido</h2>
            <button onClick={() => void loadInitialData()} type="button">
              <RefreshCcw className="h-4 w-4 text-ink/50" />
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-md bg-surface p-4">
              <span className="text-sm text-ink/60">Percentual</span>
              <strong className="mt-2 block text-3xl">
                {auditRun?.score_percent != null ? `${auditRun.score_percent}%` : "-"}
              </strong>
            </div>
            <div className="rounded-md bg-surface p-4">
              <span className="text-sm text-ink/60">Aprovados</span>
              <strong className="mt-2 block text-3xl">{auditRun?.approved_criteria ?? "-"}</strong>
            </div>
            <div className="rounded-md bg-surface p-4">
              <span className="text-sm text-ink/60">Reprovados</span>
              <strong className="mt-2 block text-3xl">{auditRun?.failed_criteria ?? "-"}</strong>
            </div>
          </div>

          {selectedIfcFileId && (
            <div className="mt-5 flex justify-end">
              <Link
                href={`/visualizador?ifc_file_id=${selectedIfcFileId}`}
                className="rounded-md border border-line px-3 py-2 text-sm hover:bg-surface"
              >
                Abrir no visualizador
              </Link>
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-md border border-line">
            {summaryRows.length === 0 ? (
              <div className="px-4 py-3 text-sm text-ink/60">Nenhuma auditoria executada nesta sessao.</div>
            ) : (
              summaryRows.map((result) => (
                <div
                  key={`${result.criteria_id}-${result.code}`}
                  className="grid gap-3 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-[90px_110px_110px_1fr]"
                >
                  <strong>{result.code}</strong>
                  <span className={result.status === "approved" ? "text-moss" : "text-coral"}>
                    {result.status}
                  </span>
                  <span className="capitalize">{result.severity}</span>
                  <span className="text-ink/70">{result.message}</span>
                </div>
              ))
            )}
          </div>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink/60">
            Resultados por elemento
          </h3>
          <div className="mt-3 overflow-hidden rounded-md border border-line">
            {elementRows.length === 0 ? (
              <div className="px-4 py-3 text-sm text-ink/60">
                Nenhum detalhe por elemento para esta auditoria.
              </div>
            ) : (
              elementRows.map((result, index) => (
                <div
                  key={`${result.criteria_id}-${result.element_guid ?? "no-guid"}-${index}`}
                  className="grid gap-3 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-[130px_110px_80px_1fr]"
                >
                  <span className="font-mono text-xs">{result.element_guid ?? "sem-guid"}</span>
                  <span className={result.status === "approved" ? "text-moss" : "text-coral"}>
                    {result.status}
                  </span>
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
