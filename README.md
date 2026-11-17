# BPO Financeiro

Gestão de contas a pagar, contas a receber, baixas e estornos. A landing de médicos não faz parte deste app.

## Regras já gravadas no banco

- A baixa parcial não altera o valor original. O saldo fica em aberto e o título continua previsto.
- O estorno não apaga a baixa. Ele devolve o saldo e guarda o motivo.
- Cancelar exige motivo e nenhuma baixa ativa. Título com baixa, mesmo estornada, não é excluído.
- Receita e despesa do painel usam a competência. O saldo da conta usa apenas baixas não estornadas, posteriores à data do saldo inicial, mais transferências.

## Subir

1. Crie um projeto no Supabase.
2. Rode o SQL de `supabase/migrations/20261117131500_financeiro_inicial.sql` no editor SQL.
3. Copie `.env.example` para `.env.local` e preencha a URL, a chave publishable e a secret.
4. No painel do Supabase: Authentication → Providers → Email → desative **Allow new users to sign up**. Contas novas só entram pela tela Usuários (administrador).
5. `npm install` e `npm run dev`.
6. Entre com a conta administrador, cadastre a empresa e selecione-a no topo. Depois use Cadastros → Usuários para criar os demais.

O plano de contas real e os saldos da planilha não entram neste repositório. A importação fica para a fase seguinte.
