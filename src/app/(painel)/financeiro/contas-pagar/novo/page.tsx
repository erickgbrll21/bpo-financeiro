import type { Metadata } from "next";
import { PaginaNovo } from "@/features/financeiro/PaginaNovo";

export const metadata: Metadata = { title: "Nova conta a pagar" };

export default async function NovaContaPagarPage({ searchParams }: PageProps<"/financeiro/contas-pagar/novo">) {
  return <PaginaNovo natureza="pagar" busca={await searchParams} />;
}
