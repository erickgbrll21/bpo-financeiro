-- Operação diária herdada da Planilha BPO (Rev 02):
-- numeração P000001/R000001 e F0001, classificações da planilha por grupo de DRE,
-- lançar já pago, baixa em lote (tesouraria) e transferências validadas.

create table private.contadores (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  chave text not null,
  ultimo integer not null,
  primary key (empresa_id, chave)
);

create or replace function private.proximo_numero(p_empresa uuid, p_chave text)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into private.contadores as c (empresa_id, chave, ultimo)
  values (p_empresa, p_chave, 1)
  on conflict (empresa_id, chave) do update set ultimo = c.ultimo + 1
  returning c.ultimo
$$;

alter table public.lancamentos add column numero integer;
alter table public.lancamentos add constraint lancamentos_numero_unico unique (empresa_id, natureza, numero);

create or replace function private.numerar_lancamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.numero = private.proximo_numero(new.empresa_id, new.natureza::text);
  new.created_by = auth.uid();
  return new;
end;
$$;

create trigger lancamentos_antes_inserir
before insert on public.lancamentos
for each row execute function private.numerar_lancamento();

create or replace function private.codificar_fornecedor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.codigo is null or length(trim(new.codigo)) = 0 then
    new.codigo = 'F' || lpad(private.proximo_numero(new.empresa_id, 'fornecedor')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger fornecedores_antes_inserir
before insert on public.fornecedores
for each row execute function private.codificar_fornecedor();

create index lancamentos_empresa_natureza_venc_idx on public.lancamentos (empresa_id, natureza, vencimento);
create index baixas_empresa_data_idx on public.baixas (empresa_id, data);
create index transferencias_empresa_data_idx on public.transferencias (empresa_id, data);

-- Classificações, centros de custo e formas da planilha viram o padrão de toda empresa nova.
create or replace function private.semear_cadastros(p_empresa uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categorias (empresa_id, natureza, grupo_dre, nome)
  select p_empresa, 'receber'::public.natureza, g, n
  from (values
    ('Receitas operacionais', 'Mensalidades de residentes'),
    ('Receitas operacionais', 'Cuidados e assistência de enfermagem'),
    ('Receitas operacionais', 'Terapias e reabilitação'),
    ('Receitas operacionais', 'Day use'),
    ('Receitas operacionais', 'Hospedagem temporária / diárias'),
    ('Receitas operacionais', 'Taxa de admissão'),
    ('Receitas operacionais', 'Taxa de enxoval / rouparia'),
    ('Receitas operacionais', 'Refeições de acompanhantes'),
    ('Receitas operacionais', 'Cartão – a identificar'),
    ('Outras receitas operacionais', 'Receitas extras'),
    ('Outras receitas operacionais', 'Reembolso de farmácia'),
    ('Outras receitas operacionais', 'Reembolso consultas/exames'),
    ('Receitas financeiras', 'Rendimentos de aplicações'),
    ('Receitas financeiras', 'Juros e multas recebidos'),
    ('Receitas não operacionais', 'Aporte de sócios'),
    ('Receitas não operacionais', 'Captação de empréstimos'),
    ('Receitas não operacionais', 'Venda de bens do imobilizado')
  ) as r (g, n)
  on conflict (empresa_id, natureza, nome) do nothing;

  insert into public.categorias (empresa_id, natureza, grupo_dre, nome)
  select p_empresa, 'pagar'::public.natureza, g, n
  from (values
    ('Deduções sobre vendas', 'Descontos e cancelamentos'),
    ('Deduções sobre vendas', 'Taxas de cartão (MDR)'),
    ('Custo das vendas', 'Médico geriatra'),
    ('Custo das vendas', 'Nutricionista'),
    ('Custo das vendas', 'Fisioterapia'),
    ('Custo das vendas', 'Terapia ocupacional'),
    ('Custo das vendas', 'Psicologia'),
    ('Custo das vendas', 'Arteterapia'),
    ('Custo das vendas', 'Urgência e remoção'),
    ('Custo das vendas', 'Consultas e exames de residentes'),
    ('Custo das vendas', 'Resp. técnica / conselhos saúde'),
    ('Custo das vendas', 'Fraldas e higiene pessoal'),
    ('Custo das vendas', 'Oxigênio e gases medicinais'),
    ('Custo das vendas', 'Materiais médico-hospitalares'),
    ('Custo das vendas', 'Etiquetas e identificação'),
    ('Custo das vendas', 'Alimentação – supermercado'),
    ('Custo das vendas', 'Alimentação – carnes e frios'),
    ('Custo das vendas', 'Alimentação – hortifrúti e polpas'),
    ('Custo das vendas', 'Alimentação – laticínios'),
    ('Custo das vendas', 'Alimentação – panificação'),
    ('Custo das vendas', 'Gás de cozinha'),
    ('Custo das vendas', 'Medicamentos e farmácia'),
    ('Custo das vendas', 'Materiais de limpeza'),
    ('Custo das vendas', 'Lavanderia'),
    ('Custo das vendas', 'Dedetização'),
    ('Custo das vendas', 'Coleta de resíduos'),
    ('Custo das vendas', 'Serviços terceirizados de apoio'),
    ('Custo das vendas', 'Atividades recreativas'),
    ('Custo das vendas', 'Eventos e datas comemorativas'),
    ('Custo das vendas', 'Despesas com residentes'),
    ('Despesas administrativas', 'Contabilidade e assessoria'),
    ('Despesas administrativas', 'Consultoria de RH'),
    ('Despesas administrativas', 'Controle de ponto'),
    ('Despesas administrativas', 'Manutenção de equipamentos'),
    ('Despesas administrativas', 'Telefonia e internet'),
    ('Despesas administrativas', 'Material de escritório'),
    ('Despesas administrativas', 'Certificados e cartório'),
    ('Despesas administrativas', 'Conselhos e entidades de classe'),
    ('Despesas administrativas', 'Material de consumo geral'),
    ('Despesas administrativas', 'Brindes e lembranças'),
    ('Despesas administrativas', 'Taxas municipais (TFTL)'),
    ('Despesas administrativas', 'Alvarás e licenças'),
    ('Despesas administrativas', 'Custas judiciais'),
    ('Despesas administrativas', 'ISS retido de prestadores'),
    ('Despesas administrativas', 'CSRF retida de prestadores'),
    ('Despesas com estrutura', 'Aluguel'),
    ('Despesas com estrutura', 'IRRF sobre aluguel (DARF)'),
    ('Despesas com estrutura', 'IPTU'),
    ('Despesas com estrutura', 'Energia elétrica'),
    ('Despesas com estrutura', 'Água e esgoto'),
    ('Despesas com estrutura', 'Seguros'),
    ('Despesas com estrutura', 'Materiais de manutenção'),
    ('Despesas com estrutura', 'Manutenção de elevador'),
    ('Despesas com estrutura', 'Manutenção de piscina'),
    ('Despesas com estrutura', 'Jardinagem'),
    ('Despesas com estrutura', 'Portaria / guarita'),
    ('Despesas com pessoal', 'Salários'),
    ('Despesas com pessoal', 'Plantões e horas extras'),
    ('Despesas com pessoal', 'Férias'),
    ('Despesas com pessoal', '13º salário'),
    ('Despesas com pessoal', 'Rescisões'),
    ('Despesas com pessoal', 'FGTS mensal'),
    ('Despesas com pessoal', 'FGTS rescisório e multa'),
    ('Despesas com pessoal', 'INSS'),
    ('Despesas com pessoal', 'IRRF sobre folha (DARF)'),
    ('Despesas com pessoal', 'Vale-transporte'),
    ('Despesas com pessoal', 'Plano de saúde funcionários'),
    ('Despesas com pessoal', 'Uniformes e EPI'),
    ('Despesas com pessoal', 'Outros gastos com pessoal'),
    ('Despesas com pessoal', 'Pró-labore'),
    ('Despesas comerciais', 'Agência de marketing'),
    ('Despesas comerciais', 'Mídia digital (Google / Meta)'),
    ('Despesas comerciais', 'Site'),
    ('Despesas comerciais', 'Comissões de captação'),
    ('Despesas financeiras', 'Juros de empréstimos'),
    ('Despesas financeiras', 'Tarifas bancárias'),
    ('Despesas financeiras', 'Seguro prestamista'),
    ('Despesas financeiras', 'IOF'),
    ('Despesas financeiras', 'Juros e multas por atraso'),
    ('Despesas financeiras', 'Encargos de cartão de crédito'),
    ('Despesas não operacionais', 'Empréstimos – principal'),
    ('Despesas não operacionais', 'Consórcios'),
    ('Despesas não operacionais', 'Compra de imobilizado'),
    ('Despesas não operacionais', 'Suprimento de caixa'),
    ('Despesas não operacionais', 'Fatura cartão (a classificar)'),
    ('Despesas não operacionais', 'Gastos não identificados'),
    ('Impostos', 'Simples Nacional (DAS)'),
    ('Impostos', 'ISSQN (fora do DAS)'),
    ('Participações e dividendos', 'Retiradas dos sócios')
  ) as d (g, n)
  on conflict (empresa_id, natureza, nome) do nothing;

  insert into public.centros_custos (empresa_id, nome)
  select p_empresa, n
  from (values
    ('Assistencial (apoio hospitalar)'),
    ('Apoio técnico – nutrição e farmácia'),
    ('Apoio logístico – higiene e lavanderia'),
    ('Ocupação e estrutura (rateio)'),
    ('Hospedagem e convivência'),
    ('Administrativo'),
    ('Comercial'),
    ('Tributos e financeiro'),
    ('Não operacional')
  ) as c (n)
  on conflict (empresa_id, nome) do nothing;

  insert into public.formas_liquidacao (empresa_id, nome)
  select p_empresa, n
  from (values
    ('Boleto'), ('Pix'), ('Transferência bancária'), ('Cartão de crédito'),
    ('Cartão de débito'), ('Débito automático'), ('Dinheiro'), ('Cheque')
  ) as f (n)
  on conflict (empresa_id, nome) do nothing;
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
  perform private.semear_cadastros(new.id);
  perform private.registrar(new.id, 'empresas', new.id, 'criar', jsonb_build_object('razao_social', new.razao_social));
  return new;
end;
$$;

-- Lança o título e, quando informado, registra o pagamento na mesma transação.
create or replace function public.lancar(
  p_empresa uuid,
  p_natureza public.natureza,
  p_pessoa uuid,
  p_tipo_documento uuid,
  p_numero_documento text,
  p_competencia date,
  p_vencimento date,
  p_valor numeric,
  p_categoria uuid,
  p_descricao text,
  p_centro_custo uuid default null,
  p_conta_prevista uuid default null,
  p_forma_prevista uuid default null,
  p_observacoes text default null,
  p_pago_em date default null,
  p_conta_pagamento uuid default null,
  p_forma_pagamento uuid default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_pago_em is not null and p_conta_pagamento is null then
    raise exception 'Informe a conta do pagamento.';
  end if;

  insert into public.lancamentos (
    empresa_id, natureza, fornecedor_id, cliente_id, tipo_documento_id, numero_documento,
    competencia, vencimento, descricao, valor, categoria_id, centro_custo_id,
    conta_prevista_id, forma_prevista_id, observacoes
  ) values (
    p_empresa, p_natureza,
    case when p_natureza = 'pagar' then p_pessoa end,
    case when p_natureza = 'receber' then p_pessoa end,
    p_tipo_documento, p_numero_documento, p_competencia, p_vencimento, p_descricao, p_valor,
    p_categoria, p_centro_custo, coalesce(p_conta_prevista, p_conta_pagamento),
    coalesce(p_forma_prevista, p_forma_pagamento), p_observacoes
  ) returning id into v_id;

  if p_pago_em is not null then
    insert into public.baixas (lancamento_id, empresa_id, data, valor, conta_id, forma_id)
    values (v_id, p_empresa, p_pago_em, p_valor, p_conta_pagamento, p_forma_pagamento);
  end if;

  return v_id;
end;
$$;

-- Tesouraria: quita o saldo em aberto de cada título marcado, tudo ou nada.
create or replace function public.baixar_lote(
  p_empresa uuid,
  p_lancamentos uuid[],
  p_data date,
  p_conta uuid,
  p_forma uuid default null
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item record;
  v_total integer := 0;
begin
  if coalesce(array_length(p_lancamentos, 1), 0) = 0 then
    raise exception 'Marque ao menos um título.';
  end if;

  for v_item in
    select r.id, r.saldo
    from public.lancamentos_resumo r
    where r.id = any (p_lancamentos)
      and r.empresa_id = p_empresa
      and r.situacao = 'previsto'
  loop
    insert into public.baixas (lancamento_id, empresa_id, data, valor, conta_id, forma_id)
    values (v_item.id, p_empresa, p_data, v_item.saldo, p_conta, p_forma);
    v_total := v_total + 1;
  end loop;

  if v_total = 0 then
    raise exception 'Nenhum dos títulos marcados está em aberto.';
  end if;
  return v_total;
end;
$$;

grant execute on function public.lancar(uuid, public.natureza, uuid, uuid, text, date, date, numeric, uuid, text, uuid, uuid, uuid, text, date, uuid, uuid) to authenticated;
grant execute on function public.baixar_lote(uuid, uuid[], date, uuid, uuid) to authenticated;

-- Transferência: as duas contas precisam ser ativas e da mesma empresa; exclusão fica no histórico.
create or replace function private.validar_transferencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.contas_financeiras c
    where c.id in (new.conta_origem_id, new.conta_destino_id)
      and c.empresa_id = new.empresa_id
      and c.ativa
  ) <> 2 then
    raise exception 'As duas contas precisam ser ativas e da empresa selecionada.';
  end if;
  new.created_by = auth.uid();
  perform private.registrar(new.empresa_id, 'transferencias', new.id, 'transferir',
    jsonb_build_object('valor', new.valor, 'data', new.data, 'origem', new.conta_origem_id, 'destino', new.conta_destino_id));
  return new;
end;
$$;

create trigger transferencias_antes_inserir
before insert on public.transferencias
for each row execute function private.validar_transferencia();

create or replace function private.registrar_exclusao_transferencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.registrar(old.empresa_id, 'transferencias', old.id, 'excluir',
    jsonb_build_object('valor', old.valor, 'data', old.data, 'descricao', old.descricao));
  return old;
end;
$$;

create trigger transferencias_antes_excluir
before delete on public.transferencias
for each row execute function private.registrar_exclusao_transferencia();

grant delete on public.transferencias to authenticated;
create policy transferencias_excluir on public.transferencias
for delete to authenticated using (private.pode(empresa_id, array['administrador', 'financeiro']::public.papel[]));

revoke all on function private.proximo_numero(uuid, text) from public;
revoke all on function private.semear_cadastros(uuid) from public;
