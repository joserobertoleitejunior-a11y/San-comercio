-- =====================================================================
-- San Comércio — schema do Supabase (JÁ APLICADO no projeto "San Comercio", ref urxtnzdqeafmkmilmcpq)
-- Modelo de segurança igual ao da Remop:
--   * o site (anon) só INSERE — nunca lê, altera ou apaga;
--   * a leitura é só pra quem está logado no painel (authenticated).
-- =====================================================================

-- Tabelas
create table public.identificacoes (
  id bigint generated always as identity primary key,
  nome text not null default '',
  whatsapp text not null default '',   -- só dígitos, ex.: 15996836600
  cidade text default '',
  origem text default '',              -- entrar | lista
  pagina text default '',
  visitante_id text default '',
  criado_em timestamptz not null default now(),
  constraint whatsapp_formato check (whatsapp ~ '^[0-9]{10,13}$')
);
create table public.orcamentos (
  id bigint generated always as identity primary key,
  nome text default '', whatsapp text default '', cidade text default '',
  itens jsonb not null default '[]', pagina text default '',
  status text not null default 'novo',  -- novo | atendendo | fechado | perdido
  criado_em timestamptz not null default now(),
  constraint orcamento_status check (status in ('novo','atendendo','fechado','perdido'))
);
create table public.paginas_vistas (
  id bigint generated always as identity primary key,
  pagina text default '', referencia text default '',
  visitante_id text default '', cliente_whatsapp text default '',
  criado_em timestamptz not null default now()
);
create table public.cliques (
  id bigint generated always as identity primary key,
  tipo text default '', detalhe text default '', pagina text default '',
  visitante_id text default '', cliente_whatsapp text default '',
  criado_em timestamptz not null default now()
);
create table public.pesquisas (
  id bigint generated always as identity primary key,
  termo text default '', resultados integer default 0, origem text default '',
  pagina text default '', visitante_id text default '', cliente_whatsapp text default '',
  criado_em timestamptz not null default now(),
  constraint termo_tamanho check (char_length(termo) <= 120)
);
create index on public.paginas_vistas (criado_em desc);
create index on public.cliques (criado_em desc);
create index on public.pesquisas (criado_em desc);
create index on public.orcamentos (criado_em desc);
create index on public.identificacoes (whatsapp);

-- RLS + permissões mínimas: o site só INSERE
alter table public.identificacoes enable row level security;
alter table public.orcamentos     enable row level security;
alter table public.paginas_vistas enable row level security;
alter table public.cliques        enable row level security;
alter table public.pesquisas      enable row level security;
revoke all on public.identificacoes, public.orcamentos, public.paginas_vistas, public.cliques, public.pesquisas from anon;
grant insert on public.identificacoes, public.orcamentos, public.paginas_vistas, public.cliques, public.pesquisas to anon;
grant select, update on public.orcamentos to authenticated;
grant select on public.identificacoes, public.paginas_vistas, public.cliques, public.pesquisas to authenticated;

create policy "site insere" on public.identificacoes for insert to anon
  with check (char_length(nome) <= 120 and char_length(coalesce(cidade,'')) <= 120);
create policy "site insere" on public.orcamentos for insert to anon
  with check (status = 'novo' and jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) <= 60 and char_length(coalesce(nome,'')) <= 120);
create policy "site insere" on public.paginas_vistas for insert to anon
  with check (char_length(coalesce(pagina,'')) <= 200 and char_length(coalesce(referencia,'')) <= 500);
create policy "site insere" on public.cliques for insert to anon
  with check (char_length(coalesce(tipo,'')) <= 60 and char_length(coalesce(detalhe,'')) <= 200);
create policy "site insere" on public.pesquisas for insert to anon
  with check (char_length(termo) <= 120);
create policy "painel le" on public.identificacoes for select to authenticated using (true);
create policy "painel le" on public.orcamentos     for select to authenticated using (true);
create policy "painel muda status" on public.orcamentos for update to authenticated using (true) with check (true);
create policy "painel le" on public.paginas_vistas for select to authenticated using (true);
create policy "painel le" on public.cliques        for select to authenticated using (true);
create policy "painel le" on public.pesquisas      for select to authenticated using (true);

-- Login do painel (já criado): e-mail painel@san-comercio.internal
-- senha = PIN + sufixo de assets/js/admin.js ("-SanPainel2026!").
-- O PIN é segredo e NÃO fica no repositório. Pra trocar: Supabase →
-- Authentication → Users → painel@san-comercio.internal → reset password.
