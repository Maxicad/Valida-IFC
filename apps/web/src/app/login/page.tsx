"use client";

import { LockKeyhole, Mail, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiPost, setStoredToken } from "@/services/api";
import type { TokenResponse, User } from "@/types/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("Auditor BIM");
  const [email, setEmail] = useState("auditor@example.com");
  const [password, setPassword] = useState("secret123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <main className="flex min-h-screen items-center justify-center bg-surface px-5">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-8 shadow-soft">
        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-ink text-sm font-bold text-white">
            IFC
          </div>
          <h1 className="text-2xl font-semibold text-ink">
            {mode === "login" ? "Entrar no Valida IFC" : "Criar conta"}
          </h1>
          <p className="mt-2 text-sm text-ink/65">
            Acesse projetos, criterios, auditorias e relatorios tecnicos.
          </p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {mode === "register" && (
            <label className="block text-sm font-medium">
              Nome
              <span className="mt-2 flex items-center gap-2 rounded-md border border-line bg-white px-3">
                <UserPlus className="h-4 w-4 text-ink/45" />
                <input
                  className="h-11 w-full outline-none"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Auditor BIM"
                  type="text"
                  value={name}
                />
              </span>
            </label>
          )}
          <label className="block text-sm font-medium">
            E-mail
            <span className="mt-2 flex items-center gap-2 rounded-md border border-line bg-white px-3">
              <Mail className="h-4 w-4 text-ink/45" />
              <input
                className="h-11 w-full outline-none"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="auditor@empresa.com"
                type="email"
                value={email}
              />
            </span>
          </label>
          <label className="block text-sm font-medium">
            Senha
            <span className="mt-2 flex items-center gap-2 rounded-md border border-line bg-white px-3">
              <LockKeyhole className="h-4 w-4 text-ink/45" />
              <input
                className="h-11 w-full outline-none"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                value={password}
              />
            </span>
          </label>
          {error && <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "Aguarde" : mode === "login" ? "Entrar" : "Criar e entrar"}
          </Button>
        </form>

        <div className="mt-6 flex justify-between text-sm text-ink/65">
          <button type="button">Recuperar senha</button>
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            type="button"
          >
            {mode === "login" ? "Criar conta" : "Ja tenho conta"}
          </button>
        </div>
      </section>
    </main>
  );
}
