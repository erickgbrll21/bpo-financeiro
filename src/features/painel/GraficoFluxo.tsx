"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PontoFluxo = {
  mes: string;
  entradas: number;
  saidas: number;
  liquido: number;
  previsto: boolean;
};

const ENTRADA = "#4c5fd5";
const SAIDA = "#b9c0f2";
const LIQUIDO = "#1a2126";

const compacto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function Dica({ active, payload }: { active?: boolean; payload?: { payload: PontoFluxo }[] }) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0].payload;
  return (
    <div className="rounded-lg border border-filete bg-folha px-3 py-2 text-[0.8125rem] shadow-[0_8px_24px_-12px_rgb(26_33_38/0.35)]">
      <p className="mb-1 font-semibold">
        {ponto.mes} {ponto.previsto ? <span className="font-normal text-tinta-2">· previsto</span> : null}
      </p>
      <p className="flex justify-between gap-6">
        <span className="text-tinta-2">Entradas</span>
        <span className="tabular-nums">{moeda.format(ponto.entradas)}</span>
      </p>
      <p className="flex justify-between gap-6">
        <span className="text-tinta-2">Saídas</span>
        <span className="tabular-nums">{moeda.format(-ponto.saidas)}</span>
      </p>
      <p className="mt-1 flex justify-between gap-6 border-t border-filete pt-1 font-semibold">
        <span>Líquido</span>
        <span className={`tabular-nums ${ponto.liquido < 0 ? "text-vermelho" : ""}`}>{moeda.format(ponto.liquido)}</span>
      </p>
    </div>
  );
}

export function GraficoFluxo({ dados }: { dados: PontoFluxo[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={dados} stackOffset="sign" margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="#e4e8e1" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#4f5a53", fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fill: "#4f5a53", fontSize: 12 }}
          tickFormatter={(valor: number) => compacto.format(valor)}
        />
        <ReferenceLine y={0} stroke="#b9c2b8" />
        <Tooltip content={<Dica />} cursor={{ fill: "rgb(26 33 38 / 0.04)" }} />
        <Bar dataKey="entradas" stackId="fluxo" fill={ENTRADA} radius={[6, 6, 0, 0]} isAnimationActive={false}>
          {dados.map((ponto) => (
            <Cell key={ponto.mes} fillOpacity={ponto.previsto ? 0.4 : 1} />
          ))}
        </Bar>
        <Bar
          dataKey={(ponto: PontoFluxo) => -ponto.saidas}
          name="saidas"
          stackId="fluxo"
          fill={SAIDA}
          radius={[0, 0, 6, 6]}
          isAnimationActive={false}
        >
          {dados.map((ponto) => (
            <Cell key={ponto.mes} fillOpacity={ponto.previsto ? 0.45 : 1} />
          ))}
        </Bar>
        <Line
          dataKey="liquido"
          stroke={LIQUIDO}
          strokeWidth={2}
          dot={{ r: 3.5, fill: LIQUIDO, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
