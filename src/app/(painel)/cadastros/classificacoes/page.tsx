import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, Cabecalho, param } from "@/components/ui";
import { criarClassificacao } from "@/features/cadastros/actions";
import { AlternarAtivo, Campo, FormLateral, Inativo } from "@/features/cadastros/componentes";
import { exigirEmpresa, nomeEmpresa, PODE_LANCAR } from "@/lib/sessao";

export const metadata: Metadata = { title: "Classificações" };

export default async function ClassificacoesPage({ searchParams }: PageProps<"/cadastros/classificacoes">) {
  const busca = await searchParams;
  const natureza = param(busca, "natureza") === "receber" ? "receber" : "pagar";
  const { supabase, empresa, papel } = await exigirEmpresa();
  const { data } = await supabase
    .from("categorias")
    .select("id, grupo_dre, nome, ativa")
    .eq("empresa_id", empresa.id)
    .eq("natureza", natureza)
    .order("grupo_dre")
    .order("nome");
  const categorias = data ?? [];
  const grupos = [...new Set(categorias.map((item) => item.grupo_dre))];
  const pode = PODE_LANCAR.includes(papel);

  return (
    <>
      <Cabecalho
        titulo="Classificações"
        descricao={`${nomeEmpresa(empresa)} · plano de receitas (PR) e despesas (PD) da planilha, agrupado como na DRE.`}
      >
        <nav aria-label="Natureza" className="segmentos">
          <Link href="/cadastros/classificacoes" aria-current={natureza === "pagar" ? "page" : undefined}>
            Despesas (PD)
          </Link>
          <Link href="/cadastros/classificacoes?natureza=receber" aria-current={natureza === "receber" ? "page" : undefined}>
            Receitas (PR)
          </Link>
        </nav>
      </Cabecalho>
      <Aviso busca={busca} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="folha overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Classificação</th>
                <th />
              </tr>
            </thead>
            {grupos.map((grupo) => (
              <tbody key={grupo}>
                <tr>
                  <th colSpan={2} className="bg-papel !text-tinta">
                    {grupo}
                  </th>
                </tr>
                {categorias
                  .filter((item) => item.grupo_dre === grupo)
                  .map((item) => (
                    <tr key={item.id} className={item.ativa ? "" : "text-tinta-2"}>
                      <td className="pl-6">
                        {item.nome}
                        {item.ativa ? null : <Inativo />}
                      </td>
                      <td className="text-right">{pode ? <AlternarAtivo tabela="categorias" id={item.id} ativo={item.ativa} /> : null}</td>
                    </tr>
                  ))}
              </tbody>
            ))}
            <tfoot>
              <tr>
                <td colSpan={2}>
                  {categorias.length} classificações em {grupos.length} grupos
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {pode ? (
          <FormLateral titulo="Nova classificação" action={criarClassificacao} botao="Criar classificação">
            <input type="hidden" name="natureza" value={natureza} />
            <label className="campo">
              <span>Grupo da DRE *</span>
              <input name="grupo_dre" required list="grupos" className="entrada" placeholder="Escolha ou digite um novo" />
              <datalist id="grupos">
                {grupos.map((grupo) => (
                  <option key={grupo} value={grupo} />
                ))}
              </datalist>
            </label>
            <Campo rotulo="Nome" name="nome" required />
            <p className="text-tinta-2">
              Classificação usada em lançamento não é apagada: inative para tirá-la das listas.
            </p>
          </FormLateral>
        ) : null}
      </div>
    </>
  );
}
