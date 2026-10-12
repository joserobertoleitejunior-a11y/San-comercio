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

  if (typeof window.supabase === "undefined" || typeof window.supabase.createClient !== "function") {
    window.SanSupabase = { pronto: false, client: null };
    return;
  }

  if (!configPreenchida) {
    console.warn(
      "[San] Config do Supabase ainda não foi preenchida em assets/js/config.js — " +
        "lista de orçamento vai usar apenas o WhatsApp."
    );
    window.SanSupabase = { pronto: false, client: null };
    return;
  }

  window.SanSupabase = {
    pronto: true,
    client: window.supabase.createClient(config.url, config.anonKey),
  };
})();
