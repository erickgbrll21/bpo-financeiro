"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { comAviso, mensagemDoBanco, opcional, texto } from "@/lib/form";
import { exigirEmpresa, lerSessao, type Papel } from "@/lib/sessao";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PAPEIS: Papel[] = ["administrador", "financeiro", "operador", "visualizador"];

export async function entrar(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?erro=config");
  const { error } = await supabase.auth.signInWithPassword({
    email: texto(formData, "email"),
    password: String(formData.get("senha") ?? ""),
  });
  if (error) redirect("/login?erro=credencial");
  redirect("/");
}

export async function sair() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/login");
}

export async function escolherEmpresa(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");
  const escolhida = texto(formData, "empresa_id");
  if (sessao.empresas.some((item) => item.empresa.id === escolhida)) {
    (await cookies()).set("bpo_empresa", escolhida, { path: "/", sameSite: "lax", httpOnly: true });
  }
  revalidatePath("/", "layout");
  redirect(texto(formData, "voltar").startsWith("/") ? texto(formData, "voltar") : "/");
}

export async function criarEmpresa(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");
  const rota = "/cadastros/empresas";
  if (sessao.empresas.length > 0 && !sessao.empresas.some((item) => item.papel === "administrador")) {
    redirect(comAviso(rota, "erro", "Só administradores cadastram novas empresas."));
  }
  const razao = texto(formData, "razao_social");
  if (!razao) redirect(comAviso(rota, "erro", "Informe a razão social."));

  const supabase = (await createClient())!;
  const { data: grupo, error: erroGrupo } = await supabase
    .from("grupos_economicos")
    .insert({ nome: texto(formData, "grupo") || razao, created_by: sessao.usuarioId })
    .select("id")
    .single();
  if (erroGrupo || !grupo) redirect(comAviso(rota, "erro", mensagemDoBanco(erroGrupo, "Não foi possível criar o grupo econômico.")));

  // Sem RETURNING: o vínculo de administrador nasce num gatilho AFTER, e até lá a política de leitura barra a linha.
  const empresa = { id: crypto.randomUUID() };
  const { error } = await supabase
    .from("empresas")
    .insert({
      id: empresa.id,
      grupo_id: grupo.id,
      razao_social: razao,
      nome_fantasia: opcional(formData, "nome_fantasia"),
      cnpj: opcional(formData, "cnpj"),
      codigo_dominio: opcional(formData, "codigo_dominio"),
      observacoes: opcional(formData, "observacoes"),
      created_by: sessao.usuarioId,
    });
  if (error) redirect(comAviso(rota, "erro", mensagemDoBanco(error, "Não foi possível cadastrar a empresa.")));

  if (sessao.empresas.length === 0) {
    (await cookies()).set("bpo_empresa", empresa.id, { path: "/", sameSite: "lax", httpOnly: true });
  }
  revalidatePath("/", "layout");
  redirect(comAviso(rota, "ok", `${razao} cadastrada com classificações, centros de custo e formas da planilha.`));
}

export async function criarUsuarioPorAdmin(formData: FormData) {
  const rota = "/cadastros/usuarios";
  const { supabase, empresa, papel: meuPapel } = await exigirEmpresa();
  if (meuPapel !== "administrador") redirect(comAviso(rota, "erro", "Somente administrador pode criar usuários."));
  const admin = createAdminClient();
  if (!admin) redirect(comAviso(rota, "erro", "Falta a chave secret do Supabase no servidor."));

  const email = texto(formData, "email").toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const papel = texto(formData, "papel") as Papel;
  if (!email || senha.length < 6 || !PAPEIS.includes(papel)) {
    redirect(comAviso(rota, "erro", "Informe e-mail, senha com pelo menos 6 caracteres e um papel válido."));
  }

  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (erroAuth || !criado.user) redirect(comAviso(rota, "erro", "Não foi possível criar o usuário. O e-mail pode já existir."));

  const { error: erroVinculo } = await supabase
    .from("usuarios_empresas")
    .insert({ usuario_id: criado.user.id, empresa_id: empresa.id, papel });
  if (erroVinculo) {
    await admin.auth.admin.deleteUser(criado.user.id);
    redirect(comAviso(rota, "erro", "O vínculo com a empresa falhou; o usuário não foi criado."));
  }

  revalidatePath(rota);
  redirect(comAviso(rota, "ok", `${email} criado como ${papel}.`));
}
