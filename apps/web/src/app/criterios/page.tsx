"use client";

import { Bot, FileSpreadsheet, Plus, RefreshCcw } from "lucide-react";
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiPost, apiUpload } from "@/services/api";
import type { CriteriaImportResponse, CriteriaSet, Criterion } from "@/types/api";

export default function CriteriaPage() {
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [setName, setSetName] = useState("Criterios BIM Basicos");
  const [criterionCode, setCriterionCode] = useState("IFC-001");
  const [criterionName, setCriterionName] = useState("Versão mínima IFC");
  const [error, setError] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<CriteriaImportResponse | null>(null);

  async function loadCriteriaSets() {
    setError(null);
    try {
      const sets = await apiGet<CriteriaSet[]>("/criteria-sets");
      setCriteriaSets(sets);
      setSelectedSetId((current) => current || sets[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar conjuntos.");
    }
  }

  const loadCriteria = useCallback(async (criteriaSetId: string) => {
    if (!criteriaSetId) {
      setCriteria([]);
      return;
    }
    try {
      setCriteria(await apiGet<Criterion[]>(`/criteria?criteria_set_id=${criteriaSetId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar critérios.");
    }
  }, []);

  async function createCriteriaSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await apiPost<CriteriaSet>("/criteria-sets", {
        name: setName,
        source_type: "manual",
      });
      setSelectedSetId(created.id);
      await loadCriteriaSets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar conjunto.");
    }
  }

  async function createCriterion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSetId) {
      setError("Crie ou selecione um conjunto de critérios.");
      return;
    }
    try {
      await apiPost<Criterion>("/criteria", {
        criteria_set_id: selectedSetId,
        code: criterionCode,
        name: criterionName,
        category: "Metadados",
        severity: "alta",
        rule_type: "ifc_schema",
        property_name: "FILE_SCHEMA",
        operator: "in",
        expected_value: "IFC4|IFC4X3",
        active: true,
      });
      await loadCriteria(selectedSetId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar critério.");
    }
  }

  async function importCriteria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!importFile) {
      setError("Selecione um arquivo CSV, TXT, XLS, XLSX, IDS ou XML.");
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);
    if (selectedSetId) {
      formData.append("criteria_set_id", selectedSetId);
    }

    try {
      setError(null);
      const result = await apiUpload<CriteriaImportResponse>("/criteria-sets/import", formData);
      setImportResult(result);
      setSelectedSetId(result.criteria_set.id);
      await loadCriteriaSets();
      await loadCriteria(result.criteria_set.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível importar critérios.");
    }
  }

  function selectImportFile(event: ChangeEvent<HTMLInputElement>) {
    setImportFile(event.target.files?.[0] ?? null);
    setImportResult(null);
  }

  useEffect(() => {
    void loadCriteriaSets();
  }, []);

  useEffect(() => {
    void loadCriteria(selectedSetId);
  }, [loadCriteria, selectedSetId]);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Criterios</h1>
          <p className="text-sm text-ink/65">Defina o que o modelo precisa atender antes da auditoria.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void loadCriteria(selectedSetId)} variant="secondary">
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="secondary" type="button">
            <FileSpreadsheet className="h-4 w-4" />
            Importar
          </Button>
          <Button type="button">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <select
              className="h-10 flex-1 rounded-md border border-line bg-white px-3 text-sm"
              onChange={(event) => setSelectedSetId(event.target.value)}
              value={selectedSetId}
            >
              <option value="">Selecione um conjunto</option>
              {criteriaSets.map((criteriaSet) => (
                <option key={criteriaSet.id} value={criteriaSet.id}>
                  {criteriaSet.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="mb-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
          <div className="overflow-hidden rounded-md border border-line">
            {criteria.length === 0 ? (
              <div className="px-4 py-3 text-sm text-ink/60">Nenhum critério cadastrado.</div>
            ) : (
              criteria.map((criterion) => (
                <div
                  key={criterion.id}
                  className="grid gap-3 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-4"
                >
                  <strong>{criterion.code}</strong>
                  <span>{criterion.name}</span>
                  <span className="text-ink/65">{criterion.category ?? criterion.rule_type}</span>
                  <span className="text-right font-semibold capitalize text-coral">
                    {criterion.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <form className="mb-5 border-b border-line pb-5" onSubmit={importCriteria}>
            <h2 className="mb-3 font-semibold">Importar critérios</h2>
            <input
              accept=".csv,.txt,.xls,.xlsx,.ids,.xml"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              onChange={selectImportFile}
              type="file"
            />
            <Button className="mt-3 w-full" type="submit" variant="secondary">
              <FileSpreadsheet className="h-4 w-4" />
              Importar arquivo
            </Button>
            {importResult && (
              <div className="mt-3 rounded-md bg-surface p-3 text-sm">
                <strong className="block">Importação concluída</strong>
                <span className="text-ink/65">
                  {importResult.imported_count}/{importResult.total_rows} importados
                </span>
                {importResult.errors.length > 0 && (
                  <ul className="mt-2 space-y-1 text-coral">
                    {importResult.errors.slice(0, 4).map((item) => (
                      <li key={`${item.row}-${item.code ?? "sem-codigo"}`}>
                        Linha {item.row}: {item.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </form>
          <form className="mb-5 border-b border-line pb-5" onSubmit={createCriteriaSet}>
            <h2 className="mb-3 font-semibold">Grupo de critérios</h2>
            <input
              className="h-10 w-full rounded-md border border-line px-3 text-sm outline-none"
              onChange={(event) => setSetName(event.target.value)}
              placeholder="Nome do conjunto"
              value={setName}
            />
            <Button className="mt-3 w-full" type="submit" variant="secondary">
              Criar conjunto
            </Button>
          </form>
          <form className="mb-5 border-b border-line pb-5" onSubmit={createCriterion}>
            <h2 className="mb-3 font-semibold">Novo critério</h2>
            <input
              className="mb-2 h-10 w-full rounded-md border border-line px-3 text-sm outline-none"
              onChange={(event) => setCriterionCode(event.target.value)}
              placeholder="Codigo"
              value={criterionCode}
            />
            <input
              className="h-10 w-full rounded-md border border-line px-3 text-sm outline-none"
              onChange={(event) => setCriterionName(event.target.value)}
              placeholder="Nome"
              value={criterionName}
            />
            <Button className="mt-3 w-full" type="submit">
              Salvar critério
            </Button>
          </form>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-steel" />
            <h2 className="font-semibold">Sugestão de critério</h2>
          </div>
          <textarea
            className="mt-4 min-h-32 w-full rounded-md border border-line p-3 text-sm outline-none focus:ring-2 focus:ring-steel/25"
            placeholder="Verificar se todos os ambientes possuem nome preenchido."
          />
          <Button className="mt-3 w-full" variant="secondary">
            Gerar sugestao
          </Button>
        </Card>
      </section>
    </AppShell>
  );
}
