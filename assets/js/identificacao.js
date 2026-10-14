/**
 * Identificação do cliente pelo número do WhatsApp ("Entrar com
 * WhatsApp"). Mesmo espírito do portão de visitante da Remop, mas sem
 * bloquear a navegação: o cliente se identifica quando quer (botão no
 * header) ou na hora de mandar a lista de orçamento.
 *
 * - Guarda nome/WhatsApp/cidade no navegador (volta a reconhecer o
 *   cliente nas próximas visitas: "Bem-vindo de volta, Nome").
 * - Se o Supabase estiver configurado, grava cada identificação na
 *   tabela "identificacoes" (só inserção — ver supabase/schema.sql).
 *   O painel admin agrupa por número de WhatsApp.
 *
 * Não há verificação por código (OTP): isso exige a API oficial do
 * WhatsApp Business. Ver BRIEFING-SAN.md → próximos passos.
 */
(function () {
  "use strict";

  var CHAVE = "sanCliente";
  var el = {};

  function soDigitos(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  /** (15) 99683-6600 a partir de qualquer digitação */
  function formatarWhatsApp(valor) {
    var d = soDigitos(valor).replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
    if (d.length <= 2) return d ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }

  function whatsappValido(valor) {
    var d = soDigitos(valor);
    return d.length === 10 || d.length === 11;
  }

  function obter() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE) || "null");
    } catch (erro) {
      return null;
    }
  }

  async function registrarNoSupabase(dados, origem) {
    var info = window.SanSupabase;
    if (!info || !info.pronto) return;
    try {
      var resultado = await info.client.from("identificacoes").insert({
        nome: dados.nome,
        whatsapp: soDigitos(dados.whatsapp),
        cidade: dados.cidade || "",
        origem: origem || "site",
        pagina: location.pathname,
        visitante_id: (window.SanAnalytics && window.SanAnalytics.visitanteId()) || "",
      });
      if (resultado.error) throw resultado.error;
    } catch (erro) {
      console.warn("[San] Não deu pra registrar a identificação:", erro);
    }
  }

  function salvar(dados, origem) {
    var atual = obter() || {};
    var novo = {
      nome: (dados.nome || atual.nome || "").trim(),
      whatsapp: formatarWhatsApp(dados.whatsapp || atual.whatsapp || ""),
      cidade: (dados.cidade || atual.cidade || "").trim(),
      desde: atual.desde || new Date().toISOString(),
    };
    try { localStorage.setItem(CHAVE, JSON.stringify(novo)); } catch (erro) {}
    var mudou = soDigitos(novo.whatsapp) !== soDigitos(atual.whatsapp) || novo.nome !== atual.nome;
    if (mudou || origem === "lista") registrarNoSupabase(novo, origem);
    atualizarInterface();
    return novo;
  }

  function sair() {
    try { localStorage.removeItem(CHAVE); } catch (erro) {}
    atualizarInterface();
  }

  function primeiroNome() {
    var c = obter();
    return c && c.nome ? c.nome.split(" ")[0] : "";
  }

  /* ---------- Interface ---------- */
  function atualizarInterface() {
    var cliente = obter();
    document.querySelectorAll("[data-abrir-entrar]").forEach(function (botao) {
      var inicial = botao.querySelector("[data-inicial-cliente]");
      if (cliente && cliente.nome) {
        botao.setAttribute("data-identificado", "true");
        botao.setAttribute("aria-label", "Conectado como " + cliente.nome + " — abrir dados");
        if (inicial) inicial.textContent = cliente.nome.trim().charAt(0).toUpperCase();
      } else {
        botao.setAttribute("data-identificado", "false");
        botao.setAttribute("aria-label", "Entrar com WhatsApp");
        if (inicial) inicial.textContent = "";
      }
    });
    // Pré-preenche os campos da lista de orçamento
    ["nome", "whatsapp", "cidade"].forEach(function (campo) {
      var input = document.getElementById("lista-" + campo);
      if (input && cliente && cliente[campo] && !input.value) input.value = cliente[campo];
    });
    if (el.modal) {
      el.conectado.hidden = !(cliente && cliente.nome);
      el.form.hidden = !!(cliente && cliente.nome);
      if (cliente && cliente.nome) {
        el.saudacao.textContent = "Olá, " + cliente.nome.split(" ")[0] + "!";
        el.dados.textContent = cliente.whatsapp + (cliente.cidade ? " · " + cliente.cidade : "");
      }
    }
  }

  function abrirModal() {
    if (!el.modal) return;
    el.modal.hidden = false;
    requestAnimationFrame(function () { el.modal.classList.add("aberto"); });
    document.body.classList.add("travado");
    var foco = el.modal.querySelector(el.form.hidden ? "[data-fechar-entrar]" : "input");
    if (foco) foco.focus();
  }

  function fecharModal() {
    if (!el.modal || el.modal.hidden) return;
    el.modal.classList.remove("aberto");
    document.body.classList.remove("travado");
    setTimeout(function () { el.modal.hidden = true; }, 300);
  }

  function aplicarMascara(input) {
    input.addEventListener("input", function () {
      var pos = input.value.length;
      input.value = formatarWhatsApp(input.value);
      if (pos >= input.value.length) input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  function iniciarModal() {
    el.modal = document.querySelector("[data-modal-entrar]");
    if (!el.modal) return;
    el.form = el.modal.querySelector("[data-form-entrar]");
    el.conectado = el.modal.querySelector("[data-entrar-conectado]");
    el.saudacao = el.modal.querySelector("[data-entrar-saudacao]");
    el.dados = el.modal.querySelector("[data-entrar-dados]");
    var status = el.modal.querySelector("[data-entrar-status]");

    aplicarMascara(el.form.querySelector("#entrar-whatsapp"));

    el.form.addEventListener("submit", function (evento) {
      evento.preventDefault();
      var nome = el.form.querySelector("#entrar-nome").value.trim();
      var whats = el.form.querySelector("#entrar-whatsapp").value;
      var cidade = el.form.querySelector("#entrar-cidade").value.trim();
      if (!nome) { status.textContent = "Escreva seu nome."; return; }
      if (!whatsappValido(whats)) { status.textContent = "Confira o WhatsApp com DDD, ex.: (15) 99999-9999."; return; }
      status.textContent = "";
      salvar({ nome: nome, whatsapp: whats, cidade: cidade }, "entrar");
      if (window.SanToast) window.SanToast("Pronto, " + nome.split(" ")[0] + "! Sua lista fica salva aqui.");
      setTimeout(fecharModal, 500);
    });

    el.modal.addEventListener("click", function (evento) {
      if (evento.target === el.modal || evento.target.closest("[data-fechar-entrar]")) fecharModal();
      if (evento.target.closest("[data-sair-cliente]")) sair();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecharModal(); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    iniciarModal();
    ["lista-whatsapp"].forEach(function (id) {
      var input = document.getElementById(id);
      if (input) aplicarMascara(input);
    });
    document.addEventListener("click", function (evento) {
      if (evento.target.closest("[data-abrir-entrar]")) abrirModal();
    });
    atualizarInterface();

    // "Bem-vindo de volta" uma vez por sessão
    var nome = primeiroNome();
    var jaSaudou = false;
    try { jaSaudou = sessionStorage.getItem("sanSaudou") === "1"; sessionStorage.setItem("sanSaudou", "1"); } catch (e) {}
    if (nome && !jaSaudou && window.SanToast) {
      setTimeout(function () { window.SanToast("Bem-vindo de volta, " + nome + "!"); }, 2600);
    }
  });

  window.SanCliente = {
    obter: obter,
    salvar: salvar,
    abrir: abrirModal,
    formatarWhatsApp: formatarWhatsApp,
    whatsappValido: whatsappValido,
    soDigitos: soDigitos,
  };
})();
