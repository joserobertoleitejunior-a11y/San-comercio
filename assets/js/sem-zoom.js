/**
 * Trava o zoom (pedido do cliente: o site deve ocupar a tela sem ser
 * ampliado/reduzido). Complementa o <meta name="viewport" ...
 * user-scalable=no> das páginas, que o iOS ignora e o Chrome ignora no
 * "modo desktop".
 *
 * DESEMPENHO: a pinça e o toque duplo são travados por CSS
 * (`touch-action: pan-x pan-y`, em style.css). NÃO registrar aqui
 * listeners não-passivos de touchmove/touchend/wheel permanentes: eles
 * obrigam o navegador a esperar o JS a cada pixel de rolagem e deixam a
 * página travando no celular e no touchpad.
 *
 * Acessibilidade: bloquear zoom dificulta a leitura para quem tem baixa
 * visão; por isso o texto usa tamanhos generosos e respeita a fonte do
 * sistema.
 */
(function () {
  "use strict";
  var opcoes = { passive: false };

  // Pinça no iOS Safari (evento raro: só dispara em pinça)
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (nome) {
    document.addEventListener(nome, function (e) { e.preventDefault(); }, opcoes);
  });

  // Ctrl + roda / pinça no touchpad: o listener (não-passivo) só existe
  // enquanto o Ctrl/⌘ está pressionado, então a rolagem normal não é afetada.
  function bloquearRoda(e) { e.preventDefault(); }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Control" || e.key === "Meta") window.addEventListener("wheel", bloquearRoda, opcoes);
    if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "_", "0"].indexOf(e.key) !== -1) e.preventDefault();
  });
  function soltar() { window.removeEventListener("wheel", bloquearRoda, opcoes); }
  document.addEventListener("keyup", function (e) { if (e.key === "Control" || e.key === "Meta") soltar(); });
  window.addEventListener("blur", soltar);
})();
