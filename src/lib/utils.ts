export function dinheiro(valor: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor));
}

/** Valor sem "R$", para colunas de tabela onde a moeda já está no cabeçalho. */
export function valor(valor: number | string) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(valor));
}

export function dataBr(valor: string | null) {
  if (!valor) return "—";
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Data de hoje no fuso do escritório, em AAAA-MM-DD. */
export function hojeIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function primeiro<T>(valor: T | T[] | null | undefined): T | null {
  return (Array.isArray(valor) ? valor[0] : valor) ?? null;
}
