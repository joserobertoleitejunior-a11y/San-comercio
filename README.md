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

## Supabase (banco do painel admin)

Sem Supabase o site funciona igual (tudo via WhatsApp) e o painel abre em **modo demonstração**.
Para ligar os dados reais:

1. Criar projeto em supabase.com e preencher `supabase.url`/`anonKey` em `assets/js/config.js`
   (a anon key não é segredo; a proteção é o RLS).
2. Rodar `supabase/schema.sql` no SQL Editor (tabelas `identificacoes`, `orcamentos`,
   `paginas_vistas`, `cliques`, `pesquisas` + políticas: o site só insere, o painel logado lê).
3. Authentication → Users → Add user: `painel@san-comercio.internal`, senha = PIN + sufixo de
   `assets/js/admin.js` (padrão `2580-SanPainel2026!`), marcar **Auto Confirm User**.
4. Abrir `admin.html` e entrar com o PIN.

Nunca liberar leitura pública dessas tabelas (são dados de clientes — LGPD).

## Backlog

- Personagem/mascote da San Comércio (assistente + tour, nos moldes do "Seu Remo")
- Fotos reais em alta dos produtos e da prensa
- Ver pendências em `BRIEFING-SAN.md`
