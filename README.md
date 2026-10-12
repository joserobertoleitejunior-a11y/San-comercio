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

## Supabase (banco do painel admin) — JÁ LIGADO

Projeto **San Comercio** (região sa-east-1, plano gratuito), ref `urxtnzdqeafmkmilmcpq`.
URL e anon key já estão em `assets/js/config.js` (a anon key não é segredo; a proteção é o RLS).

- Tabelas e políticas: `supabase/schema.sql` (o site só **insere**; só o painel logado **lê**).
- Login do painel: e-mail interno `painel@san-comercio.internal` + PIN de 8 dígitos
  (a senha real é PIN + sufixo de `assets/js/admin.js`). **O PIN não fica no repositório** —
  foi entregue ao José no chat. Para trocar: Supabase → Authentication → Users → reset password.
- Enquanto não há dados reais, `admin.html` → "Ver demonstração" mostra o painel com dados de exemplo.

Nunca liberar leitura pública dessas tabelas (são dados de clientes — LGPD).
Pendente de segurança: ativar "Leaked password protection" em Authentication → Providers → Email
(exige plano Pro; sem impacto aqui porque só existe 1 usuário, com PIN aleatório).

## Backlog

- Personagem/mascote da San Comércio (assistente + tour, nos moldes do "Seu Remo")
- Fotos reais em alta dos produtos e da prensa
- Ver pendências em `BRIEFING-SAN.md`
