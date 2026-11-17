import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, Cabecalho, Vazio } from "@/components/ui";
import { excluirTransferencia, transferir } from "@/features/financeiro/actions";
import { exigirEmpresa, nomeEmpresa, PODE_BAIXAR } from "@/lib/sessao";
import { dataBr, hojeIso, primeiro, valor } from "@/lib/utils";

export const metadata: Metadata = { title: "Transferências" };

type Transferencia = {
  id: string;
  data: string;
  valor: number;
  descricao: string;
  observacao: string | null;
  origem: { nome: string } | { nome: string }[] | null;
  destino: { nome: string } | { nome: string }[] | null;
};

export default async function TransferenciasPage({ searchParams }: PageProps<"/financeiro/transferencias">) {
  const busca = await searchParams;
  const { supabase, empresa, papel } = await exigirEmpresa();
  const pode = PODE_BAIXAR.includes(papel);

  const [{ data: contas }, { data }] = await Promise.all([
    supabase.from("contas_financeiras").select("id, nome").eq("empresa_id", empresa.id).eq("ativa", true).order("nome"),
    supabase
      .from("transferencias")
      .select(
        "id, data, valor, descricao, observacao, origem:contas_financeiras!transferencias_conta_origem_id_fkey(nome), destino:contas_financeiras!transferencias_conta_destino_id_fkey(nome)",
      )
      .eq("empresa_id", empresa.id)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const transferencias = (data ?? []) as Transferencia[];
  const total = transferencias.reduce((soma, item) => soma + Number(item.valor), 0);
  const poucasContas = (contas ?? []).length < 2;

  return (
    <>
      <Cabecalho
        titulo="Transferências"
        descricao={`${nomeEmpresa(empresa)} · movimentação entre contas da própria empresa. Não entra em receitas nem despesas.`}
      />
      <Aviso busca={busca} />

      {pode ? (
        poucasContas ? (
          <p className="folha mb-6 px-5 py-4 text-tinta-2">
            É preciso ter ao menos duas contas ativas.{" "}
            <Link href="/cadastros/contas" className="link">
              Cadastrar conta
            </Link>
          </p>
        ) : (
          <form action={transferir} className="folha mb-6 grid items-end gap-4 p-5 md:grid-cols-[1fr_auto_1fr_10rem_10rem]">
            <label className="campo">
              <span>Sai da conta</span>
              <select name="conta_origem_id" required defaultValue="" className="entrada">
                <option value="" disabled>
                  Escolha…
                </option>
                {(contas ?? []).map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.nome}
                  </option>
                ))}
              </select>
            </label>
            <ArrowRight className="mb-2 hidden size-5 text-tinta-2 md:block" strokeWidth={1.75} aria-hidden />
            <label className="campo">
              <span>Entra na conta</span>
              <select name="conta_destino_id" required defaultValue="" className="entrada">
                <option value="" disabled>
                  Escolha…
                </option>
                {(contas ?? []).map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Data</span>
              <input type="date" name="data" required defaultValue={hojeIso()} className="entrada" />
            </label>
            <label className="campo">
              <span>Valor (R$)</span>
              <input name="valor" required inputMode="decimal" placeholder="0,00" className="entrada text-right tabular-nums" />
            </label>
            <label className="campo md:col-span-3">
              <span>Descrição</span>
              <input name="descricao" placeholder="Transferência entre contas" className="entrada" />
            </label>
            <label className="campo">
              <span>Observação</span>
              <input name="observacao" className="entrada" />
            </label>
            <button type="submit" className="botao">
              Registrar transferência
            </button>
          </form>
        )
      ) : null}

      <div className="folha overflow-x-auto">
        {transferencias.length === 0 ? (
          <Vazio titulo="Nenhuma transferência registrada." />
        ) : (
          <table className="tabela min-w-[760px]">
            <thead>
              <tr>
                <th>Data</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Descrição</th>
                <th className="num">Valor (R$)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {transferencias.map((item) => (
                <tr key={item.id}>
                  <td className="tabular-nums">{dataBr(item.data)}</td>
                  <td>{primeiro(item.origem)?.nome}</td>
                  <td>{primeiro(item.destino)?.nome}</td>
                  <td>
                    {item.descricao}
                    {item.observacao ? <span className="block text-xs text-tinta-2">{item.observacao}</span> : null}
                  </td>
                  <td className="num font-semibold">{valor(item.valor)}</td>
                  <td className="text-right">
                    {pode ? (
                      <form action={excluirTransferencia}>
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className="link text-vermelho">
                          Excluir
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total · {transferencias.length} transferências</td>
                <td className="num">{valor(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  );
}
