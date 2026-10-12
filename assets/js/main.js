/**
 * Comportamento geral do site San Comércio: links de WhatsApp
 * pré-preenchidos, menu mobile, header que muda ao rolar, horário de
 * funcionamento (lido do config.js), faixa arrastável, filtro do
 * catálogo e FAQ. Base reaproveitada do site Remop.
 */
(function () {
  "use strict";

  var config = window.SAN_CONFIG || {};

  function montarLinkWhatsApp(mensagem) {
    var texto = encodeURIComponent(mensagem || config.whatsappMensagemPadrao || "");
    return "https://wa.me/" + (config.whatsappNumero || "") + "?text=" + texto;
  }

  /** Preenche todos os links que dependem do config (um só ponto de edição). */
  function preencherLinks() {
    document.querySelectorAll("[data-whatsapp-mensagem]").forEach(function (link) {
      link.setAttribute("href", montarLinkWhatsApp(link.getAttribute("data-whatsapp-mensagem")));
    });
    document.querySelectorAll("[data-whatsapp-link]").forEach(function (link) {
      link.setAttribute("href", montarLinkWhatsApp());
    });
    var mapa = {
      "[data-link-instagram]": config.instagramUrl,
      "[data-link-maps]": config.mapsUrl,
      "[data-link-waze]": config.wazeUrl,
      "[data-link-email]": config.email ? "mailto:" + config.email : null,
      "[data-link-fixo]": config.telefoneFixoLink ? "tel:" + config.telefoneFixoLink : null,
    };
    Object.keys(mapa).forEach(function (seletor) {
      if (!mapa[seletor]) return;
      document.querySelectorAll(seletor).forEach(function (el) {
        el.setAttribute("href", mapa[seletor]);
      });
    });
    var textos = {
      "[data-texto-whatsapp]": config.whatsappExibicao,
      "[data-texto-fixo]": config.telefoneFixo,
      "[data-texto-email]": config.email,
      "[data-texto-endereco]": config.enderecoCompleto,
      "[data-texto-instagram]": config.instagramUsuario,
    };
    Object.keys(textos).forEach(function (seletor) {
      if (!textos[seletor]) return;
      document.querySelectorAll(seletor).forEach(function (el) {
        el.textContent = textos[seletor];
      });
    });
  }

  function iniciarMenuMobile() {
    var botao = document.querySelector(".menu-toggle");
    var nav = document.querySelector(".nav-principal");
    if (!botao || !nav) return;

    function fechar() {
      nav.classList.remove("aberto");
      botao.setAttribute("aria-expanded", "false");
      botao.setAttribute("aria-label", "Abrir menu");
    }
    botao.addEventListener("click", function () {
      var aberto = nav.classList.toggle("aberto");
      botao.setAttribute("aria-expanded", aberto ? "true" : "false");
      botao.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", fechar);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") fechar();
    });
  }

  /**
   * Header: transparente por cima da hero (texto branco), vira "vidro"
   * branco depois que rola, e se esconde ao descer / volta ao subir.
   */
  function iniciarCabecalho() {
    var cabecalho = document.querySelector(".cabecalho");
    if (!cabecalho) return;
    var temHero = !!document.querySelector(".hero");
    var ultimoY = window.scrollY;
    var agendado = false;

    function atualizar() {
      agendado = false;
      var y = window.scrollY;
      var rolado = y > 40 || !temHero;
      cabecalho.classList.toggle("cabecalho--rolado", rolado);
      cabecalho.classList.toggle("cabecalho--sobre-hero", !rolado);
      var menuAberto = document.querySelector(".nav-principal.aberto");
      var descendo = y > ultimoY && y > 400;
      cabecalho.classList.toggle("cabecalho--escondido", descendo && !menuAberto);
      ultimoY = y;
    }
    window.addEventListener("scroll", function () {
      if (!agendado) {
        agendado = true;
        requestAnimationFrame(atualizar);
      }
    }, { passive: true });
    atualizar();
  }

  /* ---------- Horário de funcionamento ---------- */
  var NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  function agoraEmSaoPaulo() {
    // Itapetininga segue o horário de Brasília (UTC-3, sem horário de verão).
    var agora = new Date();
    var utc = agora.getTime() + agora.getTimezoneOffset() * 60000;
    return new Date(utc - 3 * 3600000);
  }

  function emMinutos(hhmm) {
    var p = hhmm.split(":");
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function textoDoDia(dia) {
    var faixa = (config.horarios || {})[dia];
    if (faixa) return faixa[0].replace(":", "h") + " às " + faixa[1].replace(":", "h");
    if (dia === 6) return config.sabadoTexto || "Consulte";
    return "Fechado";
  }

  /** Estado atual: aberto / fechado / consultar (sábado sem horário confirmado). */
  function estadoAgora() {
    var agora = agoraEmSaoPaulo();
    var dia = agora.getDay();
    var faixa = (config.horarios || {})[dia];
    var minutos = agora.getHours() * 60 + agora.getMinutes();
    if (!faixa) {
      return dia === 6
        ? { estado: "consultar", texto: "Sábado: consulte o horário" }
        : { estado: "fechado", texto: "Fechado agora · abre segunda 07h15" };
    }
    var abre = emMinutos(faixa[0]);
    var fecha = emMinutos(faixa[1]);
    if (minutos >= abre && minutos < fecha) {
      return { estado: "aberto", texto: "Aberto agora · até " + faixa[1].replace(":", "h") };
    }
    if (minutos < abre) {
      return { estado: "fechado", texto: "Fechado · abre hoje às " + faixa[0].replace(":", "h") };
    }
    return { estado: "fechado", texto: "Fechado agora · fala com a gente no WhatsApp" };
  }

  function renderizarHorario() {
    var status = estadoAgora();
    document.querySelectorAll("[data-status-aberto]").forEach(function (el) {
      el.setAttribute("data-estado", status.estado);
      el.textContent = status.texto;
    });

    var hoje = agoraEmSaoPaulo().getDay();
    document.querySelectorAll("[data-tabela-horario]").forEach(function (tabela) {
      var corpo = document.createElement("tbody");
      [1, 2, 3, 4, 5, 6, 0].forEach(function (dia) {
        var linha = document.createElement("tr");
        if (dia === hoje) linha.className = "hoje";
        var nome = document.createElement("td");
        nome.textContent = NOMES_DIAS[dia] + (dia === hoje ? " (hoje)" : "");
        var horas = document.createElement("td");
        horas.textContent = textoDoDia(dia);
        linha.appendChild(nome);
        linha.appendChild(horas);
        corpo.appendChild(linha);
      });
      tabela.innerHTML = "";
      tabela.appendChild(corpo);
    });

    document.querySelectorAll("[data-horario-resumo]").forEach(function (el) {
      el.textContent = "Seg a sex: " + textoDoDia(1) + " · Sáb: " + textoDoDia(6);
    });
  }

  /**
   * Faixa de categorias: anda sozinha e pode ser arrastada (com inércia).
   * Mesma lógica da faixa de ícones da hero da Remop — itens aparecem
   * duplicados no HTML pra criar o loop infinito nos dois sentidos.
   */
  function iniciarFaixaArrastavel() {
    var faixa = document.querySelector(".faixa");
    var trilha = document.querySelector(".faixa__trilha");
    if (!faixa || !trilha) return;

    var reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var VELOCIDADE = 0.05; // px por ms
    var ATRITO = 0.94;
    var larguraConjunto = trilha.scrollWidth / 2;
    window.addEventListener("resize", function () { larguraConjunto = trilha.scrollWidth / 2; });

    var posicao = 0, arrastando = false, pontoX = 0, pontoT = 0, velocidade = 0;
    var quadro = null, ultimo = null, visivel = true;
    // Acelera um pouco quando o visitante rola a página (sensação de "puxar" a faixa)
    var empurraoScroll = 0, ultimoScrollY = window.scrollY;
    window.addEventListener("scroll", function () {
      empurraoScroll = Math.min(Math.abs(window.scrollY - ultimoScrollY) * 0.08, 6);
      ultimoScrollY = window.scrollY;
    }, { passive: true });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entradas) {
        var estava = visivel;
        visivel = entradas[0].isIntersecting;
        if (visivel && !estava && !quadro) { ultimo = null; quadro = requestAnimationFrame(loop); }
      }).observe(faixa);
    }

    function desenhar() {
      if (larguraConjunto > 0) {
        while (posicao <= -larguraConjunto) posicao += larguraConjunto;
        while (posicao > 0) posicao -= larguraConjunto;
      }
      trilha.style.transform = "translate3d(" + posicao + "px,0,0)";
    }

    function loop(agora) {
      if (!visivel) { quadro = null; return; }
      if (ultimo === null) ultimo = agora;
      var passo = Math.min(agora - ultimo, 50);
      ultimo = agora;
      if (!arrastando) {
        if (Math.abs(velocidade) > 0.01) {
          posicao += velocidade * passo;
          velocidade *= ATRITO;
        } else if (!reduz) {
          posicao -= VELOCIDADE * passo + empurraoScroll;
          empurraoScroll *= 0.9;
        }
        desenhar();
      }
      quadro = requestAnimationFrame(loop);
    }

    faixa.addEventListener("pointerdown", function (e) {
      arrastando = true;
      pontoX = e.clientX;
      pontoT = performance.now();
      velocidade = 0;
      try { faixa.setPointerCapture(e.pointerId); } catch (erro) {}
    });
    faixa.addEventListener("pointermove", function (e) {
      if (!arrastando) return;
      var agora = performance.now();
      var dx = e.clientX - pontoX;
      posicao += dx;
      velocidade = dx / Math.max(agora - pontoT, 1);
      pontoX = e.clientX;
      pontoT = agora;
      desenhar();
    });
    function soltar() { arrastando = false; if (reduz) velocidade = 0; }
    faixa.addEventListener("pointerup", soltar);
    faixa.addEventListener("pointercancel", soltar);

    quadro = requestAnimationFrame(loop);
  }

  /** Filtro do catálogo por segmento (Hidráulica, Automotivo, etc.). */
  function iniciarFiltroProdutos() {
    var botoes = document.querySelectorAll("[data-filtro]");
    var cards = document.querySelectorAll("[data-segmentos]");
    if (!botoes.length || !cards.length) return;

    botoes.forEach(function (botao) {
      botao.addEventListener("click", function () {
        var filtro = botao.getAttribute("data-filtro");
        botoes.forEach(function (b) { b.setAttribute("aria-pressed", b === botao ? "true" : "false"); });

        var mostrar = [];
        cards.forEach(function (card) {
          var segs = card.getAttribute("data-segmentos").split(" ");
          var visivel = filtro === "todos" || segs.indexOf(filtro) !== -1;
          card.hidden = !visivel;
          if (visivel) mostrar.push(card);
        });

        if (window.SanAnimacoes && window.SanAnimacoes.entrarCards) {
          window.SanAnimacoes.entrarCards(mostrar);
        }
      });
    });
  }

  /** FAQ: abre uma resposta por vez. */
  function iniciarFaq() {
    var perguntas = document.querySelectorAll(".faq__pergunta");
    perguntas.forEach(function (pergunta) {
      pergunta.addEventListener("click", function () {
        var aberta = pergunta.getAttribute("aria-expanded") === "true";
        perguntas.forEach(function (outra) { outra.setAttribute("aria-expanded", "false"); });
        pergunta.setAttribute("aria-expanded", aberta ? "false" : "true");
      });
    });
  }

  /** Toast curto de confirmação, usado pela lista de orçamento. */
  var toastTimer = null;
  function mostrarToast(mensagem) {
    var toast = document.querySelector("[data-toast]");
    if (!toast) return;
    toast.querySelector("[data-toast-texto]").textContent = mensagem;
    toast.classList.add("visivel");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("visivel"); }, 2600);
  }

  document.addEventListener("DOMContentLoaded", function () {
    preencherLinks();
    iniciarMenuMobile();
    iniciarCabecalho();
    renderizarHorario();
    setInterval(renderizarHorario, 60000);
    iniciarFaixaArrastavel();
    iniciarFiltroProdutos();
    iniciarFaq();
    document.querySelectorAll("[data-ano-atual]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  });

  window.SanWhatsApp = { montarLink: montarLinkWhatsApp };
  window.SanToast = mostrarToast;
})();
