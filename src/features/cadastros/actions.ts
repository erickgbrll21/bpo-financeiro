"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { comAviso, dataIso, mensagemDoBanco, opcional, texto } from "@/lib/form";
import { exigirEmpresa } from "@/lib/sessao";

async function inserir(rota: string, tabela: string, registro: Record<string, unknown>, sucesso: string) {
  const { supabase, empresa } = await exigirEmpresa();
  const { error } = await supabase.from(tabela).insert({ empresa_id: empresa.id, ...registro });
  if (error) redirect(comAviso(rota, "erro", mensagemDoBanco(error, "Não foi possível salvar.")));
  revalidatePath(rota);
  redirect(comAviso(rota, "ok", sucesso));
}

export async function criarFornecedor(formData: FormData) {
  const nome = texto(formData, "nome");
  if (!nome) redirect(comAviso("/cadastros/fornecedores", "erro", "Informe o nome do fornecedor."));
  await inserir(
    "/cadastros/fornecedores",
    "fornecedores",
    {
      nome,
      documento: opcional(formData, "documento"),
      contato: opcional(formData, "contato"),
      telefone: opcional(formData, "telefone"),
      email: opcional(formData, "email"),
      endereco: opcional(formData, "endereco"),
      observacoes: opcional(formData, "observacoes"),
    },
    `${nome} cadastrado.`,
  );
}

export async function criarCliente(formData: FormData) {
  const nome = texto(formData, "nome");
  if (!nome) redirect(comAviso("/cadastros/clientes", "erro", "Informe o nome do cliente."));
  await inserir(
    "/cadastros/clientes",
    "clientes",
    {
      nome,
      beneficiario: opcional(formData, "beneficiario"),
      tutor: opcional(formData, "tutor"),
      contato: opcional(formData, "contato"),
      telefone: opcional(formData, "telefone"),
      telefone_secundario: opcional(formData, "telefone_secundario"),
      email: opcional(formData, "email"),
      endereco: opcional(formData, "endereco"),
      observacoes: opcional(formData, "observacoes"),
    },
    `${nome} cadastrado.`,
  );
}

export async function criarConta(formData: FormData) {
  const rota = "/cadastros/contas";
  const nome = texto(formData, "nome");
  const saldo = texto(formData, "saldo_inicial").replace(/\./g, "").replace(",", ".") || "0";
  const data = dataIso(texto(formData, "data_saldo_inicial"));
  if (!nome || !data || Number.isNaN(Number(saldo))) {
    redirect(comAviso(rota, "erro", "Informe nome, saldo inicial e a data do saldo."));
  }
  await inserir(
    rota,
    "contas_financeiras",
    {
      nome,
      banco: opcional(formData, "banco"),
      agencia: opcional(formData, "agencia"),
      numero: opcional(formData, "numero"),
      tipo: texto(formData, "tipo") || "corrente",
      saldo_inicial: Number(saldo).toFixed(2),
      data_saldo_inicial: data,
    },
    `Conta ${nome} cadastrada.`,
  );
}

export async function criarClassificacao(formData: FormData) {
  const rota = "/cadastros/classificacoes";
  const nome = texto(formData, "nome");
  const grupo = texto(formData, "grupo_dre");
  const natureza = texto(formData, "natureza") === "receber" ? "receber" : "pagar";
  if (!nome || !grupo) redirect(comAviso(rota, "erro", "Informe o grupo e o nome da classificação."));
  await inserir(rota, "categorias", { natureza, grupo_dre: grupo, nome }, `Classificação ${nome} criada em ${grupo}.`);
}

export async function criarCentroCusto(formData: FormData) {
  const nome = texto(formData, "nome");
  if (!nome) redirect(comAviso("/cadastros/contas", "erro", "Informe o nome do centro de custo."));
  await inserir("/cadastros/contas", "centros_custos", { nome }, `Centro de custo ${nome} criado.`);
}

export async function criarForma(formData: FormData) {
  const nome = texto(formData, "nome");
  if (!nome) redirect(comAviso("/cadastros/contas", "erro", "Informe o nome da forma de liquidação."));
  await inserir("/cadastros/contas", "formas_liquidacao", { nome }, `Forma ${nome} criada.`);
}

const ALTERNAVEIS = {
  fornecedores: { campo: "ativo", rota: "/cadastros/fornecedores" },
  clientes: { campo: "ativo", rota: "/cadastros/clientes" },
  contas_financeiras: { campo: "ativa", rota: "/cadastros/contas" },
  centros_custos: { campo: "ativo", rota: "/cadastros/contas" },
  formas_liquidacao: { campo: "ativa", rota: "/cadastros/contas" },
  categorias: { campo: "ativa", rota: "/cadastros/classificacoes" },
} as const;

export async function alternarAtivo(formData: FormData) {
  const tabela = texto(formData, "tabela") as keyof typeof ALTERNAVEIS;
  const alvo = ALTERNAVEIS[tabela];
  if (!alvo) redirect("/");
  const { supabase, empresa } = await exigirEmpresa();
  const ativar = texto(formData, "ativar") === "1";
  const { error } = await supabase
    .from(tabela)
    .update({ [alvo.campo]: ativar })
    .eq("id", texto(formData, "id"))
    .eq("empresa_id", empresa.id);
  if (error) redirect(comAviso(alvo.rota, "erro", mensagemDoBanco(error, "Não foi possível alterar.")));
  revalidatePath(alvo.rota);
  redirect(comAviso(alvo.rota, "ok", ativar ? "Reativado." : "Inativado. Não aparece mais nos lançamentos novos."));
}
