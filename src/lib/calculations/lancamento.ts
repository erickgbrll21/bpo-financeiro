import Decimal from "decimal.js";

export type Situacao = "previsto" | "realizado" | "cancelado";

export type Baixa = {
  valor: Decimal.Value;
  estornada: boolean;
};

const dinheiro = (valor: Decimal.Value) => new Decimal(valor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export function valorBaixado(baixas: Baixa[]) {
  return baixas.reduce(
    (total, baixa) => (baixa.estornada ? total : total.plus(dinheiro(baixa.valor))),
    new Decimal(0),
  );
}

export function saldoEmAberto(valorOriginal: Decimal.Value, baixas: Baixa[]) {
  return dinheiro(valorOriginal).minus(valorBaixado(baixas));
}

export function situacaoDoLancamento(
  valorOriginal: Decimal.Value,
  baixas: Baixa[],
  cancelado: boolean,
): Situacao {
  if (cancelado) return "cancelado";
  if (saldoEmAberto(valorOriginal, baixas).lte(0)) return "realizado";
  return "previsto";
}

/** A baixa cabe no saldo e não passa de um título cancelado. */
export function baixaPermitida(
  valorOriginal: Decimal.Value,
  baixas: Baixa[],
  valorBaixa: Decimal.Value,
  cancelado: boolean,
) {
  if (cancelado) return false;
  const valor = dinheiro(valorBaixa);
  if (valor.lte(0)) return false;
  return valor.lte(saldoEmAberto(valorOriginal, baixas));
}

export function podeCancelar(baixas: Baixa[], cancelado: boolean) {
  if (cancelado) return false;
  return baixas.every((baixa) => baixa.estornada);
}

export function podeExcluir(baixas: Baixa[]) {
  return baixas.length === 0;
}
