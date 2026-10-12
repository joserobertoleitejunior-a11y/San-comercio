/**
 * Trava o zoom por gesto e por roda do mouse (pedido do cliente: o site
 * deve ocupar a tela sem ser ampliado/reduzido). Complementa o
 * <meta name="viewport" ... user-scalable=no> das páginas, que o iOS
 * ignora e o Chrome ignora no "modo desktop".
 *
 * Observação de acessibilidade: bloquear zoom dificulta a leitura para
 * quem tem baixa visão. Por isso o texto do site usa tamanhos generosos
 * e respeita o tamanho de fonte escolhido no sistema.
 * Os atalhos do navegador (Ctrl +/−) não dá pra bloquear com segurança.
 */
(function () {
  "use strict";
  var opcoes = { passive: false };

  // Pinça no iOS Safari
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (nome) {
    document.addEventListener(nome, function (e) { e.preventDefault(); }, opcoes);
  });

  // Pinça com dois dedos (Android/Chrome)
  document.addEventListener("touchmove", function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, opcoes);

  // Toque duplo rápido (zoom por duplo toque)
  var ultimoToque = 0;
  document.addEventListener("touchend", function (e) {
    var agora = Date.now();
    if (agora - ultimoToque < 320 && e.target && !e.target.closest("input, textarea, select")) e.preventDefault();
    ultimoToque = agora;
  }, opcoes);

  // Ctrl + roda do mouse / pinça no touchpad
  document.addEventListener("wheel", function (e) {
    if (e.ctrlKey) e.preventDefault();
  }, opcoes);

  // Ctrl/⌘ + "+", "−", "0"
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "_", "0"].indexOf(e.key) !== -1) e.preventDefault();
  });
})();
