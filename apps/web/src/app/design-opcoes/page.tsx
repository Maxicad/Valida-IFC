import { ArrowRight, Columns3, Route, ShieldCheck } from "lucide-react";
import Link from "next/link";

const options = [
  {
    href: "/design-opcoes/opcao-a",
    title: "Opcao A - Mesa de controle",
    description:
      "Login com onboarding e entrada demo; depois, area operacional densa para uso recorrente.",
    icon: Columns3,
    accent: "bg-[#183833] text-white",
  },
  {
    href: "/design-opcoes/opcao-b",
    title: "Opcao B - Fluxo assistido",
    description:
      "Login separado com explicacao em etapas, demo sem cadastro e produto guiado por jornada.",
    icon: Route,
    accent: "bg-[#203a33] text-white",
  },
];

export default function DesignOptionsPage() {
  return (
    <main className="min-h-screen bg-[#eef3f0] px-4 py-8 text-[#203a33]">
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-lg border border-[#d8e1da] bg-white p-6 shadow-[0_18px_48px_rgba(45,42,35,0.1)] md:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#203a33] text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase text-[#6a6f2f]">Prototipos isolados</p>
          <h1 className="mt-2 text-3xl font-semibold">Novas opcoes de design para Valida IFC</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#647068]">
            Cada alternativa separa login/onboarding da area do produto. A demo permite testar o sistema sem conta
            antes de convidar o usuario a salvar o progresso criando cadastro.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <Link
                className="group rounded-lg border border-[#d8e1da] bg-white p-5 shadow-[0_12px_32px_rgba(45,42,35,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(45,42,35,0.12)]"
                href={option.href}
                key={option.href}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-md ${option.accent}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-5 text-xl font-semibold">{option.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#647068]">{option.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#203a33]">
                  Abrir prototipo
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
