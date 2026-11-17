import type { Metadata } from "next";
import { Aviso, Cabecalho, Vazio } from "@/components/ui";
import { criarCliente } from "@/features/cadastros/actions";
import { AlternarAtivo, Campo, FormLateral, Inativo } from "@/features/cadastros/componentes";
import { exigirEmpresa, nomeEmpresa, PODE_LANCAR } from "@/lib/sessao";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage({ searchParams }: PageProps<"/cadastros/clientes">) {
  const busca = await searchParams;
  const { supabase, empresa, papel } = await exigirEmpresa();
  const { data } = await supabase
    .from("clientes")
    .select("id, nome, beneficiario, tutor, telefone, email, ativo")
    .eq("empresa_id", empresa.id)
    .order("ativo", { ascending: false })
    .order("nome");
  const clientes = data ?? [];
  const pode = PODE_LANCAR.includes(papel);

  return (
    <>
      <Cabecalho titulo="Clientes" descricao={`${nomeEmpresa(empresa)} · responsáveis financeiros, com o residente ou paciente atendido.`} />
      <Aviso busca={busca} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="folha overflow-x-auto">
          {clientes.length === 0 ? (
            <Vazio titulo="Nenhum cliente cadastrado.">Cadastre ao lado para poder lançar contas a receber.</Vazio>
          ) : (
            <table className="tabela min-w-[720px]">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Residente / paciente</th>
                  <th>Tutor</th>
                  <th>Contato</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {clientes.map((item) => (
                  <tr key={item.id} className={item.ativo ? "" : "text-tinta-2"}>
                    <td className="font-medium">
                      {item.nome}
                      {item.ativo ? null : <Inativo />}
                    </td>
                    <td>{item.beneficiario ?? "—"}</td>
                    <td>{item.tutor ?? "—"}</td>
                    <td>{[item.telefone, item.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="text-right">{pode ? <AlternarAtivo tabela="clientes" id={item.id} ativo={item.ativo} /> : null}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>{clientes.filter((item) => item.ativo).length} ativos de {clientes.length}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        {pode ? (
          <FormLateral titulo="Novo cliente" action={criarCliente} botao="Cadastrar cliente">
            <Campo rotulo="Nome do responsável" name="nome" required />
            <Campo rotulo="Residente / paciente" name="beneficiario" />
            <Campo rotulo="Tutor" name="tutor" />
            <Campo rotulo="Contato" name="contato" />
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Telefone" name="telefone" type="tel" />
              <Campo rotulo="Telefone 2" name="telefone_secundario" type="tel" />
            </div>
            <Campo rotulo="E-mail" name="email" type="email" />
            <Campo rotulo="Endereço" name="endereco" />
            <Campo rotulo="Observações" name="observacoes" />
          </FormLateral>
        ) : null}
      </div>
    </>
  );
}
