-- Leitura pronta para as telas: um título por linha com nomes, saldo e situação,
-- e o saldo de todas as contas da empresa numa única chamada.

create view public.titulos
with (security_invoker = true) as
select
  r.id,
  r.empresa_id,
  r.natureza,
  l.numero,
  (case when r.natureza = 'pagar' then 'P' else 'R' end) || lpad(l.numero::text, 6, '0') as codigo,
  coalesce(r.fornecedor_id, r.cliente_id) as pessoa_id,
  coalesce(f.nome, c.nome) as pessoa_nome,
  c.beneficiario,
  r.tipo_documento_id,
  td.nome as tipo_nome,
  r.numero_documento,
  r.competencia,
  r.vencimento,
  r.descricao,
  r.valor,
  r.valor_baixado,
  r.saldo,
  r.situacao,
  r.categoria_id,
  cat.nome as categoria_nome,
  cat.grupo_dre,
  r.centro_custo_id,
  cc.nome as centro_nome,
  l.conta_prevista_id,
  l.forma_prevista_id,
  r.observacoes,
  r.cancelado_em,
  r.cancelado_motivo,
  (
    select max(b.data) from public.baixas b
    where b.lancamento_id = r.id
      and not exists (select 1 from public.estornos e where e.baixa_id = b.id)
  ) as ultima_baixa,
  l.created_at
from public.lancamentos_resumo r
join public.lancamentos l on l.id = r.id
join public.tipos_documento td on td.id = r.tipo_documento_id
join public.categorias cat on cat.id = r.categoria_id
left join public.fornecedores f on f.id = r.fornecedor_id
left join public.clientes c on c.id = r.cliente_id
left join public.centros_custos cc on cc.id = r.centro_custo_id;

grant select on public.titulos to authenticated;

create or replace function public.saldos_contas(p_empresa uuid, p_ate date)
returns table (id uuid, nome text, banco text, ativa boolean, saldo numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.nome, c.banco, c.ativa, coalesce(public.saldo_conta(c.id, p_ate), 0)
  from public.contas_financeiras c
  where c.empresa_id = p_empresa
  order by c.ativa desc, c.nome;
$$;

grant execute on function public.saldos_contas(uuid, date) to authenticated;
