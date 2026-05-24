"use client";

import { ArrowRight, LockKeyhole, Mail, ShieldCheck, UserPlus } from "lucide-react";
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

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("Auditor BIM");
  const [email, setEmail] = useState("auditor@example.com");
  const [password, setPassword] = useState("secret123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

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
    <main className="min-h-screen bg-surface px-4 py-8 md:px-8 md:py-10">
      <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-lg border border-line bg-panel shadow-soft lg:grid-cols-[1.05fr_1fr]">
        <aside className="flex flex-col justify-between border-b border-line bg-ink px-6 py-7 text-white lg:border-b-0 lg:border-r lg:px-8 lg:py-9">
          <div>
            <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-md bg-white/15 text-sm font-bold">
              IFC
            </div>
            <h1 className="text-2xl font-semibold leading-tight">Valida IFC</h1>
            <p className="mt-3 text-sm text-white/80">
              Plataforma operacional para validar modelos openBIM com criterios tecnicos.
            </p>
          </div>

          <div className="mt-8 space-y-3 text-sm text-white/85">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Controle de acesso com JWT
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Upload IFC com rastreio por projeto
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Auditoria e visualizacao por GlobalId
            </div>
          </div>
        </aside>

        <div className="px-6 py-7 lg:px-8 lg:py-9">
          {googleClientId && (
            <Script
              onError={() => setError("Nao foi possivel carregar o login do Google.")}
              onLoad={() => setGoogleScriptReady(true)}
              src="https://accounts.google.com/gsi/client"
              strategy="afterInteractive"
            />
          )}

          <div className="mb-6 flex rounded-md border border-line bg-surface p-1">
            <button
              className={`h-9 flex-1 rounded-md text-sm font-medium transition ${mode === "login" ? "bg-panel text-ink shadow-sm" : "text-ink/65 hover:text-ink"}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Entrar
            </button>
            <button
              className={`h-9 flex-1 rounded-md text-sm font-medium transition ${mode === "register" ? "bg-panel text-ink shadow-sm" : "text-ink/65 hover:text-ink"}`}
              onClick={() => setMode("register")}
              type="button"
            >
              Criar conta
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-ink">
              {mode === "login" ? "Entrar na plataforma" : "Criar nova conta"}
            </h2>
            <p className="mt-2 text-sm text-ink/65">
              Use seu e-mail de trabalho para acessar projetos, criterios e auditorias.
            </p>
          </div>

          {googleClientId && (
            <div className="mb-5 space-y-4">
              <div
                aria-label="Entrar com Google"
                className={`min-h-11 w-full ${googleLoading ? "pointer-events-none opacity-60" : ""}`}
                ref={googleButtonRef}
              />
              <div className="flex items-center gap-3 text-xs uppercase text-ink/45">
                <span className="h-px flex-1 bg-line" />
                ou
                <span className="h-px flex-1 bg-line" />
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={submit}>
            {mode === "register" && (
              <label className="block text-sm font-medium text-ink/90">
                Nome completo
                <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 focus-within:ring-2 focus-within:ring-steel/25">
                  <UserPlus className="h-4 w-4 text-ink/45" />
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

            <label className="block text-sm font-medium text-ink/90">
              E-mail
              <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 focus-within:ring-2 focus-within:ring-steel/25">
                <Mail className="h-4 w-4 text-ink/45" />
                <input
                  className="h-full w-full bg-transparent outline-none"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="auditor@empresa.com"
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label className="block text-sm font-medium text-ink/90">
              Senha
              <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 focus-within:ring-2 focus-within:ring-steel/25">
                <LockKeyhole className="h-4 w-4 text-ink/45" />
                <input
                  className="h-full w-full bg-transparent outline-none"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  type="password"
                  value={password}
                />
              </span>
            </label>

            {error && <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

            <Button className="mt-1 h-11 w-full" disabled={loading} type="submit">
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta e entrar"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <button className="text-ink/60 hover:text-ink" type="button">
              Recuperar senha
            </button>
            <button
              className="font-medium text-steel hover:text-ink"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              type="button"
            >
              {mode === "login" ? "Ainda sem conta?" : "Ja tem conta?"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
