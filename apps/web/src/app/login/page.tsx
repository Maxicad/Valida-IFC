"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  UserPlus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiPost, getStoredToken, setStoredToken } from "@/services/api";
import type { TokenResponse, User } from "@/types/api";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              size?: "large" | "medium" | "small";
              text?: "continue_with" | "signin_with";
              theme?: "outline" | "filled_blue" | "filled_black";
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

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

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("Auditor BIM");
  const [email, setEmail] = useState("auditor@example.com");
  const [password, setPassword] = useState("secret123");
  const [showPassword, setShowPassword] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const slide = onboardingSlides[activeSlide];

  useEffect(() => {
    if (getStoredToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        setError("Nao foi possivel obter a credencial do Google.");
        return;
      }

      setError(null);
      setGoogleLoading(true);
      try {
        const token = await apiPost<TokenResponse>("/auth/google", { id_token: response.credential });
        setStoredToken(token.access_token);
        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nao foi possivel autenticar com Google.");
      } finally {
        setGoogleLoading(false);
      }
    },
    [router],
  );

  const initializeGoogleLogin = useCallback(() => {
    if (!googleClientId || !googleButtonRef.current || !window.google || googleInitializedRef.current) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
      ux_mode: "popup",
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      width: googleButtonRef.current.offsetWidth || 320,
    });
    googleInitializedRef.current = true;
  }, [googleClientId, handleGoogleCredential]);

  useEffect(() => {
    initializeGoogleLogin();
  }, [googleScriptReady, initializeGoogleLogin]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        await apiPost<User>("/auth/register", {
          name,
          email,
          password,
          role: "auditor_bim",
        });
      }

      const token = await apiPost<TokenResponse>("/auth/login", { email, password });
      setStoredToken(token.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#e9efec] px-4 py-6 text-[#203a33] md:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-6xl overflow-hidden rounded-lg border border-[#d3ded8] bg-white shadow-[0_18px_48px_rgba(45,42,35,0.11)] lg:grid-cols-[1fr_0.82fr]">
        <aside className="p-6 md:p-8">
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
                Entenda o fluxo, teste uma demo sem cadastro e crie a conta somente quando quiser salvar o progresso.
              </p>
            </div>
            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[#d3ded8] bg-white px-4 text-sm font-semibold text-[#203a33] transition hover:bg-[#eef5f2]"
              href="/demo"
            >
              Abrir demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {[
              ["Projeto", "Organiza cliente, disciplina e escopo."],
              ["Arquivo IFC", "Carrega modelo e metadados principais."],
              ["Auditoria", "Executa regras e entrega evidencias."],
            ].map(([title, detail], index) => (
              <button
                className="rounded-md border border-[#d3ded8] bg-white px-3 py-4 text-left transition hover:bg-[#f8faf7]"
                key={title}
                onClick={() => setActiveSlide(index)}
                type="button"
              >
                <span className="text-xs font-semibold uppercase text-[#6a6f2f]">Tela {index + 1}</span>
                <strong className="mt-1 block text-sm text-[#203a33]">{title}</strong>
                <span className="mt-2 block text-xs leading-5 text-[#5d6a62]">{detail}</span>
              </button>
            ))}
          </div>

          <div className="mt-7 rounded-lg bg-[#203a33] p-5 text-white">
            <div className="rounded-lg border border-white/20 bg-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
                  Conheca antes de entrar
                </span>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#203a33]">{slide.metric}</span>
              </div>
              <h2 className="mt-6 text-2xl font-semibold leading-tight">{slide.title}</h2>
              <p className="mt-3 min-h-14 text-sm leading-6 text-white/78">{slide.detail}</p>
              <div className="mt-6 flex items-center gap-2">
                {onboardingSlides.map((item, index) => (
                  <button
                    aria-label={`Ver tela ${index + 1}: ${item.title}`}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeSlide ? "w-8 bg-white" : "w-2.5 bg-white/35"
                    }`}
                    key={item.title}
                    onClick={() => setActiveSlide(index)}
                    type="button"
                  />
                ))}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2">
                {["Projeto", "IFC", "Relatorio"].map((item, index) => (
                  <button
                    className={`rounded-md border border-white/15 px-2 py-2 text-left text-xs font-semibold text-white/82 ${
                      index === activeSlide ? "bg-[#6a6f2f]" : ""
                    }`}
                    key={item}
                    onClick={() => setActiveSlide(index)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="flex flex-col justify-center border-t border-[#d3ded8] bg-white p-6 md:p-8 lg:border-l lg:border-t-0">
          <div>
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-[#6a6f2f]" />
              <span className="text-sm font-semibold uppercase text-[#6a6f2f]">Acesso</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-[#203a33]">
              {mode === "login" ? "Comece do seu jeito" : "Crie sua conta"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5d6a62]">
              Entrar, criar conta ou experimentar a demo ficam aqui. Upload e dashboard aparecem apenas depois.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-md bg-[#eef5f2] p-1 text-sm font-semibold">
            <button
              className={`h-9 rounded-md transition ${
                mode === "login" ? "bg-white text-[#203a33] shadow-sm" : "text-[#5d6a62] hover:text-[#203a33]"
              }`}
              onClick={() => setMode("login")}
              type="button"
            >
              Entrar
            </button>
            <button
              className={`h-9 rounded-md transition ${
                mode === "register" ? "bg-white text-[#203a33] shadow-sm" : "text-[#5d6a62] hover:text-[#203a33]"
              }`}
              onClick={() => setMode("register")}
              type="button"
            >
              Criar conta
            </button>
          </div>

          {googleClientId && (
            <Script
              onError={() => setError("Nao foi possivel carregar o login do Google.")}
              onLoad={() => setGoogleScriptReady(true)}
              src="https://accounts.google.com/gsi/client"
              strategy="afterInteractive"
            />
          )}

          {googleClientId && (
            <div className="mt-5 space-y-4">
              <div
                aria-label="Entrar com Google"
                className={`min-h-11 w-full rounded-md ${googleLoading ? "pointer-events-none opacity-60" : ""}`}
                ref={googleButtonRef}
              />
              <div className="flex items-center gap-3 text-xs uppercase text-[#5d6a62]/65">
                <span className="h-px flex-1 bg-[#d3ded8]" />
                ou
                <span className="h-px flex-1 bg-[#d3ded8]" />
              </div>
            </div>
          )}

          {!googleClientId && (
            <p className="mt-5 rounded-md border border-[#d3ded8] bg-[#f8faf7] px-3 py-2 text-sm text-[#5d6a62]">
              Login Google indisponivel neste ambiente.
            </p>
          )}

          <form className="mt-5 space-y-4" onSubmit={submit}>
            {mode === "register" && (
              <label className="block text-sm font-medium text-[#203a33]">
                Nome completo
                <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-[#d3ded8] bg-white px-3 focus-within:ring-2 focus-within:ring-[#6a6f2f]/25">
                  <UserPlus className="h-4 w-4 text-[#5d6a62]" />
                  <input
                    className="h-full w-full bg-transparent outline-none"
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Auditor BIM"
                    type="text"
                    value={name}
                  />
                </span>
              </label>
            )}

            <label className="block text-sm font-medium text-[#203a33]">
              E-mail
              <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-[#d3ded8] bg-white px-3 focus-within:ring-2 focus-within:ring-[#6a6f2f]/25">
                <Mail className="h-4 w-4 text-[#5d6a62]" />
                <input
                  className="h-full w-full bg-transparent outline-none"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="auditor@empresa.com"
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label className="block text-sm font-medium text-[#203a33]">
              Senha
              <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-[#d3ded8] bg-white px-3 focus-within:ring-2 focus-within:ring-[#6a6f2f]/25">
                <LockKeyhole className="h-4 w-4 text-[#5d6a62]" />
                <input
                  className="h-full w-full bg-transparent outline-none"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="text-[#5d6a62] transition hover:text-[#203a33]"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {error && <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

            <Button className="h-11 w-full bg-[#203a33] hover:bg-[#2f6f73]" disabled={loading} type="submit">
              {loading ? "Aguarde..." : mode === "login" ? "Entrar com e-mail" : "Criar conta e entrar"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <Link
            className="mt-3 flex h-11 items-center justify-center gap-2 rounded-md border border-[#d3ded8] bg-[#eef5f2] text-sm font-semibold text-[#203a33] transition hover:bg-[#e1ebe6]"
            href="/demo"
          >
            <Sparkles className="h-4 w-4" />
            Testar demo sem login
          </Link>

          <div className="mt-5 flex items-center justify-between text-sm">
            <button className="text-[#5d6a62] hover:text-[#203a33]" type="button">
              Recuperar senha
            </button>
            <button
              className="font-medium text-[#6a6f2f] hover:text-[#203a33]"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              type="button"
            >
              {mode === "login" ? "Ainda sem conta?" : "Ja tem conta?"}
            </button>
          </div>

          <p className="mt-5 rounded-md border border-[#d3ded8] bg-[#f8faf7] p-3 text-sm text-[#5d6a62]">
            A demo usa dados ficticios e permite salvar o progresso criando uma conta depois.
          </p>
        </section>
      </section>
    </main>
  );
}
