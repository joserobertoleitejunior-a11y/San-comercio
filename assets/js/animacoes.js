/**
 * Animações do site San Comércio (GSAP + ScrollTrigger), seguindo o
 * padrão de motion da agência (PADROES-AGENCIA.md §2) e a base do
 * scroll-reveal.js da Remop (montagem de títulos letra a letra,
 * revelação em grupo, refresh depois de imagens/fontes).
 *
 * Momento-assinatura: o "X de mangueiras" do logotipo — se desenha no
 * splash (CSS puro, no index.html), se monta na hero com fluido correndo por dentro, vira a
 * barra de progresso no topo (mangueira com terminal de latão) e o
 * sublinhado dos títulos.
 *
 * Tudo respeita prefers-reduced-motion: com ele ligado, nada anima e o
 * conteúdo aparece direto.
 */
(function () {
  "use strict";

  var reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ponteiroFino = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var raiz = document.documentElement;
  // Toque / tela pequena: sem parallax, sem inclinação e títulos por palavra
  // (muito menos nós animados = rolagem a 60fps em celular fraco).
  var leve = !ponteiroFino || window.innerWidth < 1024;

  function esconderPreloader() {
    var p = document.querySelector("[data-preloader]");
    if (p) p.hidden = true;
    raiz.classList.add("hero-ok");
  }

  /** Roda fn quando o splash começa a abrir (ou já, se não há splash). */
  function aoSplash(fn, atraso) {
    var splash = document.querySelector("[data-preloader]");
    if (!splash || splash.hidden || raiz.classList.contains("sem-preloader") || window.__sanSplashSai) {
      fn();
      return;
    }
    document.addEventListener("san:splash-sai", function () { gsap.delayedCall(atraso || 0, fn); }, { once: true });
  }

  // API usada por main.js / lista-orcamento.js mesmo sem GSAP
  window.SanAnimacoes = {
    voarParaLista: function () {},
    entrarCards: function () {},
  };

  if (typeof gsap === "undefined" || reduz) {
    document.addEventListener("DOMContentLoaded", esconderPreloader);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  // Barra de endereço do celular mudando de tamanho não pode recalcular tudo
  ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });

  /* ---------- Utilidades ---------- */

  /** Quebra o título em letras (acessível via aria-label). Base Remop. */
  function dividirEmLetras(elemento, porPalavra) {
    if (elemento.querySelector(".letra-montavel")) return elemento.querySelectorAll(".letra-montavel");
    var html = elemento.innerHTML;
    var textoOriginal = elemento.textContent.trim().replace(/\s+/g, " ");
    elemento.setAttribute("aria-label", textoOriginal);

    // Mantém o <span class="destaque"> (dourado) se existir
    var fragmento = document.createElement("div");
    fragmento.innerHTML = html;
    elemento.innerHTML = "";

    function processar(no, destino) {
      no.childNodes.forEach(function (filho) {
        if (filho.nodeType === 3) {
          var partes = filho.textContent.split(/(\s+)/);
          partes.forEach(function (parte) {
            if (!parte) return;
            if (/^\s+$/.test(parte)) { destino.appendChild(document.createTextNode(" ")); return; }
            var palavra = document.createElement("span");
            palavra.className = "palavra-montavel";
            palavra.setAttribute("aria-hidden", "true");
            if (porPalavra) {
              palavra.classList.add("letra-montavel");
              palavra.textContent = parte;
              destino.appendChild(palavra);
              return;
            }
            parte.split("").forEach(function (letra) {
              var s = document.createElement("span");
              s.className = "letra-montavel";
              s.textContent = letra;
              palavra.appendChild(s);
            });
            destino.appendChild(palavra);
          });
        } else if (filho.nodeType === 1) {
          var clone = filho.cloneNode(false);
          clone.setAttribute("aria-hidden", "true");
          destino.appendChild(clone);
          processar(filho, clone);
        }
      });
    }
    processar(fragmento, elemento);
    // .destaque usa background-clip:text — precisa estar nas letras também
    elemento.querySelectorAll(".destaque .letra-montavel, .destaque.letra-montavel").forEach(function (l) { l.classList.add("destaque"); });
    return elemento.querySelectorAll(".letra-montavel");
  }

  /** Títulos: só quebra em letras/palavras quando chega perto da tela. */
  function montarTitulos(seletor) {
    gsap.utils.toArray(seletor).forEach(function (titulo) {
      ScrollTrigger.create({
        trigger: titulo, start: "top 92%", once: true,
        onEnter: function () {
          var pecas = dividirEmLetras(titulo, leve);
          gsap.from(pecas, {
            yPercent: 110, rotate: leve ? 0 : 8, opacity: 0,
            duration: 0.7, ease: "power3.out", stagger: leve ? 0.06 : 0.018,
          });
        },
      });
    });
  }

  function revelar(seletor, opcoes) {
    gsap.utils.toArray(seletor).forEach(function (el) {
      gsap.from(el, Object.assign({
        opacity: 0, y: 36, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      }, opcoes || {}));
    });
  }

  function revelarGrupo(seletorContainer, seletorItens, opcoes) {
    gsap.utils.toArray(seletorContainer).forEach(function (container) {
      var itens = container.querySelectorAll(seletorItens);
      if (!itens.length) return;
      gsap.from(itens, Object.assign({
        opacity: 0, y: 40, duration: 0.75, ease: "power3.out", stagger: 0.08,
        scrollTrigger: { trigger: container, start: "top 85%", once: true },
      }, opcoes || {}));
    });
  }

  /** Mangueira desenhando: prepara o traço pra animar o comprimento. */
  function prepararTraco(caminho) {
    var comprimento = caminho.getTotalLength();
    gsap.set(caminho, { strokeDasharray: comprimento, strokeDashoffset: comprimento });
    return comprimento;
  }

  /* ---------- Hero ---------- */
  function animarHero() {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    var titulo = hero.querySelector("h1");
    var letras = titulo ? dividirEmLetras(titulo) : [];

    var tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    aoSplash(function () { tl.play(); }, 0.3);
    function de(alvos, vars, posicao) {
      if (alvos && alvos.length !== 0) tl.from(alvos, vars, posicao);
    }
    de(hero.querySelectorAll(".hero__foto"), { opacity: 0, duration: 1.1, ease: "power1.out" }, 0);
    de(hero.querySelectorAll(".rotulo, .status-aberto"), { opacity: 0, y: 14, duration: 0.5, stagger: 0.08 }, 0.1);
    de(letras, { yPercent: 120, rotate: 10, opacity: 0, duration: 0.8, stagger: 0.014 }, 0.2);
    de(hero.querySelectorAll(".hero__texto"), { opacity: 0, y: 18, duration: 0.6 }, "-=0.5");
    de(hero.querySelectorAll(".hero__ctas .botao"), { opacity: 0, y: 18, scale: 0.94, duration: 0.55, stagger: 0.1 }, "-=0.35");
    de(hero.querySelectorAll(".hero__selos li"), { opacity: 0, x: -14, duration: 0.45, stagger: 0.07 }, "-=0.3");

    // X de mangueiras desenhando + terminais encaixando + fluido
    var x = hero.querySelector(".hero__x");
    if (x && getComputedStyle(x).display !== "none") {
      var tubos = x.querySelectorAll(".x-mangueira, .x-brilho");
      tubos.forEach(prepararTraco);
      tl.to(tubos, { strokeDashoffset: 0, duration: 1.3, ease: "power2.inOut", stagger: 0.08 }, 0.3)
        .from(x.querySelectorAll(".x-terminal-grupo"), { scale: 0, rotate: -30, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2.6)", stagger: 0.08 }, "-=0.45")
        .from(x.querySelectorAll(".x-fluxo"), { opacity: 0, duration: 0.6 }, "-=0.2")
        .from(x.querySelectorAll(".hero__etiqueta"), { opacity: 0, scale: 0.8, y: 10, duration: 0.5, ease: "back.out(2)", stagger: 0.12 }, "-=0.4");

      // Fluido correndo por dentro das mangueiras + flutuação leve (loops).
      // Só rodam enquanto a hero está na tela.
      var loops = [
        gsap.to(x.querySelectorAll(".x-fluxo"), { strokeDashoffset: -280, duration: 4, ease: "none", repeat: -1, paused: true }),
        gsap.to(x.querySelector("svg"), { y: -10, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true }),
      ];
      ScrollTrigger.create({
        trigger: hero, start: "top bottom", end: "bottom top",
        onToggle: function (self) { loops.forEach(function (l) { self.isActive ? l.resume() : l.pause(); }); },
      });

      if (ponteiroFino) {
        var svg = x.querySelector("svg");
        var rx = gsap.quickTo(svg, "rotationY", { duration: 0.8, ease: "power3.out" });
        var ry = gsap.quickTo(svg, "rotationX", { duration: 0.8, ease: "power3.out" });
        gsap.set(x, { perspective: 800 });
        hero.addEventListener("pointermove", function (e) {
          var r = hero.getBoundingClientRect();
          rx(((e.clientX - r.left) / r.width - 0.5) * 18);
          ry(-((e.clientY - r.top) / r.height - 0.5) * 12);
        });
      }
    }

    // Libera o conteúdo (o CSS escondia só até o GSAP assumir o estado inicial)
    raiz.classList.add("hero-ok");

    // Parallax ao rolar: fundo afunda, conteúdo sobe (só desktop com mouse)
    if (!leve) {
      gsap.fromTo(hero.querySelector(".hero__foto"), { yPercent: 0 }, {
        yPercent: 10, ease: "none", immediateRender: false,
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(hero.querySelector(".hero__grid, .hero__conteudo"), {
        y: -60, opacity: 0.2, ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
      });
    }
  }

  /* ---------- Barra de progresso (mangueira no topo) ---------- */
  function iniciarProgresso() {
    var linha = document.querySelector(".progresso-mangueira__linha");
    var terminal = document.querySelector(".progresso-mangueira__terminal");
    if (!linha) return;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: function (self) {
        gsap.set(linha, { scaleX: self.progress });
        if (terminal) gsap.set(terminal, { x: self.progress * window.innerWidth - 18 });
      },
    });
  }

  /* ---------- Sublinhado-mangueira dos títulos ---------- */
  function iniciarSublinhados() {
    gsap.utils.toArray(".sublinhado-mangueira").forEach(function (svg) {
      var caminho = svg.querySelector("path");
      var terminal = svg.querySelector("rect");
      prepararTraco(caminho);
      var tl = gsap.timeline({ scrollTrigger: { trigger: svg, start: "top 92%", once: true } });
      tl.to(caminho, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" });
      if (terminal) tl.from(terminal, { scale: 0, transformOrigin: "50% 50%", duration: 0.35, ease: "back.out(3)" }, "-=0.15");
    });
  }

  /* ---------- Contadores (ex.: 9.000 itens) ---------- */
  function iniciarContadores() {
    gsap.utils.toArray("[data-contador]").forEach(function (el) {
      var alvo = parseFloat(el.getAttribute("data-contador"));
      var obj = { v: 0 };
      var formato = new Intl.NumberFormat("pt-BR");
      el.textContent = formato.format(alvo); // estado de repouso = valor final
      gsap.fromTo(obj, { v: 0 }, {
        v: alvo,
        duration: 2,
        ease: "power2.out",
        immediateRender: false,
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: function () { el.textContent = formato.format(Math.round(obj.v)); },
      });
    });
  }

  /* ---------- Passo a passo da prensagem (linha que enche ao rolar) ---------- */
  function iniciarPassos() {
    var lista = document.querySelector(".passos");
    if (!lista) return;
    var linha = lista.querySelector(".passos__linha");
    if (linha) {
      gsap.fromTo(linha, { scaleY: 0 }, {
        scaleY: 1, ease: "none",
        scrollTrigger: { trigger: lista, start: "top 75%", end: "bottom 55%", scrub: 0.4 },
      });
    }
    lista.querySelectorAll(".passo").forEach(function (passo) {
      var num = passo.querySelector(".passo__num");
      gsap.from(passo, {
        opacity: 0.25, x: -16, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: passo, start: "top 78%", toggleActions: "play none none none" },
      });
      gsap.fromTo(num, { backgroundColor: "#061443", color: "#FFB36B" }, {
        backgroundColor: "#FF7A1A", color: "#061443", duration: 0.4,
        scrollTrigger: { trigger: passo, start: "top 70%", toggleActions: "play none none none" },
      });
    });
  }

  /* ---------- Microinterações (só com mouse) ---------- */
  function iniciarTilt() {
    if (!ponteiroFino) return;
    document.querySelectorAll("[data-tilt]").forEach(function (card) {
      var rx = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" });
      var ry = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" });
      gsap.set(card, { transformPerspective: 900 });
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 8);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
      });
      card.addEventListener("pointerleave", function () { rx(0); ry(0); });
    });
  }

  function iniciarMagneticos() {
    if (!ponteiroFino) return;
    document.querySelectorAll("[data-magnetico]").forEach(function (botao) {
      var mx = gsap.quickTo(botao, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      var my = gsap.quickTo(botao, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      botao.addEventListener("pointermove", function (e) {
        var r = botao.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.3);
        my((e.clientY - r.top - r.height / 2) * 0.4);
      });
      botao.addEventListener("pointerleave", function () { mx(0); my(0); });
    });
  }

  /* ---------- Item "voando" até a lista ---------- */
  function alvoDaLista() {
    var candidatos = document.querySelectorAll(".flutuante--lista, .cabecalho__lista");
    for (var i = 0; i < candidatos.length; i++) {
      var r = candidatos[i].getBoundingClientRect();
      if (r.width && r.top >= 0 && r.bottom <= window.innerHeight) return candidatos[i];
    }
    return candidatos[0];
  }

  window.SanAnimacoes.voarParaLista = function (origem) {
    var destino = alvoDaLista();
    if (!origem || !destino) return;
    var a = origem.getBoundingClientRect();
    var b = destino.getBoundingClientRect();
    var bolinha = document.createElement("div");
    bolinha.className = "voo-item";
    bolinha.textContent = "+1";
    document.body.appendChild(bolinha);
    var x0 = a.left + a.width / 2 - 17, y0 = a.top + a.height / 2 - 17;
    var x1 = b.left + b.width / 2 - 17, y1 = b.top + b.height / 2 - 17;
    gsap.set(bolinha, { x: x0, y: y0, scale: 0.4 });
    var tl = gsap.timeline({ onComplete: function () { bolinha.remove(); } });
    tl.to(bolinha, { scale: 1.1, duration: 0.18, ease: "back.out(3)" })
      .to(bolinha, { x: x1, duration: 0.75, ease: "power1.inOut" }, 0.1)
      .to(bolinha, { y: Math.min(y0, y1) - 120, duration: 0.36, ease: "power2.out" }, 0.1)
      .to(bolinha, { y: y1, duration: 0.39, ease: "power2.in" }, 0.46)
      .to(bolinha, { scale: 0.3, opacity: 0, duration: 0.15 }, 0.8)
      .fromTo(destino, { scale: 1 }, { scale: 1.25, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.out" }, 0.82);
  };

  window.SanAnimacoes.entrarCards = function (cards) {
    gsap.fromTo(cards, { opacity: 0, y: 24, scale: 0.97 }, {
      opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out", stagger: 0.05,
      onComplete: function () { ScrollTrigger.refresh(); },
    });
  };

  /* ---------- Montagem ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    animarHero();

    iniciarProgresso();
    iniciarSublinhados();
    iniciarContadores();
    iniciarPassos();
    iniciarTilt();
    iniciarMagneticos();

    montarTitulos("[data-montar]");
    revelar(".secao__topo .rotulo:not(.hero *), .secao__topo p", { y: 18, duration: 0.6 });
    revelarGrupo(".numeros__grid", ".numero");
    revelarGrupo(".filtros", ".filtro", { y: 14, duration: 0.45, stagger: 0.05 });
    revelarGrupo(".grid-produtos", ".card-produto", { y: 50, stagger: 0.07 });
    revelarGrupo(".grid-segmentos", ".segmento", { stagger: 0.08 });
    revelarGrupo(".grid-diferenciais", ".diferencial", { stagger: 0.08 });
    revelarGrupo(".galeria", "figure", { scale: 0.94, y: 20 });
    revelarGrupo(".faq", ".faq__item", { y: 20, stagger: 0.06 });
    revelarGrupo(".lista-check", "li", { x: -16, y: 0, stagger: 0.08 });
    revelar(".produtos__nao-achou, .ficha, .info-bloco, .cartao-mapa, .foto-moldura", { y: 50 });
    revelar(".historia__citacao", { x: -30, y: 0 });

    // Faixa dourada entra "esticando"
    var faixa = document.querySelector(".faixa");
    if (faixa) {
      gsap.set(faixa, { scaleX: 0.6, opacity: 0 });
      aoSplash(function () { gsap.to(faixa, { scaleX: 1, opacity: 1, duration: 1, ease: "power3.out", delay: 0.6, clearProps: "transform,opacity" }); }, 0.3);
    }

    // Mosaico: fotos com parallax interno (só desktop)
    if (!leve) gsap.utils.toArray(".mosaico img, .foto-moldura img").forEach(function (img) {
      gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, {
        yPercent: 6, ease: "none",
        scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true },
      });
    });
    revelarGrupo(".mosaico", "figure", { scale: 0.9, y: 30, stagger: 0.12 });

    // Fluxo da prensagem desenha antes de começar a correr
    gsap.utils.toArray(".prensagem__fluxo .fluxo-tubo").forEach(function (tubo) {
      prepararTraco(tubo);
      gsap.to(tubo, { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut", scrollTrigger: { trigger: tubo, start: "top 85%", once: true } });
    });

    // X gigante do CTA final gira devagar com o scroll
    var xCta = document.querySelector(".cta-final__x");
    if (xCta) {
      gsap.fromTo(xCta, { rotate: -20 }, { rotate: 25, ease: "none", scrollTrigger: { trigger: ".cta-final", start: "top bottom", end: "bottom top", scrub: true } });
    }

    // Nome gigante no rodapé desliza conforme chega no fim
    var gigante = document.querySelector(".rodape__gigante");
    if (gigante) {
      gsap.fromTo(gigante, { xPercent: 12 }, { xPercent: -12, ease: "none", scrollTrigger: { trigger: ".rodape", start: "top bottom", end: "bottom bottom", scrub: true } });
    }

    // Botões flutuantes entram depois da hero
    gsap.set(".flutuante", { scale: 0 });
    aoSplash(function () { gsap.to(".flutuante", { scale: 1, duration: 0.6, ease: "back.out(2.4)", stagger: 0.1, delay: 1.4, clearProps: "transform,scale" }); }, 0.3);

    // Imagens e fontes mudam a altura da página depois do cálculo inicial
    // — sem isso, gatilhos ficam desalinhados e elementos podem não aparecer
    // (mesmo bug já resolvido na Remop).
    // Os scripts entram depois do "load" (mini-loader do HTML): se já passou, refaz agora.
    if (document.readyState === "complete") ScrollTrigger.refresh();
    else window.addEventListener("load", function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  });
})();
