import type { Metadata } from "next";
import { Aviso, Cabecalho } from "@/components/ui";
import { criarUsuarioPorAdmin } from "@/features/acesso/actions";
import { Campo, FormLateral } from "@/features/cadastros/componentes";
import { exigirEmpresa, nomeEmpresa } from "@/lib/sessao";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Usuários" };

const PAPEIS = [
  ["administrador", "Administrador", "Tudo, inclusive usuários e empresas"],
  ["financeiro", "Financeiro", "Lança, dá baixa, estorna e transfere"],
  ["operador", "Operador", "Lança e cadastra; não dá baixa"],
  ["visualizador", "Visualizador", "Só consulta"],
] as const;

export default async function UsuariosPage({ searchParams }: PageProps<"/cadastros/usuarios">) {
  const busca = await searchParams;
  const { supabase, empresa, papel } = await exigirEmpresa();
  if (papel !== "administrador") {
    return <Cabecalho titulo="Usuários" descricao="Somente administrador pode criar e ver usuários desta empresa." />;
  }

  const admin = createAdminClient();
  const { data: vinculos } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id, papel")
    .eq("empresa_id", empresa.id)
    .order("papel");
  const emails = new Map(
    await Promise.all(
      (admin ? (vinculos ?? []) : []).map(async (item) => {
        const { data } = await admin!.auth.admin.getUserById(item.usuario_id);
        return [item.usuario_id, data.user?.email ?? item.usuario_id] as const;
      }),
    ),
  );

  return (
    <>
      <Cabecalho titulo="Usuários" descricao={`Quem acessa ${nomeEmpresa(empresa)} e com qual papel.`} />
      <Aviso busca={busca} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="folha overflow-x-auto">
          <table className="tabela min-w-[520px]">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Pode</th>
              </tr>
            </thead>
            <tbody>
              {(vinculos ?? []).map((item) => {
                const info = PAPEIS.find(([id]) => id === item.papel);
                return (
                  <tr key={item.usuario_id}>
                    <td className="font-medium">{emails.get(item.usuario_id) ?? item.usuario_id}</td>
                    <td>
                      <span className="selo text-tinta-2">{info?.[1] ?? item.papel}</span>
                    </td>
                    <td className="text-tinta-2">{info?.[2]}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>{(vinculos ?? []).length} usuários</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <FormLateral titulo="Novo usuário" action={criarUsuarioPorAdmin} botao="Criar e vincular">
          <Campo rotulo="E-mail" name="email" type="email" required autoComplete="off" />
          <Campo rotulo="Senha inicial" name="senha" type="password" required minLength={6} autoComplete="new-password" />
          <label className="campo">
            <span>Papel *</span>
            <select name="papel" defaultValue="operador" required className="entrada">
              {PAPEIS.map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          {admin ? null : <p className="text-vermelho">Falta SUPABASE_SECRET_KEY no servidor para criar usuários.</p>}
        </FormLateral>
      </div>
    </>
  );
}
