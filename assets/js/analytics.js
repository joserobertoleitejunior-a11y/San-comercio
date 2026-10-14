/**
 * Rastreamento leve de uso do site — visitas por página, cliques nos
 * principais CTAs (WhatsApp, lista de orçamento, Instagram, mapa).
 * Base reaproveitada do site Remop.
 *
 * Só grava quando o Supabase estiver configurado (mesmo padrão do resto
 * do site — ver supabase-init.js); se não estiver, não faz nada e nunca
 * trava a navegação por causa disso.
 */
(function () {
  "use strict";

  var CHAVE_VISITANTE_ID = "sanVisitanteId";

  function obterVisitanteId() {
    try {
      var id = localStorage.getItem(CHAVE_VISITANTE_ID);
      if (!id) {
        id = "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
        localStorage.setItem(CHAVE_VISITANTE_ID, id);
      }
      return id;
    } catch (erro) {
      return null;
    }
  }

  // Número do cliente identificado ("Entrar com WhatsApp"), só dígitos.
  // Liga as visitas/cliques/pesquisas ao cliente no painel admin.
  function clienteWhatsapp() {
    var c = window.SanCliente && window.SanCliente.obter();
    return c && c.whatsapp ? String(c.whatsapp).replace(/\D/g, "") : "";
  }

  async function registrar(tabela, dados) {
    var supabaseInfo = window.SanSupabase;
    if (!supabaseInfo || !supabaseInfo.pronto) return;

    try {
      var linha = Object.assign(
        {
          pagina: location.pathname,
          visitante_id: obterVisitanteId(),
          cliente_whatsapp: clienteWhatsapp(),
        },
        dados
      );
      var resultado = await supabaseInfo.client.from(tabela).insert(linha);
      if (resultado.error) throw resultado.error;
    } catch (erro) {
      console.warn("[San] Não deu pra registrar analytics (" + tabela + "):", erro);
    }
  }

  function registrarPagina() {
    registrar("paginas_vistas", { referencia: document.referrer || "" });
  }

  function registrarCliques() {
    var seletores =
      "[data-whatsapp-link], [data-whatsapp-mensagem], [data-adicionar-item], [data-abrir-lista], [data-link-instagram], [data-link-maps]";

    document.addEventListener("click", function (evento) {
      var alvo = evento.target.closest(seletores);
      if (!alvo) return;

      var tipo = alvo.hasAttribute("data-adicionar-item")
        ? "adicionar-lista"
        : alvo.hasAttribute("data-abrir-lista")
        ? "abrir-lista"
        : alvo.hasAttribute("data-link-instagram")
        ? "instagram"
        : alvo.hasAttribute("data-link-maps")
        ? "mapa"
        : "whatsapp";

      registrar("cliques", {
        tipo: tipo,
        detalhe:
          alvo.getAttribute("data-adicionar-item") ||
          alvo.textContent.trim().slice(0, 60),
      });
    });
  }

  window.SanAnalytics = {
    visitanteId: obterVisitanteId,
    /** Termo buscado no catálogo / item escrito à mão na lista. */
    registrarPesquisa: function (termo, resultados, origem) {
      termo = String(termo || "").trim().toLowerCase().slice(0, 120);
      if (termo.length < 2) return;
      registrar("pesquisas", { termo: termo, resultados: resultados || 0, origem: origem || "busca" });
    },
  };

  document.addEventListener("DOMContentLoaded", function () {
    registrarPagina();
    registrarCliques();
  });
})();
