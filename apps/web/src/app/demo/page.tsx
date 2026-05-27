import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  Plus,
  Play,
} from "lucide-react";
import Link from "next/link";

const steps = [
  { label: "Projeto", status: "concluido" },
  { label: "IFC", status: "concluido" },
  { label: "Criterios", status: "concluido" },
  { label: "Auditoria", status: "em execucao" },
  { label: "Entrega", status: "proximo" },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#e9efec] px-4 py-6 text-[#203a33] md:px-8">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link className="text-sm font-semibold underline-offset-4 hover:underline" href="/login">
              Voltar ao login
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Demo - Fluxo assistido</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#5d6a62]">
              Ambiente demonstrativo com dados ficticios. Teste a jornada sem login e salve o progresso criando conta.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#203a33] px-4 text-sm font-semibold text-white transition hover:bg-[#2f6f73]"
            href="/login"
          >
            Salvar progresso criando conta
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#d3ded8] bg-[#eef5f2] shadow-[0_18px_48px_rgba(45,42,35,0.11)]">
          <header className="flex flex-col gap-3 border-b border-[#d3ded8] bg-[#203a33] px-4 py-4 text-white md:flex-row md:items-center md:justify-between">
            <div>
              <strong className="block">Valida IFC</strong>
              <span className="text-xs text-white/65">Demo sem autenticacao</span>
            </div>
            <button className="flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-[#203a33]" type="button">
              <Plus className="h-4 w-4" />
              Nova validacao
            </button>
          </header>

          <div className="grid min-h-[700px] gap-4 p-4 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-lg border border-[#d3ded8] bg-white p-4">
              <h2 className="text-sm font-semibold uppercase text-[#6a6f2f]">Jornada atual</h2>
              <div className="mt-4 grid gap-3">
                {steps.map((step, index) => (
                  <button
                    className={`flex items-center gap-3 rounded-md border px-3 py-3 text-left ${
                      step.status === "em execucao" ? "border-[#203a33] bg-[#eef5f2]" : "border-[#dce6df] bg-white"
                    }`}
                    key={step.label}
                    type="button"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
                        step.status === "concluido"
                          ? "bg-[#3f7b5f] text-white"
                          : step.status === "em execucao"
                            ? "bg-[#203a33] text-white"
                            : "bg-[#e6eee8] text-[#5d6a62]"
                      }`}
                    >
                      {step.status === "concluido" ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </span>
                    <span>
                      <strong className="block text-sm text-[#203a33]">{step.label}</strong>
                      <span className="text-xs text-[#5d6a62]">{step.status}</span>
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="min-w-0">
              <div className="rounded-lg border border-[#d3ded8] bg-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[#6a6f2f]">Auditoria guiada</p>
                    <h2 className="mt-1 text-2xl font-semibold text-[#203a33]">Hospital Central - Arquitetura.ifc</h2>
                    <p className="mt-2 max-w-2xl text-sm text-[#5d6a62]">
                      Proxima acao clara, menos telas intermediarias e resumo de impacto antes da entrega.
                    </p>
                  </div>
                  <button className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#203a33] px-4 text-sm font-semibold text-white" type="button">
                    <Play className="h-4 w-4" />
                    Executar agora
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-[#dce6df] bg-[#f8faf7] p-4">
                    <CheckCircle2 className="h-4 w-4 text-[#6a6f2f]" />
                    <strong className="mt-3 block text-2xl text-[#203a33]">86%</strong>
                    <span className="text-sm text-[#5d6a62]">Score previsto</span>
                  </div>
                  <div className="rounded-md border border-[#dce6df] bg-[#f8faf7] p-4">
                    <AlertTriangle className="h-4 w-4 text-[#c8523f]" />
                    <strong className="mt-3 block text-2xl text-[#203a33]">11</strong>
                    <span className="text-sm text-[#5d6a62]">Pendencias criticas</span>
                  </div>
                  <div className="rounded-md border border-[#dce6df] bg-[#f8faf7] p-4">
                    <Clock3 className="h-4 w-4 text-[#2f6f73]" />
                    <strong className="mt-3 block text-2xl text-[#203a33]">4 min</strong>
                    <span className="text-sm text-[#5d6a62]">Tempo estimado</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
                <section className="rounded-lg border border-[#d3ded8] bg-white p-4">
                  <h2 className="text-base font-semibold text-[#203a33]">Pendencias por prioridade</h2>
                  <div className="mt-3 grid gap-2">
                    {[
                      ["Ambientes sem nome", "23 elementos", "Alta"],
                      ["Classificacao ausente", "14 elementos", "Media"],
                      ["Geometria incompleta", "6 elementos", "Critica"],
                    ].map(([title, detail, severity]) => (
                      <button
                        className="grid gap-2 rounded-md border border-[#dce6df] px-3 py-3 text-left text-sm md:grid-cols-[1fr_120px_90px_32px] md:items-center"
                        key={title}
                        type="button"
                      >
                        <strong className="text-[#203a33]">{title}</strong>
                        <span className="text-[#5d6a62]">{detail}</span>
                        <span className="font-semibold text-[#6a6f2f]">{severity}</span>
                        <ArrowRight className="h-4 w-4 text-[#5d6a62]" />
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-[#d3ded8] bg-white p-4">
                  <h2 className="text-base font-semibold text-[#203a33]">Entrega</h2>
                  <div className="mt-3 grid gap-2">
                    {[
                      { label: "Visualizador", icon: Eye },
                      { label: "Relatorio HTML", icon: FileCheck2 },
                      { label: "PDF tecnico", icon: Download },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          className="flex h-11 items-center justify-between rounded-md border border-[#dce6df] px-3 text-sm font-semibold text-[#203a33]"
                          key={item.label}
                          type="button"
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-[#6a6f2f]" />
                            {item.label}
                          </span>
                          <ArrowRight className="h-4 w-4 text-[#5d6a62]" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
