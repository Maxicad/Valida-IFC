"use client";

import { FileUp, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiUpload } from "@/services/api";
import type { IfcFile, Project } from "@/types/api";

export default function UploadPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ifcFiles, setIfcFiles] = useState<IfcFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadProjects() {
    try {
      const data = await apiGet<Project[]>("/projects");
      setProjects(data);
      setSelectedProjectId((current) => current || data[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar projetos.");
    }
  }

  async function loadFiles(projectId: string) {
    if (!projectId) {
      setIfcFiles([]);
      return;
    }
    try {
      setIfcFiles(await apiGet<IfcFile[]>(`/projects/${projectId}/ifc-files`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar arquivos IFC.");
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

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const uploaded = await apiUpload<IfcFile>(`/projects/${selectedProjectId}/ifc/upload`, formData);
      setSelectedFile(null);
      setSuccessMessage(`Arquivo ${uploaded.file_name} enviado com sucesso.`);
      await loadFiles(selectedProjectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel enviar o IFC.");
    } finally {
      setLoading(false);
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setSuccessMessage(null);
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    void loadFiles(selectedProjectId);
  }, [selectedProjectId]);

  return (
    <AppShell>
      <h1 className="mb-2 text-2xl font-semibold">Upload IFC</h1>
      <p className="mb-6 text-sm text-ink/65">Envio, validacao de extensao e leitura inicial do FILE_SCHEMA.</p>

      <Card className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form
          className="flex min-h-80 flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-surface px-6 text-center"
          onSubmit={submit}
        >
          <FileUp className="h-10 w-10 text-steel" />
          <h2 className="mt-4 text-lg font-semibold">Arraste o arquivo IFC</h2>
          <p className="mt-2 max-w-md text-sm text-ink/65">
            O backend aceitara apenas `.ifc`, aplicara limite de tamanho e extraira a versao do cabecalho.
          </p>
          <select
            className="mt-5 h-10 w-full max-w-md rounded-md border border-line bg-white px-3 text-sm"
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
          <input
            accept=".ifc"
            className="mt-3 w-full max-w-md rounded-md border border-line bg-white px-3 py-2 text-sm"
            onChange={selectFile}
            type="file"
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-ink/70">
              Selecionado: <strong>{selectedFile.name}</strong> ({selectedFile.size} bytes)
            </p>
          )}
          {error && <p className="mt-3 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
          {successMessage && (
            <p className="mt-3 rounded-md bg-moss/10 px-3 py-2 text-sm text-moss">{successMessage}</p>
          )}
          <Button className="mt-5" disabled={loading} type="submit" variant="secondary">
            {loading ? "Enviando..." : "Enviar arquivo"}
          </Button>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
            <Link className="rounded-md border border-line px-3 py-2 hover:bg-white" href="/criterios">
              Importar criterios
            </Link>
            <Link className="rounded-md border border-line px-3 py-2 hover:bg-white" href="/auditorias">
              Rodar auditoria
            </Link>
            <Link className="rounded-md border border-line px-3 py-2 hover:bg-white" href="/visualizador">
              Abrir visualizador
            </Link>
          </div>
        </form>

        <aside className="rounded-lg border border-line p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-moss" />
            <h2 className="font-semibold">Validacoes previstas</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-ink/70">
            <li>Extensao `.ifc`.</li>
            <li>Tamanho maximo configuravel.</li>
            <li>Leitura de `FILE_SCHEMA`.</li>
            <li>Registro do upload no projeto.</li>
          </ul>
          <div className="mt-6 border-t border-line pt-4">
            <h3 className="mb-3 text-sm font-semibold">Arquivos do projeto</h3>
            <div className="space-y-2">
              {ifcFiles.length === 0 ? (
                <p className="text-sm text-ink/60">Nenhum IFC enviado.</p>
              ) : (
                ifcFiles.map((ifcFile) => (
                  <div key={ifcFile.id} className="rounded-md bg-surface p-3 text-sm">
                    <strong className="block">{ifcFile.file_name}</strong>
                    <span className="text-ink/60">
                      {ifcFile.ifc_schema ?? "Schema nao identificado"} - {ifcFile.file_size} bytes
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </Card>
    </AppShell>
  );
}
