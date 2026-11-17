import type { Metadata } from "next";
import { PaginaTitulos } from "@/features/financeiro/PaginaTitulos";

export const metadata: Metadata = { title: "Contas a receber" };

export default async function ContasReceberPage({ searchParams }: PageProps<"/financeiro/contas-receber">) {
  return <PaginaTitulos natureza="receber" busca={await searchParams} />;
}
