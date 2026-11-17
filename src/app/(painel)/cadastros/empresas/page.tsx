import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Aviso, Cabecalho, Vazio } from "@/components/ui";
import { criarEmpresa } from "@/features/acesso/actions";
import { Campo, FormLateral } from "@/features/cadastros/componentes";
import { lerSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Empresas" };

export default async function EmpresasPage({ searchParams }: PageProps<"/cadastros/empresas">) {
  const [sessao, busca] = await Promise.all([lerSessao(), searchParams]);
  if (!sessao) redirect("/login");
  const podeCriar = sessao.empresas.length === 0 || sessao.empresas.some((item) => item.papel === "administrador");

  return (
    <>
      <Cabecalho titulo="Empresas" descricao="Empresas clientes atendidas pelo BPO às quais você tem acesso." />
      <Aviso busca={busca} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="folha overflow-x-auto">
          {sessao.empresas.length === 0 ? (
            <Vazio titulo="Nenhuma empresa ainda.">
              Cadastre a primeira ao lado. Ela já vem com as classificações, centros de custo e formas de liquidação da planilha.
            </Vazio>
          ) : (
            <table className="tabela min-w-[560px]">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>CNPJ</th>
                  <th>Seu papel</th>
                </tr>
              </thead>
              <tbody>
                {sessao.empresas.map((item) => (
                  <tr key={item.empresa.id}>
                    <td>
                      <p className="font-medium">{item.empresa.nome_fantasia || item.empresa.razao_social}</p>
                      {item.empresa.nome_fantasia ? <p className="text-xs text-tinta-2">{item.empresa.razao_social}</p> : null}
                    </td>
                    <td className="tabular-nums">{item.empresa.cnpj ?? "—"}</td>
                    <td>
                      <span className="selo text-tinta-2">{item.papel}</span>
                      {item.empresa.id === sessao.empresa?.id ? <span className="ml-2 text-xs text-carimbo">em uso</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>{sessao.empresas.length} empresas</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        {podeCriar ? (
          <FormLateral titulo="Nova empresa" action={criarEmpresa} botao="Cadastrar empresa">
            <Campo rotulo="Razão social" name="razao_social" required />
            <Campo rotulo="Nome fantasia" name="nome_fantasia" />
            <Campo rotulo="CNPJ" name="cnpj" />
            <Campo rotulo="Grupo econômico" name="grupo" placeholder="Se vazio, usa a razão social" />
            <Campo rotulo="Código no Domínio" name="codigo_dominio" />
            <Campo rotulo="Observações" name="observacoes" />
          </FormLateral>
        ) : null}
      </div>
    </>
  );
}
