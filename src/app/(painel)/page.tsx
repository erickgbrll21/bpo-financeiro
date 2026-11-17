import {
  ArrowDown,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Plus,
  Undo2,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecalho } from "@/components/ui";
import type { Natureza } from "@/features/financeiro/natureza";
import { GraficoFluxo, type PontoFluxo } from "@/features/painel/GraficoFluxo";
import { diasEmAtraso, fimDoMes, inicioDoMes, somarDias } from "@/lib/calculations/titulos";
import { lerSessao, nomeEmpresa, PODE_LANCAR } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import { dataBr, dinheiro, hojeIso, primeiro } from "@/lib/utils";

export const metadata: Metadata = { title: "Painel do dia" };

export default function PainelPage() {
  return (
    <Suspense fallback={<PainelEsqueleto />}>
      <PainelDoDia />
    </Suspense>
  );
}

function PainelEsqueleto() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Carregando painel">
      <div className="h-12 max-w-md animate-pulse rounded-lg bg-filete/70" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="cartao h-28 animate-pulse bg-filete/40" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="cartao h-80 animate-pulse bg-filete/40" />
        <div className="cartao h-80 animate-pulse bg-filete/40" />
      </div>
      <div className="cartao h-64 animate-pulse bg-filete/40" />
    </div>
  );
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type Um<T> = T | T[] | null;

type Aberto = {
  id: string;
  natureza: Natureza;
  codigo: string;
  pessoa_nome: string;
  descricao: string;
  vencimento: string;
  saldo: number;
};

type BaixaAno = { data: string; valor: number; lancamento: Um<{ natureza: Natureza }>; estorno: Um<{ id: string }> };

type BaixaRecente = {
  id: string;
  data: string;
  valor: number;
  created_at: string;
  conta: Um<{ nome: string }>;
  estorno: Um<{ id: string }>;
  lancamento: Um<{
    id: string;
    natureza: Natureza;
    numero: number;
    descricao: string;
    fornecedor: Um<{ nome: string }>;
    cliente: Um<{ nome: string }>;
  }>;
};

type TransferenciaRecente = {
  id: string;
  data: string;
  valor: number;
  descricao: string;
  created_at: string;
  origem: Um<{ nome: string }>;
  destino: Um<{ nome: string }>;
};

type Movimento = {
  id: string;
  tipo: "entrada" | "saida" | "transferencia";
  nome: string;
  detalhe: string;
  estornado: boolean;
  valor: number;
  data: string;
  criado: string;
  href?: string;
};

const TINTAS = ["bg-carimbo-fundo text-carimbo", "bg-[#e6f0ea] text-verde", "bg-ambar-fundo text-ambar", "bg-[#eef1ec] text-capa"];

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter((parte) => parte.length > 2 || /^[A-ZÀ-Ú]/.test(parte));
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

function tinta(nome: string) {
  let soma = 0;
  for (const letra of nome) soma += letra.charCodeAt(0);
  return TINTAS[soma % TINTAS.length];
}

function variacao(atual: number, anterior: number) {
  if (!anterior) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

function Variacao({ valor, sufixo }: { valor: number | null; sufixo: string }) {
  if (valor === null || !Number.isFinite(valor)) return <p className="text-[0.8125rem] text-tinta-2">Sem base no mês anterior</p>;
  const sobe = valor >= 0;
  const Icone = sobe ? ArrowUp : ArrowDown;
  return (
    <p className="flex items-center gap-1 text-[0.8125rem] text-tinta-2">
      <Icone className={`size-3.5 ${sobe ? "text-verde" : "text-vermelho"}`} strokeWidth={2.25} aria-hidden />
      <span className={`font-semibold tabular-nums ${sobe ? "text-verde" : "text-vermelho"}`}>
        {sobe ? "+" : ""}
        {valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
      </span>
      {sufixo}
    </p>
  );
}

function Indicador({ rotulo, valor, children }: { rotulo: string; valor: string; children: React.ReactNode }) {
  return (
    <div className="cartao grid content-start gap-1.5 p-5">
      <p className="font-medium text-tinta-2">{rotulo}</p>
      <p className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] tabular-nums">{valor}</p>
      {children}
    </div>
  );
}

async function PainelDoDia() {
  const sessao = await lerSessao();
  const empresa = sessao?.empresa;
  if (!sessao || !empresa) {
    return (
      <div className="max-w-xl">
        <Cabecalho titulo="Cadastre a primeira empresa" descricao="O painel mostra os dados da empresa cliente selecionada no topo." />
        <Link href="/cadastros/empresas" className="botao">
          Cadastrar empresa
        </Link>
      </div>
    );
  }

  const supabase = (await createClient())!;
  const hoje = hojeIso();
  const ano = hoje.slice(0, 4);
  const mesAtual = Number(hoje.slice(5, 7)) - 1;
  const fimMesAnterior = somarDias(inicioDoMes(hoje), -1);
  const inicioMesAnterior = inicioDoMes(fimMesAnterior);

  const [saldosHoje, saldosAntes, baixasAno, abertosRes, competencia, recentesRes, transferenciasRes] = await Promise.all([
    supabase.rpc("saldos_contas", { p_empresa: empresa.id, p_ate: hoje }),
    supabase.rpc("saldos_contas", { p_empresa: empresa.id, p_ate: fimMesAnterior }),
    supabase
      .from("baixas")
      .select("data, valor, lancamento:lancamentos!inner(natureza), estorno:estornos(id)")
      .eq("empresa_id", empresa.id)
      .gte("data", `${ano}-01-01`)
      .lte("data", hoje)
      .limit(20000),
    supabase
      .from("titulos")
      .select("id, natureza, codigo, pessoa_nome, descricao, vencimento, saldo")
      .eq("empresa_id", empresa.id)
      .eq("situacao", "previsto")
      .order("vencimento")
      .limit(10000),
    supabase
      .from("titulos")
      .select("natureza, valor, competencia")
      .eq("empresa_id", empresa.id)
      .neq("situacao", "cancelado")
      .gte("competencia", inicioMesAnterior)
      .lte("competencia", fimDoMes(hoje))
      .limit(20000),
    supabase
      .from("baixas")
      .select(
        "id, data, valor, created_at, conta:contas_financeiras(nome), estorno:estornos(id), lancamento:lancamentos(id, natureza, numero, descricao, fornecedor:fornecedores(nome), cliente:clientes(nome))",
      )
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("transferencias")
      .select(
        "id, data, valor, descricao, created_at, origem:contas_financeiras!transferencias_conta_origem_id_fkey(nome), destino:contas_financeiras!transferencias_conta_destino_id_fkey(nome)",
      )
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const somaSaldos = (linhas: unknown) => ((linhas ?? []) as { saldo: number }[]).reduce((soma, conta) => soma + Number(conta.saldo), 0);
  const caixa = somaSaldos(saldosHoje.data);
  const caixaAntes = somaSaldos(saldosAntes.data);

  const abertos = ((abertosRes.data ?? []) as Aberto[]).map((titulo) => ({ ...titulo, saldo: Number(titulo.saldo) }));
  const total = (natureza: Natureza, so?: "vencido") =>
    abertos
      .filter((titulo) => titulo.natureza === natureza && (so !== "vencido" || titulo.vencimento < hoje))
      .reduce((soma, titulo) => soma + titulo.saldo, 0);
  const receberAberto = total("receber");
  const receberVencido = total("receber", "vencido");
  const pagarAberto = total("pagar");
  const pagarVencido = total("pagar", "vencido");

  const resultado = (prefixo: string) =>
    (competencia.data ?? [])
      .filter((linha) => linha.competencia.startsWith(prefixo))
      .reduce((soma, linha) => soma + (linha.natureza === "receber" ? 1 : -1) * Number(linha.valor), 0);
  const resultadoMes = resultado(hoje.slice(0, 7));
  const resultadoAntes = resultado(fimMesAnterior.slice(0, 7));

  const fluxo: PontoFluxo[] = MESES.map((mes, indice) => ({ mes, entradas: 0, saidas: 0, liquido: 0, previsto: indice > mesAtual }));
  for (const baixa of (baixasAno.data ?? []) as BaixaAno[]) {
    if (primeiro(baixa.estorno)) continue;
    const ponto = fluxo[Number(baixa.data.slice(5, 7)) - 1];
    if (primeiro(baixa.lancamento)?.natureza === "receber") ponto.entradas += Number(baixa.valor);
    else ponto.saidas += Number(baixa.valor);
  }
  for (const titulo of abertos) {
    if (!titulo.vencimento.startsWith(ano)) continue;
    const indice = Number(titulo.vencimento.slice(5, 7)) - 1;
    if (indice <= mesAtual) continue;
    if (titulo.natureza === "receber") fluxo[indice].entradas += titulo.saldo;
    else fluxo[indice].saidas += titulo.saldo;
  }
  for (const ponto of fluxo) ponto.liquido = ponto.entradas - ponto.saidas;
  const entradasAno = fluxo.filter((ponto) => !ponto.previsto).reduce((soma, ponto) => soma + ponto.entradas, 0);
  const saidasAno = fluxo.filter((ponto) => !ponto.previsto).reduce((soma, ponto) => soma + ponto.saidas, 0);

  const semana = somarDias(hoje, 7);
  const pendentes = abertos.filter((titulo) => titulo.vencimento <= semana);
  const pendentesTotal = pendentes.reduce((soma, titulo) => soma + (titulo.natureza === "pagar" ? -1 : 1) * titulo.saldo, 0);

  const movimentos: Movimento[] = [
    ...((recentesRes.data ?? []) as BaixaRecente[]).map((baixa) => {
      const lancamento = primeiro(baixa.lancamento);
      const natureza = lancamento?.natureza ?? "pagar";
      const pessoa = primeiro(lancamento?.fornecedor ?? null)?.nome ?? primeiro(lancamento?.cliente ?? null)?.nome ?? "—";
      const codigo = lancamento ? `${natureza === "pagar" ? "P" : "R"}${String(lancamento.numero).padStart(6, "0")}` : "";
      return {
        id: baixa.id,
        tipo: natureza === "receber" ? ("entrada" as const) : ("saida" as const),
        nome: pessoa,
        detalhe: `${codigo} · ${primeiro(baixa.conta)?.nome ?? ""}`,
        estornado: Boolean(primeiro(baixa.estorno)),
        valor: (natureza === "receber" ? 1 : -1) * Number(baixa.valor),
        data: baixa.data,
        criado: baixa.created_at,
        href: lancamento ? `/financeiro/lancamentos/${lancamento.id}` : undefined,
      };
    }),
    ...((transferenciasRes.data ?? []) as TransferenciaRecente[]).map((item) => ({
      id: item.id,
      tipo: "transferencia" as const,
      nome: `${primeiro(item.origem)?.nome ?? "?"} → ${primeiro(item.destino)?.nome ?? "?"}`,
      detalhe: item.descricao,
      estornado: false,
      valor: Number(item.valor),
      data: item.data,
      criado: item.created_at,
      href: "/financeiro/transferencias",
    })),
  ]
    .sort((a, b) => b.criado.localeCompare(a.criado))
    .slice(0, 8);

  const podeLancar = sessao.papel ? PODE_LANCAR.includes(sessao.papel) : false;
  const dataExtenso = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${hoje}T12:00:00-03:00`));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.625rem] leading-tight font-bold">Visão financeira</h1>
          <p className="mt-1 text-tinta-2">Como está o caixa de {nomeEmpresa(empresa)} hoje.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-1.5 text-tinta-2 first-letter:uppercase">
            <CalendarDays className="size-4" strokeWidth={1.75} aria-hidden />
            <span className="first-letter:uppercase">{dataExtenso}</span>
          </p>
          {podeLancar ? (
            <>
              <Link href="/financeiro/contas-receber/novo" className="botao-claro">
                <Plus className="size-4" strokeWidth={2} aria-hidden />A receber
              </Link>
              <Link href="/financeiro/contas-pagar/novo" className="botao">
                <Plus className="size-4" strokeWidth={2} aria-hidden />A pagar
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Saldo em caixa" valor={dinheiro(caixa)}>
          <Variacao valor={variacao(caixa, caixaAntes)} sufixo="vs fim do mês passado" />
        </Indicador>
        <Indicador rotulo="A receber em aberto" valor={dinheiro(receberAberto)}>
          <p className={`text-[0.8125rem] ${receberVencido > 0 ? "font-semibold text-vermelho" : "text-tinta-2"}`}>
            {receberVencido > 0 ? `${dinheiro(receberVencido)} vencido` : "Nada vencido"}
          </p>
        </Indicador>
        <Indicador rotulo="A pagar em aberto" valor={dinheiro(pagarAberto)}>
          <p className={`text-[0.8125rem] ${pagarVencido > 0 ? "font-semibold text-vermelho" : "text-tinta-2"}`}>
            {pagarVencido > 0 ? `${dinheiro(pagarVencido)} vencido` : "Nada vencido"}
          </p>
        </Indicador>
        <Indicador rotulo="Resultado do mês" valor={dinheiro(resultadoMes)}>
          <Variacao valor={variacao(resultadoMes, resultadoAntes)} sufixo="vs mês passado" />
        </Indicador>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="cartao min-w-0 p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Fluxo de caixa {ano}</h2>
              <p className="text-[0.8125rem] text-tinta-2">
                Realizado até {MESES[mesAtual]}: {dinheiro(entradasAno)} entradas, {dinheiro(saidasAno)} saídas. Meses seguintes em tom claro: previsto pelos títulos em aberto.
              </p>
            </div>
            <ul className="flex items-center gap-4 text-[0.8125rem] text-tinta-2">
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-[#4c5fd5]" aria-hidden />
                Entradas
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-[#b9c0f2]" aria-hidden />
                Saídas
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-tinta" aria-hidden />
                Líquido
              </li>
            </ul>
          </div>
          <GraficoFluxo dados={fluxo} />
        </section>

        <section className="cartao p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold">
              Vencem até {dataBr(semana).slice(0, 5)}
              <span className="rounded-md bg-papel px-1.5 text-[0.75rem] font-semibold text-tinta-2 tabular-nums">{pendentes.length}</span>
            </h2>
            <Link href="/financeiro/tesouraria" className="link text-[0.8125rem]">
              Ver todos
            </Link>
          </div>
          {pendentes.length === 0 ? (
            <p className="py-8 text-center text-tinta-2">Nada vencido nem vencendo nesta semana.</p>
          ) : (
            <ul className="grid gap-1">
              {pendentes.slice(0, 5).map((titulo) => {
                const atraso = titulo.vencimento < hoje ? diasEmAtraso(titulo.vencimento, hoje) : 0;
                const pagar = titulo.natureza === "pagar";
                const Icone = pagar ? ArrowUpRight : ArrowDownLeft;
                return (
                  <li key={titulo.id}>
                    <Link
                      href={`/financeiro/lancamentos/${titulo.id}`}
                      className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-papel"
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-lg ${pagar ? "bg-vermelho-fundo text-vermelho" : "bg-carimbo-fundo text-carimbo"}`}
                      >
                        <Icone className="size-4" strokeWidth={2} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{titulo.pessoa_nome}</span>
                        <span className="block truncate text-[0.8125rem] text-tinta-2">
                          {titulo.codigo} ·{" "}
                          <span className={atraso ? "font-semibold text-vermelho" : ""}>
                            {atraso ? `${atraso} ${atraso === 1 ? "dia" : "dias"} em atraso` : `vence ${dataBr(titulo.vencimento).slice(0, 5)}`}
                          </span>
                        </span>
                        <span className={`mt-0.5 block font-bold tabular-nums ${pagar ? "" : "text-carimbo"}`}>
                          {pagar ? "−" : "+"}
                          {dinheiro(titulo.saldo)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {pendentes.length > 0 ? (
            <p className="mt-3 flex justify-between border-t border-filete pt-3 text-[0.8125rem]">
              <span className="text-tinta-2">Efeito líquido no caixa</span>
              <span className={`font-bold tabular-nums ${pendentesTotal < 0 ? "text-vermelho" : "text-carimbo"}`}>{dinheiro(pendentesTotal)}</span>
            </p>
          ) : null}
        </section>
      </div>

      <section className="cartao min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 className="text-base font-bold">Movimentações recentes</h2>
          <Link href="/financeiro/tesouraria" className="link text-[0.8125rem]">
            Tesouraria
          </Link>
        </div>
        {movimentos.length === 0 ? (
          <p className="px-5 pb-8 text-center text-tinta-2">Nenhuma baixa ou transferência registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela min-w-[760px]">
              <thead>
                <tr className="bg-papel">
                  <th className="pl-5">Tipo</th>
                  <th>Contraparte</th>
                  <th>Situação</th>
                  <th className="num">Valor</th>
                  <th>Data</th>
                  <th className="pr-5" />
                </tr>
              </thead>
              <tbody>
                {movimentos.map((item) => {
                  const tipo = {
                    entrada: { rotulo: "Entrada", Icone: ArrowDown, cor: "text-verde" },
                    saida: { rotulo: "Saída", Icone: ArrowUp, cor: "text-tinta-2" },
                    transferencia: { rotulo: "Transferência", Icone: ArrowLeftRight, cor: "text-carimbo" },
                  }[item.tipo];
                  return (
                    <tr key={item.id}>
                      <td className="pl-5">
                        <span className={`flex items-center gap-1.5 font-medium ${tipo.cor}`}>
                          <tipo.Icone className="size-3.5" strokeWidth={2.25} aria-hidden />
                          {tipo.rotulo}
                        </span>
                      </td>
                      <td>
                        <span className="flex items-center gap-3">
                          <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[0.75rem] font-bold ${tinta(item.nome)}`} aria-hidden>
                            {item.tipo === "transferencia" ? <ArrowLeftRight className="size-4" strokeWidth={2} /> : iniciais(item.nome)}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-72 truncate font-semibold">{item.nome}</span>
                            <span className="block max-w-72 truncate text-[0.8125rem] text-tinta-2">{item.detalhe}</span>
                          </span>
                        </span>
                      </td>
                      <td>
                        {item.estornado ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-vermelho-fundo px-2 py-0.5 text-[0.75rem] font-semibold text-vermelho">
                            <Undo2 className="size-3" strokeWidth={2.5} aria-hidden />
                            Estornada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#e6f0ea] px-2 py-0.5 text-[0.75rem] font-semibold text-verde">
                            <Check className="size-3" strokeWidth={2.5} aria-hidden />
                            Concluída
                          </span>
                        )}
                      </td>
                      <td
                        className={`num font-semibold ${item.estornado ? "text-tinta-2 line-through" : item.tipo === "entrada" ? "text-verde" : item.tipo === "saida" ? "" : "text-carimbo"}`}
                      >
                        {item.tipo === "entrada" ? "+" : item.tipo === "saida" ? "−" : ""}
                        {dinheiro(Math.abs(item.valor))}
                      </td>
                      <td className="text-tinta-2 tabular-nums">{dataBr(item.data)}</td>
                      <td className="pr-5 text-right">
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="inline-grid size-8 place-items-center rounded-lg border border-filete text-tinta-2 transition-colors hover:border-tinta-2 hover:text-tinta"
                            aria-label={`Abrir ${item.nome}`}
                          >
                            <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
