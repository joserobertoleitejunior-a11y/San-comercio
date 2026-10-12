# MAPA DO SITE — San Comércio
> Guia rápido de "onde está cada coisa" pra qualquer alteração futura (humana ou IA) sem precisar varrer o projeto inteiro.
> Ler junto com `PADROES-AGENCIA.md` (regras) e `BRIEFING-SAN.md` (dados do cliente).
> Os números de linha são aproximados (mudam conforme o arquivo cresce). Para achar um bloco, busque o comentário-marcador indicado (ex.: `===== PRENSAGEM`).

---

## 1. Alterações mais comuns → onde mexer

| Quero mudar... | Arquivo | Onde |
|---|---|---|
| Número do WhatsApp, fixo, e-mail, Instagram, endereço, links de mapa/Waze | `assets/js/config.js` | objeto `window.SAN_CONFIG` (único ponto — o site inteiro lê daqui) |
| Horário de funcionamento / texto do sábado | `assets/js/config.js` | `horarios` e `sabadoTexto` (o selo "Aberto agora", a tabela e o rodapé se atualizam sozinhos) |
| Mensagem padrão do WhatsApp | `assets/js/config.js` | `whatsappMensagemPadrao` |
| Mensagem de um botão específico | HTML do botão | atributo `data-whatsapp-mensagem="..."` |
| Ativar Supabase (salvar orçamentos/analytics) | `assets/js/config.js` | `supabase.url` e `supabase.anonKey` + SQL do `README.md` |
| Texto/título da hero da home | `index.html` | bloco `===== HERO` (~linha 103) |
| Palavras da faixa dourada que corre | `index.html` | bloco `===== FAIXA DE CATEGORIAS` (~linha 142) — itens aparecem 2x (loop infinito), mudar nos dois |
| Números (9.000 itens etc.) | `index.html` | bloco `===== NÚMEROS` (~linha 147); o contador anima o valor de `data-contador` |
| Produtos/categorias do catálogo | `index.html` | bloco `===== PRODUTOS` (~linha 159) — cada `<article class="card-produto">` é um card |
| Filtros do catálogo | `index.html` | `.filtros` (botões `data-filtro`) + no card o atributo `data-segmentos="hidraulica agro ..."` |
| Ficha "Monte sua mangueira" (tipos, bitolas, terminais) | `index.html` | bloco `===== PRENSAGEM` (~linha 339), `<form data-ficha-prensagem>` |
| Passo a passo da prensagem | `index.html` | `<ol class="passos">` dentro de `===== PRENSAGEM` |
| Segmentos atendidos ("Do trator ao jardim") | `index.html` | bloco `===== PRA QUEM` (~linha 409) |
| Fotos da loja na home | `index.html` | bloco `===== A LOJA (prévia)` (~linha 446), `.mosaico` |
| História / texto institucional | `institucional.html` | bloco `===== HISTÓRIA` (~linha 104) |
| Diferenciais | `institucional.html` | bloco `===== DIFERENCIAIS` (~linha 123) |
| Galeria de fotos | `institucional.html` | bloco `===== GALERIA` (~linha 142) |
| Perguntas frequentes | `institucional.html` | bloco `===== FAQ` (~linha 160) |
| Endereço/contatos/mapa | `localizacao.html` | `.localizacao__grid` (~linha 107); textos vêm do `config.js` |
| Cores, fontes, raios, sombras | `assets/css/style.css` | `:root` no topo (linhas 1–45) |
| Velocidade/efeitos das animações | `assets/js/animacoes.js` | ver seção 4 abaixo |
| SEO (título, descrição, OG) | cada `.html` | `<head>` — `title`, `meta description`, `og:*`, JSON-LD (só na home+internas) |

## 2. Blocos REPETIDOS nas 3 páginas (mudar em todas)

Site estático sem build: estes blocos são idênticos em `index.html`, `institucional.html` e `localizacao.html`. Qualquer mudança neles precisa ser replicada nas 3 (mesmo trade-off aceito na Remop).

- `<svg ... latao-grad>` (gradientes do latão) — logo após o `<body>`
- `===== HEADER` — logo SVG inline, menu, botão WhatsApp, botão da lista
- `===== CTA FINAL` — "Mande a lista. A gente separa."
- `===== GAVETA: LISTA DE ORÇAMENTO`, `.flutuantes`, `.toast`
- `===== FOOTER` + lista de `<script>` no fim
- Versão de cache `?v=AAAAMMDDx` nos links de CSS/JS — **trocar nas 3 páginas a cada deploy** (evita o cliente ver versão velha)

## 3. Arquivos

```
index.html                 Home: hero, faixa, números, catálogo, prensagem, segmentos, loja, CTA
institucional.html         A loja: história, diferenciais, galeria, FAQ
localizacao.html           Endereço, contatos, horário (tabela automática), mapa (link), rotas

assets/css/style.css       Todo o visual (mobile-first). Seções marcadas com /* ---------- Nome ---------- */
assets/js/config.js        ★ Único ponto de configuração (contatos, horários, Supabase)
assets/js/main.js          Links WhatsApp/contatos, menu, header que some/volta, horário + "aberto agora",
                           faixa arrastável, filtro do catálogo, FAQ, toast
assets/js/lista-orcamento.js  Lista de orçamento (carrinho sem preço) → WhatsApp; ficha de prensagem; item livre
assets/js/animacoes.js     GSAP + ScrollTrigger: preloader, hero, barra-mangueira, títulos, contadores, tilt, etc.
assets/js/supabase-init.js Inicializa Supabase se config preenchida (senão, só WhatsApp)
assets/js/analytics.js     Páginas vistas + cliques (só grava com Supabase ativo)

assets/img/                Fotos reais recortadas dos materiais do cliente (ver seção 5)
PADROES-AGENCIA.md         Regras fixas da agência (Vibe Coding Process)
BRIEFING-SAN.md            Dados levantados do cliente + pendências
README.md                  Visão geral, deploy, SQL do Supabase
robots.txt / sitemap.xml   SEO técnico (domínio provisório do GitHub Pages)
netlify.toml               Pronto pra migração futura pro Netlify
```

## 4. Animações (assets/js/animacoes.js)

| Efeito | Função | Onde aparece |
|---|---|---|
| Preloader: X de mangueiras se desenha (1x por sessão) | `rodarPreloader()` | só `index.html` (`[data-preloader]`) |
| Entrada da hero, X gigante com fluido correndo, parallax | `animarHero()` | `.hero`, `.hero__x` |
| Barra de progresso = mangueira com terminal de latão | `iniciarProgresso()` | topo de todas as páginas |
| Títulos montando letra a letra | `montarTitulos("[data-montar]")` | todo `h2` com `data-montar` |
| Sublinhado-mangueira desenhando | `iniciarSublinhados()` | `.sublinhado-mangueira` |
| Contador 0 → 9.000 | `iniciarContadores()` | `[data-contador]` |
| Linha do passo a passo enchendo | `iniciarPassos()` | `.passos` |
| Cards inclinando com o mouse | `iniciarTilt()` | `[data-tilt]` (só desktop) |
| Botões "magnéticos" | `iniciarMagneticos()` | `[data-magnetico]` (só desktop) |
| "+1" voando até a lista | `SanAnimacoes.voarParaLista()` | ao adicionar item |
| Faixa dourada arrastável com inércia | `iniciarFaixaArrastavel()` | `main.js` (não depende do GSAP) |

Tudo desliga com `prefers-reduced-motion`. Se o GSAP não carregar, o conteúdo aparece normal (sem animação) e o preloader some sozinho em ~3s (trava de segurança no CSS).

## 5. Imagens (assets/img)

| Arquivo | Origem | Uso |
|---|---|---|
| `fachada-noite-san.jpg` | foto da fachada azul (fim de tarde) | hero home + internas, galeria, mosaico, OG |
| `loja-lateral-san.jpg` | foto da lateral (Street View) | mosaico, história, galeria |
| `loja-entrada-san.jpg` | recorte da capa do WhatsApp | mosaico, galeria |
| `fachada-faixa-san.jpg` | recorte do letreiro (capa WhatsApp) | hero localização, galeria |
| `flyer-9mil-san.jpg` | arte oficial "quase 9 mil itens" | galeria |
| `cat-*.jpg` | recortes das artes de produtos do cliente | cards do catálogo |
| `og-image-san.jpg` | 1200×630 a partir da fachada | compartilhamento (WhatsApp/Facebook) |
| `favicon.svg` | desenhado (X de mangueiras) | aba do navegador |

As fotos de categoria vieram de prints de baixa resolução — **trocar por fotos reais dos produtos** quando o cliente enviar (mesmo nome de arquivo = zero mudança no HTML). A loja amarela antiga **não** é usada no site.

## 6. Logotipo

O logo é um SVG inline (texto + X de mangueiras com terminais de latão), redesenhado a partir da marca. As cores mudam por CSS (`.logo-san__texto`, `.logo-san__mangueira`). Se o cliente enviar o logo vetorial oficial, substituir o `<svg class="logo-san">` nas 3 páginas (header, footer e preloader).
