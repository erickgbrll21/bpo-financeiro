export type StatusTitulo = "vencida" | "vence_7" | "a_vencer" | "liquidada" | "cancelada";

const DIA = 86_400_000;

function utc(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

export function somarDias(iso: string, dias: number) {
  return new Date(utc(iso) + dias * DIA).toISOString().slice(0, 10);
}

export function diasEntre(de: string, ate: string) {
  return Math.round((utc(ate) - utc(de)) / DIA);
}

export function inicioDoMes(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

export function fimDoMes(iso: string) {
  const [ano, mes] = iso.slice(0, 7).split("-").map(Number);
  return new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
}

/** Mesma régua da planilha: vencida, vence em até 7 dias, a vencer, liquidada. */
export function statusDoTitulo(
  titulo: { vencimento: string; saldo: number; cancelado: boolean },
  hoje: string,
): StatusTitulo {
  if (titulo.cancelado) return "cancelada";
  if (titulo.saldo <= 0) return "liquidada";
  if (titulo.vencimento < hoje) return "vencida";
  if (titulo.vencimento <= somarDias(hoje, 7)) return "vence_7";
  return "a_vencer";
}

export function diasEmAtraso(vencimento: string, hoje: string) {
  return Math.max(0, diasEntre(vencimento, hoje));
}
