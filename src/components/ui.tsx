import { CircleAlert, CircleCheck } from "lucide-react";
import type { StatusTitulo } from "@/lib/calculations/titulos";

export function Cabecalho({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[1.625rem] leading-tight font-bold">{titulo}</h1>
        {descricao ? <p className="mt-1 max-w-[70ch] text-tinta-2">{descricao}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export type Busca = Record<string, string | string[] | undefined>;

export function param(busca: Busca, chave: string) {
  const valor = busca[chave];
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export function Aviso({ busca }: { busca: Busca }) {
  const erro = param(busca, "erro");
  const ok = param(busca, "ok");
  if (!erro && !ok) return null;
  return erro ? (
    <p role="alert" className="mb-5 flex items-start gap-2 rounded-[4px] border border-[#e3b4b0] bg-vermelho-fundo px-4 py-2.5 text-vermelho">
      <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
      <span>{erro}</span>
    </p>
  ) : (
    <p role="status" className="mb-5 flex items-start gap-2 rounded-[4px] border border-[#c3c6e8] bg-carimbo-fundo px-4 py-2.5 text-carimbo">
      <CircleCheck className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
      <span>{ok}</span>
    </p>
  );
}

const ROTULO_STATUS: Record<StatusTitulo, string> = {
  vencida: "Vencida",
  vence_7: "Em 7 dias",
  a_vencer: "A vencer",
  liquidada: "Liquidada",
  cancelada: "Cancelada",
};

export function Selo({ status, liquidadaComo }: { status: StatusTitulo; liquidadaComo?: string }) {
  return (
    <span className={`selo selo-${status}`}>
      {status === "liquidada" && liquidadaComo ? liquidadaComo : ROTULO_STATUS[status]}
    </span>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold">{titulo}</p>
      {children ? <div className="mx-auto mt-1 max-w-[60ch] text-tinta-2">{children}</div> : null}
    </div>
  );
}

/** Faixa de resumo do topo das telas: colunas separadas por filete, fechada por traço duplo. */
export function Resumo({
  itens,
}: {
  itens: { rotulo: string; valor: string; detalhe?: string; tom?: "vermelho" | "ambar" | "carimbo" }[];
}) {
  const cor = { vermelho: "text-vermelho", ambar: "text-ambar", carimbo: "text-carimbo" } as const;
  return (
    <dl className="fechamento mb-6 grid grid-cols-2 border-t-2 border-tinta md:grid-cols-4">
      {itens.map((item) => (
        <div key={item.rotulo} className="border-filete px-4 py-3 not-first:border-l max-md:nth-[3]:border-l-0">
          <dt className="rotulo">{item.rotulo}</dt>
          <dd className={`mt-0.5 text-xl font-bold tabular-nums ${item.tom ? cor[item.tom] : ""}`}>{item.valor}</dd>
          {item.detalhe ? <dd className="text-tinta-2">{item.detalhe}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
