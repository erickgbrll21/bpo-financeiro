import type { SupabaseClient } from "@supabase/supabase-js";
import { somarDias, statusDoTitulo, type StatusTitulo } from "@/lib/calculations/titulos";
import type { Natureza } from "./natureza";

export type Opcao = { id: string; nome: string };
export type Classificacao = Opcao & { grupo_dre: string };

export type Titulo = {
  id: string;
  natureza: Natureza;
  codigo: string;
  pessoa_id: string;
  pessoa_nome: string;
  beneficiario: string | null;
  tipo_nome: string;
  numero_documento: string;
  competencia: string;
  vencimento: string;
  descricao: string;
  valor: number;
  valor_baixado: number;
  saldo: number;
  situacao: "previsto" | "realizado" | "cancelado";
  categoria_nome: string;
  grupo_dre: string;
  centro_nome: string | null;
  ultima_baixa: string | null;
  cancelado_em: string | null;
  status: StatusTitulo;
};

export async function carregarOpcoes(supabase: SupabaseClient, empresaId: string, natureza: Natureza) {
  const tabelaPessoa = natureza === "pagar" ? "fornecedores" : "clientes";
  const [pessoas, tipos, categorias, centros, contas, formas] = await Promise.all([
    supabase.from(tabelaPessoa).select("id, nome").eq("empresa_id", empresaId).eq("ativo", true).order("nome"),
    supabase.from("tipos_documento").select("id, nome").eq("natureza", natureza).order("nome"),
    supabase
      .from("categorias")
      .select("id, nome, grupo_dre")
      .eq("empresa_id", empresaId)
      .eq("natureza", natureza)
      .eq("ativa", true)
      .order("grupo_dre")
      .order("nome"),
    supabase.from("centros_custos").select("id, nome").eq("empresa_id", empresaId).eq("ativo", true).order("nome"),
    supabase.from("contas_financeiras").select("id, nome").eq("empresa_id", empresaId).eq("ativa", true).order("nome"),
    supabase.from("formas_liquidacao").select("id, nome").eq("empresa_id", empresaId).eq("ativa", true).order("nome"),
  ]);
  return {
    pessoas: (pessoas.data ?? []) as Opcao[],
    tipos: (tipos.data ?? []) as Opcao[],
    categorias: (categorias.data ?? []) as Classificacao[],
    centros: (centros.data ?? []) as Opcao[],
    contas: (contas.data ?? []) as Opcao[],
    formas: (formas.data ?? []) as Opcao[],
  };
}

export type Opcoes = Awaited<ReturnType<typeof carregarOpcoes>>;

export const FILTROS_STATUS = [
  { id: "abertos", rotulo: "Em aberto" },
  { id: "vencidas", rotulo: "Vencidas" },
  { id: "vence_7", rotulo: "Vencem em 7 dias" },
  { id: "liquidadas", rotulo: "Liquidadas" },
  { id: "canceladas", rotulo: "Canceladas" },
  { id: "todas", rotulo: "Todas" },
] as const;

export type FiltroStatus = (typeof FILTROS_STATUS)[number]["id"];

export type Filtros = {
  status: FiltroStatus;
  de: string;
  ate: string;
  pessoa: string;
  categoria: string;
  busca: string;
};

const LIMITE = 500;

function comStatus(linha: Omit<Titulo, "status">, hoje: string): Titulo {
  const valor = Number(linha.valor);
  const saldo = Number(linha.saldo);
  return {
    ...linha,
    valor,
    saldo,
    valor_baixado: Number(linha.valor_baixado),
    status: statusDoTitulo({ vencimento: linha.vencimento, saldo, cancelado: Boolean(linha.cancelado_em) }, hoje),
  };
}

export async function listarTitulos(
  supabase: SupabaseClient,
  empresaId: string,
  natureza: Natureza,
  filtros: Filtros,
  hoje: string,
) {
  let consulta = supabase
    .from("titulos")
    .select(
      "id, natureza, codigo, pessoa_id, pessoa_nome, beneficiario, tipo_nome, numero_documento, competencia, vencimento, descricao, valor, valor_baixado, saldo, situacao, categoria_nome, grupo_dre, centro_nome, ultima_baixa, cancelado_em",
      { count: "exact" },
    )
    .eq("empresa_id", empresaId)
    .eq("natureza", natureza);

  if (filtros.status === "abertos") consulta = consulta.eq("situacao", "previsto");
  if (filtros.status === "vencidas") consulta = consulta.eq("situacao", "previsto").lt("vencimento", hoje);
  if (filtros.status === "vence_7")
    consulta = consulta.eq("situacao", "previsto").gte("vencimento", hoje).lte("vencimento", somarDias(hoje, 7));
  if (filtros.status === "liquidadas") consulta = consulta.eq("situacao", "realizado");
  if (filtros.status === "canceladas") consulta = consulta.eq("situacao", "cancelado");
  if (filtros.de) consulta = consulta.gte("vencimento", filtros.de);
  if (filtros.ate) consulta = consulta.lte("vencimento", filtros.ate);
  if (filtros.pessoa) consulta = consulta.eq("pessoa_id", filtros.pessoa);
  if (filtros.categoria) consulta = consulta.eq("categoria_id", filtros.categoria);
  if (filtros.busca) {
    const termo = filtros.busca.replace(/[%,()]/g, " ").trim();
    const numero = /^[PR]?0*(\d+)$/i.exec(termo)?.[1];
    consulta = consulta.or(
      [`descricao.ilike.%${termo}%`, `numero_documento.ilike.%${termo}%`, `pessoa_nome.ilike.%${termo}%`]
        .concat(numero ? [`numero.eq.${numero}`] : [])
        .join(","),
    );
  }

  const { data, count, error } = await consulta
    .order("vencimento", { ascending: filtros.status !== "liquidadas" })
    .order("numero")
    .limit(LIMITE);

  return {
    titulos: ((data ?? []) as Omit<Titulo, "status">[]).map((linha) => comStatus(linha, hoje)),
    total: count ?? 0,
    limite: LIMITE,
    erro: error?.message ?? null,
  };
}

/** Régua do topo: o que já venceu e o que vence na semana, independente do filtro aplicado. */
export async function resumoEmAberto(supabase: SupabaseClient, empresaId: string, natureza: Natureza, hoje: string) {
  const { data } = await supabase
    .from("titulos")
    .select("vencimento, saldo")
    .eq("empresa_id", empresaId)
    .eq("natureza", natureza)
    .eq("situacao", "previsto")
    .limit(10000);
  const semana = somarDias(hoje, 7);
  const resumo = { vencido: 0, qtdVencido: 0, semana: 0, qtdSemana: 0, aberto: 0, qtdAberto: 0 };
  for (const linha of data ?? []) {
    const saldo = Number(linha.saldo);
    resumo.aberto += saldo;
    resumo.qtdAberto += 1;
    if (linha.vencimento < hoje) {
      resumo.vencido += saldo;
      resumo.qtdVencido += 1;
    } else if (linha.vencimento <= semana) {
      resumo.semana += saldo;
      resumo.qtdSemana += 1;
    }
  }
  return resumo;
}

export function lerFiltros(busca: Record<string, string | string[] | undefined>): Filtros {
  const p = (chave: string) => {
    const valor = busca[chave];
    return ((Array.isArray(valor) ? valor[0] : valor) ?? "").trim();
  };
  const status = FILTROS_STATUS.some((item) => item.id === p("status")) ? (p("status") as FiltroStatus) : "abertos";
  const data = (valor: string) => (/^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : "");
  return { status, de: data(p("de")), ate: data(p("ate")), pessoa: p("pessoa"), categoria: p("categoria"), busca: p("busca") };
}

/** Agrupa classificações por grupo da DRE para os <optgroup>. */
export function porGrupo(categorias: Classificacao[]) {
  const grupos = new Map<string, Classificacao[]>();
  for (const categoria of categorias) {
    grupos.set(categoria.grupo_dre, [...(grupos.get(categoria.grupo_dre) ?? []), categoria]);
  }
  return [...grupos.entries()];
}
