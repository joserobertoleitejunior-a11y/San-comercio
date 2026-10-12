# San Comércio de Mangueiras e Conexões — Site institucional + catálogo

Site estático (HTML/CSS/JS puro, sem build/bundler) da San Comércio, Itapetininga-SP.
Projeto da agência **Vibe Coding Process**, construído por engenharia reversa do site Remop
(mesma base de padrões, identidade e funcionalidades próprias).

- **Onde está cada coisa:** `MAPA-DO-SITE.md` ← comece por aqui antes de alterar qualquer coisa
- **Regras da agência:** `PADROES-AGENCIA.md`
- **Dados do cliente e pendências:** `BRIEFING-SAN.md`

## Rodar localmente

Qualquer servidor estático na raiz:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Publicação (fase atual: GitHub Pages)

Settings → Pages → Branch `main` (ou o branch de trabalho) / pasta `/ (root)`.
URL: `https://joserobertoleitejunior-a11y.github.io/San-comercio/`.
Ao trocar para domínio próprio, atualizar `canonical`, `og:*`, JSON-LD nas 3 páginas, `robots.txt` e `sitemap.xml`.

## Lista de orçamento

Funciona 100% sem backend: guarda a lista no navegador (localStorage) e envia pro
WhatsApp formatada. Nunca mostra preço nem confirma estoque — o atendente humano fecha.

## Supabase (opcional — quando quiser guardar orçamentos e métricas)

1. Criar projeto em supabase.com e preencher `supabase.url`/`anonKey` em `assets/js/config.js`
   (a anon key não é segredo; a proteção é o RLS abaixo).
2. Rodar no SQL Editor:

```sql
create table orcamentos (
  id bigint generated always as identity primary key,
  nome text default '',
  cidade text default '',
  itens jsonb not null default '[]',
  pagina text default '',
  status text default 'novo',
  criado_em timestamptz not null default now()
);
create table paginas_vistas (
  id bigint generated always as identity primary key,
  pagina text default '', referencia text default '', visitante_id text default '',
  criado_em timestamptz not null default now()
);
create table cliques (
  id bigint generated always as identity primary key,
  tipo text default '', detalhe text default '', pagina text default '', visitante_id text default '',
  criado_em timestamptz not null default now()
);

alter table orcamentos enable row level security;
alter table paginas_vistas enable row level security;
alter table cliques enable row level security;

create policy "criacao publica" on orcamentos for insert to anon with check (true);
create policy "leitura autenticada" on orcamentos for select to authenticated using (true);
create policy "criacao publica" on paginas_vistas for insert to anon with check (true);
create policy "leitura autenticada" on paginas_vistas for select to authenticated using (true);
create policy "criacao publica" on cliques for insert to anon with check (true);
create policy "leitura autenticada" on cliques for select to authenticated using (true);
```

Nunca liberar leitura pública dessas tabelas (são leads do cliente).

## Backlog

- Personagem/mascote da San Comércio (assistente + tour, nos moldes do "Seu Remo")
- Painel administrativo (reaproveitar `admin.html` da Remop)
- Fotos reais em alta dos produtos e da prensa
- Ver pendências em `BRIEFING-SAN.md`
