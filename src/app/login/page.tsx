import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { entrar } from "@/features/acesso/actions";

export const metadata: Metadata = { title: "Entrar" };

const ERROS: Record<string, string> = {
  credencial: "E-mail ou senha não conferem. Confira e tente de novo.",
  config: "O sistema ainda não está ligado ao Supabase. Avise o administrador.",
};

async function MensagemErro({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { erro } = await searchParams;
  if (typeof erro !== "string") return null;
  return (
    <p role="alert" className="mt-5 rounded-[4px] border border-[#e3b4b0] bg-vermelho-fundo px-4 py-2.5 text-vermelho">
      {ERROS[erro] ?? ERROS.credencial}
    </p>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_480px]">
      <section className="hidden flex-col justify-between bg-capa p-12 text-capa-tinta lg:flex">
        <div className="flex items-center gap-3">
          <BookOpen className="size-7" strokeWidth={1.5} aria-hidden />
          <p className="text-lg font-bold text-white">BC Consultores</p>
        </div>
        <div className="max-w-md">
          <p className="text-3xl leading-snug font-bold text-white">O livro-caixa de cada empresa cliente, num só lugar.</p>
          <p className="mt-4 text-capa-tinta-2">Contas a pagar e a receber, tesouraria, transferências e saldos por conta.</p>
        </div>
        <p className="text-sm text-capa-tinta-2">BPO Financeiro</p>
      </section>

      <section className="grid content-center bg-papel px-8 py-16">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-[1.625rem] font-bold">Entrar no BPO Financeiro</h1>
          <p className="mt-1 text-tinta-2">Contas novas são criadas por um administrador.</p>
          <Suspense fallback={null}>
            <MensagemErro searchParams={searchParams} />
          </Suspense>
          <form action={entrar} className="fechamento mt-6 grid gap-4 border-t-2 border-tinta pt-6 pb-6">
            <label className="campo">
              <span>E-mail</span>
              <input name="email" type="email" autoComplete="username" required className="entrada" />
            </label>
            <label className="campo">
              <span>Senha</span>
              <input name="senha" type="password" autoComplete="current-password" required minLength={6} className="entrada" />
            </label>
            <button type="submit" className="botao mt-2">
              Entrar
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
