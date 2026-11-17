import type { Metadata } from "next";
import { Aviso, Cabecalho } from "@/components/ui";
import { criarCentroCusto, criarConta, criarForma } from "@/features/cadastros/actions";
import { AlternarAtivo, Campo, FormLateral, Inativo } from "@/features/cadastros/componentes";
import { exigirEmpresa, nomeEmpresa, PODE_BAIXAR, PODE_LANCAR } from "@/lib/sessao";
import { dataBr, hojeIso, valor } from "@/lib/utils";

export const metadata: Metadata = { title: "Contas e formas" };

function ListaSimples({
  titulo,
  tabela,
  itens,
  pode,
  action,
  botao,
}: {
  titulo: string;
  tabela: string;
  itens: { id: string; nome: string; ativo: boolean }[];
  pode: boolean;
  action: (formData: FormData) => Promise<void>;
  botao: string;
}) {
  return (
    <section className="folha">
      <h2 className="px-5 pt-4 pb-2 text-base font-bold">{titulo}</h2>
      <table className="tabela">
        <tbody>
          {itens.map((item) => (
            <tr key={item.id} className={item.ativo ? "" : "text-tinta-2"}>
              <td>
                {item.nome}
                {item.ativo ? null : <Inativo />}
              </td>
              <td className="text-right">{pode ? <AlternarAtivo tabela={tabela} id={item.id} ativo={item.ativo} /> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pode ? (
        <form action={action} className="flex items-end gap-2 p-4">
          <Campo rotulo="Nome" name="nome" required className="flex-1" />
          <button type="submit" className="botao-claro">
            {botao}
          </button>
        </form>
      ) : null}
    </section>
  );
}

export default async function ContasPage({ searchParams }: PageProps<"/cadastros/contas">) {
  const busca = await searchParams;
  const { supabase, empresa, papel } = await exigirEmpresa();
  const hoje = hojeIso();
  const [{ data: contas }, { data: saldos }, { data: centros }, { data: formas }] = await Promise.all([
    supabase
      .from("contas_financeiras")
      .select("id, nome, banco, agencia, numero, tipo, saldo_inicial, data_saldo_inicial, ativa")
      .eq("empresa_id", empresa.id)
      .order("ativa", { ascending: false })
      .order("nome"),
    supabase.rpc("saldos_contas", { p_empresa: empresa.id, p_ate: hoje }),
    supabase.from("centros_custos").select("id, nome, ativo").eq("empresa_id", empresa.id).order("nome"),
    supabase.from("formas_liquidacao").select("id, nome, ativa").eq("empresa_id", empresa.id).order("nome"),
  ]);
  const saldoPorConta = new Map(((saldos ?? []) as { id: string; saldo: number }[]).map((item) => [item.id, Number(item.saldo)]));
  const total = [...saldoPorConta.values()].reduce((soma, item) => soma + item, 0);
  const podeConta = PODE_BAIXAR.includes(papel);
  const pode = PODE_LANCAR.includes(papel);

  return (
    <>
      <Cabecalho titulo="Contas e formas" descricao={`${nomeEmpresa(empresa)} · contas bancárias e caixa, centros de custo e formas de liquidação.`} />
      <Aviso busca={busca} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="folha overflow-x-auto">
          <h2 className="px-5 pt-4 pb-2 text-base font-bold">Contas financeiras</h2>
          <table className="tabela min-w-[720px]">
            <thead>
              <tr>
                <th>Conta</th>
                <th>Banco · agência · número</th>
                <th>Saldo inicial</th>
                <th className="num">Saldo hoje (R$)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(contas ?? []).map((conta) => {
                const saldo = saldoPorConta.get(conta.id) ?? 0;
                return (
                  <tr key={conta.id} className={conta.ativa ? "" : "text-tinta-2"}>
                    <td className="font-medium">
                      {conta.nome}
                      <span className="ml-1 text-xs text-tinta-2">{conta.tipo}</span>
                      {conta.ativa ? null : <Inativo />}
                    </td>
                    <td>{[conta.banco, conta.agencia, conta.numero].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="tabular-nums">
                      {valor(conta.saldo_inicial)} <span className="text-xs text-tinta-2">em {dataBr(conta.data_saldo_inicial)}</span>
                    </td>
                    <td className={`num font-semibold ${saldo < 0 ? "negativo" : ""}`}>{valor(saldo)}</td>
                    <td className="text-right">
                      {podeConta ? <AlternarAtivo tabela="contas_financeiras" id={conta.id} ativo={conta.ativa} /> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total</td>
                <td className={`num ${total < 0 ? "negativo" : ""}`}>{valor(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        {podeConta ? (
          <FormLateral titulo="Nova conta" action={criarConta} botao="Cadastrar conta">
            <Campo rotulo="Nome" name="nome" required placeholder="Ex.: Itaú movimento" />
            <label className="campo">
              <span>Tipo</span>
              <select name="tipo" defaultValue="corrente" className="entrada">
                <option value="corrente">Conta corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="aplicacao">Aplicação</option>
                <option value="caixa">Caixa</option>
                <option value="cartao">Cartão</option>
              </select>
            </label>
            <Campo rotulo="Banco" name="banco" />
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Agência" name="agencia" />
              <Campo rotulo="Número" name="numero" />
            </div>
            <Campo rotulo="Saldo inicial (R$)" name="saldo_inicial" inputMode="decimal" placeholder="0,00" />
            <Campo rotulo="Data do saldo" name="data_saldo_inicial" type="date" required defaultValue={hoje} />
          </FormLateral>
        ) : null}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <ListaSimples
          titulo="Centros de custo"
          tabela="centros_custos"
          itens={(centros ?? []).map((item) => ({ id: item.id, nome: item.nome, ativo: item.ativo }))}
          pode={pode}
          action={criarCentroCusto}
          botao="Adicionar"
        />
        <ListaSimples
          titulo="Formas de liquidação"
          tabela="formas_liquidacao"
          itens={(formas ?? []).map((item) => ({ id: item.id, nome: item.nome, ativo: item.ativa }))}
          pode={pode}
          action={criarForma}
          botao="Adicionar"
        />
      </div>
    </>
  );
}
