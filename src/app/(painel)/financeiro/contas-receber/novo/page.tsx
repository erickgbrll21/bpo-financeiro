import type { Metadata } from "next";
import { PaginaNovo } from "@/features/financeiro/PaginaNovo";

export const metadata: Metadata = { title: "Nova conta a receber" };

export default async function NovaContaReceberPage({ searchParams }: PageProps<"/financeiro/contas-receber/novo">) {
  return <PaginaNovo natureza="receber" busca={await searchParams} />;
}
