import { Plus, Search, Wallet } from "lucide-react";
import Link from "next/link";
import { Aviso, type Busca, Cabecalho, Resumo, Selo, Vazio } from "@/components/ui";
import { diasEmAtraso } from "@/lib/calculations/titulos";
import { exigirEmpresa, nomeEmpresa, PODE_LANCAR } from "@/lib/sessao";
import { dataBr, dinheiro, hojeIso, valor } from "@/lib/utils";
import { carregarOpcoes, FILTROS_STATUS, lerFiltros, listarTitulos, porGrupo, resumoEmAberto } from "./consultas";
import { type Natureza, rotaDaNatureza, TEXTOS } from "./natureza";

export async function PaginaTitulos({ natureza, busca }: { natureza: Natureza; busca: Busca }) {
  const { supabase, empresa, papel } = await exigirEmpresa();
  const hoje = hojeIso();
  const filtros = lerFiltros(busca);
  const textos = TEXTOS[natureza];
  const rota = rotaDaNatureza(natureza);

  const [lista, resumo, opcoes] = await Promise.all([
    listarTitulos(supabase, empresa.id, natureza, filtros, hoje),
    resumoEmAberto(supabase, empresa.id, natureza, hoje),
    carregarOpcoes(supabase, empresa.id, natureza),
  ]);

  const totalValor = lista.titulos.reduce((soma, titulo) => soma + titulo.valor, 0);
  const totalSaldo = lista.titulos.reduce((soma, titulo) => soma + titulo.saldo, 0);

  const linkStatus = (status: string) => {
    const params = new URLSearchParams();
    for (const [chave, valorFiltro] of Object.entries({ ...filtros, status })) {
      if (valorFiltro && !(chave === "status" && valorFiltro === "abertos")) params.set(chave, valorFiltro);
    }
    const consulta = params.toString();
    return consulta ? `${rota}?${consulta}` : rota;
  };

  return (
    <>
      <Cabecalho titulo={textos.titulo} descricao={`${nomeEmpresa(empresa)} · títulos ordenados por vencimento.`}>
        <Link href={`/financeiro/tesouraria?natureza=${natureza}`} className="botao-claro">
          <Wallet className="size-4" strokeWidth={1.75} aria-hidden />
          Baixar em lote
        </Link>
        {PODE_LANCAR.includes(papel) ? (
          <Link href={`${rota}/novo`} className="botao">
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            {textos.novo}
          </Link>
        ) : null}
      </Cabecalho>

      <Aviso busca={busca} />

      <Resumo
        itens={[
          {
            rotulo: "Vencido",
            valor: dinheiro(resumo.vencido),
            detalhe: `${resumo.qtdVencido} ${resumo.qtdVencido === 1 ? "título" : "títulos"}`,
            tom: resumo.vencido > 0 ? "vermelho" : undefined,
          },
          {
            rotulo: "Vence em 7 dias",
            valor: dinheiro(resumo.semana),
            detalhe: `${resumo.qtdSemana} ${resumo.qtdSemana === 1 ? "título" : "títulos"}`,
            tom: resumo.semana > 0 ? "ambar" : undefined,
          },
          { rotulo: "Total em aberto", valor: dinheiro(resumo.aberto), detalhe: `${resumo.qtdAberto} títulos` },
          { rotulo: "Saldo desta lista", valor: dinheiro(totalSaldo), detalhe: `${lista.total} no filtro` },
        ]}
      />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <nav aria-label="Situação" className="segmentos">
          {FILTROS_STATUS.map((item) => (
            <Link
              key={item.id}
              href={linkStatus(item.id)}
              aria-current={filtros.status === item.id ? "page" : undefined}
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>
      </div>

      <form method="get" action={rota} className="mb-4 flex flex-wrap items-end gap-3">
        {filtros.status !== "abertos" ? <input type="hidden" name="status" value={filtros.status} /> : null}
        <label className="campo w-36">
          <span>Vencimento de</span>
          <input type="date" name="de" defaultValue={filtros.de} className="entrada" />
        </label>
        <label className="campo w-36">
          <span>até</span>
          <input type="date" name="ate" defaultValue={filtros.ate} className="entrada" />
        </label>
        <label className="campo w-52">
          <span>{textos.pessoa}</span>
          <select name="pessoa" defaultValue={filtros.pessoa} className="entrada">
            <option value="">Todos</option>
            {opcoes.pessoas.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="campo w-52">
          <span>Classificação</span>
          <select name="categoria" defaultValue={filtros.categoria} className="entrada">
            <option value="">Todas</option>
            {porGrupo(opcoes.categorias).map(([grupo, itens]) => (
              <optgroup key={grupo} label={grupo}>
                {itens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="campo min-w-48 flex-1">
          <span>Buscar</span>
          <input
            type="search"
            name="busca"
            defaultValue={filtros.busca}
            placeholder="Nº, documento, descrição ou nome"
            className="entrada"
          />
        </label>
        <button type="submit" className="botao-claro">
          <Search className="size-4" strokeWidth={1.75} aria-hidden />
          Filtrar
        </button>
        {filtros.de || filtros.ate || filtros.pessoa || filtros.categoria || filtros.busca ? (
          <Link href={linkStatus(filtros.status).split("?")[0]} className="link py-2">
            Limpar filtros
          </Link>
        ) : null}
      </form>

      <div className="folha overflow-x-auto">
        {lista.titulos.length === 0 ? (
          <Vazio titulo="Nenhum título neste filtro.">
            {filtros.status === "abertos" ? (
              PODE_LANCAR.includes(papel) ? (
                <p>
                  Nada em aberto.{" "}
                  <Link href={`${rota}/novo`} className="link">
                    Lançar {natureza === "pagar" ? "uma conta a pagar" : "uma conta a receber"}
                  </Link>
                </p>
              ) : (
                <p>Nada em aberto para esta empresa.</p>
              )
            ) : (
              <p>Troque a situação ou limpe os filtros para ver outros títulos.</p>
            )}
          </Vazio>
        ) : (
          <table className="tabela min-w-[960px]">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Vencimento</th>
                <th>{textos.pessoa}</th>
                <th>Documento</th>
                <th>Classificação</th>
                <th className="num">Valor (R$)</th>
                <th className="num">Saldo (R$)</th>
                <th>Situação</th>
                <th className="num">Atraso</th>
              </tr>
            </thead>
            <tbody>
              {lista.titulos.map((titulo) => {
                const atraso = titulo.status === "vencida" ? diasEmAtraso(titulo.vencimento, hoje) : 0;
                return (
                  <tr key={titulo.id}>
                    <td>
                      <Link href={`/financeiro/lancamentos/${titulo.id}`} className="link tabular-nums">
                        {titulo.codigo}
                      </Link>
                    </td>
                    <td className={`tabular-nums ${titulo.status === "vencida" ? "font-semibold text-vermelho" : ""}`}>
                      {dataBr(titulo.vencimento)}
                    </td>
                    <td className="max-w-60">
                      <p className="truncate font-medium">{titulo.pessoa_nome}</p>
                      <p className="truncate text-xs text-tinta-2">
                        {titulo.beneficiario ? `${titulo.beneficiario} · ` : ""}
                        {titulo.descricao}
                      </p>
                    </td>
                    <td className="max-w-32">
                      <p className="truncate tabular-nums">{titulo.numero_documento}</p>
                      <p className="truncate text-xs text-tinta-2">{titulo.tipo_nome}</p>
                    </td>
                    <td className="max-w-48">
                      <p className="truncate">{titulo.categoria_nome}</p>
                      <p className="truncate text-xs text-tinta-2">{titulo.grupo_dre}</p>
                    </td>
                    <td className="num">{valor(titulo.valor)}</td>
                    <td className="num font-semibold">{titulo.status === "cancelada" ? "—" : valor(titulo.saldo)}</td>
                    <td>
                      <Selo
                        status={titulo.status}
                        liquidadaComo={titulo.ultima_baixa ? `${textos.feito} ${dataBr(titulo.ultima_baixa).slice(0, 5)}` : undefined}
                      />
                    </td>
                    <td className={`num ${atraso ? "font-semibold text-vermelho" : "text-tinta-2"}`}>
                      {atraso ? `${atraso} ${atraso === 1 ? "dia" : "dias"}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>
                  Total · {lista.titulos.length} {lista.titulos.length === 1 ? "título" : "títulos"}
                  {lista.total > lista.limite ? (
                    <span className="ml-2 font-normal text-tinta-2">
                      (mostrando os primeiros {lista.limite} de {lista.total}; refine o filtro)
                    </span>
                  ) : null}
                </td>
                <td className="num">{valor(totalValor)}</td>
                <td className="num">{valor(totalSaldo)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  );
}
