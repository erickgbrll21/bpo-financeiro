import type { Metadata } from "next";
import { PaginaTitulos } from "@/features/financeiro/PaginaTitulos";

export const metadata: Metadata = { title: "Contas a pagar" };

export default async function ContasPagarPage({ searchParams }: PageProps<"/financeiro/contas-pagar">) {
  return <PaginaTitulos natureza="pagar" busca={await searchParams} />;
}
