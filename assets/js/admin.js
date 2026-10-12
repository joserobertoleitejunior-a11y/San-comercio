/**
 * Painel administrativo da San Comércio.
 * Base: admin.js da Remop (login por PIN sobre Supabase Auth, abas por
 * hash, Chart.js) — reestruturado pra loja: Visão geral, Clientes
 * (agrupados por WhatsApp), Orçamentos (com status), Pesquisas
 * (o que buscam e não acham) e Tráfego.
 *
 * Duas fontes de dados:
 *  - Supabase (real): precisa de config.js preenchido + supabase/schema.sql
 *    + o usuário do painel criado (ver README).
 *  - Demonstração: admin-demo.js gera um cenário fictício pra apresentar
 *    o painel. Aparece só quando o Supabase não está ligado.
 */
(function () {
  "use strict";

  // Login por PIN: o Supabase exige e-mail + senha de 6+ caracteres,
  // então o painel completa o PIN com este sufixo (mesmo esquema da Remop).
  var PAINEL_EMAIL_FIXO = "painel@san-comercio.internal";
  var SUFIXO_SENHA_PIN = "-SanPainel2026!";

  // Paleta dos gráficos (validada: contraste e daltonismo — dataviz)
  var COR = { visitas: "#1E44B5", orcamentos: "#C08417", clientes: "#14866D", grade: "#E6EAF3", texto: "#586282" };

  var TITULOS = { visao: "Visão geral", clientes: "Clientes", orcamentos: "Orçamentos", pesquisas: "Pesquisas", trafego: "Tráfego" };
  var PAGINAS = { "/": "Início", "/index.html": "Início", "/institucional.html": "A loja", "/localizacao.html": "Localização" };
  var STATUS = { novo: "Novo", atendendo: "Atendendo", fechado: "Fechado", perdido: "Perdido" };
  var CLIQUES = { whatsapp: "WhatsApp", "adicionar-lista": "Adicionar à lista", "abrir-lista": "Abrir lista", mapa: "Mapa / rota", instagram: "Instagram" };

  var modoDemo = false;
  var demoCache = null;
  var dados = null;          // período atual
  var anterior = null;       // período anterior (comparação)
  var graficos = {};
  var filtroStatus = "todos";
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
  function criar(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
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
    return Object.keys(mapa).map(function (k) { return { chave: k, total: mapa[k] }; })
      .sort(function (a, b) { return b.total - a.total; });
  }
  function diasDoPeriodo(qtd) {
    var lista = [];
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    for (var i = qtd - 1; i >= 0; i--) { var d = new Date(hoje); d.setDate(d.getDate() - i); lista.push(d); }
    return lista;
  }
  function porDia(linhas, dias) {
    var idx = {};
    dias.forEach(function (d, i) { idx[d.toDateString()] = i; });
    var out = dias.map(function () { return 0; });
    linhas.forEach(function (l) {
      var i = idx[new Date(l.criado_em).toDateString()];
      if (i !== undefined) out[i]++;
    });
    return out;
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
      var r = await Promise.all(["paginas_vistas", "cliques", "pesquisas", "identificacoes", "orcamentos"].map(function (t) { return buscar(t, inicioAnterior); }));
      tudo = { visitas: r[0], cliques: r[1], pesquisas: r[2], identificacoes: r[3], orcamentos: r[4] };
    }
    dados = separar(tudo, inicio, amanha);
    anterior = separar(tudo, inicioAnterior, inicio);
    dados.dias = diasDoPeriodo(periodo);
    // Clientes e orçamentos usam o histórico todo carregado
    dados.todosIdent = tudo.identificacoes;
    dados.todosOrc = tudo.orcamentos;
    dados.todasVisitas = tudo.visitas;
    renderizarTudo();
  }

  /* ------------------------------------------------------------------ */
  /* Visão geral                                                         */
  /* ------------------------------------------------------------------ */
  function unicos(lista, chave) {
    var s = {};
    lista.forEach(function (l) { if (l[chave]) s[l[chave]] = 1; });
    return Object.keys(s).length;
  }

  function kpi(rotulo, valor, valorAnterior, sufixo, dica) {
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
    return card;
  }

  function renderizarKpis() {
    var visitantes = unicos(dados.visitas, "visitante_id");
    var visitantesAnt = unicos(anterior.visitas, "visitante_id");
    var clientes = unicos(dados.identificacoes, "whatsapp");
    var clientesAnt = unicos(anterior.identificacoes, "whatsapp");
    var conv = visitantes ? Math.round(dados.orcamentos.length / visitantes * 1000) / 10 : 0;
    var convAnt = visitantesAnt ? Math.round(anterior.orcamentos.length / visitantesAnt * 1000) / 10 : 0;
    el.kpis.innerHTML = "";
    el.kpis.appendChild(kpi("Visitas", dados.visitas.length, anterior.visitas.length, "", "páginas abertas"));
    el.kpis.appendChild(kpi("Pessoas diferentes", visitantes, visitantesAnt, "", "aparelhos únicos"));
    el.kpis.appendChild(kpi("Clientes identificados", clientes, clientesAnt, "", "entraram com WhatsApp"));
    el.kpis.appendChild(kpi("Orçamentos", dados.orcamentos.length, anterior.orcamentos.length, "", "listas enviadas"));
    el.kpis.appendChild(kpi("Conversão", conv, convAnt, "%", "orçamentos ÷ pessoas"));
  }

  function opcoesBase(extra) {
    return Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: "easeOutQuart" },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#0E1A4A", padding: 10, cornerRadius: 8, displayColors: false, titleFont: { family: "Hanken Grotesk", weight: "700" }, bodyFont: { family: "Hanken Grotesk" } },
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

  function renderizarGraficos() {
    var rotulos = dados.dias.map(function (d) { return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); });
    var ctx = document.querySelector('[data-grafico="visitas"]');
    var gradiente = null;
    if (ctx) {
      gradiente = ctx.getContext("2d").createLinearGradient(0, 0, 0, 260);
      gradiente.addColorStop(0, "rgba(30,68,181,0.22)");
      gradiente.addColorStop(1, "rgba(30,68,181,0)");
    }
    grafico("visitas", {
      type: "line",
      data: { labels: rotulos, datasets: [{ label: "Visitas", data: porDia(dados.visitas, dados.dias), borderColor: COR.visitas, backgroundColor: gradiente, fill: true, borderWidth: 2, tension: 0.35, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: COR.visitas, pointHoverBorderColor: "#fff", pointHoverBorderWidth: 2 }] },
      options: opcoesBase(),
    });
    grafico("orcamentos", {
      type: "bar",
      data: { labels: rotulos, datasets: [{ label: "Orçamentos", data: porDia(dados.orcamentos, dados.dias), backgroundColor: COR.orcamentos, borderRadius: 4, borderSkipped: "start", maxBarThickness: 18 }] },
      options: opcoesBase(),
    });
    var horas = []; for (var h = 6; h <= 23; h++) horas.push(h);
    var porHora = horas.map(function (hh) { return dados.visitas.filter(function (v) { return new Date(v.criado_em).getHours() === hh; }).length; });
    grafico("horas", {
      type: "bar",
      data: { labels: horas.map(function (hh) { return hh + "h"; }), datasets: [{ label: "Visitas", data: porHora, backgroundColor: COR.visitas, borderRadius: 4, borderSkipped: "start", maxBarThickness: 22 }] },
      options: opcoesBase({ interaction: { mode: "nearest", intersect: true } }),
    });
    var nomesSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    var porSemana = [1, 2, 3, 4, 5, 6, 0].map(function (d) { return dados.visitas.filter(function (v) { return new Date(v.criado_em).getDay() === d; }).length; });
    grafico("semana", {
      type: "bar",
      data: { labels: [1, 2, 3, 4, 5, 6, 0].map(function (d) { return nomesSemana[d]; }), datasets: [{ label: "Visitas", data: porSemana, backgroundColor: COR.clientes, borderRadius: 4, borderSkipped: "start", maxBarThickness: 34 }] },
      options: opcoesBase({ interaction: { mode: "nearest", intersect: true } }),
    });
  }

  /** Lista de barras horizontais em HTML (rótulo + valor sempre visíveis). */
  function barras(alvo, itens, rotular, limite, extra) {
    alvo.innerHTML = "";
    var max = itens.length ? itens[0].total : 1;
    itens.slice(0, limite || 8).forEach(function (item) {
      var li = criar("li", "barra");
      var topo = criar("div", "barra__topo");
      var nome = criar("span", "barra__nome", rotular ? rotular(item.chave) : item.chave);
      topo.appendChild(nome);
      if (extra) { var e = extra(item); if (e) topo.appendChild(e); }
      topo.appendChild(criar("span", "barra__valor", n(item.total)));
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

  function renderizarRankings() {
    var produtos = {};
    dados.orcamentos.forEach(function (o) {
      (o.itens || []).forEach(function (i) {
        var nome = /^Mangueira prensada/.test(i.nome) ? "Mangueira prensada (sob medida)" : i.nome;
        produtos[nome] = (produtos[nome] || 0) + (i.qtd || 1);
      });
    });
    barras(el.topProdutos, Object.keys(produtos).map(function (k) { return { chave: k, total: produtos[k] }; }).sort(function (a, b) { return b.total - a.total; }), null, 8);

    var buscas = agruparPesquisas(dados.pesquisas);
    barras(el.topPesquisas, buscas.map(function (b) { return { chave: b.termo, total: b.vezes, semResultado: b.semResultado }; }), null, 8, function (item) {
      return item.semResultado ? selo("não achou", "alerta") : null;
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
      if (!mapa[w]) mapa[w] = { whatsapp: w, nome: "", cidade: "", primeiro: null, ultimo: null, visitas: 0, orcamentos: [] };
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
    return Object.keys(mapa).map(function (k) { return mapa[k]; }).sort(function (a, b) { return b.ultimo - a.ultimo; });
  }

  function renderizarClientes() {
    var termo = el.buscaClientes.value.trim().toLowerCase();
    var lista = montarClientes().filter(function (c) {
      return !termo || (c.nome + " " + c.whatsapp + " " + c.cidade + " " + foneBonito(c.whatsapp)).toLowerCase().indexOf(termo) !== -1;
    });
    var corpo = el.tabelaClientes.querySelector("tbody");
    corpo.innerHTML = "";
    if (!lista.length) {
      var tr0 = criar("tr"); var td0 = criar("td", "admin-vazio", "Nenhum cliente identificado ainda."); td0.colSpan = 8; tr0.appendChild(td0); corpo.appendChild(tr0);
      return;
    }
    lista.forEach(function (c) {
      var tr = criar("tr");
      var tdNome = criar("td");
      var av = criar("span", "avatar", (c.nome || "?").charAt(0).toUpperCase());
      tdNome.appendChild(av); tdNome.appendChild(document.createTextNode(c.nome || "Sem nome"));
      tr.appendChild(tdNome);
      var tdW = criar("td"); var a = criar("a", "admin-link", foneBonito(c.whatsapp));
      a.href = linkWhats(c.whatsapp, "Olá " + (c.nome || "").split(" ")[0] + ", aqui é da San Comércio!"); a.target = "_blank"; a.rel = "noopener";
      tdW.appendChild(a); tr.appendChild(tdW);
      tr.appendChild(criar("td", "", c.cidade || "–"));
      tr.appendChild(criar("td", "", dataCurta(c.primeiro)));
      tr.appendChild(criar("td", "", dataHora(c.ultimo)));
      tr.appendChild(criar("td", "num", n(c.visitas)));
      tr.appendChild(criar("td", "num", n(c.orcamentos.length)));
      var tdAc = criar("td"); var ver = criar("button", "botao botao--outline botao--sm", "Ver");
      ver.type = "button"; ver.addEventListener("click", function () { abrirDetalhe(c); });
      tdAc.appendChild(ver); tr.appendChild(tdAc);
      // No celular o botão "Ver" fica no fim da tabela rolável: a linha
      // inteira também abre o detalhe (menos o link do WhatsApp).
      tr.classList.add("linha-clicavel");
      tr.addEventListener("click", function (e) { if (!e.target.closest("a, button")) abrirDetalhe(c); });
      corpo.appendChild(tr);
    });
  }

  function abrirDetalhe(c) {
    var box = el.detalheConteudo;
    box.innerHTML = "";
    var topo = criar("div", "detalhe__topo");
    topo.appendChild(criar("span", "avatar avatar--grande", (c.nome || "?").charAt(0).toUpperCase()));
    var info = criar("div");
    var h = criar("h2", "", c.nome || "Sem nome"); h.id = "detalhe-nome"; info.appendChild(h);
    info.appendChild(criar("p", "", foneBonito(c.whatsapp) + (c.cidade ? " · " + c.cidade : "")));
    topo.appendChild(info); box.appendChild(topo);

    var numeros = criar("div", "detalhe__numeros");
    [["Visitas", c.visitas], ["Orçamentos", c.orcamentos.length], ["Cliente desde", dataCurta(c.primeiro)]].forEach(function (p) {
      var d = criar("div"); d.appendChild(criar("strong", "", typeof p[1] === "number" ? n(p[1]) : p[1])); d.appendChild(criar("span", "", p[0])); numeros.appendChild(d);
    });
    box.appendChild(numeros);

    var zap = criar("a", "botao botao--whatsapp botao--bloco", "Chamar no WhatsApp");
    zap.href = linkWhats(c.whatsapp, "Olá " + (c.nome || "").split(" ")[0] + ", aqui é da San Comércio! Tudo certo com seu orçamento?");
    zap.target = "_blank"; zap.rel = "noopener"; box.appendChild(zap);

    box.appendChild(criar("h3", "", "Orçamentos"));
    if (!c.orcamentos.length) box.appendChild(criar("p", "admin-dica", "Ainda não mandou lista."));
    c.orcamentos.slice().sort(function (a, b) { return new Date(b.criado_em) - new Date(a.criado_em); }).forEach(function (o) {
      box.appendChild(cartaoOrcamento(o, true));
    });
    el.detalhe.classList.add("aberto"); el.detalhe.setAttribute("aria-hidden", "false"); el.detalhe.inert = false;
    el.detalheFundo.hidden = false;
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
    if (modoDemo) return;
    try {
      var res = await cliente().from("orcamentos").update({ status: novo }).eq("id", o.id);
      if (res.error) throw res.error;
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
    sel.setAttribute("aria-label", "Status do orçamento de " + (o.nome || ""));
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

  function renderizarOrcamentos() {
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

  function renderizarPesquisas() {
    var grupos = agruparPesquisas(dados.pesquisas);
    var sem = grupos.filter(function (g) { return g.semResultado; });
    el.insight.innerHTML = "";
    el.insight.appendChild(criar("h2", "", sem.length ? "Procuram e não acham no site" : "Tudo que buscaram foi encontrado"));
    el.insight.appendChild(criar("p", "admin-dica", sem.length
      ? "Itens buscados que não aparecem no catálogo do site. Vale incluir no site (ou garantir estoque) — é demanda real da região."
      : "Nenhuma busca sem resultado no período."));
    if (sem.length) {
      var chips = criar("div", "insight__chips");
      sem.slice(0, 12).forEach(function (g) { chips.appendChild(criar("span", "selo selo--alerta", g.termo + " · " + g.vezes + "x")); });
      el.insight.appendChild(chips);
    }
    var lista = el.soSemResultado.checked ? sem : grupos;
    var corpo = el.tabelaPesquisas.querySelector("tbody");
    corpo.innerHTML = "";
    if (!lista.length) { var tr0 = criar("tr"); var td0 = criar("td", "admin-vazio", "Nenhuma pesquisa no período."); td0.colSpan = 5; tr0.appendChild(td0); corpo.appendChild(tr0); return; }
    lista.forEach(function (g) {
      var tr = criar("tr");
      var td = criar("td", "", g.termo);
      if (g.semResultado) { td.appendChild(document.createTextNode(" ")); td.appendChild(selo("não achou", "alerta")); }
      tr.appendChild(td);
      tr.appendChild(criar("td", "num", n(g.vezes)));
      tr.appendChild(criar("td", "num", n(Math.round(g.media))));
      tr.appendChild(criar("td", "", Object.keys(g.origens).map(function (o) { return o === "item-livre" ? "escrito na lista" : "busca"; }).join(", ")));
      tr.appendChild(criar("td", "", dataHora(g.ultima)));
      corpo.appendChild(tr);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Tráfego                                                             */
  /* ------------------------------------------------------------------ */
  function renderizarTrafego() {
    barras(el.origens, contar(dados.visitas, function (v) { return origemBonita(v.referencia); }), null, 8);
    barras(el.paginas, contar(dados.visitas, function (v) { return PAGINAS[v.pagina] || v.pagina; }), null, 8);
    barras(el.cliques, contar(dados.cliques, "tipo"), function (k) { return CLIQUES[k] || k; }, 8);
  }

  function renderizarTudo() {
    renderizarKpis();
    renderizarGraficos();
    renderizarRankings();
    renderizarClientes();
    renderizarOrcamentos();
    renderizarPesquisas();
    renderizarTrafego();
  }

  /* ------------------------------------------------------------------ */
  /* Navegação, login e início                                           */
  /* ------------------------------------------------------------------ */
  function secaoDoHash() {
    var h = (location.hash || "#visao").replace("#", "");
    return TITULOS[h] ? h : "visao";
  }
  function mostrarSecao(nome) {
    document.querySelectorAll("[data-secao]").forEach(function (s) { s.hidden = s.getAttribute("data-secao") !== nome; });
    document.querySelectorAll(".admin-nav [data-secao-link]").forEach(function (a) {
      if (a.getAttribute("data-secao-link") === nome) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    el.titulo.textContent = TITULOS[nome];
    // Chart.js precisa redimensionar quando a aba aparece
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
    el = {
      login: document.querySelector("[data-admin-login]"),
      painel: document.querySelector("[data-admin-painel]"),
      formLogin: document.querySelector("[data-form-login]"),
      statusLogin: document.querySelector("[data-status-login]"),
      periodo: document.querySelector("[data-periodo]"),
      titulo: document.querySelector("[data-titulo-secao]"),
      avisoDemo: document.querySelector("[data-aviso-demo]"),
      kpis: document.querySelector("[data-kpis]"),
      topProdutos: document.querySelector("[data-top-produtos]"),
      topPesquisas: document.querySelector("[data-top-pesquisas]"),
      buscaClientes: document.querySelector("[data-busca-clientes]"),
      tabelaClientes: document.querySelector("[data-tabela-clientes]"),
      listaOrcamentos: document.querySelector("[data-lista-orcamentos]"),
      insight: document.querySelector("[data-insight-pesquisa]"),
      soSemResultado: document.querySelector("[data-so-sem-resultado]"),
      tabelaPesquisas: document.querySelector("[data-tabela-pesquisas]"),
      origens: document.querySelector("[data-origens]"),
      paginas: document.querySelector("[data-paginas]"),
      cliques: document.querySelector("[data-cliques]"),
      detalhe: document.querySelector("[data-detalhe-cliente]"),
      detalheFundo: document.querySelector("[data-detalhe-fundo]"),
      detalheConteudo: document.querySelector("[data-detalhe-conteudo]"),
    };

    document.querySelectorAll("[data-secao-link]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); var nome = a.getAttribute("data-secao-link"); history.replaceState(null, "", "#" + nome); mostrarSecao(nome); });
    });
    el.periodo.addEventListener("change", function () { carregar(); });
    document.querySelector("[data-atualizar]").addEventListener("click", function () { carregar(); });
    el.buscaClientes.addEventListener("input", renderizarClientes);
    el.soSemResultado.addEventListener("change", renderizarPesquisas);
    document.querySelectorAll("[data-filtro-status] [data-status]").forEach(function (b) {
      b.addEventListener("click", function () {
        filtroStatus = b.getAttribute("data-status");
        document.querySelectorAll("[data-filtro-status] [data-status]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        renderizarOrcamentos();
      });
    });
    document.querySelector("[data-fechar-detalhe]").addEventListener("click", fecharDetalhe);
    el.detalheFundo.addEventListener("click", fecharDetalhe);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecharDetalhe(); });
    document.querySelectorAll("[data-exportar]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.getAttribute("data-exportar") === "clientes") {
          baixarCSV("clientes-san", [["Nome", "WhatsApp", "Cidade", "Primeiro acesso", "Último acesso", "Visitas", "Orçamentos"]].concat(
            montarClientes().map(function (c) { return [c.nome, foneBonito(c.whatsapp), c.cidade, dataHora(c.primeiro), dataHora(c.ultimo), c.visitas, c.orcamentos.length]; })));
        } else {
          baixarCSV("orcamentos-san", [["Data", "Nome", "WhatsApp", "Cidade", "Status", "Itens"]].concat(
            dados.orcamentos.map(function (o) { return [dataHora(o.criado_em), o.nome, foneBonito(o.whatsapp), o.cidade, STATUS[o.status] || o.status, (o.itens || []).map(function (i) { return (i.qtd || 1) + "x " + i.nome + (i.detalhe ? " (" + i.detalhe + ")" : ""); }).join(" | ")]; })));
        }
      });
    });
    document.querySelector("[data-sair]").addEventListener("click", function () {
      if (modoDemo) { modoDemo = false; mostrarLogin(); return; }
      cliente().auth.signOut();
    });
    el.formLogin.addEventListener("submit", tratarLogin);

    var supabasePronto = window.SanSupabase && window.SanSupabase.pronto;
    // A demonstração fica sempre disponível: com o banco recém-criado ainda
    // não há dados reais, e é ela que mostra o painel cheio ao apresentar.
    document.querySelector("[data-bloco-demo]").hidden = false;
    document.querySelector("[data-ver-demo]").addEventListener("click", function () { modoDemo = true; mostrarPainel(); });
    if (!supabasePronto) {
      el.statusLogin.textContent = "";
      el.formLogin.pin.disabled = true;
      document.querySelector("[data-botao-entrar]").disabled = true;
      document.querySelector("[data-texto-demo]").textContent = "O banco de dados ainda não foi ligado. Dá pra ver o painel funcionando com dados de exemplo:";
      return;
    }
    cliente().auth.onAuthStateChange(function (evento, sessao) {
      if (sessao && sessao.user) mostrarPainel(); else if (!modoDemo) mostrarLogin();
    });
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
