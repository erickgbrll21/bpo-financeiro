"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { comAviso, dataIso, mensagemDoBanco, opcional, texto, valorMonetario } from "@/lib/form";
import { exigirEmpresa } from "@/lib/sessao";
import { type Natureza, rotaDaNatureza } from "./natureza";

function natureza(formData: FormData): Natureza {
  return texto(formData, "natureza") === "receber" ? "receber" : "pagar";
}

function detalhe(id: string) {
  return `/financeiro/lancamentos/${id}`;
}

function revalidarFinanceiro() {
  revalidatePath("/", "layout");
}

function camposDoTitulo(formData: FormData) {
  return {
    pessoa: texto(formData, "pessoa_id"),
    tipo: texto(formData, "tipo_documento_id"),
    numeroDocumento: texto(formData, "numero_documento"),
    competencia: dataIso(texto(formData, "competencia")),
    vencimento: dataIso(texto(formData, "vencimento")),
    valor: valorMonetario(texto(formData, "valor")),
    categoria: texto(formData, "categoria_id"),
    descricao: texto(formData, "descricao"),
  };
}

function faltando(campos: ReturnType<typeof camposDoTitulo>) {
  const nomes: string[] = [];
  if (!campos.pessoa) nomes.push("pessoa");
  if (!campos.tipo) nomes.push("tipo de documento");
  if (!campos.numeroDocumento) nomes.push("nº do documento");
  if (!campos.competencia) nomes.push("competência");
  if (!campos.vencimento) nomes.push("vencimento");
  if (!campos.valor) nomes.push("valor maior que zero");
  if (!campos.categoria) nomes.push("classificação");
  return nomes;
}

export async function lancar(formData: FormData) {
  const nat = natureza(formData);
  const voltar = `${rotaDaNatureza(nat)}/novo`;
  const { supabase, empresa } = await exigirEmpresa();
  const campos = camposDoTitulo(formData);
  const ausentes = faltando(campos);
  if (ausentes.length) redirect(comAviso(voltar, "erro", `Preencha: ${ausentes.join(", ")}.`));

  const pagoEm = dataIso(texto(formData, "pago_em"));
  if (pagoEm && !texto(formData, "conta_pagamento_id")) {
    redirect(comAviso(voltar, "erro", "Para lançar já pago, informe a conta do pagamento."));
  }

  let descricao = campos.descricao;
  if (!descricao) {
    const tabela = nat === "pagar" ? "fornecedores" : "clientes";
    const { data: pessoa } = await supabase.from(tabela).select("nome").eq("id", campos.pessoa).maybeSingle();
    descricao = `${pessoa?.nome ?? "Título"} · doc. ${campos.numeroDocumento}`;
  }

  const { data: id, error } = await supabase.rpc("lancar", {
    p_empresa: empresa.id,
    p_natureza: nat,
    p_pessoa: campos.pessoa,
    p_tipo_documento: campos.tipo,
    p_numero_documento: campos.numeroDocumento,
    p_competencia: campos.competencia,
    p_vencimento: campos.vencimento,
    p_valor: campos.valor,
    p_categoria: campos.categoria,
    p_descricao: descricao,
    p_centro_custo: opcional(formData, "centro_custo_id"),
    p_conta_prevista: opcional(formData, "conta_prevista_id"),
    p_forma_prevista: opcional(formData, "forma_prevista_id"),
    p_observacoes: opcional(formData, "observacoes"),
    p_pago_em: pagoEm,
    p_conta_pagamento: pagoEm ? opcional(formData, "conta_pagamento_id") : null,
    p_forma_pagamento: pagoEm ? opcional(formData, "forma_pagamento_id") : null,
  });
  if (error || !id) redirect(comAviso(voltar, "erro", mensagemDoBanco(error, "Não foi possível gravar o lançamento.")));

  const { data: titulo } = await supabase.from("titulos").select("codigo").eq("id", id).single();
  revalidarFinanceiro();
  redirect(
    comAviso(`${voltar}?ultimo=${id}`, "ok", `${titulo?.codigo ?? "Lançamento"} gravado${pagoEm ? " e baixado" : ""}.`),
  );
}

export async function editarLancamento(formData: FormData) {
  const id = texto(formData, "lancamento_id");
  const voltar = `${detalhe(id)}/editar`;
  const { supabase } = await exigirEmpresa();
  const nat = natureza(formData);
  const campos = camposDoTitulo(formData);
  const ausentes = faltando({ ...campos, descricao: campos.descricao || "-" });
  if (ausentes.length || !campos.descricao) {
    redirect(comAviso(voltar, "erro", `Preencha: ${[...ausentes, ...(campos.descricao ? [] : ["descrição"])].join(", ")}.`));
  }

  const { error } = await supabase
    .from("lancamentos")
    .update({
      fornecedor_id: nat === "pagar" ? campos.pessoa : null,
      cliente_id: nat === "receber" ? campos.pessoa : null,
      tipo_documento_id: campos.tipo,
      numero_documento: campos.numeroDocumento,
      competencia: campos.competencia,
      vencimento: campos.vencimento,
      valor: campos.valor,
      categoria_id: campos.categoria,
      descricao: campos.descricao,
      centro_custo_id: opcional(formData, "centro_custo_id"),
      conta_prevista_id: opcional(formData, "conta_prevista_id"),
      forma_prevista_id: opcional(formData, "forma_prevista_id"),
      observacoes: opcional(formData, "observacoes"),
    })
    .eq("id", id);
  if (error) redirect(comAviso(voltar, "erro", mensagemDoBanco(error, "Não foi possível salvar as alterações.")));
  revalidarFinanceiro();
  redirect(comAviso(detalhe(id), "ok", "Alterações salvas."));
}

export async function baixar(formData: FormData) {
  const id = texto(formData, "lancamento_id");
  const { supabase, empresa } = await exigirEmpresa();
  const data = dataIso(texto(formData, "data"));
  const valor = valorMonetario(texto(formData, "valor"));
  const conta = texto(formData, "conta_id");
  if (!data || !valor || !conta) redirect(comAviso(detalhe(id), "erro", "Informe data, valor e conta da baixa."));

  const { error } = await supabase.from("baixas").insert({
    lancamento_id: id,
    empresa_id: empresa.id,
    data,
    valor,
    conta_id: conta,
    forma_id: opcional(formData, "forma_id"),
  });
  if (error) redirect(comAviso(detalhe(id), "erro", mensagemDoBanco(error, "Não foi possível registrar a baixa.")));
  revalidarFinanceiro();
  redirect(comAviso(detalhe(id), "ok", "Baixa registrada."));
}

export async function baixarEmLote(formData: FormData) {
  const nat = natureza(formData);
  const voltar = `/financeiro/tesouraria?natureza=${nat}`;
  const { supabase, empresa } = await exigirEmpresa();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const data = dataIso(texto(formData, "data"));
  const conta = texto(formData, "conta_id");
  if (!ids.length) redirect(comAviso(voltar, "erro", "Marque ao menos um título."));
  if (!data || !conta) redirect(comAviso(voltar, "erro", "Informe a data e a conta da baixa."));

  const { data: total, error } = await supabase.rpc("baixar_lote", {
    p_empresa: empresa.id,
    p_lancamentos: ids,
    p_data: data,
    p_conta: conta,
    p_forma: opcional(formData, "forma_id"),
  });
  if (error) redirect(comAviso(voltar, "erro", mensagemDoBanco(error, "Nenhuma baixa foi feita.")));
  revalidarFinanceiro();
  redirect(comAviso(voltar, "ok", `${total} ${total === 1 ? "título baixado" : "títulos baixados"} em ${data.split("-").reverse().join("/")}.`));
}

export async function estornar(formData: FormData) {
  const id = texto(formData, "lancamento_id");
  const { supabase } = await exigirEmpresa();
  const motivo = texto(formData, "motivo");
  if (!motivo) redirect(comAviso(detalhe(id), "erro", "Informe o motivo do estorno."));
  const { error } = await supabase.from("estornos").insert({ baixa_id: texto(formData, "baixa_id"), motivo });
  if (error) redirect(comAviso(detalhe(id), "erro", mensagemDoBanco(error, "Não foi possível estornar.")));
  revalidarFinanceiro();
  redirect(comAviso(detalhe(id), "ok", "Baixa estornada. O título voltou a ficar em aberto."));
}

export async function cancelar(formData: FormData) {
  const id = texto(formData, "lancamento_id");
  const { supabase } = await exigirEmpresa();
  const motivo = texto(formData, "motivo");
  if (!motivo) redirect(comAviso(detalhe(id), "erro", "Informe o motivo do cancelamento."));
  const { error } = await supabase
    .from("lancamentos")
    .update({ cancelado_em: new Date().toISOString(), cancelado_motivo: motivo })
    .eq("id", id);
  if (error) redirect(comAviso(detalhe(id), "erro", mensagemDoBanco(error, "Não foi possível cancelar.")));
  revalidarFinanceiro();
  redirect(comAviso(detalhe(id), "ok", "Lançamento cancelado."));
}

export async function excluirLancamento(formData: FormData) {
  const id = texto(formData, "lancamento_id");
  const { supabase } = await exigirEmpresa();
  const { error } = await supabase.from("lancamentos").delete().eq("id", id);
  if (error) redirect(comAviso(detalhe(id), "erro", mensagemDoBanco(error, "Não foi possível excluir.")));
  revalidarFinanceiro();
  redirect(comAviso(rotaDaNatureza(natureza(formData)), "ok", "Lançamento excluído."));
}

export async function localizarTitulo(formData: FormData) {
  const voltar = texto(formData, "voltar").startsWith("/") ? texto(formData, "voltar") : "/financeiro/tesouraria";
  const { supabase, empresa } = await exigirEmpresa();
  const entrada = texto(formData, "codigo").toUpperCase().replace(/\s/g, "");
  const achado = /^([PR])?0*(\d+)$/.exec(entrada);
  if (!achado) redirect(comAviso(voltar, "erro", "Digite o número do lançamento, por exemplo P000125 ou R000040."));

  let consulta = supabase.from("titulos").select("id").eq("empresa_id", empresa.id).eq("numero", Number(achado[2]));
  if (achado[1]) consulta = consulta.eq("natureza", achado[1] === "P" ? "pagar" : "receber");
  const { data } = await consulta.limit(2);
  if (!data?.length) redirect(comAviso(voltar, "erro", `Lançamento ${entrada} não encontrado nesta empresa.`));
  if (data.length > 1) redirect(comAviso(voltar, "erro", `Existe P e R com esse número; digite com a letra.`));
  redirect(detalhe(data[0].id));
}

export async function transferir(formData: FormData) {
  const voltar = "/financeiro/transferencias";
  const { supabase, empresa } = await exigirEmpresa();
  const origem = texto(formData, "conta_origem_id");
  const destino = texto(formData, "conta_destino_id");
  const data = dataIso(texto(formData, "data"));
  const valor = valorMonetario(texto(formData, "valor"));
  if (!origem || !destino || !data || !valor) redirect(comAviso(voltar, "erro", "Informe origem, destino, data e valor."));
  if (origem === destino) redirect(comAviso(voltar, "erro", "Origem e destino precisam ser contas diferentes."));

  const { error } = await supabase.from("transferencias").insert({
    empresa_id: empresa.id,
    conta_origem_id: origem,
    conta_destino_id: destino,
    data,
    valor,
    descricao: texto(formData, "descricao") || "Transferência entre contas",
    observacao: opcional(formData, "observacao"),
  });
  if (error) redirect(comAviso(voltar, "erro", mensagemDoBanco(error, "Não foi possível registrar a transferência.")));
  revalidarFinanceiro();
  redirect(comAviso(voltar, "ok", "Transferência registrada."));
}

export async function excluirTransferencia(formData: FormData) {
  const voltar = "/financeiro/transferencias";
  const { supabase } = await exigirEmpresa();
  const { error } = await supabase.from("transferencias").delete().eq("id", texto(formData, "id"));
  if (error) redirect(comAviso(voltar, "erro", mensagemDoBanco(error, "Não foi possível excluir a transferência.")));
  revalidarFinanceiro();
  redirect(comAviso(voltar, "ok", "Transferência excluída."));
}
