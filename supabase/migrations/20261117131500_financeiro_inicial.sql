-- Núcleo financeiro do BPO.
-- Baixa parcial mantém o valor original e o saldo em aberto.
-- Estorno não apaga a baixa. Cancelamento exige motivo e nenhuma baixa ativa.
-- Exclusão física só existe para lançamento que nunca teve baixa.

create extension if not exists pgcrypto;
create schema if not exists private;

create type public.papel as enum ('administrador', 'financeiro', 'operador', 'visualizador');
create type public.natureza as enum ('pagar', 'receber');

create table public.grupos_economicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos_economicos (id),
  codigo text,
  razao_social text not null,
  nome_fantasia text,
  cnpj text,
  inscricao_estadual text,
  inscricao_municipal text,
  codigo_dominio text,
  observacoes text,
  ativa boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usuarios_empresas (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  papel public.papel not null,
  primary key (usuario_id, empresa_id)
);

create table public.tipos_documento (
  id uuid primary key default gen_random_uuid(),
  natureza public.natureza not null,
  nome text not null,
  unique (natureza, nome)
);

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  codigo text,
  nome text not null,
  documento text,
  contato text,
  telefone text,
  email text,
  endereco text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  nome text not null,
  beneficiario text,
  tutor text,
  contato text,
  telefone text,
  telefone_secundario text,
  email text,
  endereco text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contas_financeiras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  banco text,
  nome text not null,
  agencia text,
  numero text,
  tipo text not null default 'corrente',
  saldo_inicial numeric(15, 2) not null default 0,
  data_saldo_inicial date not null default current_date,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.centros_custos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (empresa_id, nome)
);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  natureza public.natureza not null,
  grupo_dre text not null,
  nome text not null,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  unique (empresa_id, natureza, nome)
);

create table public.formas_liquidacao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  nome text not null,
  ativa boolean not null default true,
  unique (empresa_id, nome)
);

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  natureza public.natureza not null,
  fornecedor_id uuid references public.fornecedores (id),
  cliente_id uuid references public.clientes (id),
  tipo_documento_id uuid not null references public.tipos_documento (id),
  numero_documento text not null,
  competencia date not null,
  vencimento date not null,
  descricao text not null,
  valor numeric(15, 2) not null check (valor > 0),
  categoria_id uuid not null references public.categorias (id),
  centro_custo_id uuid references public.centros_custos (id),
  conta_prevista_id uuid references public.contas_financeiras (id),
  forma_prevista_id uuid references public.formas_liquidacao (id),
  observacoes text,
  cancelado_em timestamptz,
  cancelado_motivo text,
  cancelado_por uuid references auth.users (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (natureza = 'pagar' and fornecedor_id is not null and cliente_id is null)
    or (natureza = 'receber' and cliente_id is not null and fornecedor_id is null)
  ),
  check (cancelado_em is null or length(trim(cancelado_motivo)) > 0)
);

create table public.baixas (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null references public.lancamentos (id),
  empresa_id uuid not null references public.empresas (id),
  data date not null,
  valor numeric(15, 2) not null check (valor > 0),
  conta_id uuid not null references public.contas_financeiras (id),
  forma_id uuid references public.formas_liquidacao (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.estornos (
  id uuid primary key default gen_random_uuid(),
  baixa_id uuid not null unique references public.baixas (id),
  motivo text not null check (length(trim(motivo)) > 0),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.transferencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  conta_origem_id uuid not null references public.contas_financeiras (id),
  conta_destino_id uuid not null references public.contas_financeiras (id),
  data date not null,
  valor numeric(15, 2) not null check (valor > 0),
  descricao text not null,
  observacao text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (conta_origem_id <> conta_destino_id)
);

create table public.plano_contas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  codigo_reduzido text not null,
  classificacao text not null,
  nome text not null,
  tipo char(1) not null check (tipo in ('S', 'A')),
  natureza char(1),
  created_at timestamptz not null default now(),
  unique (empresa_id, codigo_reduzido)
);

create table public.mapeamentos_contabeis (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  categoria_id uuid references public.categorias (id),
  conta_financeira_id uuid references public.contas_financeiras (id),
  conta_debito_id uuid references public.plano_contas (id),
  conta_credito_id uuid references public.plano_contas (id),
  apoio_hospitalar text,
  created_at timestamptz not null default now(),
  check (categoria_id is not null or conta_financeira_id is not null)
);

create table public.historico_alteracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  entidade text not null,
  entidade_id uuid not null,
  acao text not null,
  detalhe jsonb not null default '{}'::jsonb,
  usuario_id uuid,
  created_at timestamptz not null default now()
);

create index lancamentos_empresa_vencimento_idx on public.lancamentos (empresa_id, vencimento);
create index lancamentos_empresa_competencia_idx on public.lancamentos (empresa_id, competencia);
create index baixas_lancamento_idx on public.baixas (lancamento_id);
create index baixas_conta_data_idx on public.baixas (conta_id, data);

create or replace function private.papel_na_empresa(p_empresa uuid)
returns public.papel
language sql
stable
security definer
set search_path = ''
as $$
  select ue.papel
  from public.usuarios_empresas ue
  where ue.usuario_id = auth.uid()
    and ue.empresa_id = p_empresa
$$;

create or replace function private.pode(p_empresa uuid, p_papeis public.papel[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.papel_na_empresa(p_empresa) = any (p_papeis)
$$;

create or replace function private.registrar(
  p_empresa uuid,
  p_entidade text,
  p_id uuid,
  p_acao text,
  p_detalhe jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.historico_alteracoes (empresa_id, entidade, entidade_id, acao, detalhe, usuario_id)
  values (p_empresa, p_entidade, p_id, p_acao, coalesce(p_detalhe, '{}'::jsonb), auth.uid());
end;
$$;

create or replace function private.vincular_criador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios_empresas (usuario_id, empresa_id, papel)
  values (auth.uid(), new.id, 'administrador');

  insert into public.categorias (empresa_id, natureza, grupo_dre, nome)
  values
    (new.id, 'receber', 'Receitas operacionais', 'Receitas operacionais'),
    (new.id, 'receber', 'Outras receitas operacionais', 'Outras receitas operacionais'),
    (new.id, 'receber', 'Receitas financeiras', 'Receitas financeiras'),
    (new.id, 'receber', 'Receitas não operacionais', 'Receitas não operacionais'),
    (new.id, 'pagar', 'Impostos', 'Impostos'),
    (new.id, 'pagar', 'Deduções sobre vendas', 'Deduções sobre vendas'),
    (new.id, 'pagar', 'Custo das vendas', 'Custo das vendas'),
    (new.id, 'pagar', 'Despesas administrativas', 'Despesas administrativas'),
    (new.id, 'pagar', 'Despesas com estrutura', 'Despesas com estrutura'),
    (new.id, 'pagar', 'Despesas com pessoal', 'Despesas com pessoal'),
    (new.id, 'pagar', 'Despesas comerciais', 'Despesas comerciais'),
    (new.id, 'pagar', 'Despesas financeiras', 'Despesas financeiras'),
    (new.id, 'pagar', 'Despesas não operacionais', 'Despesas não operacionais'),
    (new.id, 'pagar', 'Participações e dividendos', 'Participações e dividendos');

  insert into public.formas_liquidacao (empresa_id, nome)
  values
    (new.id, 'Boleto'),
    (new.id, 'Pix / transferência'),
    (new.id, 'Dinheiro'),
    (new.id, 'Débito em conta');

  insert into public.centros_custos (empresa_id, nome)
  values (new.id, 'Geral');

  perform private.registrar(new.id, 'empresas', new.id, 'criar', jsonb_build_object('razao_social', new.razao_social));
  return new;
end;
$$;

create trigger empresas_depois_inserir
after insert on public.empresas
for each row execute function private.vincular_criador();

create or replace function private.proteger_lancamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tem_baixa boolean;
  tem_baixa_ativa boolean;
begin
  select exists (select 1 from public.baixas b where b.lancamento_id = old.id) into tem_baixa;
  select exists (
    select 1 from public.baixas b
    where b.lancamento_id = old.id
      and not exists (select 1 from public.estornos e where e.baixa_id = b.id)
  ) into tem_baixa_ativa;

  if tem_baixa and (
    new.valor is distinct from old.valor
    or new.empresa_id is distinct from old.empresa_id
    or new.natureza is distinct from old.natureza
    or new.competencia is distinct from old.competencia
    or new.fornecedor_id is distinct from old.fornecedor_id
    or new.cliente_id is distinct from old.cliente_id
  ) then
    raise exception 'Lançamento com baixa não altera valor, empresa, competência ou pessoa. Estorne antes.';
  end if;

  if new.cancelado_em is not null and old.cancelado_em is null then
    if new.cancelado_motivo is null or length(trim(new.cancelado_motivo)) = 0 then
      raise exception 'Informe o motivo do cancelamento.';
    end if;
    if tem_baixa_ativa then
      raise exception 'Estorne as baixas antes de cancelar.';
    end if;
    new.cancelado_por = auth.uid();
    perform private.registrar(old.empresa_id, 'lancamentos', old.id, 'cancelar', jsonb_build_object('motivo', new.cancelado_motivo));
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create trigger lancamentos_antes_atualizar
before update on public.lancamentos
for each row execute function private.proteger_lancamento();

create or replace function private.impedir_exclusao_com_baixa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.baixas b where b.lancamento_id = old.id) then
    raise exception 'Lançamento que já teve baixa não pode ser excluído, mesmo depois do estorno.';
  end if;
  perform private.registrar(old.empresa_id, 'lancamentos', old.id, 'excluir', '{}'::jsonb);
  return old;
end;
$$;

create trigger lancamentos_antes_excluir
before delete on public.lancamentos
for each row execute function private.impedir_exclusao_com_baixa();

create or replace function private.validar_baixa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_valor numeric(15, 2);
  v_empresa uuid;
  v_cancel timestamptz;
  v_saldo numeric(15, 2);
begin
  select valor, empresa_id, cancelado_em
    into v_valor, v_empresa, v_cancel
  from public.lancamentos
  where id = new.lancamento_id
  for update;

  if v_valor is null then
    raise exception 'Lançamento não encontrado.';
  end if;
  if v_cancel is not null then
    raise exception 'Lançamento cancelado não recebe baixa.';
  end if;
  if new.empresa_id is distinct from v_empresa then
    raise exception 'A baixa precisa ser da mesma empresa do lançamento.';
  end if;
  if not exists (
    select 1 from public.contas_financeiras c
    where c.id = new.conta_id and c.empresa_id = v_empresa and c.ativa
  ) then
    raise exception 'Conta financeira inválida para esta empresa.';
  end if;

  select v_valor - coalesce(sum(b.valor), 0)
    into v_saldo
  from public.baixas b
  where b.lancamento_id = new.lancamento_id
    and not exists (select 1 from public.estornos e where e.baixa_id = b.id);

  if new.valor > v_saldo then
    raise exception 'Valor da baixa maior que o saldo em aberto.';
  end if;

  new.created_by = auth.uid();
  perform private.registrar(v_empresa, 'baixas', new.id, 'baixar', jsonb_build_object('valor', new.valor, 'data', new.data, 'lancamento_id', new.lancamento_id));
  return new;
end;
$$;

create trigger baixas_antes_inserir
before insert on public.baixas
for each row execute function private.validar_baixa();

create or replace function private.registrar_estorno()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_valor numeric(15, 2);
begin
  select b.empresa_id, b.valor into v_empresa, v_valor
  from public.baixas b
  where b.id = new.baixa_id;
  if v_empresa is null then
    raise exception 'Baixa não encontrada.';
  end if;
  new.created_by = auth.uid();
  perform private.registrar(v_empresa, 'estornos', new.id, 'estornar', jsonb_build_object('baixa_id', new.baixa_id, 'valor', v_valor, 'motivo', new.motivo));
  return new;
end;
$$;

create trigger estornos_antes_inserir
before insert on public.estornos
for each row execute function private.registrar_estorno();

create view public.lancamentos_resumo
with (security_invoker = true) as
select
  l.id,
  l.empresa_id,
  l.natureza,
  l.fornecedor_id,
  l.cliente_id,
  l.tipo_documento_id,
  l.numero_documento,
  l.competencia,
  l.vencimento,
  l.descricao,
  l.valor,
  l.categoria_id,
  l.centro_custo_id,
  l.observacoes,
  l.cancelado_em,
  l.cancelado_motivo,
  coalesce(sum(b.valor) filter (where e.id is null), 0)::numeric(15, 2) as valor_baixado,
  (l.valor - coalesce(sum(b.valor) filter (where e.id is null), 0))::numeric(15, 2) as saldo,
  case
    when l.cancelado_em is not null then 'cancelado'
    when l.valor - coalesce(sum(b.valor) filter (where e.id is null), 0) <= 0 then 'realizado'
    else 'previsto'
  end as situacao
from public.lancamentos l
left join public.baixas b on b.lancamento_id = l.id
left join public.estornos e on e.baixa_id = b.id
group by l.id;

create or replace function public.saldo_conta(p_conta uuid, p_ate date)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select
    case when cf.data_saldo_inicial <= p_ate then cf.saldo_inicial else 0 end
    + coalesce((
      select sum(b.valor)
      from public.baixas b
      join public.lancamentos l on l.id = b.lancamento_id
      where b.conta_id = cf.id
        and l.natureza = 'receber'
        and l.cancelado_em is null
        and b.data <= p_ate
        and b.data > cf.data_saldo_inicial
        and not exists (select 1 from public.estornos e where e.baixa_id = b.id)
    ), 0)
    - coalesce((
      select sum(b.valor)
      from public.baixas b
      join public.lancamentos l on l.id = b.lancamento_id
      where b.conta_id = cf.id
        and l.natureza = 'pagar'
        and l.cancelado_em is null
        and b.data <= p_ate
        and b.data > cf.data_saldo_inicial
        and not exists (select 1 from public.estornos e where e.baixa_id = b.id)
    ), 0)
    + coalesce((
      select sum(t.valor) from public.transferencias t
      where t.conta_destino_id = cf.id and t.data <= p_ate and t.data > cf.data_saldo_inicial
    ), 0)
    - coalesce((
      select sum(t.valor) from public.transferencias t
      where t.conta_origem_id = cf.id and t.data <= p_ate and t.data > cf.data_saldo_inicial
    ), 0)
  from public.contas_financeiras cf
  where cf.id = p_conta
$$;

insert into public.tipos_documento (natureza, nome)
values
  ('pagar', 'Nota fiscal'),
  ('pagar', 'Boleto'),
  ('pagar', 'Fatura'),
  ('pagar', 'Recibo'),
  ('pagar', 'Guia de imposto'),
  ('pagar', 'Folha de pagamento'),
  ('pagar', 'Contrato'),
  ('pagar', 'Cupom fiscal'),
  ('pagar', 'Débito em conta'),
  ('pagar', 'Outros'),
  ('receber', 'Mensalidade'),
  ('receber', 'Nota fiscal'),
  ('receber', 'Recibo'),
  ('receber', 'Boleto'),
  ('receber', 'Pix / transferência'),
  ('receber', 'Contrato'),
  ('receber', 'Outros');

alter table public.grupos_economicos enable row level security;
alter table public.empresas enable row level security;
alter table public.usuarios_empresas enable row level security;
alter table public.tipos_documento enable row level security;
alter table public.fornecedores enable row level security;
alter table public.clientes enable row level security;
alter table public.contas_financeiras enable row level security;
alter table public.centros_custos enable row level security;
alter table public.categorias enable row level security;
alter table public.formas_liquidacao enable row level security;
alter table public.lancamentos enable row level security;
alter table public.baixas enable row level security;
alter table public.estornos enable row level security;
alter table public.transferencias enable row level security;
alter table public.plano_contas enable row level security;
alter table public.mapeamentos_contabeis enable row level security;
alter table public.historico_alteracoes enable row level security;

create policy tipos_leitura on public.tipos_documento
for select to authenticated using (true);

create policy grupos_inserir on public.grupos_economicos
for insert to authenticated with check (auth.uid() is not null and created_by = auth.uid());

create policy grupos_ler on public.grupos_economicos
for select to authenticated using (
  created_by = auth.uid()
  or exists (
    select 1 from public.empresas e
    where e.grupo_id = grupos_economicos.id
      and private.pode(e.id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[])
  )
);

create policy empresas_inserir on public.empresas
for insert to authenticated with check (auth.uid() is not null and created_by = auth.uid());

create policy empresas_ler on public.empresas
for select to authenticated using (
  private.pode(id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[])
);

create policy empresas_atualizar on public.empresas
for update to authenticated
using (private.pode(id, array['administrador']::public.papel[]))
with check (private.pode(id, array['administrador']::public.papel[]));

create policy membros_ler on public.usuarios_empresas
for select to authenticated using (
  usuario_id = auth.uid()
  or private.pode(empresa_id, array['administrador']::public.papel[])
);

create policy membros_inserir on public.usuarios_empresas
for insert to authenticated with check (
  private.pode(empresa_id, array['administrador']::public.papel[])
);

create policy membros_atualizar on public.usuarios_empresas
for update to authenticated
using (private.pode(empresa_id, array['administrador']::public.papel[]))
with check (private.pode(empresa_id, array['administrador']::public.papel[]));

create policy fornecedores_ler on public.fornecedores
for select to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[]));
create policy fornecedores_escrever on public.fornecedores
for all to authenticated
using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador']::public.papel[]))
with check (private.pode(empresa_id, array['administrador', 'financeiro', 'operador']::public.papel[]));

create policy clientes_ler on public.clientes
for select to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[]));
create policy clientes_escrever on public.clientes
for all to authenticated
using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador']::public.papel[]))
with check (private.pode(empresa_id, array['administrador', 'financeiro', 'operador']::public.papel[]));

create policy contas_ler on public.contas_financeiras
for select to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[]));
create policy contas_escrever on public.contas_financeiras
for all to authenticated
using (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]))
with check (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]));

create policy centros_ler on public.centros_custos
for select to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[]));
create policy centros_escrever on public.centros_custos
for all to authenticated
using (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]))
with check (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]));

create policy categorias_ler on public.categorias
for select to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[]));
create policy categorias_escrever on public.categorias
for all to authenticated
using (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]))
with check (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]));

create policy formas_ler on public.formas_liquidacao
for select to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[]));
create policy formas_escrever on public.formas_liquidacao
for all to authenticated
using (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]))
with check (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]));

create policy lancamentos_ler on public.lancamentos
for select to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[]));
create policy lancamentos_inserir on public.lancamentos
for insert to authenticated with check (private.pode(empresa_id, array['administrador', 'financeiro', 'operador']::public.papel[]));
create policy lancamentos_atualizar on public.lancamentos
for update to authenticated
using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador']::public.papel[]))
with check (private.pode(empresa_id, array['administrador', 'financeiro', 'operador']::public.papel[]));
create policy lancamentos_excluir on public.lancamentos
for delete to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]));

create policy baixas_ler on public.baixas
for select to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[]));
create policy baixas_inserir on public.baixas
for insert to authenticated with check (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]));

create policy estornos_ler on public.estornos
for select to authenticated using (
  exists (
    select 1 from public.baixas b
    where b.id = estornos.baixa_id
      and private.pode(b.empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[])
  )
);
create policy estornos_inserir on public.estornos
for insert to authenticated with check (
  exists (
    select 1 from public.baixas b
    where b.id = baixa_id
      and private.pode(b.empresa_id, array['administrador', 'financeiro']::public.papel[])
  )
);

create policy transferencias_ler on public.transferencias
for select to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[]));
create policy transferencias_inserir on public.transferencias
for insert to authenticated with check (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]));

create policy plano_ler on public.plano_contas
for select to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[]));
create policy plano_escrever on public.plano_contas
for all to authenticated
using (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]))
with check (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]));

create policy mapa_ler on public.mapeamentos_contabeis
for select to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[]));
create policy mapa_escrever on public.mapeamentos_contabeis
for all to authenticated
using (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]))
with check (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]));

create policy historico_ler on public.historico_alteracoes
for select to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro', 'operador', 'visualizador']::public.papel[]));

revoke insert, update, delete on public.historico_alteracoes from authenticated, anon;
revoke update, delete on public.baixas from authenticated, anon;
revoke update, delete on public.estornos from authenticated, anon;
revoke update, delete on public.transferencias from authenticated, anon;

grant execute on function public.saldo_conta(uuid, date) to authenticated;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.papel_na_empresa(uuid) to authenticated;
grant execute on function private.pode(uuid, public.papel[]) to authenticated;
