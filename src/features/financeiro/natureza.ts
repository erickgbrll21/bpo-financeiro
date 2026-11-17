export type Natureza = "pagar" | "receber";

export function rotaDaNatureza(natureza: Natureza) {
  return natureza === "pagar" ? "/financeiro/contas-pagar" : "/financeiro/contas-receber";
}

export const TEXTOS = {
  pagar: {
    titulo: "Contas a pagar",
    pessoa: "Fornecedor",
    tabelaPessoa: "fornecedores",
    verbo: "Pagar",
    feito: "Pago",
    data: "Data do pagamento",
    novo: "Nova conta a pagar",
  },
  receber: {
    titulo: "Contas a receber",
    pessoa: "Cliente",
    tabelaPessoa: "clientes",
    verbo: "Receber",
    feito: "Recebido",
    data: "Data do recebimento",
    novo: "Nova conta a receber",
  },
} as const;
