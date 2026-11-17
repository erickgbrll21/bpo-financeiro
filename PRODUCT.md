# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Equipe de BPO financeiro da BC Consultores. Cada operador atende várias empresas clientes, alternando entre elas ao longo do dia: lança contas a pagar e a receber, dá baixa quando o dinheiro sai ou entra no banco, estorna erros e confere saldos contra extratos. Trabalha no desktop, no escritório, em sessões longas de digitação e conferência.

Papéis no sistema: administrador, financeiro, operador e visualizador, sempre por empresa.

## Product Purpose

Substituir a "Planilha BPO" (Excel com macros, Rev 02) por um sistema web multiempresa, sem perder as rotinas que a planilha já resolve. Sucesso: o operador faz o ciclo lançamento → tesouraria → conferência mais rápido que na planilha e sem os riscos dela (fórmulas quebradas, estrutura travada por senha, um arquivo por grupo).

## Positioning

Regras financeiras garantidas no banco, não na disciplina do operador: o valor original do título nunca muda, cada baixa reduz o saldo, estorno fica registrado e devolve o saldo, cancelamento exige motivo e lançamento com baixa não é apagado. Tudo com histórico de alterações e isolamento por empresa.

## Operating Context

- Rotina vinda da planilha: cadastros (fornecedores com código F0001, clientes com beneficiário/residente e tutor, classificações de receitas e despesas por grupo de DRE, contas financeiras com saldo inicial, centros de custo, formas de pagamento), lançamentos a pagar e a receber com tipo e número de documento, competência e vencimento, tesouraria para baixa em lote e estorno, transferências entre contas, títulos em aberto com filtros, fluxo de caixa, DRE.
- Cliente atual: grupo de 3 empresas de uma ILPI (residentes, mensalidades, apoio hospitalar segundo a RDC Anvisa 50/2002).
- Integração contábil com o sistema Domínio (plano de contas e mapa de contas da BC Consultores).
- Conferência mensal com extratos bancários (OFX na planilha).

## Capabilities and Constraints

- Stack: Next.js 16 (App Router, Server Actions), Supabase (Postgres com RLS, Auth), Tailwind 4.
- Valores monetários em `numeric(15,2)` e `decimal.js`; datas no formato brasileiro na interface.
- Visão consolidada (todas as empresas) existe na planilha apenas para consulta; ainda não decidida no sistema.
- Ainda não implementados no sistema: fluxo de caixa, DRE, metas/KPI, relatório PDF, extratos OFX e conciliação, plano/mapa de contas e arquivo Domínio, apoio hospitalar.

## Brand Commitments

Nome obrigatório: "BC Consultores · BPO Financeiro". Cores, tipografia e demais elementos visuais podem mudar.

## Evidence on Hand

- `Planilha BPO - Rev 02 - modelo sem dados.xlsm` (raiz do repositório): referência funcional, com listas reais de classificações de receitas e despesas, tipos de documento e formas de pagamento.
- Nenhum depoimento, logotipo em arquivo ou dado de cliente real no repositório; não inventar.

## Product Principles

1. Nenhuma rotina da planilha some sem substituto equivalente ou melhor.
2. O dinheiro é rastreável: toda mudança de saldo tem origem, data, conta e autor.
3. Densidade de informação acima de decoração: o operador confere números, não lê textos.
4. A empresa ativa está sempre explícita; trocar de empresa nunca mistura dados.
5. Erros se corrigem por estorno e cancelamento com motivo, nunca por apagar histórico.

## Accessibility & Inclusion

Uso prolongado em desktop: contraste alto em números, navegação por teclado completa nos formulários de lançamento e baixa, foco visível.
