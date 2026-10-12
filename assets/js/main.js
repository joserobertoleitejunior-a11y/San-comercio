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
      "[data-link-facebook]": config.facebookUrl,
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
   * [Copiada da Remop, comportamento idêntico]
   * Faixa de ícones no topo da hero: anda sozinha e também pode ser
   * arrastada com o dedo/mouse (pointer events cobrem os dois). Solta
   * arrastando e ela continua girando com a velocidade do arrasto,
   * desacelerando por atrito até voltar a andar sozinha. Como os
   * ícones aparecem duplicados no HTML (dois conjuntos iguais), a
   * posição é sempre "dobrada" de volta pra dentro de um conjunto,
   * criando a ilusão de loop infinito nos dois sentidos.
   */
  function iniciarFaixaContatos() {
    var trilha = document.querySelector(".hero__faixa-trilha");
    if (!trilha) return;

    var reduzMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    var VELOCIDADE_AUTOMATICA = 0.035; // px por ms
    var ATRITO = 0.94;
    var LIMIAR_CLIQUE = 6; // px — acima disso, não deixa o clique passar pro link

    var larguraConjunto = trilha.scrollWidth / 2;
    window.addEventListener("resize", function () {
      larguraConjunto = trilha.scrollWidth / 2;
    });

    var posicao = 0;
    var arrastando = false;
    var moveuBastante = false;
    var somaMovimento = 0;
    var pontoX = 0;
    var pontoT = 0;
    var velocidade = 0;
    var quadroAtivo = null;
    var ultimoQuadroAuto = null;
    var ultimoQuadroMomento = null;
    // Só roda o loop de animação enquanto a faixa está visível na tela
    // — sem isso, o requestAnimationFrame ficava rodando pra sempre em
    // segundo plano depois que o visitante rolava a página pra baixo,
    // gastando bateria/CPU à toa e pesando no resto dos efeitos.
    var visivel = true;
    if ("IntersectionObserver" in window) {
      var observador = new IntersectionObserver(
        function (entradas) {
          var estavaVisivel = visivel;
          visivel = entradas[0].isIntersecting;
          if (visivel && !estavaVisivel && !arrastando && !quadroAtivo) {
            quadroAtivo = requestAnimationFrame(autoRolar);
          }
        },
        { threshold: 0 }
      );
      observador.observe(trilha);
    }

    function normalizar() {
      if (larguraConjunto <= 0) return;
      while (posicao <= -larguraConjunto) posicao += larguraConjunto;
      while (posicao > 0) posicao -= larguraConjunto;
    }

    function desenhar() {
      normalizar();
      trilha.style.transform = "translateX(" + posicao + "px)";
    }

    function cancelarQuadro() {
      if (quadroAtivo) cancelAnimationFrame(quadroAtivo);
      quadroAtivo = null;
    }

    function autoRolar(agora) {
      if (!visivel) {
        // Não agenda o próximo quadro — quem acorda o loop de novo é
        // o próprio IntersectionObserver, via aoFicarVisivel().
        quadroAtivo = null;
        ultimoQuadroAuto = null;
        return;
      }
      if (ultimoQuadroAuto === null) ultimoQuadroAuto = agora;
      var passo = agora - ultimoQuadroAuto;
      ultimoQuadroAuto = agora;
      if (!arrastando && !reduzMovimento) {
        posicao -= VELOCIDADE_AUTOMATICA * passo;
        desenhar();
      }
      quadroAtivo = requestAnimationFrame(autoRolar);
    }

    function aplicarMomento(agora) {
      if (ultimoQuadroMomento === null) ultimoQuadroMomento = agora;
      var passo = agora - ultimoQuadroMomento;
      ultimoQuadroMomento = agora;
      posicao += velocidade * passo;
      velocidade *= ATRITO;
      desenhar();
      if (Math.abs(velocidade) > 0.01) {
        quadroAtivo = requestAnimationFrame(aplicarMomento);
      } else {
        ultimoQuadroMomento = null;
        ultimoQuadroAuto = null;
        quadroAtivo = requestAnimationFrame(autoRolar);
      }
    }

    function aoPressionar(evento) {
      arrastando = true;
      moveuBastante = false;
      somaMovimento = 0;
      cancelarQuadro();
      pontoX = evento.clientX;
      pontoT = performance.now();
      velocidade = 0;
      trilha.classList.add("arrastando");
      if (trilha.setPointerCapture) {
        try {
          trilha.setPointerCapture(evento.pointerId);
        } catch (erro) {}
      }
    }

    function aoMover(evento) {
      if (!arrastando) return;
      var agora = performance.now();
      var deltaX = evento.clientX - pontoX;
      var deltaT = Math.max(agora - pontoT, 1);
      posicao += deltaX;
      velocidade = deltaX / deltaT;
      somaMovimento += Math.abs(deltaX);
      if (somaMovimento > LIMIAR_CLIQUE) moveuBastante = true;
      pontoX = evento.clientX;
      pontoT = agora;
      desenhar();
    }

    function aoSoltar() {
      if (!arrastando) return;
      arrastando = false;
      trilha.classList.remove("arrastando");
      cancelarQuadro();
      ultimoQuadroMomento = null;
      if (Math.abs(velocidade) > 0.02 && !reduzMovimento) {
        quadroAtivo = requestAnimationFrame(aplicarMomento);
      } else {
        ultimoQuadroAuto = null;
        quadroAtivo = requestAnimationFrame(autoRolar);
      }
    }

    trilha.addEventListener("pointerdown", aoPressionar);
    trilha.addEventListener("pointermove", aoMover);
    trilha.addEventListener("pointerup", aoSoltar);
    trilha.addEventListener("pointercancel", aoSoltar);
    trilha.addEventListener("pointerleave", function (evento) {
      if (arrastando && evento.buttons === 0) aoSoltar();
    });
    // Depois de um arrasto de verdade, o clique que sobra não deve
    // abrir o link do ícone — só some quando foi mesmo um toque.
    trilha.addEventListener(
      "click",
      function (evento) {
        if (moveuBastante) {
          evento.preventDefault();
          evento.stopPropagation();
        }
      },
      true
    );

    quadroAtivo = requestAnimationFrame(autoRolar);
  }

  /**
   * Faixa de categorias: anda sozinha e pode ser arrastada (com inércia).
   * Mesma lógica da faixa de ícones da hero da Remop — itens aparecem
   * duplicados no HTML pra criar o loop infinito nos dois sentidos.
   */
  function iniciarFaixaCategorias() {
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

  /**
   * Catálogo: filtro por área + busca por texto (nome, descrição e tags).
   * As buscas vão pro painel admin (aba Pesquisas) — inclusive as que não
   * acham nada, que mostram o que o cliente procura e o site não tem.
   */
  function iniciarFiltroProdutos() {
    var botoes = document.querySelectorAll("[data-filtro]");
    var cards = document.querySelectorAll("[data-segmentos]");
    var busca = document.querySelector("[data-busca-produtos]");
    var vazia = document.querySelector("[data-busca-vazia]");
    if (!cards.length) return;
    var filtroAtual = "todos";
    var timerRegistro = null;

    function normalizar(texto) {
      return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function aplicar(animar) {
      var termo = busca ? normalizar(busca.value.trim()) : "";
      var mostrar = [];
      cards.forEach(function (card) {
        var segs = card.getAttribute("data-segmentos").split(" ");
        var porArea = filtroAtual === "todos" || segs.indexOf(filtroAtual) !== -1;
        var porTexto = !termo || normalizar(card.textContent).indexOf(termo) !== -1;
        card.hidden = !(porArea && porTexto);
        if (!card.hidden) mostrar.push(card);
      });
      var grade = document.querySelector(".grid-produtos");
      if (grade) grade.classList.toggle("grid-produtos--filtrado", filtroAtual !== "todos" || !!termo);
      if (vazia) {
        vazia.hidden = mostrar.length > 0;
        var alvo = vazia.querySelector("[data-termo-buscado]");
        var botao = vazia.querySelector("[data-adicionar-item]");
        if (alvo) alvo.textContent = busca ? busca.value.trim() : "";
        if (botao && busca) botao.setAttribute("data-adicionar-item", busca.value.trim());
      }
      if (animar && window.SanAnimacoes && window.SanAnimacoes.entrarCards) {
        window.SanAnimacoes.entrarCards(mostrar);
      }
      return mostrar.length;
    }

    botoes.forEach(function (botao) {
      botao.addEventListener("click", function () {
        filtroAtual = botao.getAttribute("data-filtro");
        botoes.forEach(function (b) { b.setAttribute("aria-pressed", b === botao ? "true" : "false"); });
        aplicar(true);
      });
    });

    if (busca) {
      busca.addEventListener("input", function () {
        var achados = aplicar(false);
        clearTimeout(timerRegistro);
        timerRegistro = setTimeout(function () {
          if (window.SanAnalytics) window.SanAnalytics.registrarPesquisa(busca.value, achados, "busca");
        }, 1200);
      });
      var formBusca = busca.closest("form");
      if (formBusca) formBusca.addEventListener("submit", function (e) { e.preventDefault(); });
    }
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
    iniciarFaixaContatos();
    iniciarFaixaCategorias();
    iniciarFiltroProdutos();
    iniciarFaq();
    document.querySelectorAll("[data-ano-atual]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  });

  window.SanWhatsApp = { montarLink: montarLinkWhatsApp };
  window.SanToast = mostrarToast;
})();
