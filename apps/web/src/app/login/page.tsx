import { LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-8 shadow-soft">
        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-ink text-sm font-bold text-white">
            IFC
          </div>
          <h1 className="text-2xl font-semibold text-ink">Entrar no Valida IFC</h1>
          <p className="mt-2 text-sm text-ink/65">
            Acesse projetos, criterios, auditorias e relatorios tecnicos.
          </p>
        </div>

        <form className="space-y-4">
          <label className="block text-sm font-medium">
            E-mail
            <span className="mt-2 flex items-center gap-2 rounded-md border border-line bg-white px-3">
              <Mail className="h-4 w-4 text-ink/45" />
              <input className="h-11 w-full outline-none" placeholder="auditor@empresa.com" type="email" />
            </span>
          </label>
          <label className="block text-sm font-medium">
            Senha
            <span className="mt-2 flex items-center gap-2 rounded-md border border-line bg-white px-3">
              <LockKeyhole className="h-4 w-4 text-ink/45" />
              <input className="h-11 w-full outline-none" placeholder="••••••••" type="password" />
            </span>
          </label>
          <Button className="w-full" type="button">
            Entrar
          </Button>
        </form>

        <div className="mt-6 flex justify-between text-sm text-ink/65">
          <Link href="/login">Recuperar senha</Link>
          <Link href="/dashboard">Criar conta</Link>
        </div>
      </section>
    </main>
  );
}
