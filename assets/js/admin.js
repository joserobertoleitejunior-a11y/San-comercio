/**
 * Painel administrativo da San Comércio.
 * Base: admin.js da Remop (login por PIN sobre Supabase Auth, abas por
 * hash, Chart.js). Seções: Visão geral, Clientes (cartões, sem rolagem
 * lateral), Orçamentos (com situação), Pesquisas e Tráfego.
 *
 * Fontes de dados:
 *  - Supabase (real): config.js preenchido + supabase/schema.sql.
 *  - Demonstração: admin-demo.js gera um cenário fictício pra apresentar.
 *
 * Cores dos gráficos validadas (contraste e daltonismo). Onde há mais de
 * 3 categorias usamos barras ranqueadas com rótulo, não cores.
 */
(function () {
  "use strict";

  // Login por PIN: o Supabase exige e-mail + senha de 6+ caracteres, então
  // o painel completa o PIN com este sufixo (mesmo esquema da Remop).
  var PAINEL_EMAIL_FIXO = "painel@san-comercio.internal";
  var SUFIXO_SENHA_PIN = "-SanPainel2026!";

  var COR = { azul: "#1E44B5", latao: "#C08417", verde: "#14866D", cinza: "#9AA1B5", anterior: "#B4BCD2", grade: "#E6EAF3", texto: "#586282" };
  var STATUS_COR = { novo: COR.azul, atendendo: COR.latao, fechado: COR.verde, perdido: COR.cinza };
  var STATUS = { novo: "Novo", atendendo: "Atendendo", fechado: "Fechado", perdido: "Perdido" };
  var TITULOS = { visao: "Visão geral", clientes: "Clientes", orcamentos: "Orçamentos", pesquisas: "Pesquisas", trafego: "Tráfego" };
  var PAGINAS = { "/": "Início", "/index.html": "Início", "/institucional.html": "A loja", "/localizacao.html": "Localização" };
  var CLIQUES = { whatsapp: "WhatsApp", "adicionar-lista": "Adicionar à lista", "abrir-lista": "Abrir lista", mapa: "Mapa / rota", instagram: "Instagram" };
  var DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  var HORAS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  var POR_PAGINA = 24;

  var modoDemo = false;
  var demoCache = null;
  var dados = null;
  var anterior = null;
  var graficos = {};
  var sujo = {};
  var secaoAtual = "visao";
  var filtroStatus = "todos";
  var limiteClientes = POR_PAGINA;
  var el = {};

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */
  var fmt = new Intl.NumberFormat("pt-BR");
  function n(v) { return fmt.format(v || 0); }
  function soDigitos(v) { return String(v || "").replace(/\D/g, ""); }
  function foneBonito(d) {
    d = soDigitos(d);
    if (d.length === 11) return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    if (d.length === 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return d || "–";
  }
  function dataHora(v) { return v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "–"; }
  function dataCurta(v) { return v ? new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "–"; }
  function dataLonga(v) { return v ? new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "–"; }
  function relativo(v) {
    if (!v) return "–";
    var min = (Date.now() - new Date(v).getTime()) / 60000;
    if (min < 60) return "há pouco";
    if (min < 60 * 24) return "há " + Math.floor(min / 60) + " h";
    var d = Math.floor(min / 1440);
    if (d === 1) return "ontem";
    if (d < 30) return "há " + d + " dias";
    return dataLonga(v);
  }
  function criar(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }
  function svgEl(tag, attrs) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function linkWhats(numero, mensagem) {
    return "https://wa.me/55" + soDigitos(numero) + "?text=" + encodeURIComponent(mensagem || "");
  }
  function origemBonita(ref) {
    if (!ref) return "Direto / digitou o endereço";
    if (/google\./.test(ref)) return "Google";
    if (/instagram/.test(ref)) return "Instagram";
    if (/facebook|fb\./.test(ref)) return "Facebook";
    if (/wa\.me|whatsapp/.test(ref)) return "WhatsApp";
    try { return new URL(ref).hostname.replace(/^www\./, ""); } catch (e) { return ref; }
  }
  function contar(lista, chave) {
    var mapa = {};
    lista.forEach(function (item) {
      var k = typeof chave === "function" ? chave(item) : item[chave];
      if (k === undefined || k === null || k === "") return;
      mapa[k] = (mapa[k] || 0) + 1;
    });
    return Object.keys(mapa).map(function (k) { return { chave: k, total: mapa[k] }; }).sort(function (a, b) { return b.total - a.total; });
  }
  function diasDoPeriodo(qtd, deslocar) {
    var lista = [];
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    hoje.setDate(hoje.getDate() - (deslocar || 0));
    for (var i = qtd - 1; i >= 0; i--) { var d = new Date(hoje); d.setDate(d.getDate() - i); lista.push(d); }
    return lista;
  }
  function porDia(linhas, dias, filtro) {
    var idx = {};
    dias.forEach(function (d, i) { idx[d.toDateString()] = i; });
    var out = dias.map(function () { return 0; });
    linhas.forEach(function (l) {
      if (filtro && !filtro(l)) return;
      var i = idx[new Date(l.criado_em).toDateString()];
      if (i !== undefined) out[i]++;
    });
    return out;
  }
  function unicos(lista, chave) {
    var s = {};
    lista.forEach(function (l) { if (l[chave]) s[l[chave]] = 1; });
    return Object.keys(s).length;
  }
  function baixarCSV(nome, linhas) {
    var csv = linhas.map(function (l) {
      return l.map(function (c) { return '"' + String(c === undefined || c === null ? "" : c).replace(/"/g, '""') + '"'; }).join(";");
    }).join("\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
  }
  function copiar(texto, botao) {
    function ok() { var t = botao.textContent; botao.textContent = "Copiado!"; setTimeout(function () { botao.textContent = t; }, 1600); }
    try { navigator.clipboard.writeText(texto).then(ok, function () {}); } catch (e) {}
  }
  function nomeProduto(nome) { return /^Mangueira prensada/.test(nome) ? "Mangueira prensada (sob medida)" : nome; }

  /* ------------------------------------------------------------------ */
  /* Dados                                                               */
  /* ------------------------------------------------------------------ */
  function cliente() { return window.SanSupabase.client; }

  async function buscar(tabela, desde) {
    var res = await cliente().from(tabela).select("*").gte("criado_em", desde.toISOString()).order("criado_em", { ascending: false }).limit(20000);
    if (res.error) throw res.error;
    return res.data || [];
  }
  function separar(conjunto, inicio, fim) {
    var out = {};
    Object.keys(conjunto).forEach(function (k) {
      out[k] = conjunto[k].filter(function (l) { var t = new Date(l.criado_em); return t >= inicio && t < fim; });
    });
    return out;
  }

  async function carregar() {
    var periodo = parseInt(el.periodo.value, 10) || 30;
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var inicio = new Date(hoje); inicio.setDate(inicio.getDate() - (periodo - 1));
    var inicioAnterior = new Date(inicio); inicioAnterior.setDate(inicioAnterior.getDate() - periodo);
    var amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);

    var tudo;
    if (modoDemo) {
      if (!demoCache) demoCache = window.SanAdminDemo.gerar(180);
      tudo = demoCache;
    } else {
      var r = await Promise.all(["paginas_vistas", "cliques", "pesquisas", "identificacoes", "orcamentos"].map(function (t) { return buscar(t, new Date(hoje.getTime() - 365 * 86400000)); }));
      tudo = { visitas: r[0], cliques: r[1], pesquisas: r[2], identificacoes: r[3], orcamentos: r[4] };
    }
    dados = separar(tudo, inicio, amanha);
    anterior = separar(tudo, inicioAnterior, inicio);
    dados.periodo = periodo;
    dados.dias = diasDoPeriodo(periodo);
    dados.diasAnt = diasDoPeriodo(periodo, periodo);
    dados.todosIdent = tudo.identificacoes;
    dados.todosOrc = tudo.orcamentos;
    dados.todasVisitas = tudo.visitas;
    dados.todasPesquisas = tudo.pesquisas;
    ["visao", "clientes", "orcamentos", "pesquisas", "trafego"].forEach(function (s) { sujo[s] = true; });
    renderSecao(secaoAtual);
  }

  /* ------------------------------------------------------------------ */
  /* Componentes                                                         */
  /* ------------------------------------------------------------------ */
  function sparkline(valores, cor) {
    var w = 100, h = 30, max = Math.max.apply(null, valores.concat([1]));
    var passo = valores.length > 1 ? w / (valores.length - 1) : w;
    var pts = valores.map(function (v, i) { return (i * passo).toFixed(1) + "," + (h - 3 - (v / max) * (h - 8)).toFixed(1); });
    var svg = svgEl("svg", { viewBox: "0 0 " + w + " " + h, preserveAspectRatio: "none", "aria-hidden": "true", class: "kpi__spark" });
    svg.appendChild(svgEl("polygon", { points: "0," + h + " " + pts.join(" ") + " " + w + "," + h, fill: cor, "fill-opacity": "0.12" }));
    svg.appendChild(svgEl("polyline", { points: pts.join(" "), fill: "none", stroke: cor, "stroke-width": "2", "stroke-linejoin": "round", "stroke-linecap": "round", "vector-effect": "non-scaling-stroke" }));
    return svg;
  }

  function kpi(rotulo, valor, valorAnterior, sufixo, dica, serie, cor) {
    var card = criar("div", "kpi");
    card.appendChild(criar("span", "kpi__rotulo", rotulo));
    var linha = criar("div", "kpi__linha");
    linha.appendChild(criar("span", "kpi__valor", (typeof valor === "number" ? n(valor) : valor) + (sufixo || "")));
    if (typeof valorAnterior === "number" && typeof valor === "number") {
      var delta = valorAnterior ? Math.round((valor - valorAnterior) / valorAnterior * 100) : null;
      if (delta !== null) {
        var chip = criar("span", "kpi__delta " + (delta >= 0 ? "kpi__delta--sobe" : "kpi__delta--desce"), (delta >= 0 ? "▲ " : "▼ ") + Math.abs(delta) + "%");
        chip.title = "Comparado ao período anterior";
        linha.appendChild(chip);
      }
    }
    card.appendChild(linha);
    if (dica) card.appendChild(criar("span", "kpi__dica", dica));
    if (serie && serie.length > 1) card.appendChild(sparkline(serie, cor || COR.azul));
    return card;
  }

  function barras(alvo, itens, rotular, limite, extra) {
    alvo.innerHTML = "";
    var max = itens.length ? itens[0].total : 1;
    var totalGeral = itens.reduce(function (s, i) { return s + i.total; }, 0) || 1;
    itens.slice(0, limite || 8).forEach(function (item) {
      var li = criar("li", "barra");
      var topo = criar("div", "barra__topo");
      var nome = criar("span", "barra__nome", rotular ? rotular(item.chave) : item.chave);
      nome.title = nome.textContent;
      topo.appendChild(nome);
      if (extra) { var e = extra(item); if (e) topo.appendChild(e); }
      topo.appendChild(criar("span", "barra__valor", n(item.total)));
      topo.appendChild(criar("span", "barra__pct", Math.round(item.total / totalGeral * 100) + "%"));
      li.appendChild(topo);
      var trilho = criar("div", "barra__trilho");
      var fill = criar("span", "barra__fill");
      fill.style.setProperty("--p", Math.max(3, item.total / max * 100) + "%");
      trilho.appendChild(fill);
      li.appendChild(trilho);
      alvo.appendChild(li);
    });
    if (!itens.length) alvo.appendChild(criar("li", "barra barra--vazia", "Ainda sem dados no período."));
  }

  function selo(texto, tipo) { return criar("span", "selo selo--" + tipo, texto); }

  function opcoesBase(extra) {
    return Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 650, easing: "easeOutQuart" },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#0E1A4A", padding: 10, cornerRadius: 8, boxPadding: 4, titleFont: { family: "Hanken Grotesk", weight: "700" }, bodyFont: { family: "Hanken Grotesk" } },
      },
      scales: {
        x: { grid: { display: false }, border: { color: COR.grade }, ticks: { color: COR.texto, maxRotation: 0, autoSkipPadding: 14, font: { family: "JetBrains Mono", size: 11 } } },
        y: { beginAtZero: true, grid: { color: COR.grade }, border: { display: false }, ticks: { color: COR.texto, precision: 0, font: { family: "JetBrains Mono", size: 11 } } },
      },
    }, extra || {});
  }
  function grafico(nome, config) {
    var canvas = document.querySelector('[data-grafico="' + nome + '"]');
    if (!canvas || typeof Chart === "undefined") return;
    if (graficos[nome]) graficos[nome].destroy();
    graficos[nome] = new Chart(canvas.getContext("2d"), config);
  }
  function rotulosDias(dias) { return dias.map(function (d) { return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); }); }

  /* ------------------------------------------------------------------ */
  /* Visão geral                                                         */
  /* ------------------------------------------------------------------ */
  function renderVisao() {
    var visitantes = unicos(dados.visitas, "visitante_id");
    var visitantesAnt = unicos(anterior.visitas, "visitante_id");
    var clientes = unicos(dados.identificacoes, "whatsapp");
    var clientesAnt = unicos(anterior.identificacoes, "whatsapp");
    var conv = visitantes ? Math.round(dados.orcamentos.length / visitantes * 1000) / 10 : 0;
    var convAnt = visitantesAnt ? Math.round(anterior.orcamentos.length / visitantesAnt * 1000) / 10 : 0;

    el.kpis.innerHTML = "";
    el.kpis.appendChild(kpi("Visitas", dados.visitas.length, anterior.visitas.length, "", "páginas abertas", porDia(dados.visitas, dados.dias), COR.azul));
    el.kpis.appendChild(kpi("Pessoas diferentes", visitantes, visitantesAnt, "", "aparelhos únicos"));
    el.kpis.appendChild(kpi("Clientes identificados", clientes, clientesAnt, "", "entraram com WhatsApp", porDia(dados.identificacoes, dados.dias), COR.verde));
    el.kpis.appendChild(kpi("Orçamentos", dados.orcamentos.length, anterior.orcamentos.length, "", "listas enviadas", porDia(dados.orcamentos, dados.dias), COR.latao));
    el.kpis.appendChild(kpi("Conversão", conv, convAnt, "%", "orçamentos ÷ pessoas"));

    renderFunil(visitantes, clientes);
    renderGraficosVisao();

    var produtos = {};
    dados.orcamentos.forEach(function (o) {
      (o.itens || []).forEach(function (i) { var k = nomeProduto(i.nome); produtos[k] = (produtos[k] || 0) + (i.qtd || 1); });
    });
    barras(el.topProdutos, Object.keys(produtos).map(function (k) { return { chave: k, total: produtos[k] }; }).sort(function (a, b) { return b.total - a.total; }), null, 8);

    var porCliente = {};
    dados.orcamentos.forEach(function (o) {
      var w = soDigitos(o.whatsapp); if (!w) return;
      if (!porCliente[w]) porCliente[w] = { chave: (o.nome || foneBonito(w)) + (o.cidade ? " · " + o.cidade : ""), total: 0 };
      porCliente[w].total++;
    });
    barras(el.topClientes, Object.keys(porCliente).map(function (k) { return porCliente[k]; }).sort(function (a, b) { return b.total - a.total; }), null, 6);

    var buscas = agruparPesquisas(dados.pesquisas);
    barras(el.topPesquisas, buscas.map(function (b) { return { chave: b.termo, total: b.vezes, semResultado: b.semResultado }; }), null, 8, function (item) {
      return item.semResultado ? selo("não achou", "alerta") : null;
    });
  }

  function renderFunil(visitantes, clientes) {
    // Cada etapa conta PESSOAS (não orçamentos): assim a porcentagem sempre cabe em 100%.
    var comOrcamento = unicos(dados.orcamentos, "whatsapp");
    var comVenda = unicos(dados.orcamentos.filter(function (o) { return o.status === "fechado"; }), "whatsapp");
    var etapas = [
      ["Pessoas que visitaram", visitantes],
      ["Se identificaram (WhatsApp)", clientes],
      ["Clientes que mandaram orçamento", comOrcamento],
      ["Clientes que fecharam compra", comVenda],
    ];
    el.funil.innerHTML = "";
    var base = etapas[0][1] || 1;
    etapas.forEach(function (e, i) {
      var li = criar("li", "funil__etapa");
      var topo = criar("div", "funil__topo");
      topo.appendChild(criar("span", "funil__nome", e[0]));
      topo.appendChild(criar("strong", "funil__valor", n(e[1])));
      li.appendChild(topo);
      var trilho = criar("div", "funil__trilho");
      var fill = criar("span", "funil__fill");
      fill.style.setProperty("--p", Math.max(2, e[1] / base * 100) + "%");
      fill.style.setProperty("--tom", String(1 - i * 0.2));
      trilho.appendChild(fill);
      li.appendChild(trilho);
      if (i > 0) {
        var ant = etapas[i - 1][1];
        li.appendChild(criar("span", "funil__pct", ant ? Math.min(100, Math.round(e[1] / ant * 100)) + "% da etapa anterior" : "–"));
      }
      el.funil.appendChild(li);
    });
  }

  function renderGraficosVisao() {
    var rotulos = rotulosDias(dados.dias);
    var atual = porDia(dados.visitas, dados.dias);
    var ant = porDia(anterior.visitas, dados.diasAnt);
    var ctx = document.querySelector('[data-grafico="visitas"]');
    var gradiente = null;
    if (ctx) {
      gradiente = ctx.getContext("2d").createLinearGradient(0, 0, 0, 260);
      gradiente.addColorStop(0, "rgba(30,68,181,0.22)");
      gradiente.addColorStop(1, "rgba(30,68,181,0)");
    }
    var conjuntos = [{ label: "Visitas", data: atual, borderColor: COR.azul, backgroundColor: gradiente, fill: true, borderWidth: 2.5, tension: 0.35, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: COR.azul, pointHoverBorderColor: "#fff", pointHoverBorderWidth: 2 }];
    if (el.comparar.checked) {
      conjuntos.push({ label: "Período anterior", data: ant, borderColor: COR.anterior, borderDash: [6, 5], borderWidth: 2, tension: 0.35, pointRadius: 0, pointHoverRadius: 4, fill: false });
    }
    grafico("visitas", {
      type: "line",
      data: { labels: rotulos, datasets: conjuntos },
      options: opcoesBase({
        plugins: {
          legend: { display: el.comparar.checked, align: "end", labels: { usePointStyle: true, boxWidth: 8, color: COR.texto, font: { family: "Hanken Grotesk", size: 12 } } },
          tooltip: {
            backgroundColor: "#0E1A4A", padding: 10, cornerRadius: 8,
            callbacks: {
              title: function (items) { return items.length ? rotulos[items[0].dataIndex] : ""; },
              label: function (c) {
                var d = c.datasetIndex === 1 ? " (" + dataCurta(dados.diasAnt[c.dataIndex]) + ")" : "";
                return " " + c.dataset.label + d + ": " + n(c.parsed.y);
              },
            },
          },
        },
      }),
    });

    grafico("orcamentos", {
      type: "bar",
      data: {
        labels: rotulos,
        datasets: Object.keys(STATUS).map(function (st) {
          return { label: STATUS[st], data: porDia(dados.orcamentos, dados.dias, function (o) { return (o.status || "novo") === st; }), backgroundColor: STATUS_COR[st], borderColor: "#fff", borderWidth: 1, borderSkipped: false, maxBarThickness: 22 };
        }),
      },
      options: opcoesBase({
        plugins: { legend: { display: true, position: "bottom", labels: { usePointStyle: true, boxWidth: 8, color: COR.texto, font: { family: "Hanken Grotesk", size: 12 } } }, tooltip: { backgroundColor: "#0E1A4A", padding: 10, cornerRadius: 8 } },
        scales: {
          x: { stacked: true, grid: { display: false }, border: { color: COR.grade }, ticks: { color: COR.texto, maxRotation: 0, autoSkipPadding: 14, font: { family: "JetBrains Mono", size: 11 } } },
          y: { stacked: true, beginAtZero: true, grid: { color: COR.grade }, border: { display: false }, ticks: { color: COR.texto, precision: 0, font: { family: "JetBrains Mono", size: 11 } } },
        },
      }),
    });

    var porHora = HORAS.map(function (hh) { return dados.visitas.filter(function (v) { return new Date(v.criado_em).getHours() === hh; }).length; });
    var maxHora = Math.max.apply(null, porHora);
    grafico("horas", {
      type: "bar",
      data: { labels: HORAS.map(function (hh) { return hh + "h"; }), datasets: [{ label: "Visitas", data: porHora, backgroundColor: porHora.map(function (v) { return v === maxHora ? COR.azul : "#8FA5E0"; }), borderRadius: 4, borderSkipped: "start", maxBarThickness: 22 }] },
      options: opcoesBase({ interaction: { mode: "nearest", intersect: true } }),
    });
  }

  /* ------------------------------------------------------------------ */
  /* Clientes                                                            */
  /* ------------------------------------------------------------------ */
  function montarClientes() {
    var mapa = {};
    function pegar(w) {
      w = soDigitos(w);
      if (!w) return null;
      if (!mapa[w]) mapa[w] = { whatsapp: w, nome: "", cidade: "", primeiro: null, ultimo: null, visitas: 0, orcamentos: [], buscas: [] };
      return mapa[w];
    }
    function marcar(c, t) {
      if (!c.primeiro || t < c.primeiro) c.primeiro = t;
      if (!c.ultimo || t > c.ultimo) c.ultimo = t;
    }
    dados.todosIdent.slice().sort(function (a, b) { return new Date(a.criado_em) - new Date(b.criado_em); }).forEach(function (i) {
      var c = pegar(i.whatsapp); if (!c) return;
      c.nome = i.nome || c.nome; c.cidade = i.cidade || c.cidade;
      marcar(c, new Date(i.criado_em));
    });
    dados.todosOrc.forEach(function (o) {
      var c = pegar(o.whatsapp); if (!c) return;
      c.nome = c.nome || o.nome; c.cidade = c.cidade || o.cidade;
      c.orcamentos.push(o); marcar(c, new Date(o.criado_em));
    });
    dados.todasVisitas.forEach(function (v) {
      if (!v.cliente_whatsapp) return;
      var c = mapa[soDigitos(v.cliente_whatsapp)]; if (!c) return;
      c.visitas++; marcar(c, new Date(v.criado_em));
    });
    (dados.todasPesquisas || []).forEach(function (p) {
      if (!p.cliente_whatsapp) return;
      var c = mapa[soDigitos(p.cliente_whatsapp)]; if (c) c.buscas.push(p);
    });
    var inicioPeriodo = dados.dias[0];
    var semana = Date.now() - 7 * 86400000;
    return Object.keys(mapa).map(function (k) {
      var c = mapa[k];
      c.fechados = c.orcamentos.filter(function (o) { return o.status === "fechado"; }).length;
      c.novo = c.primeiro && c.primeiro >= inicioPeriodo;
      c.recorrente = c.orcamentos.length >= 2;
      c.quente = c.orcamentos.some(function (o) { return (o.status === "novo" || o.status === "atendendo") && new Date(o.criado_em).getTime() >= semana; });
      var itens = {};
      c.orcamentos.forEach(function (o) { (o.itens || []).forEach(function (i) { var nome = nomeProduto(i.nome); itens[nome] = (itens[nome] || 0) + (i.qtd || 1); }); });
      c.topItens = Object.keys(itens).map(function (x) { return { chave: x, total: itens[x] }; }).sort(function (a, b) { return b.total - a.total; });
      return c;
    });
  }

  var clientesLista = [];

  function clientesFiltrados() {
    var termo = el.buscaClientes.value.trim().toLowerCase();
    var filtro = el.filtroClientes.value;
    var ordem = el.ordemClientes.value;
    var lista = clientesLista.filter(function (c) {
      if (termo && (c.nome + " " + c.whatsapp + " " + foneBonito(c.whatsapp) + " " + c.cidade).toLowerCase().indexOf(termo) === -1) return false;
      if (filtro === "quentes") return c.quente;
      if (filtro === "novos") return c.novo;
      if (filtro === "recorrentes") return c.recorrente;
      if (filtro === "sem") return c.orcamentos.length === 0;
      return true;
    });
    lista.sort(function (a, b) {
      if (ordem === "orcamentos") return b.orcamentos.length - a.orcamentos.length || b.ultimo - a.ultimo;
      if (ordem === "visitas") return b.visitas - a.visitas || b.ultimo - a.ultimo;
      if (ordem === "nome") return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
      return b.ultimo - a.ultimo;
    });
    return lista;
  }

  function renderClientes() {
    clientesLista = montarClientes();
    var total = clientesLista.length;
    var novos = clientesLista.filter(function (c) { return c.novo; }).length;
    var recorrentes = clientesLista.filter(function (c) { return c.recorrente; }).length;
    var quentes = clientesLista.filter(function (c) { return c.quente; }).length;
    el.kpisClientes.innerHTML = "";
    el.kpisClientes.appendChild(kpi("Clientes", total, null, "", "se identificaram até hoje"));
    el.kpisClientes.appendChild(kpi("Novos no período", novos, null, "", "primeiro contato recente", null));
    el.kpisClientes.appendChild(kpi("Recorrentes", recorrentes, null, "", "2 ou mais orçamentos"));
    el.kpisClientes.appendChild(kpi("Quentes", quentes, null, "", "orçamento aberto (7 dias)"));

    var novosPorDia = dados.dias.map(function () { return 0; });
    var idx = {};
    dados.dias.forEach(function (d, i) { idx[d.toDateString()] = i; });
    clientesLista.forEach(function (c) { if (c.primeiro) { var i = idx[c.primeiro.toDateString()]; if (i !== undefined) novosPorDia[i]++; } });
    grafico("novos", {
      type: "bar",
      data: { labels: rotulosDias(dados.dias), datasets: [{ label: "Novos clientes", data: novosPorDia, backgroundColor: COR.verde, borderRadius: 4, borderSkipped: "start", maxBarThickness: 22 }] },
      options: opcoesBase(),
    });
    barras(el.cidades, contar(clientesLista, "cidade"), null, 8);
    renderListaClientes();
  }

  function tag(texto, tipo) { return criar("span", "tag tag--" + tipo, texto); }

  function cartaoCliente(c) {
    var card = criar("article", "cliente");
    var topo = criar("div", "cliente__topo");
    topo.appendChild(criar("span", "avatar", (c.nome || "?").charAt(0).toUpperCase()));
    var quem = criar("div", "cliente__quem");
    quem.appendChild(criar("strong", "cliente__nome", c.nome || "Sem nome"));
    quem.appendChild(criar("span", "cliente__cidade", c.cidade || "Cidade não informada"));
    topo.appendChild(quem);
    card.appendChild(topo);

    var tags = criar("div", "cliente__tags");
    if (c.quente) tags.appendChild(tag("Quente", "quente"));
    if (c.novo) tags.appendChild(tag("Novo", "novo"));
    if (c.recorrente) tags.appendChild(tag("Recorrente", "recorrente"));
    if (!c.orcamentos.length) tags.appendChild(tag("Sem orçamento", "neutro"));
    card.appendChild(tags);

    var nums = criar("div", "cliente__nums");
    [["Visitas", c.visitas], ["Orçamentos", c.orcamentos.length], ["Fechados", c.fechados]].forEach(function (p) {
      var d = criar("div"); d.appendChild(criar("strong", "", n(p[1]))); d.appendChild(criar("span", "", p[0])); nums.appendChild(d);
    });
    card.appendChild(nums);

    var info = criar("dl", "cliente__info");
    function par(t, v) { info.appendChild(criar("dt", "", t)); info.appendChild(criar("dd", "", v)); }
    par("WhatsApp", foneBonito(c.whatsapp));
    par("Último acesso", relativo(c.ultimo));
    par("Pede mais", c.topItens.length ? c.topItens.slice(0, 2).map(function (i) { return i.chave; }).join(", ") : "–");
    card.appendChild(info);

    var acoes = criar("div", "cliente__acoes");
    var zap = criar("a", "botao botao--whatsapp botao--sm", "WhatsApp");
    zap.href = linkWhats(c.whatsapp, "Olá " + (c.nome || "").split(" ")[0] + ", aqui é da San Comércio!");
    zap.target = "_blank"; zap.rel = "noopener";
    var ver = criar("button", "botao botao--outline botao--sm", "Ver detalhes");
    ver.type = "button";
    ver.addEventListener("click", function () { abrirDetalhe(c); });
    acoes.appendChild(zap); acoes.appendChild(ver);
    card.appendChild(acoes);
    return card;
  }

  function renderListaClientes() {
    var lista = clientesFiltrados();
    el.listaClientes.innerHTML = "";
    el.resumoClientes.textContent = lista.length === clientesLista.length
      ? n(lista.length) + " clientes"
      : n(lista.length) + " de " + n(clientesLista.length) + " clientes";
    if (!lista.length) { el.listaClientes.appendChild(criar("p", "admin-vazio", "Nenhum cliente encontrado com esse filtro.")); el.maisClientes.hidden = true; return; }
    lista.slice(0, limiteClientes).forEach(function (c) { el.listaClientes.appendChild(cartaoCliente(c)); });
    el.maisClientes.hidden = lista.length <= limiteClientes;
  }

  function abrirDetalhe(c) {
    var box = el.detalheConteudo;
    box.innerHTML = "";
    var topo = criar("div", "detalhe__topo");
    topo.appendChild(criar("span", "avatar avatar--grande", (c.nome || "?").charAt(0).toUpperCase()));
    var info = criar("div");
    var h = criar("h2", "", c.nome || "Sem nome"); h.id = "detalhe-nome"; info.appendChild(h);
    info.appendChild(criar("p", "", foneBonito(c.whatsapp) + (c.cidade ? " · " + c.cidade : "")));
    var tags = criar("div", "cliente__tags");
    if (c.quente) tags.appendChild(tag("Quente", "quente"));
    if (c.novo) tags.appendChild(tag("Novo", "novo"));
    if (c.recorrente) tags.appendChild(tag("Recorrente", "recorrente"));
    info.appendChild(tags);
    topo.appendChild(info); box.appendChild(topo);

    var numeros = criar("div", "detalhe__numeros");
    [["Visitas", n(c.visitas)], ["Orçamentos", n(c.orcamentos.length)], ["Fechados", n(c.fechados)], ["Cliente desde", dataCurta(c.primeiro)]].forEach(function (p) {
      var d = criar("div"); d.appendChild(criar("strong", "", p[1])); d.appendChild(criar("span", "", p[0])); numeros.appendChild(d);
    });
    box.appendChild(numeros);

    var botoes = criar("div", "detalhe__botoes");
    var zap = criar("a", "botao botao--whatsapp", "Chamar no WhatsApp");
    zap.href = linkWhats(c.whatsapp, "Olá " + (c.nome || "").split(" ")[0] + ", aqui é da San Comércio! Tudo certo com seu orçamento?");
    zap.target = "_blank"; zap.rel = "noopener";
    var cp = criar("button", "botao botao--outline", "Copiar número"); cp.type = "button";
    cp.addEventListener("click", function () { copiar(foneBonito(c.whatsapp), cp); });
    botoes.appendChild(zap); botoes.appendChild(cp);
    box.appendChild(botoes);
    box.appendChild(criar("p", "admin-dica", "Último acesso " + relativo(c.ultimo) + " (" + dataHora(c.ultimo) + ")"));

    box.appendChild(criar("h3", "", "O que costuma pedir"));
    var ul = criar("ol", "barras");
    barras(ul, c.topItens, null, 5);
    box.appendChild(ul);

    if (c.buscas.length) {
      box.appendChild(criar("h3", "", "O que buscou no site"));
      var chips = criar("div", "insight__chips");
      contar(c.buscas, function (b) { return b.termo; }).slice(0, 10).forEach(function (b) { chips.appendChild(criar("span", "selo selo--neutro", b.chave)); });
      box.appendChild(chips);
    }

    box.appendChild(criar("h3", "", "Histórico de orçamentos"));
    if (!c.orcamentos.length) box.appendChild(criar("p", "admin-dica", "Ainda não mandou lista."));
    c.orcamentos.slice().sort(function (a, b) { return new Date(b.criado_em) - new Date(a.criado_em); }).forEach(function (o) { box.appendChild(cartaoOrcamento(o, true)); });
    el.detalhe.classList.add("aberto"); el.detalhe.setAttribute("aria-hidden", "false"); el.detalhe.inert = false;
    el.detalheFundo.hidden = false;
    el.detalhe.scrollTop = 0;
    el.detalhe.querySelector("[data-fechar-detalhe]").focus();
  }
  function fecharDetalhe() {
    el.detalhe.classList.remove("aberto"); el.detalhe.setAttribute("aria-hidden", "true"); el.detalhe.inert = true;
    el.detalheFundo.hidden = true;
  }

  /* ------------------------------------------------------------------ */
  /* Orçamentos                                                          */
  /* ------------------------------------------------------------------ */
  async function mudarStatus(o, novo, seletor) {
    var antigo = o.status;
    o.status = novo;
    seletor.closest(".orcamento").setAttribute("data-status", novo);
    sujo.visao = sujo.clientes = true;
    if (modoDemo) { renderPilha(); return; }
    try {
      var res = await cliente().from("orcamentos").update({ status: novo }).eq("id", o.id);
      if (res.error) throw res.error;
      renderPilha();
    } catch (erro) {
      console.error("[San Admin] Falha ao mudar status:", erro);
      o.status = antigo; seletor.value = antigo;
      seletor.closest(".orcamento").setAttribute("data-status", antigo);
    }
  }

  function cartaoOrcamento(o, compacto) {
    var card = criar("article", "orcamento");
    card.setAttribute("data-status", o.status || "novo");
    var topo = criar("div", "orcamento__topo");
    var quem = criar("div");
    quem.appendChild(criar("strong", "", o.nome || "Sem nome"));
    quem.appendChild(criar("span", "orcamento__meta", foneBonito(o.whatsapp) + (o.cidade ? " · " + o.cidade : "") + " · " + dataHora(o.criado_em)));
    topo.appendChild(quem);
    var sel = criar("select", "orcamento__status");
    sel.setAttribute("aria-label", "Situação do orçamento de " + (o.nome || ""));
    Object.keys(STATUS).forEach(function (k) { var op = criar("option", "", STATUS[k]); op.value = k; if (k === (o.status || "novo")) op.selected = true; sel.appendChild(op); });
    sel.addEventListener("change", function () { mudarStatus(o, sel.value, sel); });
    topo.appendChild(sel);
    card.appendChild(topo);
    var ul = criar("ul", "orcamento__itens");
    (o.itens || []).forEach(function (i) {
      var li = criar("li");
      li.appendChild(criar("span", "orcamento__qtd", (i.qtd || 1) + "x"));
      var t = criar("span", "", i.nome);
      if (i.detalhe) t.appendChild(criar("em", "", " — " + i.detalhe));
      li.appendChild(t); ul.appendChild(li);
    });
    card.appendChild(ul);
    if (!compacto) {
      var zap = criar("a", "botao botao--whatsapp botao--sm", "Responder no WhatsApp");
      zap.href = linkWhats(o.whatsapp, "Olá " + (o.nome || "").split(" ")[0] + "! Aqui é da San Comércio, recebemos sua lista pelo site. ");
      zap.target = "_blank"; zap.rel = "noopener";
      card.appendChild(zap);
    }
    return card;
  }

  function renderPilha() {
    var total = dados.orcamentos.length || 1;
    var cont = {};
    dados.orcamentos.forEach(function (o) { var s = o.status || "novo"; cont[s] = (cont[s] || 0) + 1; });
    el.pilha.innerHTML = "";
    var barra = criar("div", "pilha__barra");
    var legenda = criar("ul", "pilha__legenda");
    Object.keys(STATUS).forEach(function (st) {
      var q = cont[st] || 0;
      if (q) {
        var seg = criar("span", "pilha__seg", Math.round(q / total * 100) >= 9 ? Math.round(q / total * 100) + "%" : "");
        seg.style.flexGrow = q; seg.style.background = STATUS_COR[st]; seg.title = STATUS[st] + ": " + q;
        barra.appendChild(seg);
      }
      var li = criar("li");
      var bolinha = criar("i"); bolinha.style.background = STATUS_COR[st];
      li.appendChild(bolinha);
      li.appendChild(document.createTextNode(STATUS[st] + " "));
      li.appendChild(criar("strong", "", n(q)));
      legenda.appendChild(li);
    });
    el.pilha.appendChild(barra);
    el.pilha.appendChild(legenda);
  }

  function renderOrcamentos() {
    var cont = {};
    dados.orcamentos.forEach(function (o) { var s = o.status || "novo"; cont[s] = (cont[s] || 0) + 1; });
    var total = dados.orcamentos.length;
    var taxa = total ? Math.round((cont.fechado || 0) / total * 100) : 0;
    el.kpisOrc.innerHTML = "";
    el.kpisOrc.appendChild(kpi("Novos", cont.novo || 0, null, "", "aguardando resposta"));
    el.kpisOrc.appendChild(kpi("Atendendo", cont.atendendo || 0, null, "", "em conversa"));
    el.kpisOrc.appendChild(kpi("Fechados", cont.fechado || 0, null, "", "viraram venda"));
    el.kpisOrc.appendChild(kpi("Taxa de fechamento", taxa, null, "%", "fechados ÷ orçamentos"));
    renderPilha();

    el.listaOrcamentos.innerHTML = "";
    var lista = dados.orcamentos.slice().sort(function (a, b) { return new Date(b.criado_em) - new Date(a.criado_em); })
      .filter(function (o) { return filtroStatus === "todos" || (o.status || "novo") === filtroStatus; });
    if (!lista.length) { el.listaOrcamentos.appendChild(criar("p", "admin-vazio", "Nenhum orçamento nesse filtro e período.")); return; }
    lista.slice(0, 120).forEach(function (o) { el.listaOrcamentos.appendChild(cartaoOrcamento(o, false)); });
  }

  /* ------------------------------------------------------------------ */
  /* Pesquisas                                                           */
  /* ------------------------------------------------------------------ */
  function agruparPesquisas(lista) {
    var mapa = {};
    lista.forEach(function (p) {
      var k = String(p.termo || "").trim().toLowerCase(); if (!k) return;
      if (!mapa[k]) mapa[k] = { termo: k, vezes: 0, somaRes: 0, origens: {}, ultima: null };
      var m = mapa[k]; m.vezes++; m.somaRes += p.resultados || 0; m.origens[p.origem || "busca"] = 1;
      var t = new Date(p.criado_em); if (!m.ultima || t > m.ultima) m.ultima = t;
    });
    return Object.keys(mapa).map(function (k) {
      var m = mapa[k]; m.media = m.somaRes / m.vezes; m.semResultado = m.media === 0; return m;
    }).sort(function (a, b) { return b.vezes - a.vezes; });
  }

  function renderPesquisas() {
    var grupos = agruparPesquisas(dados.pesquisas);
    var sem = grupos.filter(function (g) { return g.semResultado; });
    el.insight.innerHTML = "";
    el.insight.appendChild(criar("h2", "", sem.length ? "Procuram e não acham no site" : "Tudo que buscaram foi encontrado"));
    el.insight.appendChild(criar("p", "admin-dica", sem.length
      ? "Itens buscados que não aparecem no catálogo do site. Vale incluir no site (ou garantir estoque): é demanda real da região."
      : "Nenhuma busca sem resultado no período."));
    if (sem.length) {
      var chips = criar("div", "insight__chips");
      sem.slice(0, 12).forEach(function (g) { chips.appendChild(criar("span", "selo selo--alerta", g.termo + " · " + g.vezes + "x")); });
      el.insight.appendChild(chips);
    }
    var lista = el.soSemResultado.checked ? sem : grupos;
    el.listaPesquisas.innerHTML = "";
    if (!lista.length) { el.listaPesquisas.appendChild(criar("p", "admin-vazio", "Nenhuma pesquisa no período.")); return; }
    var max = lista[0].vezes || 1;
    lista.slice(0, 80).forEach(function (g) {
      var linha = criar("div", "linha");
      var nome = criar("div", "linha__nome");
      nome.appendChild(criar("strong", "", g.termo));
      if (g.semResultado) nome.appendChild(selo("não achou", "alerta"));
      linha.appendChild(nome);
      var trilho = criar("div", "linha__trilho");
      var fill = criar("span", "barra__fill"); fill.style.setProperty("--p", Math.max(4, g.vezes / max * 100) + "%");
      trilho.appendChild(fill); linha.appendChild(trilho);
      var meta = criar("div", "linha__meta");
      meta.appendChild(criar("span", "", n(g.vezes) + (g.vezes === 1 ? " vez" : " vezes")));
      meta.appendChild(criar("span", "", g.semResultado ? "0 resultados" : n(Math.round(g.media)) + " resultados"));
      meta.appendChild(criar("span", "", Object.keys(g.origens).map(function (o) { return o === "item-livre" ? "escrito na lista" : "busca"; }).join(", ")));
      meta.appendChild(criar("span", "", relativo(g.ultima)));
      linha.appendChild(meta);
      el.listaPesquisas.appendChild(linha);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Tráfego                                                             */
  /* ------------------------------------------------------------------ */
  function renderCalor() {
    var matriz = DIAS_SEMANA.map(function () { return HORAS.map(function () { return 0; }); });
    dados.visitas.forEach(function (v) {
      var d = new Date(v.criado_em); var hi = HORAS.indexOf(d.getHours());
      if (hi !== -1) matriz[d.getDay()][hi]++;
    });
    var max = 1;
    matriz.forEach(function (l) { l.forEach(function (v) { if (v > max) max = v; }); });
    el.calor.innerHTML = "";
    el.calor.appendChild(criar("span", "calor__canto"));
    HORAS.forEach(function (h, i) { el.calor.appendChild(criar("span", "calor__hora", i % 2 === 0 ? h + "h" : "")); });
    [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
      el.calor.appendChild(criar("span", "calor__dia", DIAS_SEMANA[d]));
      HORAS.forEach(function (h, i) {
        var v = matriz[d][i];
        var c = criar("span", "calor__cel", v ? String(v) : "");
        var a = v ? 0.1 + 0.9 * v / max : 0;
        c.style.background = v ? "rgba(30,68,181," + a.toFixed(2) + ")" : "var(--cor-fundo-alt)";
        c.style.color = a > 0.5 ? "#fff" : "#0E1A4A";
        c.title = DIAS_SEMANA[d] + ", " + h + "h: " + v + (v === 1 ? " visita" : " visitas");
        el.calor.appendChild(c);
      });
    });
  }

  function renderTrafego() {
    renderCalor();
    barras(el.origens, contar(dados.visitas, function (v) { return origemBonita(v.referencia); }), null, 8);
    barras(el.paginas, contar(dados.visitas, function (v) { return PAGINAS[v.pagina] || v.pagina; }), null, 8);
    barras(el.cliques, contar(dados.cliques, "tipo"), function (k) { return CLIQUES[k] || k; }, 8);
    var porSemana = [1, 2, 3, 4, 5, 6, 0].map(function (d) { return dados.visitas.filter(function (v) { return new Date(v.criado_em).getDay() === d; }).length; });
    var maxS = Math.max.apply(null, porSemana);
    grafico("semana", {
      type: "bar",
      data: { labels: [1, 2, 3, 4, 5, 6, 0].map(function (d) { return DIAS_SEMANA[d]; }), datasets: [{ label: "Visitas", data: porSemana, backgroundColor: porSemana.map(function (v) { return v === maxS ? COR.azul : "#8FA5E0"; }), borderRadius: 4, borderSkipped: "start", maxBarThickness: 34 }] },
      options: opcoesBase({ interaction: { mode: "nearest", intersect: true } }),
    });
  }

  /* ------------------------------------------------------------------ */
  /* Navegação, login e início                                           */
  /* ------------------------------------------------------------------ */
  function renderSecao(nome) {
    if (!dados || !sujo[nome]) return;
    sujo[nome] = false;
    if (nome === "visao") renderVisao();
    if (nome === "clientes") renderClientes();
    if (nome === "orcamentos") renderOrcamentos();
    if (nome === "pesquisas") renderPesquisas();
    if (nome === "trafego") renderTrafego();
  }
  function secaoDoHash() {
    var h = (location.hash || "#visao").replace("#", "");
    return TITULOS[h] ? h : "visao";
  }
  function mostrarSecao(nome) {
    secaoAtual = nome;
    document.querySelectorAll("[data-secao]").forEach(function (s) { s.hidden = s.getAttribute("data-secao") !== nome; });
    document.querySelectorAll(".admin-nav [data-secao-link]").forEach(function (a) {
      if (a.getAttribute("data-secao-link") === nome) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    el.titulo.textContent = TITULOS[nome];
    window.scrollTo(0, 0);
    // Gráficos só são desenhados com a seção visível (Chart.js precisa do tamanho real)
    renderSecao(nome);
    Object.keys(graficos).forEach(function (k) { graficos[k].resize(); });
  }

  function mostrarPainel() {
    el.login.hidden = true;
    el.painel.hidden = false;
    el.avisoDemo.hidden = !modoDemo;
    mostrarSecao(secaoDoHash());
    carregar().catch(function (erro) { console.error("[San Admin] Falha ao carregar dados:", erro); });
  }
  function mostrarLogin(msg) {
    el.painel.hidden = true;
    el.login.hidden = false;
    if (msg) { el.statusLogin.textContent = msg; el.formLogin.reset(); el.formLogin.pin.focus(); }
  }

  async function tratarLogin(evento) {
    evento.preventDefault();
    if (!window.SanSupabase || !window.SanSupabase.pronto) return;
    var pin = el.formLogin.pin.value.trim();
    if (pin.length < 4) { el.statusLogin.textContent = "Digite o PIN de 4 a 8 números."; return; }
    el.statusLogin.textContent = "Entrando...";
    var res = await cliente().auth.signInWithPassword({ email: PAINEL_EMAIL_FIXO, password: pin + SUFIXO_SENHA_PIN });
    if (res.error) mostrarLogin("PIN incorreto.");
  }

  function iniciar() {
    function q(s) { return document.querySelector(s); }
    el = {
      login: q("[data-admin-login]"), painel: q("[data-admin-painel]"), formLogin: q("[data-form-login]"), statusLogin: q("[data-status-login]"),
      periodo: q("[data-periodo]"), titulo: q("[data-titulo-secao]"), avisoDemo: q("[data-aviso-demo]"),
      kpis: q("[data-kpis]"), funil: q("[data-funil]"), comparar: q("[data-comparar]"), topProdutos: q("[data-top-produtos]"), topPesquisas: q("[data-top-pesquisas]"), topClientes: q("[data-top-clientes]"),
      kpisClientes: q("[data-kpis-clientes]"), cidades: q("[data-cidades]"), buscaClientes: q("[data-busca-clientes]"), filtroClientes: q("[data-filtro-clientes]"),
      ordemClientes: q("[data-ordem-clientes]"), resumoClientes: q("[data-resumo-clientes]"), listaClientes: q("[data-lista-clientes]"), maisClientes: q("[data-mais-clientes]"),
      kpisOrc: q("[data-kpis-orcamentos]"), pilha: q("[data-pilha-status]"), listaOrcamentos: q("[data-lista-orcamentos]"),
      insight: q("[data-insight-pesquisa]"), soSemResultado: q("[data-so-sem-resultado]"), listaPesquisas: q("[data-lista-pesquisas]"),
      calor: q("[data-calor]"), origens: q("[data-origens]"), paginas: q("[data-paginas]"), cliques: q("[data-cliques]"),
      detalhe: q("[data-detalhe-cliente]"), detalheFundo: q("[data-detalhe-fundo]"), detalheConteudo: q("[data-detalhe-conteudo]"),
    };

    document.querySelectorAll("[data-secao-link]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); var nome = a.getAttribute("data-secao-link"); history.replaceState(null, "", "#" + nome); mostrarSecao(nome); });
    });
    el.periodo.addEventListener("change", function () { carregar(); });
    q("[data-atualizar]").addEventListener("click", function () { carregar(); });
    el.comparar.addEventListener("change", function () { if (dados) renderGraficosVisao(); });
    function refiltrarClientes() { limiteClientes = POR_PAGINA; if (dados) renderListaClientes(); }
    el.buscaClientes.addEventListener("input", refiltrarClientes);
    el.filtroClientes.addEventListener("change", refiltrarClientes);
    el.ordemClientes.addEventListener("change", refiltrarClientes);
    el.maisClientes.addEventListener("click", function () { limiteClientes += POR_PAGINA; renderListaClientes(); });
    el.soSemResultado.addEventListener("change", function () { if (dados) renderPesquisas(); });
    document.querySelectorAll("[data-filtro-status] [data-status]").forEach(function (b) {
      b.addEventListener("click", function () {
        filtroStatus = b.getAttribute("data-status");
        document.querySelectorAll("[data-filtro-status] [data-status]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        if (dados) renderOrcamentos();
      });
    });
    q("[data-fechar-detalhe]").addEventListener("click", fecharDetalhe);
    el.detalheFundo.addEventListener("click", fecharDetalhe);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecharDetalhe(); });
    document.querySelectorAll("[data-exportar]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!dados) return;
        if (b.getAttribute("data-exportar") === "clientes") {
          baixarCSV("clientes-san", [["Nome", "WhatsApp", "Cidade", "Primeiro acesso", "Último acesso", "Visitas", "Orçamentos", "Fechados"]].concat(
            clientesFiltrados().map(function (c) { return [c.nome, foneBonito(c.whatsapp), c.cidade, dataHora(c.primeiro), dataHora(c.ultimo), c.visitas, c.orcamentos.length, c.fechados]; })));
        } else {
          baixarCSV("orcamentos-san", [["Data", "Nome", "WhatsApp", "Cidade", "Situação", "Itens"]].concat(
            dados.orcamentos.map(function (o) { return [dataHora(o.criado_em), o.nome, foneBonito(o.whatsapp), o.cidade, STATUS[o.status] || o.status, (o.itens || []).map(function (i) { return (i.qtd || 1) + "x " + i.nome + (i.detalhe ? " (" + i.detalhe + ")" : ""); }).join(" | ")]; })));
        }
      });
    });
    q("[data-sair]").addEventListener("click", function () {
      if (modoDemo) { modoDemo = false; mostrarLogin(); return; }
      cliente().auth.signOut();
    });
    el.formLogin.addEventListener("submit", tratarLogin);

    var supabasePronto = window.SanSupabase && window.SanSupabase.pronto;
    // A demonstração fica sempre disponível: com o banco recém-criado ainda
    // não há dados reais, e é ela que mostra o painel cheio ao apresentar.
    q("[data-bloco-demo]").hidden = false;
    q("[data-ver-demo]").addEventListener("click", function () { modoDemo = true; mostrarPainel(); });
    if (!supabasePronto) {
      el.statusLogin.textContent = "";
      el.formLogin.pin.disabled = true;
      q("[data-botao-entrar]").disabled = true;
      q("[data-texto-demo]").textContent = "O banco de dados ainda não foi ligado. Dá pra ver o painel funcionando com dados de exemplo:";
      return;
    }
    cliente().auth.onAuthStateChange(function (evento, sessao) {
      if (sessao && sessao.user) mostrarPainel(); else if (!modoDemo) mostrarLogin();
    });
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
