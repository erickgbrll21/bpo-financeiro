import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, Cabecalho, param, Selo, Vazio } from "@/components/ui";
import { baixarEmLote, localizarTitulo } from "@/features/financeiro/actions";
import { lerFiltros, listarTitulos } from "@/features/financeiro/consultas";
import { type Natureza, TEXTOS } from "@/features/financeiro/natureza";
import { SomaMarcados } from "@/features/financeiro/SomaMarcados";
import { diasEmAtraso, somarDias } from "@/lib/calculations/titulos";
import { exigirEmpresa, nomeEmpresa, PODE_BAIXAR } from "@/lib/sessao";
import { dataBr, hojeIso, primeiro, valor } from "@/lib/utils";

export const metadata: Metadata = { title: "Tesouraria" };

type BaixaRecente = {
  id: string;
  data: string;
  valor: number;
  lancamento: { id: string; numero: number; natureza: Natureza; descricao: string } | { id: string; numero: number; natureza: Natureza; descricao: string }[] | null;
  conta: { nome: string } | { nome: string }[] | null;
  estorno: { id: string } | { id: string }[] | null;
};

export default async function TesourariaPage({ searchParams }: PageProps<"/financeiro/tesouraria">) {
  const busca = await searchParams;
  const { supabase, empresa, papel } = await exigirEmpresa();
  const hoje = hojeIso();
  const natureza: Natureza = param(busca, "natureza") === "receber" ? "receber" : "pagar";
  const textos = TEXTOS[natureza];
  const ate = /^\d{4}-\d{2}-\d{2}$/.test(param(busca, "ate")) ? param(busca, "ate") : somarDias(hoje, 7);
  const filtros = { ...lerFiltros({}), ate };
  const podeBaixar = PODE_BAIXAR.includes(papel);

  const [lista, { data: contas }, { data: formas }, { data: recentes }] = await Promise.all([
    listarTitulos(supabase, empresa.id, natureza, filtros, hoje),
    supabase.from("contas_financeiras").select("id, nome").eq("empresa_id", empresa.id).eq("ativa", true).order("nome"),
    supabase.from("formas_liquidacao").select("id, nome").eq("empresa_id", empresa.id).eq("ativa", true).order("nome"),
    supabase
      .from("baixas")
      .select("id, data, valor, lancamento:lancamentos!inner(id, numero, natureza, descricao), conta:contas_financeiras(nome), estorno:estornos(id)")
      .eq("empresa_id", empresa.id)
      .eq("lancamento.natureza", natureza)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const totalSaldo = lista.titulos.reduce((soma, titulo) => soma + titulo.saldo, 0);
  const prefixo = natureza === "pagar" ? "P" : "R";

  return (
    <>
      <Cabecalho
        titulo="Tesouraria"
        descricao={`${nomeEmpresa(empresa)} · marque os títulos ${natureza === "pagar" ? "pagos" : "recebidos"} e dê baixa de uma vez, pelo saldo de cada um.`}
      >
        <nav aria-label="Natureza" className="segmentos">
          <Link href="/financeiro/tesouraria" aria-current={natureza === "pagar" ? "page" : undefined}>
            A pagar
          </Link>
          <Link href="/financeiro/tesouraria?natureza=receber" aria-current={natureza === "receber" ? "page" : undefined}>
            A receber
          </Link>
        </nav>
      </Cabecalho>
      <Aviso busca={busca} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form action={baixarEmLote} className="folha min-w-0">
          <input type="hidden" name="natureza" value={natureza} />
          <div className="flex flex-wrap items-end gap-3 border-b border-filete p-4">
            <label className="campo w-44">
              <span>{textos.data}</span>
              <input type="date" name="data" required defaultValue={hoje} className="entrada" disabled={!podeBaixar} />
            </label>
            <label className="campo w-56">
              <span>Conta</span>
              <select name="conta_id" required defaultValue="" className="entrada" disabled={!podeBaixar}>
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
            <label className="campo w-48">
              <span>Forma</span>
              <select name="forma_id" defaultValue="" className="entrada" disabled={!podeBaixar}>
                <option value="">—</option>
                {(formas ?? []).map((forma) => (
                  <option key={forma.id} value={forma.id}>
                    {forma.nome}
                  </option>
                ))}
              </select>
            </label>
            <div className="ml-auto">
              {podeBaixar ? (
                <SomaMarcados verbo={`Baixar`} />
              ) : (
                <p className="text-tinta-2">Seu papel não permite dar baixa.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-tinta-2">
            <p>
              Em aberto com vencimento até <strong className="text-tinta">{dataBr(ate)}</strong>, incluindo vencidos.
            </p>
            <p className="flex gap-3">
              {[
                ["Hoje", hoje],
                ["7 dias", somarDias(hoje, 7)],
                ["30 dias", somarDias(hoje, 30)],
              ].map(([rotulo, data]) => (
                <Link
                  key={rotulo}
                  href={`/financeiro/tesouraria?${new URLSearchParams({ ...(natureza === "receber" ? { natureza } : {}), ate: data })}`}
                  className={data === ate ? "font-semibold text-tinta" : "link"}
                  aria-current={data === ate ? "true" : undefined}
                >
                  {rotulo}
                </Link>
              ))}
            </p>
          </div>

          <div className="overflow-x-auto">
            {lista.titulos.length === 0 ? (
              <Vazio titulo="Nada a baixar neste período.">
                <p>Amplie o período acima ou confira os filtros em {textos.titulo.toLowerCase()}.</p>
              </Vazio>
            ) : (
              <table className="tabela min-w-[860px]">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input type="checkbox" data-todos aria-label="Marcar todos" disabled={!podeBaixar} className="size-4 accent-[var(--carimbo)]" />
                    </th>
                    <th>Nº</th>
                    <th>Vencimento</th>
                    <th>{textos.pessoa}</th>
                    <th>Classificação</th>
                    <th className="num">Saldo (R$)</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.titulos.map((titulo) => {
                    const atraso = titulo.status === "vencida" ? diasEmAtraso(titulo.vencimento, hoje) : 0;
                    return (
                      <tr key={titulo.id}>
                        <td>
                          <input
                            type="checkbox"
                            name="ids"
                            value={titulo.id}
                            data-saldo={titulo.saldo}
                            disabled={!podeBaixar}
                            aria-label={`Marcar ${titulo.codigo}`}
                            className="size-4 accent-[var(--carimbo)]"
                          />
                        </td>
                        <td>
                          <Link href={`/financeiro/lancamentos/${titulo.id}`} className="link tabular-nums">
                            {titulo.codigo}
                          </Link>
                        </td>
                        <td className={`tabular-nums ${atraso ? "font-semibold text-vermelho" : ""}`}>
                          {dataBr(titulo.vencimento)}
                          {atraso ? <span className="ml-1 text-xs">({atraso}d)</span> : null}
                        </td>
                        <td className="max-w-64">
                          <p className="truncate font-medium">{titulo.pessoa_nome}</p>
                          <p className="truncate text-xs text-tinta-2">{titulo.descricao}</p>
                        </td>
                        <td className="max-w-52 truncate">{titulo.categoria_nome}</td>
                        <td className="num font-semibold">{valor(titulo.saldo)}</td>
                        <td>
                          <Selo status={titulo.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}>Total em aberto no período · {lista.titulos.length} títulos</td>
                    <td className="num">{valor(totalSaldo)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </form>

        <aside className="grid gap-6">
          <form action={localizarTitulo} className="folha grid gap-3 p-5">
            <h2 className="text-base font-bold">Estornar ou consultar</h2>
            <input type="hidden" name="voltar" value={`/financeiro/tesouraria${natureza === "receber" ? "?natureza=receber" : ""}`} />
            <label className="campo">
              <span>Nº do lançamento</span>
              <input name="codigo" required placeholder={`${prefixo}000125`} className="entrada uppercase tabular-nums" />
            </label>
            <button type="submit" className="botao-claro">
              Abrir lançamento
            </button>
            <p className="text-tinta-2">O estorno fica na ficha do lançamento, com o motivo registrado.</p>
          </form>

          <section className="folha">
            <h2 className="px-5 pt-4 pb-2 text-base font-bold">Últimas baixas</h2>
            {(recentes ?? []).length === 0 ? (
              <p className="px-5 pb-5 text-tinta-2">Nenhuma baixa ainda.</p>
            ) : (
              <ul>
                {((recentes ?? []) as BaixaRecente[]).map((baixa) => {
                  const lancamento = primeiro(baixa.lancamento);
                  const estornada = Boolean(primeiro(baixa.estorno));
                  return (
                    <li key={baixa.id} className="flex items-baseline justify-between gap-3 border-t border-filete px-5 py-2">
                      <span className="min-w-0">
                        {lancamento ? (
                          <Link href={`/financeiro/lancamentos/${lancamento.id}`} className="link tabular-nums">
                            {prefixo}
                            {String(lancamento.numero).padStart(6, "0")}
                          </Link>
                        ) : null}
                        <span className="ml-2 text-xs text-tinta-2">
                          {dataBr(baixa.data)} · {primeiro(baixa.conta)?.nome}
                        </span>
                      </span>
                      <span className={`tabular-nums ${estornada ? "text-tinta-2 line-through" : "font-semibold"}`}>
                        {valor(baixa.valor)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
