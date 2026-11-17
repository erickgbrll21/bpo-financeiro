import Link from "next/link";
import { redirect } from "next/navigation";
import { Aviso, type Busca, Cabecalho, param } from "@/components/ui";
import { comAviso } from "@/lib/form";
import { exigirEmpresa, nomeEmpresa, PODE_LANCAR } from "@/lib/sessao";
import { hojeIso } from "@/lib/utils";
import { carregarOpcoes } from "./consultas";
import { FormLancamento } from "./FormLancamento";
import { type Natureza, rotaDaNatureza, TEXTOS } from "./natureza";

export async function PaginaNovo({ natureza, busca }: { natureza: Natureza; busca: Busca }) {
  const { supabase, empresa, papel } = await exigirEmpresa();
  if (!PODE_LANCAR.includes(papel)) {
    redirect(comAviso(rotaDaNatureza(natureza), "erro", "Seu papel nesta empresa só permite consultar."));
  }
  const opcoes = await carregarOpcoes(supabase, empresa.id, natureza);
  const ultimo = param(busca, "ultimo");

  return (
    <div className="max-w-5xl">
      <Cabecalho
        titulo={TEXTOS[natureza].novo}
        descricao={`${nomeEmpresa(empresa)}. O número ${natureza === "pagar" ? "P" : "R"}000000 é gerado ao gravar.`}
      />
      <Aviso busca={busca} />
      {ultimo && param(busca, "ok") ? (
        <p className="-mt-3 mb-5 text-tinta-2">
          <Link href={`/financeiro/lancamentos/${ultimo}`} className="link">
            Abrir o lançamento gravado
          </Link>{" "}
          ou continue lançando abaixo.
        </p>
      ) : null}
      <FormLancamento key={ultimo || "novo"} natureza={natureza} opcoes={opcoes} hoje={hojeIso()} />
    </div>
  );
}
