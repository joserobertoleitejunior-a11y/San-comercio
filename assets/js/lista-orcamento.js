/**
 * Lista de orçamento — o "carrinho" do site, no espírito do botão
 * "Adicionar ao pedido" do catálogo do WhatsApp da loja.
 *
 * O visitante junta itens (categorias do catálogo, item digitado livre
 * ou uma mangueira montada na ficha de prensagem), ajusta quantidades e
 * manda tudo formatado pro WhatsApp. Não mostra preço nem fecha venda:
 * quem confirma valor e estoque é sempre o atendente humano.
 *
 * A lista fica salva no navegador (localStorage) pra não se perder ao
 * trocar de página. Se o Supabase estiver configurado, também grava o
 * pedido na tabela "orcamentos" (ver README). Sem Supabase, só WhatsApp.
 */
(function () {
  "use strict";

  var CHAVE = "sanListaOrcamento";
  var itens = [];
  var el = {};

  /* ---------- Persistência ---------- */
  function carregar() {
    try {
      var salvo = JSON.parse(localStorage.getItem(CHAVE) || "[]");
      itens = Array.isArray(salvo) ? salvo : [];
    } catch (erro) {
      itens = [];
    }
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(itens)); } catch (erro) {}
  }

  function gerarId(nome, detalhe) {
    return (nome + "|" + (detalhe || "")).toLowerCase();
  }

  /* ---------- Operações ---------- */
  function adicionar(nome, detalhe, quantidade, origemEl) {
    nome = String(nome || "").trim();
    if (!nome) return;
    var id = gerarId(nome, detalhe);
    var existente = itens.filter(function (i) { return i.id === id; })[0];
    if (existente) {
      existente.qtd += quantidade || 1;
    } else {
      itens.push({ id: id, nome: nome, detalhe: detalhe || "", qtd: quantidade || 1 });
    }
    salvar();
    renderizar();
    marcarBotoesAdicionados();

    if (origemEl && window.SanAnimacoes && window.SanAnimacoes.voarParaLista) {
      window.SanAnimacoes.voarParaLista(origemEl);
    }
    if (window.SanToast) window.SanToast("“" + nome + "” entrou na sua lista");
  }

  function alterarQuantidade(id, delta) {
    itens.forEach(function (i) {
      if (i.id === id) i.qtd = Math.max(1, i.qtd + delta);
    });
    salvar();
    renderizar();
  }

  function remover(id) {
    itens = itens.filter(function (i) { return i.id !== id; });
    salvar();
    renderizar();
    marcarBotoesAdicionados();
  }

  function limpar() {
    itens = [];
    salvar();
    renderizar();
    marcarBotoesAdicionados();
  }

  /* ---------- Interface ---------- */
  function totalUnidades() {
    return itens.reduce(function (soma, i) { return soma + i.qtd; }, 0);
  }

  function atualizarContadores() {
    var total = itens.length;
    document.querySelectorAll("[data-contador-lista]").forEach(function (c) {
      c.textContent = total;
      c.setAttribute("data-vazio", total === 0 ? "true" : "false");
    });
  }

  function marcarBotoesAdicionados() {
    var ids = itens.map(function (i) { return i.id; });
    document.querySelectorAll("[data-adicionar-item]").forEach(function (botao) {
      var id = gerarId(botao.getAttribute("data-adicionar-item"), botao.getAttribute("data-detalhe"));
      botao.setAttribute("data-adicionado", ids.indexOf(id) !== -1 ? "true" : "false");
    });
  }

  function renderizar() {
    atualizarContadores();
    if (!el.lista) return;

    el.lista.innerHTML = "";
    el.vazia.hidden = itens.length > 0;
    el.rodape.hidden = itens.length === 0;

    itens.forEach(function (item) {
      var linha = document.createElement("div");
      linha.className = "item-lista";

      var nome = document.createElement("span");
      nome.className = "item-lista__nome";
      nome.textContent = item.nome;
      linha.appendChild(nome);

      var qtd = document.createElement("div");
      qtd.className = "item-lista__qtd";
      var menos = document.createElement("button");
      menos.type = "button";
      menos.textContent = "−";
      menos.setAttribute("aria-label", "Diminuir quantidade de " + item.nome);
      menos.addEventListener("click", function () { alterarQuantidade(item.id, -1); });
      var numero = document.createElement("span");
      numero.textContent = item.qtd;
      var mais = document.createElement("button");
      mais.type = "button";
      mais.textContent = "+";
      mais.setAttribute("aria-label", "Aumentar quantidade de " + item.nome);
      mais.addEventListener("click", function () { alterarQuantidade(item.id, 1); });
      qtd.appendChild(menos);
      qtd.appendChild(numero);
      qtd.appendChild(mais);
      linha.appendChild(qtd);

      if (item.detalhe) {
        var detalhe = document.createElement("span");
        detalhe.className = "item-lista__detalhe";
        detalhe.textContent = item.detalhe;
        linha.appendChild(detalhe);
      }

      var tirar = document.createElement("button");
      tirar.type = "button";
      tirar.className = "item-lista__remover";
      tirar.textContent = "Remover";
      tirar.addEventListener("click", function () { remover(item.id); });
      linha.appendChild(tirar);

      el.lista.appendChild(linha);
    });
  }

  function abrirGaveta() {
    if (!el.gaveta) return;
    el.gaveta.classList.add("aberto");
    el.fundo.classList.add("aberto");
    el.gaveta.setAttribute("aria-hidden", "false");
    el.gaveta.inert = false;
    document.body.classList.add("travado");
    var fechar = el.gaveta.querySelector("[data-fechar-lista]");
    if (fechar) fechar.focus();
  }

  function fecharGaveta() {
    if (!el.gaveta) return;
    el.gaveta.classList.remove("aberto");
    el.fundo.classList.remove("aberto");
    el.gaveta.setAttribute("aria-hidden", "true");
    el.gaveta.inert = true;
    document.body.classList.remove("travado");
  }

  /* ---------- Envio ---------- */
  function montarMensagem(nome, cidade) {
    var linhas = ["Olá! Vim pelo site da San Comércio e quero um orçamento destes itens:", ""];
    itens.forEach(function (item, indice) {
      linhas.push((indice + 1) + ") " + item.qtd + "x " + item.nome + (item.detalhe ? " — " + item.detalhe : ""));
    });
    linhas.push("");
    if (nome) linhas.push("Nome: " + nome);
    if (cidade) linhas.push("Cidade: " + cidade);
    linhas.push("Total de itens: " + itens.length + " (" + totalUnidades() + " unidades)");
    return linhas.join("\n");
  }

  async function salvarNoSupabase(nome, cidade) {
    var info = window.SanSupabase;
    if (!info || !info.pronto) return;
    try {
      var resultado = await info.client.from("orcamentos").insert({
        nome: nome || "",
        cidade: cidade || "",
        itens: itens,
        pagina: location.pathname,
      });
      if (resultado.error) throw resultado.error;
    } catch (erro) {
      console.warn("[San] Não deu pra salvar o orçamento no Supabase:", erro);
    }
  }

  function iniciarEnvio() {
    var form = document.querySelector("[data-form-lista]");
    if (!form) return;
    form.addEventListener("submit", function (evento) {
      evento.preventDefault();
      if (!itens.length) return;
      var nome = form.querySelector("#lista-nome").value.trim();
      var cidade = form.querySelector("#lista-cidade").value.trim();
      salvarNoSupabase(nome, cidade);
      var link = window.SanWhatsApp.montarLink(montarMensagem(nome, cidade));
      // Navegação por link real (funciona em qualquer navegador e app).
      var a = form.querySelector("[data-link-envio]");
      a.setAttribute("href", link);
      a.click();
    });
  }

  /* ---------- Ficha de prensagem ("Monte sua mangueira") ---------- */
  function iniciarFichaPrensagem() {
    var ficha = document.querySelector("[data-ficha-prensagem]");
    if (!ficha) return;
    var resumo = ficha.querySelector("[data-ficha-resumo]");

    function ler() {
      var bitola = ficha.querySelector('input[name="bitola"]:checked');
      return {
        tipo: ficha.querySelector("#ficha-tipo").value,
        bitola: bitola ? bitola.value : "",
        comprimento: ficha.querySelector("#ficha-comprimento").value.trim(),
        terminais: ficha.querySelector("#ficha-terminais").value,
        qtd: parseInt(ficha.querySelector("#ficha-qtd").value, 10) || 1,
        obs: ficha.querySelector("#ficha-obs").value.trim(),
      };
    }

    function detalhe(d) {
      var partes = [];
      if (d.bitola) partes.push("bitola " + d.bitola);
      if (d.comprimento) partes.push(d.comprimento + " m");
      if (d.terminais) partes.push("terminais: " + d.terminais);
      if (d.obs) partes.push(d.obs);
      return partes.join(" · ");
    }

    function atualizarResumo() {
      var d = ler();
      resumo.textContent = d.qtd + "x " + d.tipo + (detalhe(d) ? " — " + detalhe(d) : "");
    }

    ficha.addEventListener("input", atualizarResumo);
    ficha.addEventListener("change", atualizarResumo);
    ficha.addEventListener("submit", function (evento) {
      evento.preventDefault();
      var d = ler();
      adicionar("Mangueira prensada: " + d.tipo, detalhe(d), d.qtd, ficha.querySelector('[type="submit"]'));
    });
    atualizarResumo();
  }

  /* ---------- Item livre ("não achou?") ---------- */
  function iniciarItemLivre() {
    document.querySelectorAll("[data-form-item-livre]").forEach(function (form) {
      form.addEventListener("submit", function (evento) {
        evento.preventDefault();
        var campo = form.querySelector("input");
        var texto = campo.value.trim();
        if (!texto) { campo.focus(); return; }
        adicionar(texto, "", 1, form.querySelector("button"));
        campo.value = "";
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    el.gaveta = document.querySelector("[data-gaveta-lista]");
    el.fundo = document.querySelector("[data-gaveta-fundo]");
    el.lista = document.querySelector("[data-itens-lista]");
    el.vazia = document.querySelector("[data-lista-vazia]");
    el.rodape = document.querySelector("[data-rodape-lista]");

    carregar();
    renderizar();
    marcarBotoesAdicionados();

    document.addEventListener("click", function (evento) {
      var botaoAdd = evento.target.closest("[data-adicionar-item]");
      if (botaoAdd) {
        adicionar(botaoAdd.getAttribute("data-adicionar-item"), botaoAdd.getAttribute("data-detalhe"), 1, botaoAdd);
        return;
      }
      if (evento.target.closest("[data-abrir-lista]")) { abrirGaveta(); return; }
      if (evento.target.closest("[data-fechar-lista]")) { fecharGaveta(); return; }
      if (evento.target.closest("[data-limpar-lista]")) { limpar(); }
    });
    if (el.fundo) el.fundo.addEventListener("click", fecharGaveta);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") fecharGaveta();
    });

    iniciarEnvio();
    iniciarFichaPrensagem();
    iniciarItemLivre();

    // Outras abas abertas do site ficam sincronizadas
    window.addEventListener("storage", function (e) {
      if (e.key === CHAVE) { carregar(); renderizar(); marcarBotoesAdicionados(); }
    });
  });

  window.SanLista = { adicionar: adicionar, abrir: abrirGaveta, fechar: fecharGaveta };
})();
