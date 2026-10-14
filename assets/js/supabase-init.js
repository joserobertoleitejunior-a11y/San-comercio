/**
 * Inicialização do Supabase (SDK client-side, via CDN).
 * Precisa que assets/js/config.js já tenha carregado com a URL e a
 * anon key reais do projeto Supabase preenchidas em
 * window.SAN_CONFIG.supabase.
 */
(function () {
  "use strict";

  var config = (window.SAN_CONFIG || {}).supabase || {};
  var configPreenchida =
    config.url &&
    config.anonKey &&
    config.url.indexOf("SUBSTITUIR") === -1 &&
    config.anonKey.indexOf("SUBSTITUIR") === -1;

  if (!configPreenchida) {
    console.warn(
      "[San] Config do Supabase ainda não foi preenchida em assets/js/config.js — " +
        "lista de orçamento vai usar apenas o WhatsApp."
    );
    window.SanSupabase = { pronto: false, client: null };
    return;
  }

  // O SDK (~150 KB) NÃO bloqueia a abertura do site: só é baixado depois que
  // a página terminou de carregar e o navegador está ocioso. Quem usa
  // SanSupabase.client.from(tabela).insert(...) espera o SDK sozinho.
  var SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  var promessa = null;

  function carregarSdk() {
    if (promessa) return promessa;
    promessa = new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      function baixar() {
        var tag = document.createElement("script");
        tag.src = SDK;
        tag.async = true;
        tag.onload = function () { resolve(window.supabase); };
        tag.onerror = function () { promessa = null; reject(new Error("SDK do Supabase não carregou")); };
        document.head.appendChild(tag);
      }
      function quandoOcioso() {
        if (window.requestIdleCallback) window.requestIdleCallback(baixar, { timeout: 4000 });
        else setTimeout(baixar, 1500);
      }
      if (document.readyState === "complete") quandoOcioso();
      else window.addEventListener("load", quandoOcioso, { once: true });
    }).then(function (lib) {
      return lib.createClient(config.url, config.anonKey);
    });
    return promessa;
  }

  window.SanSupabase = {
    pronto: true,
    client: {
      from: function (tabela) {
        return {
          insert: function (linha) {
            return carregarSdk().then(function (c) { return c.from(tabela).insert(linha); });
          },
        };
      },
    },
  };
})();
