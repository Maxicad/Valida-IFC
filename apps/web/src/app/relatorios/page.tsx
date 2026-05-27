"use client";

import { ArrowRightLeft, ExternalLink, History, Link2, Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { API_BASE_URL, apiGet, apiPost } from "@/services/api";
import type { AuditComparison, AuditHistoryItem, AuditSnapshot, Project } from "@/types/api";

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusTone(status: string): string {
  if (status === "completed") {
    return "bg-moss/10 text-moss";
  }
  if (status === "failed") {
    return "bg-coral/10 text-coral";
  }
  return "bg-amber/10 text-amber";
}

function snapshotUrl(path?: string): string {
  return path ? `${API_BASE_URL}${path}` : "";
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [history, setHistory] = useState<AuditHistoryItem[]>([]);
  const [baseAuditId, setBaseAuditId] = useState("");
  const [targetAuditId, setTargetAuditId] = useState("");
  const [comparison, setComparison] = useState<AuditComparison | null>(null);
  const [snapshotLinks, setSnapshotLinks] = useState<Record<string, AuditSnapshot>>({});
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [creatingSnapshotFor, setCreatingSnapshotFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const completedAudits = useMemo(
    () => history.filter((audit) => audit.status === "completed"),
    [history],
  );

  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      const loadedProjects = await apiGet<Project[]>("/projects");
      setProjects(loadedProjects);
      setSelectedProjectId((current) => {
        if (loadedProjects.some((project) => project.id === current)) {
          return current;
        }
        return loadedProjects[0]?.id ?? "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar projetos.");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(projectId: string) {
    if (!projectId) {
      setHistory([]);
      setComparison(null);
      return;
    }

    setError(null);
    try {
      const rows = await apiGet<AuditHistoryItem[]>(`/audits/project/${projectId}/history`);
      setHistory(rows);
      setComparison(null);
      setBaseAuditId((current) => (rows.some((audit) => audit.id === current) ? current : rows[1]?.id ?? rows[0]?.id ?? ""));
      setTargetAuditId((current) => (rows.some((audit) => audit.id === current) ? current : rows[0]?.id ?? ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar histórico.");
    }
  }

  async function compareAudits() {
    if (!baseAuditId || !targetAuditId || baseAuditId === targetAuditId) {
      setError("Selecione duas auditorias diferentes para comparar.");
      return;
    }

    setComparing(true);
    setError(null);
    try {
      const result = await apiGet<AuditComparison>(
        `/audits/compare?base_audit_id=${encodeURIComponent(baseAuditId)}&target_audit_id=${encodeURIComponent(targetAuditId)}`,
      );
      setComparison(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível comparar auditorias.");
    } finally {
      setComparing(false);
    }
  }

  async function createSnapshot(auditId: string) {
    setCreatingSnapshotFor(auditId);
    setError(null);
    try {
      const snapshot = await apiPost<AuditSnapshot>(`/audits/${auditId}/snapshots`, { expires_in_days: 30 });
      setSnapshotLinks((current) => ({ ...current, [auditId]: snapshot }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar snapshot.");
    } finally {
      setCreatingSnapshotFor(null);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    void loadHistory(selectedProjectId);
  }, [selectedProjectId]);

  return (
    <AppShell>
      <section className="rounded-lg border border-line bg-panel p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-steel">Historico e Evidencia</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Relatorios e snapshots</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink/65">
              Acompanhe execuções, compare resultados e gere links read-only para auditorias concluídas.
            </p>
          </div>
          <Button onClick={() => void loadProjects()} type="button" variant="secondary">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </section>

      {error && <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card className="p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-steel" />
              <h2 className="text-lg font-semibold text-ink">Timeline do projeto</h2>
            </div>
            <label className="text-sm font-medium text-ink/90">
              Projeto
              <select
                className="ml-0 mt-2 h-10 w-full rounded-md border border-line bg-white px-3 outline-none focus:ring-2 focus:ring-steel/25 md:ml-2 md:mt-0 md:w-72"
                onChange={(event) => setSelectedProjectId(event.target.value)}
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
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-line">
            <div className="hidden grid-cols-[130px_1fr_90px_90px_150px] gap-3 border-b border-line bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink/55 lg:grid">
              <span>Data</span>
              <span>Escopo</span>
              <span>Score</span>
              <span>Status</span>
              <span>Evidencia</span>
            </div>

            {history.length === 0 ? (
              <div className="px-4 py-4 text-sm text-ink/60">Nenhuma auditoria encontrada para este projeto.</div>
            ) : (
              history.map((audit) => {
                const snapshot = snapshotLinks[audit.id];
                const isCreating = creatingSnapshotFor === audit.id;
                return (
                  <div
                    className="grid gap-3 border-b border-line px-4 py-3 text-sm last:border-0 lg:grid-cols-[130px_1fr_90px_90px_150px] lg:items-center"
                    key={audit.id}
                  >
                    <span className="text-ink/70">{formatDate(audit.finished_at ?? audit.started_at)}</span>
                    <div>
                      <strong className="block font-medium text-ink">{audit.ifc_file_name}</strong>
                      <span className="text-xs text-ink/60">{audit.criteria_set_name}</span>
                    </div>
                    <strong>{audit.score_percent != null ? `${audit.score_percent}%` : "-"}</strong>
                    <span className={`w-fit rounded-md px-2 py-1 text-xs font-semibold ${statusTone(audit.status)}`}>
                      {audit.status}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {snapshot ? (
                        <a
                          className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink/80 hover:bg-white"
                          href={snapshotUrl(snapshot.view_url)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Snapshot
                        </a>
                      ) : (
                        <button
                          className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink/80 hover:bg-white disabled:opacity-60"
                          disabled={audit.status !== "completed" || isCreating}
                          onClick={() => void createSnapshot(audit.id)}
                          type="button"
                        >
                          {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                          Gerar link
                        </button>
                      )}
                      <a
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink/80 hover:bg-white"
                        href={`${API_BASE_URL}/audits/${audit.id}/report/html`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        HTML
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-steel" />
            <h2 className="text-lg font-semibold text-ink">Comparação de execuções</h2>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-ink/90">
              Base
              <select
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 outline-none focus:ring-2 focus:ring-steel/25"
                onChange={(event) => setBaseAuditId(event.target.value)}
                value={baseAuditId}
              >
                <option value="">Selecione</option>
                {completedAudits.map((audit) => (
                  <option key={audit.id} value={audit.id}>
                    {formatDate(audit.finished_at)} - {audit.score_percent ?? 0}%
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-ink/90">
              Atual
              <select
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 outline-none focus:ring-2 focus:ring-steel/25"
                onChange={(event) => setTargetAuditId(event.target.value)}
                value={targetAuditId}
              >
                <option value="">Selecione</option>
                {completedAudits.map((audit) => (
                  <option key={audit.id} value={audit.id}>
                    {formatDate(audit.finished_at)} - {audit.score_percent ?? 0}%
                  </option>
                ))}
              </select>
            </label>

            <Button className="w-full" disabled={comparing || completedAudits.length < 2} onClick={() => void compareAudits()} type="button">
              {comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
              Comparar
            </Button>
          </div>

          {comparison && (
            <section className="mt-5 space-y-4">
              <div className="rounded-md border border-line bg-surface p-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink/55">Delta de score</span>
                <strong className={comparison.score_delta >= 0 ? "mt-1 block text-2xl text-moss" : "mt-1 block text-2xl text-coral"}>
                  {comparison.score_delta > 0 ? "+" : ""}
                  {comparison.score_delta}%
                </strong>
              </div>

              {[
                ["Novas falhas", comparison.new_failures, "text-coral"],
                ["Resolvidas", comparison.resolved_failures, "text-moss"],
                ["Persistentes", comparison.persistent_failures, "text-amber"],
              ].map(([label, rows, tone]) => (
                <div key={label as string}>
                  <h3 className="text-sm font-semibold text-ink">{label as string}</h3>
                  <div className="mt-2 overflow-hidden rounded-md border border-line">
                    {(rows as AuditComparison["new_failures"]).length === 0 ? (
                      <p className="px-3 py-2 text-sm text-ink/60">Nenhum item.</p>
                    ) : (
                      (rows as AuditComparison["new_failures"]).map((item) => (
                        <div className="border-b border-line px-3 py-2 text-sm last:border-0" key={`${label}-${item.code}-${item.element_guid ?? item.message}`}>
                          <strong className={tone as string}>{item.code}</strong>
                          <span className="ml-2 font-mono text-xs text-ink/60">{item.element_guid ?? "sem-guid"}</span>
                          <p className="mt-1 text-ink/70">{item.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}
        </Card>
      </section>
    </AppShell>
  );
}
