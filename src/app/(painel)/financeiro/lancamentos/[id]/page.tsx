import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, Cabecalho, Selo } from "@/components/ui";
import { baixar, cancelar, estornar, excluirLancamento } from "@/features/financeiro/actions";
import { type Natureza, rotaDaNatureza, TEXTOS } from "@/features/financeiro/natureza";
import { diasEmAtraso, statusDoTitulo } from "@/lib/calculations/titulos";
import { exigirEmpresa, PODE_BAIXAR, PODE_LANCAR } from "@/lib/sessao";
import { dataBr, dinheiro, hojeIso, primeiro, valor } from "@/lib/utils";

export const metadata: Metadata = { title: "Lançamento" };

type Baixa = {
  id: string;
  data: string;
  valor: number;
  conta: { nome: string } | { nome: string }[] | null;
  forma: { nome: string } | { nome: string }[] | null;
  estorno: { motivo: string; created_at: string } | { motivo: string; created_at: string }[] | null;
};

export default async function LancamentoPage({ params, searchParams }: PageProps<"/financeiro/lancamentos/[id]">) {
  const [{ id }, busca] = await Promise.all([params, searchParams]);
  const { supabase, empresa, papel } = await exigirEmpresa();
  const hoje = hojeIso();

  const [{ data: titulo }, { data: baixasBrutas }, { data: contas }, { data: formas }] = await Promise.all([
    supabase.from("titulos").select("*").eq("id", id).eq("empresa_id", empresa.id).maybeSingle(),
    supabase
      .from("baixas")
      .select("id, data, valor, conta:contas_financeiras(nome), forma:formas_liquidacao(nome), estorno:estornos(motivo, created_at)")
      .eq("lancamento_id", id)
      .order("data"),
    supabase.from("contas_financeiras").select("id, nome").eq("empresa_id", empresa.id).eq("ativa", true).order("nome"),
    supabase.from("formas_liquidacao").select("id, nome").eq("empresa_id", empresa.id).eq("ativa", true).order("nome"),
  ]);
  if (!titulo) notFound();

  const natureza = titulo.natureza as Natureza;
  const textos = TEXTOS[natureza];
  const saldo = Number(titulo.saldo);
  const status = statusDoTitulo({ vencimento: titulo.vencimento, saldo, cancelado: Boolean(titulo.cancelado_em) }, hoje);
  const baixas = (baixasBrutas ?? []) as Baixa[];
  const ativas = baixas.filter((baixa) => !primeiro(baixa.estorno));
  const podeBaixar = PODE_BAIXAR.includes(papel) && titulo.situacao === "previsto";
  const podeEditar = PODE_LANCAR.includes(papel) && !titulo.cancelado_em;
  const podeCancelar = PODE_LANCAR.includes(papel) && !titulo.cancelado_em && ativas.length === 0;
  const podeExcluir = PODE_LANCAR.includes(papel) && baixas.length === 0;
  const atraso = status === "vencida" ? diasEmAtraso(titulo.vencimento, hoje) : 0;

  const ficha: [string, React.ReactNode][] = [
    [textos.pessoa, titulo.beneficiario ? `${titulo.pessoa_nome} · ${titulo.beneficiario}` : titulo.pessoa_nome],
    ["Documento", `${titulo.tipo_nome} nº ${titulo.numero_documento}`],
    ["Classificação", `${titulo.grupo_dre} › ${titulo.categoria_nome}`],
    ["Centro de custo", titulo.centro_nome ?? "—"],
    ["Competência", dataBr(titulo.competencia)],
    [
      "Vencimento",
      <span key="v" className={atraso ? "font-semibold text-vermelho" : ""}>
        {dataBr(titulo.vencimento)}
        {atraso ? ` · ${atraso} ${atraso === 1 ? "dia" : "dias"} em atraso` : ""}
      </span>,
    ],
    ["Observações", titulo.observacoes ?? "—"],
  ];

  return (
    <>
      <Link href={rotaDaNatureza(natureza)} className="link mb-3 inline-flex items-center gap-1">
        <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        {textos.titulo}
      </Link>
      <Cabecalho titulo={`${titulo.codigo} · ${titulo.pessoa_nome}`} descricao={titulo.descricao}>
        <Selo status={status} liquidadaComo={titulo.ultima_baixa ? `${textos.feito} ${dataBr(titulo.ultima_baixa)}` : undefined} />
        {podeEditar ? (
          <Link href={`/financeiro/lancamentos/${id}/editar`} className="botao-claro">
            <Pencil className="size-4" strokeWidth={1.75} aria-hidden />
            Editar
          </Link>
        ) : null}
      </Cabecalho>
      <Aviso busca={busca} />

      {titulo.cancelado_em ? (
        <p className="mb-5 rounded-[4px] border border-filete bg-folha px-4 py-2.5 text-tinta-2">
          Cancelado em {dataBr(titulo.cancelado_em)}. Motivo: {titulo.cancelado_motivo}
        </p>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <section className="folha">
            <dl className="fechamento grid grid-cols-3 border-b-0 text-center">
              {[
                ["Valor do título", valor(titulo.valor), ""],
                [textos.feito, valor(titulo.valor_baixado), "text-carimbo"],
                ["Saldo em aberto", valor(saldo), saldo > 0 && status === "vencida" ? "text-vermelho" : ""],
              ].map(([rotulo, numero, cor]) => (
                <div key={rotulo} className="border-filete px-4 py-4 not-first:border-l">
                  <dt className="rotulo">{rotulo} (R$)</dt>
                  <dd className={`mt-1 text-xl font-bold tabular-nums ${cor}`}>{numero}</dd>
                </div>
              ))}
            </dl>
            <dl className="grid gap-x-6 gap-y-3 border-t border-filete p-5 sm:grid-cols-[160px_1fr]">
              {ficha.map(([rotulo, conteudo]) => (
                <div key={rotulo} className="contents">
                  <dt className="rotulo pt-0.5">{rotulo}</dt>
                  <dd>{conteudo}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="folha overflow-x-auto">
            <h2 className="px-5 pt-4 pb-2 text-base font-bold">Baixas</h2>
            {baixas.length === 0 ? (
              <p className="px-5 pb-5 text-tinta-2">Nenhuma baixa registrada.</p>
            ) : (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Conta</th>
                    <th>Forma</th>
                    <th className="num">Valor (R$)</th>
                    <th>Situação</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {baixas.map((baixa) => {
                    const estorno = primeiro(baixa.estorno);
                    return (
                      <tr key={baixa.id} className={estorno ? "text-tinta-2" : ""}>
                        <td className="tabular-nums">{dataBr(baixa.data)}</td>
                        <td>{primeiro(baixa.conta)?.nome}</td>
                        <td>{primeiro(baixa.forma)?.nome ?? "—"}</td>
                        <td className={`num ${estorno ? "line-through" : ""}`}>{valor(baixa.valor)}</td>
                        <td>{estorno ? `Estornada: ${estorno.motivo}` : "Ativa"}</td>
                        <td className="text-right">
                          {!estorno && PODE_BAIXAR.includes(papel) ? (
                            <details className="inline-block text-left">
                              <summary className="link">Estornar</summary>
                              <form action={estornar} className="mt-2 flex w-72 gap-2">
                                <input type="hidden" name="lancamento_id" value={id} />
                                <input type="hidden" name="baixa_id" value={baixa.id} />
                                <input name="motivo" required placeholder="Motivo do estorno" aria-label="Motivo do estorno" className="entrada" />
                                <button type="submit" className="botao-perigo">
                                  Estornar
                                </button>
                              </form>
                            </details>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Total baixado</td>
                    <td className="num">{valor(titulo.valor_baixado)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}
          </section>
        </div>

        <aside className="grid gap-6">
          {podeBaixar ? (
            <form action={baixar} className="folha grid gap-4 p-5">
              <h2 className="text-base font-bold">
                {textos.verbo} {saldo < Number(titulo.valor) ? "o restante" : "este título"}
              </h2>
              <input type="hidden" name="lancamento_id" value={id} />
              <label className="campo">
                <span>{textos.data}</span>
                <input type="date" name="data" required defaultValue={hoje} className="entrada" />
              </label>
              <label className="campo">
                <span>Valor (R$)</span>
                <input name="valor" required inputMode="decimal" defaultValue={valor(saldo)} className="entrada text-right tabular-nums" />
                <small className="text-tinta-2">Valor menor que o saldo gera baixa parcial.</small>
              </label>
              <label className="campo">
                <span>Conta</span>
                <select name="conta_id" required defaultValue={titulo.conta_prevista_id ?? ""} className="entrada">
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
                <span>Forma</span>
                <select name="forma_id" defaultValue={titulo.forma_prevista_id ?? ""} className="entrada">
                  <option value="">—</option>
                  {(formas ?? []).map((forma) => (
                    <option key={forma.id} value={forma.id}>
                      {forma.nome}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="botao">
                Registrar baixa de {dinheiro(saldo)}
              </button>
            </form>
          ) : null}

          {podeCancelar || podeExcluir ? (
            <section className="folha grid gap-4 p-5">
              <h2 className="text-base font-bold">Desfazer</h2>
              {podeCancelar ? (
                <form action={cancelar} className="grid gap-2">
                  <input type="hidden" name="lancamento_id" value={id} />
                  <label className="campo">
                    <span>Motivo do cancelamento</span>
                    <input name="motivo" required className="entrada" />
                  </label>
                  <button type="submit" className="botao-perigo">
                    Cancelar lançamento
                  </button>
                  <small className="text-tinta-2">Cancelado continua no histórico, sem valor em aberto.</small>
                </form>
              ) : null}
              {podeExcluir ? (
                <form action={excluirLancamento} className="grid gap-2 border-t border-filete pt-4">
                  <input type="hidden" name="lancamento_id" value={id} />
                  <input type="hidden" name="natureza" value={natureza} />
                  <button type="submit" className="botao-perigo">
                    Excluir definitivamente
                  </button>
                  <small className="text-tinta-2">Só é possível porque nunca houve baixa. Use para lançamento digitado errado.</small>
                </form>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
