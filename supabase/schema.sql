-- =====================================================================
-- San Comércio — schema do Supabase (rodar uma vez no SQL Editor)
-- Modelo de segurança igual ao da Remop:
--   * o site (anon) só INSERE — nunca lê, altera ou apaga;
--   * a leitura é só pra quem está logado no painel (authenticated).
-- =====================================================================

-- Clientes que se identificaram ("Entrar com WhatsApp" ou ao mandar a lista).
-- Só inserção: o painel agrupa as linhas pelo número de WhatsApp.
create table if not exists identificacoes (
  id bigint generated always as identity primary key,
  nome text not null default '',
  whatsapp text not null default '',   -- só dígitos, ex.: 15996836600
  cidade text default '',
  origem text default '',              -- entrar | lista
  pagina text default '',
  visitante_id text default '',
  criado_em timestamptz not null default now()
);

create table if not exists orcamentos (
  id bigint generated always as identity primary key,
  nome text default '',
  whatsapp text default '',
  cidade text default '',
  itens jsonb not null default '[]',
  pagina text default '',
  status text default 'novo',          -- novo | atendendo | fechado | perdido
  criado_em timestamptz not null default now()
);

create table if not exists paginas_vistas (
  id bigint generated always as identity primary key,
  pagina text default '', referencia text default '',
  visitante_id text default '', cliente_whatsapp text default '',
  criado_em timestamptz not null default now()
);

create table if not exists cliques (
  id bigint generated always as identity primary key,
  tipo text default '', detalhe text default '', pagina text default '',
  visitante_id text default '', cliente_whatsapp text default '',
  criado_em timestamptz not null default now()
);

-- O que as pessoas buscam no catálogo (e o que escrevem à mão na lista)
create table if not exists pesquisas (
  id bigint generated always as identity primary key,
  termo text default '', resultados integer default 0, origem text default '',
  pagina text default '', visitante_id text default '', cliente_whatsapp text default '',
  criado_em timestamptz not null default now()
);

-- Validações básicas no banco (o site também valida antes de enviar)
alter table identificacoes add constraint whatsapp_formato check (whatsapp ~ '^[0-9]{10,13}$');
alter table pesquisas add constraint termo_tamanho check (char_length(termo) <= 120);

-- RLS
alter table identificacoes enable row level security;
alter table orcamentos     enable row level security;
alter table paginas_vistas enable row level security;
alter table cliques        enable row level security;
alter table pesquisas      enable row level security;

create policy "site insere"   on identificacoes for insert to anon with check (true);
create policy "painel le"     on identificacoes for select to authenticated using (true);
create policy "site insere"   on orcamentos     for insert to anon with check (true);
create policy "painel le"     on orcamentos     for select to authenticated using (true);
create policy "painel status" on orcamentos     for update to authenticated using (true) with check (true);
create policy "site insere"   on paginas_vistas for insert to anon with check (true);
create policy "painel le"     on paginas_vistas for select to authenticated using (true);
create policy "site insere"   on cliques        for insert to anon with check (true);
create policy "painel le"     on cliques        for select to authenticated using (true);
create policy "site insere"   on pesquisas      for insert to anon with check (true);
create policy "painel le"     on pesquisas      for select to authenticated using (true);

-- Login do painel: Authentication → Users → Add user
--   e-mail: painel@san-comercio.internal
--   senha : <PIN> + sufixo de assets/js/admin.js (padrão: 2580-SanPainel2026!)
--   marcar "Auto Confirm User"
