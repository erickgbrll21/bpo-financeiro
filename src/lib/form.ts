export function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

export function opcional(formData: FormData, campo: string) {
  return texto(formData, campo) || null;
}

/** Aceita "1.500,00", "1500,5" ou "1500.50" e devolve "1500.00", ou null se inválido. */
export function valorMonetario(entrada: string) {
  const limpo = entrada.replace(/\s|R\$/g, "");
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  const numero = Number(normalizado);
  return numero > 0 ? numero.toFixed(2) : null;
}

export function dataIso(entrada: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(entrada) ? entrada : null;
}

/** Monta a URL de retorno com uma mensagem para o aviso da página. */
export function comAviso(rota: string, tipo: "erro" | "ok", mensagem: string) {
  const [caminho, busca = ""] = rota.split("?");
  const params = new URLSearchParams(busca);
  params.delete("erro");
  params.delete("ok");
  params.set(tipo, mensagem);
  return `${caminho}?${params.toString()}`;
}

/** Mensagens do Postgres chegam cruas; as nossas (raise exception) já estão em português. */
export function mensagemDoBanco(erro: { message: string; code?: string } | null, padrao: string) {
  if (!erro) return padrao;
  if (erro.code === "42501") return "Seu papel nesta empresa não permite essa operação.";
  if (erro.code === "23505") return "Já existe um registro com esses dados.";
  if (erro.code === "23503") return "Um dos itens escolhidos não existe mais.";
  if (/[áéíóúãõç]/i.test(erro.message)) return erro.message;
  return padrao;
}
