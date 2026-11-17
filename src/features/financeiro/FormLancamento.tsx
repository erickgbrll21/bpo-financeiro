import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { valor as formatarValor } from "@/lib/utils";
import { editarLancamento, lancar } from "./actions";
import { type Opcoes, porGrupo } from "./consultas";
import { type Natureza, rotaDaNatureza, TEXTOS } from "./natureza";

export type ValoresLancamento = {
  id: string;
  pessoa_id: string;
  tipo_documento_id: string;
  numero_documento: string;
  competencia: string;
  vencimento: string;
  valor: number;
  categoria_id: string;
  centro_custo_id: string | null;
  conta_prevista_id: string | null;
  forma_prevista_id: string | null;
  descricao: string;
  observacoes: string | null;
};

function Lista({ nome, rotulo, opcoes, padrao, vazio = "—" }: { nome: string; rotulo: string; opcoes: { id: string; nome: string }[]; padrao?: string | null; vazio?: string }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <select name={nome} defaultValue={padrao ?? ""} className="entrada">
        <option value="">{vazio}</option>
        {opcoes.map((opcao) => (
          <option key={opcao.id} value={opcao.id}>
            {opcao.nome}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FormLancamento({
  natureza,
  opcoes,
  hoje,
  atual,
  comBaixa = false,
}: {
  natureza: Natureza;
  opcoes: Opcoes;
  hoje: string;
  atual?: ValoresLancamento;
  comBaixa?: boolean;
}) {
  const textos = TEXTOS[natureza];
  const editando = Boolean(atual);
  const voltar = atual ? `/financeiro/lancamentos/${atual.id}` : rotaDaNatureza(natureza);
  const travado = editando && comBaixa;

  return (
    <form action={editando ? editarLancamento : lancar} className="folha grid gap-6 p-6">
      <input type="hidden" name="natureza" value={natureza} />
      {atual ? <input type="hidden" name="lancamento_id" value={atual.id} /> : null}
      {travado ? (
        <>
          <input type="hidden" name="pessoa_id" value={atual!.pessoa_id} />
          <input type="hidden" name="competencia" value={atual!.competencia} />
          <input type="hidden" name="valor" value={formatarValor(atual!.valor)} />
          <p className="rounded-[4px] bg-ambar-fundo px-3 py-2 text-ambar">
            Este título já teve baixa: {textos.pessoa.toLowerCase()}, competência e valor ficam travados. Estorne as baixas para alterá-los.
          </p>
        </>
      ) : null}

      <fieldset className="grid gap-4 md:grid-cols-4">
        <legend className="mb-3 text-base font-bold">Título</legend>
        <label className="campo md:col-span-2">
          <span>{textos.pessoa} *</span>
          <select name="pessoa_id" required defaultValue={atual?.pessoa_id ?? ""} disabled={travado} className="entrada">
            <option value="" disabled>
              Escolha…
            </option>
            {opcoes.pessoas.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome}
              </option>
            ))}
          </select>
          {opcoes.pessoas.length === 0 ? (
            <Link href={`/cadastros/${textos.tabelaPessoa}`} className="link text-xs">
              Nenhum {textos.pessoa.toLowerCase()} ativo. Cadastrar agora
            </Link>
          ) : null}
        </label>
        <label className="campo md:col-span-2">
          <span>Classificação *</span>
          <select name="categoria_id" required defaultValue={atual?.categoria_id ?? ""} className="entrada">
            <option value="" disabled>
              Escolha…
            </option>
            {porGrupo(opcoes.categorias).map(([grupo, itens]) => (
              <optgroup key={grupo} label={grupo}>
                {itens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>Tipo de documento *</span>
          <select name="tipo_documento_id" required defaultValue={atual?.tipo_documento_id ?? ""} className="entrada">
            <option value="" disabled>
              Escolha…
            </option>
            {opcoes.tipos.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Nº do documento *</span>
          <input name="numero_documento" required defaultValue={atual?.numero_documento} className="entrada" />
        </label>
        <label className="campo">
          <span>Competência *</span>
          <input
            type="date"
            name="competencia"
            required
            defaultValue={atual?.competencia ?? hoje}
            disabled={travado}
            className="entrada"
          />
        </label>
        <label className="campo">
          <span>Vencimento *</span>
          <input type="date" name="vencimento" required defaultValue={atual?.vencimento} className="entrada" />
        </label>

        <label className="campo">
          <span>Valor (R$) *</span>
          <input
            name="valor"
            required
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={atual ? formatarValor(atual.valor) : ""}
            disabled={travado}
            className="entrada text-right tabular-nums"
          />
        </label>
        <Lista nome="centro_custo_id" rotulo="Centro de custo" opcoes={opcoes.centros} padrao={atual?.centro_custo_id} />
        <Lista nome="conta_prevista_id" rotulo="Conta prevista" opcoes={opcoes.contas} padrao={atual?.conta_prevista_id} />
        <Lista nome="forma_prevista_id" rotulo="Forma prevista" opcoes={opcoes.formas} padrao={atual?.forma_prevista_id} />

        <label className="campo md:col-span-4">
          <span>Descrição{editando ? " *" : ""}</span>
          <input
            name="descricao"
            required={editando}
            defaultValue={atual?.descricao}
            placeholder={editando ? undefined : `Se ficar em branco: nome do ${textos.pessoa.toLowerCase()} e nº do documento`}
            className="entrada"
          />
        </label>
        <label className="campo md:col-span-4">
          <span>Observações</span>
          <textarea name="observacoes" rows={2} defaultValue={atual?.observacoes ?? ""} className="entrada" />
        </label>
      </fieldset>

      {editando ? null : (
        <details className="group rounded-[4px] border border-filete">
          <summary className="flex items-center gap-2 px-4 py-3 font-semibold">
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" strokeWidth={2} aria-hidden />
            Já foi {natureza === "pagar" ? "pago" : "recebido"}? Registrar a baixa junto
          </summary>
          <div className="grid gap-4 border-t border-filete px-4 py-4 md:grid-cols-4">
            <label className="campo">
              <span>{textos.data}</span>
              <input type="date" name="pago_em" className="entrada" />
            </label>
            <Lista nome="conta_pagamento_id" rotulo="Conta" opcoes={opcoes.contas} vazio="Escolha…" />
            <Lista nome="forma_pagamento_id" rotulo="Forma" opcoes={opcoes.formas} />
            <p className="self-end pb-2 text-tinta-2 md:col-span-1">A baixa entra pelo valor total do título.</p>
          </div>
        </details>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-filete pt-5">
        <button type="submit" className="botao">
          {editando ? "Salvar alterações" : "Gravar lançamento"}
        </button>
        <Link href={voltar} className="botao-claro">
          {editando ? "Descartar" : "Voltar à lista"}
        </Link>
        <p className="text-tinta-2">* obrigatório</p>
      </div>
    </form>
  );
}
