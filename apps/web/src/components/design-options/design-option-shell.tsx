"use client";

import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  FolderKanban,
  Gauge,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Menu,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  View,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Option = "a" | "b";

const onboardingSlides = [
  {
    title: "Valide modelos IFC com criterios claros",
    detail: "Organize projeto, arquivo IFC e regras de auditoria em uma jornada unica.",
    metric: "3 passos",
  },
  {
    title: "Encontre pendencias antes da entrega",
    detail: "Veja falhas por severidade, elemento e GlobalId para agir com mais rapidez.",
    metric: "11 alertas",
  },
  {
    title: "Gere relatorios tecnicos rastreaveis",
    detail: "Exporte evidencias para revisao interna, cliente ou aprovacao BIM.",
    metric: "PDF + HTML",
  },
];

const scoreItems = [
  { label: "Modelos", value: "18", detail: "4 com alerta" },
  { label: "Auditorias", value: "32", detail: "7 em fila" },
  { label: "Score medio", value: "86%", detail: "+9 esta semana" },
  { label: "Criticos", value: "11", detail: "3 sem dono" },
];

const navItems = [
  { label: "Painel", icon: LayoutDashboard },
  { label: "Projetos", icon: FolderKanban },
  { label: "Modelos", icon: Layers3 },
  { label: "Criterios", icon: ClipboardCheck },
  { label: "Auditorias", icon: Gauge },
  { label: "Viewer", icon: View },
  { label: "Relatorios", icon: FileText },
];

const projects = [
  { name: "Hospital Central", client: "Saude Norte", score: "91%", status: "Apto para revisao" },
  { name: "Torre Corporate A", client: "Alpha Build", score: "78%", status: "Corrigir metadados" },
  { name: "Campus Tecnico", client: "Instituto Delta", score: "84%", status: "Aguardando auditoria" },
];

const queue = [
  { title: "IFC novo recebido", detail: "Hospital Central - Arquitetura", tone: "steel" },
  { title: "11 falhas criticas", detail: "Sem GlobalId ou classificacao", tone: "coral" },
  { title: "Relatorio liberado", detail: "Torre Corporate A - v03", tone: "moss" },
];

const steps = [
  { label: "Projeto", status: "ok" },
  { label: "IFC", status: "ok" },
  { label: "Criterios", status: "ok" },
  { label: "Auditoria", status: "active" },
  { label: "Entrega", status: "next" },
];

function ToneDot({ tone }: { tone: string }) {
  const color =
    tone === "coral"
      ? "bg-[#c8523f]"
      : tone === "moss"
        ? "bg-[#3f7b5f]"
        : tone === "amber"
          ? "bg-[#bf812d]"
          : "bg-[#2f6f73]";
  return <span className={`h-2.5 w-2.5 rounded-full ${color}`} />;
}

function OnboardingSlider({ option }: { option: Option }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = onboardingSlides[activeSlide];
  const isA = option === "a";
  const accent = isA ? "#2f6f73" : "#6a6f2f";
  const ink = isA ? "#183833" : "#203a33";

  return (
    <div className="rounded-lg border border-white/16 bg-white/10 p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/70">Conheca antes de entrar</span>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-bold" style={{ color: ink }}>
          {slide.metric}
        </span>
      </div>
      <h2 className="mt-6 text-2xl font-semibold leading-tight">{slide.title}</h2>
      <p className="mt-3 min-h-14 text-sm leading-6 text-white/78">{slide.detail}</p>
      <div className="mt-6 flex items-center gap-2">
        {onboardingSlides.map((item, index) => (
          <button
            aria-label={`Ver tela ${index + 1}: ${item.title}`}
            className={`h-2.5 rounded-full transition-all ${index === activeSlide ? "w-8 bg-white" : "w-2.5 bg-white/35"}`}
            key={item.title}
            onClick={() => setActiveSlide(index)}
            type="button"
          />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2">
        {["Projeto", "IFC", "Relatorio"].map((item, index) => (
          <button
            className="rounded-md border border-white/15 px-2 py-2 text-left text-xs font-semibold text-white/82"
            key={item}
            onClick={() => setActiveSlide(index)}
            style={index === activeSlide ? { backgroundColor: accent } : undefined}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniLoginA() {
  return (
    <section className="grid min-h-[760px] overflow-hidden rounded-lg border border-[#cfd9df] bg-white shadow-[0_18px_48px_rgba(25,45,58,0.12)] lg:grid-cols-[0.95fr_1.05fr]">
      <div className="flex flex-col justify-between bg-[#183833] p-6 text-white md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-sm font-bold text-[#183833]">
            IFC
          </div>
          <span className="rounded-md border border-white/20 px-2.5 py-1 text-xs font-semibold uppercase text-white/75">
            Operacao
          </span>
        </div>
        <div className="my-8">
          <OnboardingSlider option="a" />
        </div>
        <div className="grid gap-2 text-sm">
          {["Auditoria por criterio", "Viewer conectado ao resultado", "Demo sem cadastro inicial"].map((item) => (
            <div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2" key={item}>
              <ShieldCheck className="h-4 w-4" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col justify-center p-6 md:p-9">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#2f6f73]">Acesso ao Valida IFC</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#183833]">Entre, teste ou crie sua conta</h1>
        <p className="mt-3 text-sm leading-6 text-[#5d6f6b]">
          A tela de entrada apresenta o produto antes do acesso. O ambiente demo abre uma versao navegavel sem login.
        </p>
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-md bg-[#eef4f0] p-1 text-sm font-semibold">
          <button className="h-9 rounded-md bg-white text-[#183833] shadow-sm" type="button">
            Entrar
          </button>
          <button className="h-9 rounded-md text-[#5d6f6b]" type="button">
            Criar conta
          </button>
        </div>
        <button
          className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#cfd9df] bg-white text-sm font-semibold text-[#183833]"
          type="button"
        >
          <Sparkles className="h-4 w-4 text-[#2f6f73]" />
          Continuar com Google
        </button>
        <label className="block text-sm font-semibold text-[#183833]">
          E-mail
          <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-[#cfd9df] px-3">
            <Mail className="h-4 w-4 text-[#77847f]" />
            <input className="w-full bg-transparent outline-none" placeholder="auditor@empresa.com" />
          </span>
        </label>
        <label className="mt-3 block text-sm font-semibold text-[#183833]">
          Senha
          <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-[#cfd9df] px-3">
            <LockKeyhole className="h-4 w-4 text-[#77847f]" />
            <input className="w-full bg-transparent outline-none" placeholder="********" type="password" />
          </span>
        </label>
        <button className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#183833] text-sm font-semibold text-white" type="button">
          Entrar na minha conta
          <ArrowRight className="h-4 w-4" />
        </button>
        <Link
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#cfd9df] bg-[#f6faf9] text-sm font-semibold text-[#183833]"
          href="/design-opcoes/opcao-a/demo"
        >
          Testar demo sem login
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-4 rounded-md border border-[#dce5e8] bg-[#f6faf9] p-3 text-sm text-[#5d6f6b]">
          No fim da demo, o usuario pode salvar o progresso criando uma conta.
        </p>
      </div>
    </section>
  );
}

function MiniLoginB() {
  return (
    <section className="grid min-h-[760px] overflow-hidden rounded-lg border border-[#d3ded8] bg-[#f8faf7] shadow-[0_18px_48px_rgba(45,42,35,0.11)] lg:grid-cols-[1fr_0.82fr]">
      <div className="p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#203a33] text-sm font-bold text-white">
                IFC
              </span>
              <span className="text-sm font-semibold uppercase text-[#6a6f2f]">Fluxo assistido</span>
            </div>
            <h1 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight text-[#203a33]">
              Conheca o Valida IFC antes de entrar
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5d6a62]">
              Um onboarding separado explica a proposta, mostra o fluxo e oferece uma demo completa sem bloquear o usuario no cadastro.
            </p>
          </div>
          <Link
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[#d3ded8] bg-white px-4 text-sm font-semibold text-[#203a33]"
            href="/design-opcoes/opcao-b/demo"
          >
            Abrir demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {["Projeto", "Arquivo IFC", "Auditoria"].map((item, index) => (
            <button className="rounded-md border border-[#d3ded8] bg-white px-3 py-4 text-left" key={item} type="button">
              <span className="text-xs font-semibold uppercase text-[#6a6f2f]">Tela {index + 1}</span>
              <strong className="mt-1 block text-sm text-[#203a33]">{item}</strong>
              <span className="mt-2 block text-xs leading-5 text-[#5d6a62]">
                {index === 0
                  ? "Organiza cliente e projeto."
                  : index === 1
                    ? "Carrega IFC e metadados."
                    : "Executa regras e entrega evidencias."}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-7 rounded-lg bg-[#203a33] p-5">
          <OnboardingSlider option="b" />
        </div>
      </div>
      <div className="flex flex-col justify-center border-t border-[#d3ded8] bg-white p-6 md:p-8 lg:border-l lg:border-t-0">
        <div>
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-[#6a6f2f]" />
            <span className="text-sm font-semibold uppercase text-[#6a6f2f]">Acesso</span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-[#203a33]">Comece do seu jeito</h2>
          <p className="mt-2 text-sm leading-6 text-[#5d6a62]">
            Entrar, criar conta ou experimentar a demo ficam na tela de login. Upload e dashboard aparecem apenas depois.
          </p>
        </div>
        <div className="mt-6 grid gap-3">
          <button className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#203a33] text-sm font-semibold text-white" type="button">
            <UserRound className="h-4 w-4" />
            Entrar com e-mail
          </button>
          <button className="flex h-11 items-center justify-center gap-2 rounded-md border border-[#d3ded8] text-sm font-semibold text-[#203a33]" type="button">
            <Building2 className="h-4 w-4" />
            Criar conta
          </button>
          <Link
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-[#d3ded8] bg-[#eef5f2] text-sm font-semibold text-[#203a33]"
            href="/design-opcoes/opcao-b/demo"
          >
            <Sparkles className="h-4 w-4" />
            Testar demo sem login
          </Link>
        </div>
        <div className="mt-6 rounded-md border border-[#d3ded8] bg-[#f8faf7] p-3 text-sm text-[#5d6a62]">
          Demo: dados ficticios, sem cadastro e com convite para salvar progresso ao final.
        </div>
      </div>
    </section>
  );
}

function OptionAWorkspace() {
  return (
    <div className="overflow-hidden rounded-lg border border-[#cad6dc] bg-[#eef4f0] shadow-[0_18px_48px_rgba(25,45,58,0.11)]">
      <div className="grid min-h-[720px] lg:grid-cols-[236px_1fr]">
        <aside className="border-b border-[#cad6dc] bg-[#183833] p-4 text-white lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-sm font-bold text-[#183833]">
              IFC
            </span>
            <div>
              <strong className="block">Valida IFC</strong>
              <span className="text-xs text-white/65">Mesa tecnica</span>
            </div>
          </div>
          <nav className="grid gap-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium ${
                    index === 0 ? "bg-white text-[#183833]" : "text-white/78 hover:bg-white/10"
                  }`}
                  key={item.label}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0">
          <header className="flex flex-col gap-3 border-b border-[#cad6dc] bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77847f]" />
              <input
                className="h-10 w-full rounded-md border border-[#cad6dc] bg-[#f7fafb] pl-9 pr-3 text-sm outline-none"
                placeholder="Buscar projeto, GlobalId, criterio ou relatorio"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="flex h-9 w-9 items-center justify-center rounded-md border border-[#cad6dc] bg-white" type="button">
                <Bell className="h-4 w-4 text-[#2f6f73]" />
              </button>
              <button className="flex h-9 items-center gap-2 rounded-md border border-[#cad6dc] bg-white px-3 text-sm font-semibold text-[#183833]" type="button">
                Auditor BIM
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </header>
          <section className="p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[#2f6f73]">Operacao de validacao</p>
                <h1 className="mt-1 text-2xl font-semibold text-[#183833]">Painel de controle IFC</h1>
                <p className="mt-2 max-w-2xl text-sm text-[#5d6f6b]">
                  Priorize pendencias, acompanhe score e abra rapidamente o modelo certo.
                </p>
              </div>
              <button className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#183833] px-4 text-sm font-semibold text-white" type="button">
                <Upload className="h-4 w-4" />
                Novo IFC
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {scoreItems.map((item) => (
                <div className="rounded-lg border border-[#cad6dc] bg-white p-4" key={item.label}>
                  <span className="text-sm text-[#5d6f6b]">{item.label}</span>
                  <strong className="mt-2 block text-3xl font-semibold text-[#183833]">{item.value}</strong>
                  <span className="mt-1 block text-xs font-semibold uppercase text-[#2f6f73]">{item.detail}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
              <section className="rounded-lg border border-[#cad6dc] bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[#183833]">Projetos em foco</h2>
                  <button className="text-sm font-semibold text-[#2f6f73]" type="button">
                    Ver todos
                  </button>
                </div>
                <div className="overflow-hidden rounded-md border border-[#d9e3e7]">
                  {projects.map((project) => (
                    <div className="grid gap-2 border-b border-[#d9e3e7] px-3 py-3 text-sm last:border-0 md:grid-cols-[1.4fr_1fr_90px_1fr]" key={project.name}>
                      <strong className="text-[#183833]">{project.name}</strong>
                      <span className="text-[#5d6f6b]">{project.client}</span>
                      <span className="font-semibold text-[#3f7b5f]">{project.score}</span>
                      <span className="text-[#5d6f6b]">{project.status}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-[#cad6dc] bg-white p-4">
                <h2 className="text-base font-semibold text-[#183833]">Fila inteligente</h2>
                <div className="mt-3 grid gap-2">
                  {queue.map((item) => (
                    <button className="flex items-center justify-between rounded-md border border-[#d9e3e7] px-3 py-3 text-left" key={item.title} type="button">
                      <span className="flex items-start gap-3">
                        <ToneDot tone={item.tone} />
                        <span>
                          <strong className="block text-sm text-[#183833]">{item.title}</strong>
                          <span className="text-xs text-[#5d6f6b]">{item.detail}</span>
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#77847f]" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function OptionBWorkspace() {
  return (
    <div className="overflow-hidden rounded-lg border border-[#d3ded8] bg-[#eef5f2] shadow-[0_18px_48px_rgba(45,42,35,0.11)]">
      <header className="flex flex-col gap-3 border-b border-[#d3ded8] bg-[#203a33] px-4 py-4 text-white md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button className="flex h-9 w-9 items-center justify-center rounded-md border border-white/18" type="button">
            <Menu className="h-4 w-4" />
          </button>
          <div>
            <strong className="block">Valida IFC</strong>
            <span className="text-xs text-white/65">Fluxo assistido de auditoria</span>
          </div>
        </div>
        <button className="flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-[#203a33]" type="button">
          <Plus className="h-4 w-4" />
          Nova validacao
        </button>
      </header>
      <main className="grid min-h-[700px] gap-4 p-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-[#d3ded8] bg-white p-4">
          <h2 className="text-sm font-semibold uppercase text-[#6a6f2f]">Jornada atual</h2>
          <div className="mt-4 grid gap-3">
            {steps.map((step, index) => (
              <button
                className={`flex items-center gap-3 rounded-md border px-3 py-3 text-left ${
                  step.status === "active"
                    ? "border-[#203a33] bg-[#eef5f2]"
                    : "border-[#dce6df] bg-white"
                }`}
                key={step.label}
                type="button"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
                    step.status === "ok" ? "bg-[#3f7b5f] text-white" : step.status === "active" ? "bg-[#203a33] text-white" : "bg-[#e6eee8] text-[#5d6a62]"
                  }`}
                >
                  {step.status === "ok" ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </span>
                <span>
                  <strong className="block text-sm text-[#203a33]">{step.label}</strong>
                  <span className="text-xs text-[#5d6a62]">
                    {step.status === "active" ? "em execucao" : step.status === "ok" ? "concluido" : "proximo"}
                  </span>
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
                <h1 className="mt-1 text-2xl font-semibold text-[#203a33]">Hospital Central - Arquitetura.ifc</h1>
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
                <CircleDot className="h-4 w-4 text-[#6a6f2f]" />
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
                  <button className="grid gap-2 rounded-md border border-[#dce6df] px-3 py-3 text-left text-sm md:grid-cols-[1fr_120px_90px_32px] md:items-center" key={title} type="button">
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
                  { label: "Visualizador", icon: View },
                  { label: "Relatorio HTML", icon: FileCheck2 },
                  { label: "PDF tecnico", icon: Download },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button className="flex h-11 items-center justify-between rounded-md border border-[#dce6df] px-3 text-sm font-semibold text-[#203a33]" key={item.label} type="button">
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
      </main>
    </div>
  );
}

export function DesignOptionShell({ option }: { option: Option }) {
  const isA = option === "a";
  return (
    <main className={isA ? "min-h-screen bg-[#e4eee9] px-4 py-6 text-[#183833]" : "min-h-screen bg-[#e9efec] px-4 py-6 text-[#203a33]"}>
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link className="text-sm font-semibold underline-offset-4 hover:underline" href="/design-opcoes">
              Voltar para opcoes
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">
              {isA ? "Opcao A - Mesa de controle" : "Opcao B - Fluxo assistido"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm opacity-75">
              {isA
                ? "Prototipo com navegacao densa, busca central e fila de trabalho para usuarios frequentes."
                : "Prototipo orientado por etapas, com a proxima acao sempre em evidencia para reduzir decisao."}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-current px-3 text-sm font-semibold"
              href="/design-opcoes/opcao-a"
            >
              Ver A
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-current px-3 text-sm font-semibold"
              href="/design-opcoes/opcao-b"
            >
              Ver B
            </Link>
          </div>
        </div>

        <div className="grid gap-5">
          {isA ? <MiniLoginA /> : <MiniLoginB />}
        </div>
      </div>
    </main>
  );
}

export function DesignDemoShell({ option }: { option: Option }) {
  const isA = option === "a";
  return (
    <main className={isA ? "min-h-screen bg-[#e4eee9] px-4 py-6 text-[#183833]" : "min-h-screen bg-[#e9efec] px-4 py-6 text-[#203a33]"}>
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link className="text-sm font-semibold underline-offset-4 hover:underline" href={`/design-opcoes/opcao-${option}`}>
              Voltar ao login
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">
              {isA ? "Demo A - Mesa de controle" : "Demo B - Fluxo assistido"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm opacity-75">
              Ambiente demonstrativo separado do login, com dados ficticios e convite posterior para criar conta.
            </p>
          </div>
          <button
            className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold text-white ${
              isA ? "bg-[#183833]" : "bg-[#203a33]"
            }`}
            type="button"
          >
            Salvar progresso criando conta
          </button>
        </div>
        {isA ? <OptionAWorkspace /> : <OptionBWorkspace />}
      </div>
    </main>
  );
}
