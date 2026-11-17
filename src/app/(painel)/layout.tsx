import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Shell } from "@/components/layout/Shell";
import { lerSessao } from "@/lib/sessao";
import { supabasePublico } from "@/lib/supabase/env";

/** Sessão, cookies e Supabase: o painel não pode ser Instant/PPR estático. */
export const instant = false;

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  if (!supabasePublico()) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-bold">Falta configurar o Supabase</h1>
        <p className="mt-3 text-tinta-2">
          Copie <code>.env.example</code> para <code>.env.local</code>, preencha a URL e a chave publishable e aplique
          as migrations de <code>supabase/migrations</code>.
        </p>
      </main>
    );
  }
  return (
    <Suspense fallback={<PainelCarregando />}>
      <PainelComSessao>{children}</PainelComSessao>
    </Suspense>
  );
}

async function PainelComSessao({ children }: { children: React.ReactNode }) {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");
  return <Shell sessao={sessao}>{children}</Shell>;
}

function PainelCarregando() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]" aria-busy="true">
      <div className="bg-capa lg:h-screen" />
      <div className="px-6 pt-20">
        <p className="text-tinta-2">Abrindo o livro…</p>
      </div>
    </div>
  );
}
