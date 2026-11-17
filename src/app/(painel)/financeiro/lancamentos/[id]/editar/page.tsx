import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Aviso, Cabecalho } from "@/components/ui";
import { carregarOpcoes } from "@/features/financeiro/consultas";
import { FormLancamento } from "@/features/financeiro/FormLancamento";
import type { Natureza } from "@/features/financeiro/natureza";
import { comAviso } from "@/lib/form";
import { exigirEmpresa, PODE_LANCAR } from "@/lib/sessao";
import { hojeIso } from "@/lib/utils";

export const metadata: Metadata = { title: "Editar lançamento" };

export default async function EditarLancamentoPage({ params, searchParams }: PageProps<"/financeiro/lancamentos/[id]/editar">) {
  const [{ id }, busca] = await Promise.all([params, searchParams]);
  const { supabase, empresa, papel } = await exigirEmpresa();
  if (!PODE_LANCAR.includes(papel)) redirect(comAviso(`/financeiro/lancamentos/${id}`, "erro", "Seu papel só permite consultar."));

  const [{ data: titulo }, { count }] = await Promise.all([
    supabase.from("titulos").select("*").eq("id", id).eq("empresa_id", empresa.id).maybeSingle(),
    supabase.from("baixas").select("id", { count: "exact", head: true }).eq("lancamento_id", id),
  ]);
  if (!titulo) notFound();
  if (titulo.cancelado_em) redirect(comAviso(`/financeiro/lancamentos/${id}`, "erro", "Lançamento cancelado não pode ser editado."));

  const natureza = titulo.natureza as Natureza;
  const opcoes = await carregarOpcoes(supabase, empresa.id, natureza);

  return (
    <div className="max-w-5xl">
      <Cabecalho titulo={`Editar ${titulo.codigo}`} descricao={titulo.descricao} />
      <Aviso busca={busca} />
      <FormLancamento
        natureza={natureza}
        opcoes={opcoes}
        hoje={hojeIso()}
        comBaixa={(count ?? 0) > 0}
        atual={{ ...titulo, valor: Number(titulo.valor) }}
      />
    </div>
  );
}
