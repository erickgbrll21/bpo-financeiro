import type { Metadata } from "next";
import { Aviso, Cabecalho, Vazio } from "@/components/ui";
import { criarFornecedor } from "@/features/cadastros/actions";
import { AlternarAtivo, Campo, FormLateral, Inativo } from "@/features/cadastros/componentes";
import { exigirEmpresa, nomeEmpresa, PODE_LANCAR } from "@/lib/sessao";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function FornecedoresPage({ searchParams }: PageProps<"/cadastros/fornecedores">) {
  const busca = await searchParams;
  const { supabase, empresa, papel } = await exigirEmpresa();
  const { data } = await supabase
    .from("fornecedores")
    .select("id, codigo, nome, documento, contato, telefone, email, ativo")
    .eq("empresa_id", empresa.id)
    .order("ativo", { ascending: false })
    .order("nome");
  const fornecedores = data ?? [];
  const pode = PODE_LANCAR.includes(papel);

  return (
    <>
      <Cabecalho titulo="Fornecedores" descricao={`${nomeEmpresa(empresa)} · o código F0001 é gerado na gravação.`} />
      <Aviso busca={busca} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="folha overflow-x-auto">
          {fornecedores.length === 0 ? (
            <Vazio titulo="Nenhum fornecedor cadastrado.">Cadastre ao lado para poder lançar contas a pagar.</Vazio>
          ) : (
            <table className="tabela min-w-[720px]">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>CNPJ / CPF</th>
                  <th>Contato</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((item) => (
                  <tr key={item.id} className={item.ativo ? "" : "text-tinta-2"}>
                    <td className="tabular-nums">{item.codigo}</td>
                    <td className="font-medium">
                      {item.nome}
                      {item.ativo ? null : <Inativo />}
                    </td>
                    <td className="tabular-nums">{item.documento ?? "—"}</td>
                    <td>
                      {[item.contato, item.telefone, item.email].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="text-right">{pode ? <AlternarAtivo tabela="fornecedores" id={item.id} ativo={item.ativo} /> : null}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>{fornecedores.filter((item) => item.ativo).length} ativos de {fornecedores.length}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        {pode ? (
          <FormLateral titulo="Novo fornecedor" action={criarFornecedor} botao="Cadastrar fornecedor">
            <Campo rotulo="Nome" name="nome" required />
            <Campo rotulo="CNPJ / CPF" name="documento" />
            <Campo rotulo="Contato" name="contato" />
            <Campo rotulo="Telefone" name="telefone" type="tel" />
            <Campo rotulo="E-mail" name="email" type="email" />
            <Campo rotulo="Endereço" name="endereco" />
            <Campo rotulo="Observações" name="observacoes" />
          </FormLateral>
        ) : null}
      </div>
    </>
  );
}
