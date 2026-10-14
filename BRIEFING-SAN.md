# BRIEFING — Site San Comércio de Mangueiras e Conexões
> Levantamento feito a partir dos prints enviados pelo José (Facebook, perfil comercial do WhatsApp, catálogo do WhatsApp, Instagram, Google/Street View) e de pesquisa pública (cadastros de CNPJ). Ler junto com `PADROES-AGENCIA.md`.

---

## 1. Dados do negócio

| Campo | Valor | Fonte |
|---|---|---|
| Razão social | San Comércio de Mangueiras e Conexões Ltda | CNPJ / Instagram |
| CNPJ | 47.752.792/0001-14 (ativo, aberto em 29/08/2022) | Econodata, Casa dos Dados |
| Endereço | Av. 5 de Novembro, 961 — Vila Nastri, Itapetininga-SP, 18207-320 | WhatsApp + artes |
| WhatsApp | (15) 99683-6600 | WhatsApp Business |
| Fixo | (15) 3272-8295 | WhatsApp + artes |
| E-mail | sancomercio@hotmail.com | WhatsApp Business |
| Instagram | @san_comercio_de_mangueiras | enviado pelo José |
| Facebook | https://www.facebook.com/profile.php?id=100075493675699 (categoria: Loja de produtos automotivos) | enviado pelo José |
| Horário | Segunda 07:15–18:00 (confirmado). Demais dias: **a confirmar** | WhatsApp Business |
| Categoria WhatsApp | Loja de ferragens | WhatsApp Business |

## 2. O que a loja vende (pela fachada e pelas artes)

Fachada: *Mangueiras · Correias · Óleos · Lubrificantes · Peças galvanizadas · Ferramentas · EPI's · Prensamos mangueiras*.

Artes: Conexões · Mangueiras · Correias · Produtos de limpeza automotivo · Ferramentas · EPIs · Fitas, colas, adesivos · Mangueiras hidráulicas e conexões prensáveis · Conexões galvanizadas · Conexões linha pneumática · Conexões de latão · Mangueiras PVC/jardim/cristal/polietileno e conexões de irrigação.

**Leitura do negócio:** não é só "loja automotiva" nem só "ferragens" — é uma **casa de mangueiras e conexões** (núcleo: hidráulica com prensagem própria) que virou um "resolve-tudo" de manutenção para oficinas, agro, indústria, obra e casa. O site trata a **prensagem de mangueira hidráulica** como o serviço-âncora e o resto como catálogo.

Frases oficiais usadas (das artes do cliente): "Tudo o que você precisa, em um só lugar!", "Quase 9 mil itens", "Os melhores preços de toda região", "Qualidade, variedade e confiança sempre com você", "Soluções completas para você e seu negócio", selos Confiança · Variedade · Atendimento rápido.

## 3. Identidade visual

- **Azul cobalto elétrico** (a pintura da loja) + **tinta escura** (`#061443`) + **laranja de segurança** (`#FF7A1A`, os quadradinhos laranja do X no letreiro). Propositalmente diferente da Remop (azul-marinho + amarelo). O dourado/latão ficou só no metal do logo e das ilustrações.
- Fundo do topo sem foto: a parede ondulada da fachada ficava feia e a foto era de baixa resolução. É um fundo desenhado (gradiente cobalto, X gigante e anéis técnicos).
- Logo: "SAN COMÉRCIO" com X formado por duas mangueiras com terminais de latão entre "MANGUEIRAS" e "CONEXÕES".
- Loja amarela = antiga (não usar). Loja azul = atual.

## 4. Estrutura entregue (fase 1)

1. **Home** — hero com X de mangueiras animado, faixa de categorias arrastável, números, catálogo filtrável (12 linhas) com lista de orçamento, prensagem (passo a passo + ficha "Monte sua mangueira"), segmentos, prévia da loja, CTA.
2. **A loja** — história, diferenciais, galeria real, FAQ.
3. **Localização** — endereço, contatos, horário automático, mapa (link), rotas Maps/Waze.
4. **Lista de orçamento** em todas as páginas → envia pro WhatsApp formatada (sem preço, sem fechar venda).

## 5. Pendências com o cliente

- [ ] Confirmar horário de terça a sexta e **sábado** (hoje o site mostra seg–sex 07h15–18h e sábado "consulte").
- [x] Link da página do Facebook (recebido e aplicado).
- [ ] Fotos reais dos produtos/balcão/prensa em boa resolução (hoje o catálogo usa ilustrações próprias; ver MAPA §5).
- [ ] Logo vetorial oficial (o do site é redesenho em SVG).
- [ ] Formas de pagamento e se faz entrega/venda para empresas (com nota) — não publicado por falta de confirmação.
- [ ] Domínio próprio (ex.: `sancomercio.com.br`) — hoje está em GitHub Pages.
- [ ] Personagem/mascote da San Comércio (o José vai passar o briefing).
- [x] Projeto Supabase criado e ligado (schema aplicado, RLS validado, usuário do painel criado).

## 6. Ideias para encantar o dono (apresentação)

1. **Mostrar no celular dele, no balcão** — abrir o site no próprio WhatsApp dele e mandar uma lista de orçamento de teste pro número da loja: ele vê o pedido chegando formatado.
2. **Painel em modo demonstração** — `admin.html` → "Ver demonstração": visitas, horário de pico, o que o pessoal busca e **não acha** (vira decisão de estoque).
3. **Placa/QR no balcão** — "Monte sua lista pelo site" com QR para o site (cliente faz o pedido na fila).
4. **Google Meu Negócio** — completar o perfil (fotos novas da loja azul, horário, link do site): é de onde vem a maior parte das visitas.
5. **Fotos de verdade em 1 tarde** — 20 fotos de produto no fundo branco + a prensa trabalhando; troca direto nos arquivos `prod-*.webp`.
6. **Vídeo curto da prensagem** (Reels) — "mangueira estourou? a gente prensa aqui na loja" — e embed no site.
7. **Personagem da San** (mascote) — guia o cliente no site, como o Seu Remo.
8. **Catálogo vivo** — próximo passo: o dono cadastra produtos/promoções pelo painel (sem mexer em código).
9. **Código de verificação no WhatsApp** — com a API oficial do WhatsApp Business, o "Entrar com WhatsApp" passa a confirmar o número por código.
10. **Relatório mensal automático** — resumo do mês (visitas, orçamentos, mais buscados) enviado pro WhatsApp/e-mail do dono.
