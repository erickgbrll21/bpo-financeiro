import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Papel = "administrador" | "financeiro" | "operador" | "visualizador";

export type Empresa = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
};

export type Sessao = {
  usuarioId: string;
  email: string;
  empresas: { papel: Papel; empresa: Empresa }[];
  empresa: Empresa | null;
  papel: Papel | null;
};

export const PODE_BAIXAR: Papel[] = ["administrador", "financeiro"];
export const PODE_LANCAR: Papel[] = ["administrador", "financeiro", "operador"];

export function nomeEmpresa(empresa: Empresa) {
  return empresa.nome_fantasia || empresa.razao_social;
}

export const lerSessao = cache(async (): Promise<Sessao | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const [{ data: vinculos }, jar] = await Promise.all([
    supabase
      .from("usuarios_empresas")
      .select("papel, empresa:empresas(id, razao_social, nome_fantasia, cnpj)")
      .eq("usuario_id", data.user.id),
    cookies(),
  ]);

  const empresas = (vinculos ?? [])
    .flatMap((linha) => {
      const empresa = Array.isArray(linha.empresa) ? linha.empresa[0] : linha.empresa;
      if (!empresa) return [];
      return [{ papel: linha.papel as Papel, empresa: empresa as Empresa }];
    })
    .sort((a, b) => nomeEmpresa(a.empresa).localeCompare(nomeEmpresa(b.empresa), "pt-BR"));

  const escolhida = jar.get("bpo_empresa")?.value;
  const atual = empresas.find((item) => item.empresa.id === escolhida) ?? empresas[0] ?? null;

  return {
    usuarioId: data.user.id,
    email: data.user.email ?? "",
    empresas,
    empresa: atual?.empresa ?? null,
    papel: atual?.papel ?? null,
  };
});

/** Para páginas e ações que exigem empresa selecionada. */
export async function exigirEmpresa() {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");
  if (!sessao.empresa || !sessao.papel) redirect("/cadastros/empresas");
  const supabase = (await createClient())!;
  return { sessao, supabase, empresa: sessao.empresa, papel: sessao.papel };
}
