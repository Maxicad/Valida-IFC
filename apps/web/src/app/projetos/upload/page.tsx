import { FileUp, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function UploadPage() {
  return (
    <AppShell>
      <h1 className="mb-2 text-2xl font-semibold">Upload IFC</h1>
      <p className="mb-6 text-sm text-ink/65">Envio, validacao de extensao e leitura inicial do FILE_SCHEMA.</p>

      <Card className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-surface px-6 text-center">
          <FileUp className="h-10 w-10 text-steel" />
          <h2 className="mt-4 text-lg font-semibold">Arraste o arquivo IFC</h2>
          <p className="mt-2 max-w-md text-sm text-ink/65">
            O backend aceitara apenas `.ifc`, aplicara limite de tamanho e extraira a versao do cabecalho.
          </p>
          <Button className="mt-5" variant="secondary">
            Selecionar arquivo
          </Button>
        </div>

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
        </aside>
      </Card>
    </AppShell>
  );
}
