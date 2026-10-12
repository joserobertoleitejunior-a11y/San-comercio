# PADRÕES-AGENCIA.md
### VIBE CODING PROCESS — arquivo mestre de padrões
> Criado por José. Define as regras fixas que **todo projeto novo** da agência segue, independente do cliente, do stack específico ou de qual agente/modelo de IA está executando o código.
>
> **Como usar**: cole este arquivo na raiz de todo projeto novo (`PADROES-AGENCIA.md`) e referencie ele no início de qualquer sessão de execução — humana ou de IA. É o "contrato" que qualquer agente deve respeitar sem precisar ser lembrado toda vez. Se um agente de IA sugerir algo que contradiz este arquivo, este arquivo vence.

---

## 0. Contexto do projeto

- **Cliente**: San Comércio de Mangueiras e Conexões Ltda — CNPJ 47.752.792/0001-14
- **Cidade**: Itapetininga-SP — Av. 5 de Novembro, 961, Vila Nastri, 18207-320
- **Segmento**: loja de mangueiras hidráulicas (prensagem própria), conexões, ferramentas, EPIs e produtos automotivos
- **Tipo de projeto**: site institucional + catálogo com lista de orçamento via WhatsApp (sem e-commerce, sem preço)
- **Projeto-base**: engenharia reversa do site Remop (`remop-retifica`, somente leitura)
- **Briefing completo**: `BRIEFING-SAN.md` · **Mapa de arquivos**: `MAPA-DO-SITE.md`

---

## 1–9. Regras fixas

Todas as seções 1 a 9 do padrão mestre da agência (governança/versionamento, motion e loading, observabilidade/qualidade/testes, segurança, acessibilidade, arquitetura multi-tenant se aplicável, deploy/rollback, checklist de início, SEO) **valem integralmente para este projeto, sem exceção**.

**Notas específicas deste projeto:**
- Site institucional público (não é SaaS interno da agência) → seção 6 (multi-tenant) não se aplica.
- Projeto tem página pública voltada ao cliente final → checklist de SEO (seção 9) é obrigatório, não opcional.
- Lista de orçamento **nunca mostra preço nem confirma estoque** — sempre termina no atendente humano pelo WhatsApp.
- Mascote/personagem próprio da San Comércio: **pendente** (aguardando briefing do José).

---

## 8. Checklist de início de projeto (status atual)

- [x] Repositório Git criado
- [x] Este arquivo copiado pra raiz, seção 0 preenchida
- [ ] `.env` configurado (`.gitignore` cobrindo `.env*` desde o primeiro commit)
- [ ] Sentry plugado (front e back)
- [ ] Lint (Biome) configurado
- [ ] RLS — tabelas `orcamentos`/analytics no Supabase (quando o projeto for criado), mesmo modelo da Remop
- [ ] Estrutura de testes inicial
- [x] Definido: projeto único de cliente (não SaaS da agência)
- [ ] Painel administrativo (backlog — reaproveitar `admin.html` da Remop)
- [ ] Definido: quem tem acesso a produção e onde ficam as chaves

---

*Este arquivo é vivo — atualize conforme o VIBE CODING PROCESS evoluir.*
