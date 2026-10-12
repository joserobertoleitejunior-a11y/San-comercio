/**
 * Dados de DEMONSTRAÇÃO do painel admin — só usados quando o Supabase
 * ainda não está ligado (ou quando alguém clica em "Ver demonstração").
 * Servem pra apresentar o painel ao dono da loja antes de ter dados
 * reais. Nomes e números são fictícios (prefixo 15 9 0000-xxxx) e o
 * painel mostra uma faixa "Modo demonstração" o tempo todo.
 *
 * Gerador determinístico (semente fixa): toda vez gera o mesmo cenário,
 * relativo à data de hoje.
 */
(function () {
  "use strict";

  function rng(semente) {
    return function () {
      semente = (semente * 1664525 + 1013904223) % 4294967296;
      return semente / 4294967296;
    };
  }

  var NOMES = ["Carlos", "Marcos", "Ana", "Paulo", "Rogério", "Luciana", "Fernando", "Juliana", "Sérgio", "Rafael",
    "Patrícia", "Eduardo", "Márcio", "Cláudia", "Diego", "Renata", "Anderson", "Fábio", "Simone", "Gustavo",
    "Vanessa", "Leandro", "Adriana", "Wagner", "Tiago", "Cristiane", "Ricardo", "Elaine", "Rodrigo", "Daniela",
    "Valdir", "Jéssica", "Alexandre", "Priscila", "Edson", "Camila", "Osvaldo", "Mariana"];
  var SOBRENOMES = ["A.", "B.", "C.", "D.", "F.", "G.", "L.", "M.", "N.", "O.", "P.", "R.", "S.", "T.", "V."];
  var CIDADES = ["Itapetininga", "Itapetininga", "Itapetininga", "Itapetininga", "São Miguel Arcanjo", "Angatuba",
    "Guareí", "Capão Bonito", "Alambari", "Sarapuí", "Tatuí"];
  var PRODUTOS = ["Mangueiras hidráulicas", "Terminais e conexões prensáveis", "Conexões galvanizadas", "Linha pneumática",
    "Conexões de latão", "Correias", "Óleos e lubrificantes", "Ferramentas", "EPIs", "Fitas, colas e adesivos",
    "Limpeza automotiva", "Mangueiras e conexões PVC"];
  var PESO_PRODUTOS = [10, 7, 5, 6, 3, 5, 4, 5, 4, 3, 3, 4];
  var LIVRES = ["abraçadeira 1/2", "engate rápido 1/4", "graxeira reta", "anel o-ring kit", "fita veda-rosca 18mm",
    "luva de vaqueta", "rolamento 6203", "mangueira de combustível 5/16", "silicone alta temperatura", "disco de corte 4 1/2"];
  var MANGUEIRAS = ["Mangueira prensada: Hidráulica 2 tramas (100R2)", "Mangueira prensada: Hidráulica 1 trama (100R1)",
    "Mangueira prensada: Lavadora de alta pressão", "Mangueira prensada: Mangueira de ar / pneumática"];
  var BITOLAS = ['1/4"', '3/8"', '1/2"', '1/2"', '3/4"', '5/8"'];
  var TERMOS = [
    ["mangueira hidraulica", 1], ["engate rapido", 1], ["correia", 1], ["luva", 2], ["mangueira", 3],
    ["conexao", 3], ["epi", 1], ["oleo hidraulico", 1], ["niple", 1], ["abracadeira", 0], ["rolamento", 0],
    ["graxeira", 0], ["o-ring", 0], ["mangueira combustivel", 0], ["chave de boca", 1], ["fita", 1],
    ["registro", 1], ["bota", 1], ["disco de corte", 0], ["mangueira jardim", 1]];
  var ORIGENS = [["https://www.google.com/", 46], ["https://l.instagram.com/", 22], ["https://m.facebook.com/", 10],
    ["https://wa.me/", 9], ["", 13]];
  var PAGINAS = [["/index.html", 62], ["/institucional.html", 14], ["/localizacao.html", 24]];
  var CLIQUES = [["whatsapp", "Falar no WhatsApp", 40], ["adicionar-lista", "Mangueiras hidráulicas", 25],
    ["abrir-lista", "Minha lista", 14], ["mapa", "Google Maps", 12], ["instagram", "Instagram", 9]];

  function sortearPeso(r, lista, pesoIdx) {
    var total = lista.reduce(function (s, it) { return s + it[pesoIdx]; }, 0);
    var x = r() * total;
    for (var i = 0; i < lista.length; i++) {
      x -= lista[i][pesoIdx];
      if (x <= 0) return lista[i];
    }
    return lista[lista.length - 1];
  }

  function horaDoDia(r) {
    // Picos de manhã (8–11h) e à tarde (14–17h), loja abre 07h15
    var faixas = [[7, 2], [8, 9], [9, 12], [10, 11], [11, 7], [12, 4], [13, 5], [14, 9], [15, 10], [16, 9], [17, 6], [18, 3], [19, 3], [20, 4], [21, 3], [22, 2]];
    var h = sortearPeso(r, faixas, 1)[0];
    return [h, Math.floor(r() * 60)];
  }

  function gerar(dias) {
    var r = rng(20261012);
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Clientes fictícios
    var clientes = [];
    for (var c = 0; c < 160; c++) {
      clientes.push({
        nome: NOMES[c % NOMES.length] + " " + SOBRENOMES[Math.floor(r() * SOBRENOMES.length)],
        whatsapp: "1590000" + String(1000 + c * 37).slice(-4),
        cidade: CIDADES[Math.floor(r() * CIDADES.length)],
        // dia (contando de hoje pra trás) em que o cliente aparece pela 1ª vez
        entrada: Math.floor(Math.pow(r(), 1.4) * 175),
      });
    }

    var visitas = [], cliques = [], pesquisas = [], identificacoes = [], orcamentos = [];
    var idOrc = 1;

    for (var d = dias - 1; d >= 0; d--) {
      var dia = new Date(hoje);
      dia.setDate(dia.getDate() - d);
      var semana = dia.getDay();
      var base = semana === 0 ? 12 : semana === 6 ? 24 : 38;
      var crescimento = 1 + (dias - d) / dias * 0.35; // site "pegando tração"
      var nVisitas = Math.round((base + r() * 18) * crescimento);

      var elegiveis = clientes.filter(function (c) { return c.entrada >= d; });
      if (!elegiveis.length) elegiveis = clientes.slice(0, 5);
      function escolher(expoente) { return elegiveis[Math.floor(Math.pow(r(), expoente) * elegiveis.length)]; }

      function quando() {
        var hm = horaDoDia(r);
        var t = new Date(dia);
        t.setHours(hm[0], hm[1], Math.floor(r() * 60));
        return t.toISOString();
      }

      for (var v = 0; v < nVisitas; v++) {
        var visitante = "v-demo-" + Math.floor(r() * nVisitas * 0.8 + d * 50);
        var cli = r() < 0.035 ? escolher(1) : null;
        visitas.push({
          pagina: sortearPeso(r, PAGINAS, 1)[0],
          referencia: sortearPeso(r, ORIGENS, 1)[0],
          visitante_id: visitante,
          cliente_whatsapp: cli ? cli.whatsapp : "",
          criado_em: quando(),
        });
      }
      var nCliques = Math.round(nVisitas * (0.5 + r() * 0.3));
      for (var k = 0; k < nCliques; k++) {
        var tipo = sortearPeso(r, CLIQUES, 2);
        cliques.push({ tipo: tipo[0], detalhe: tipo[0] === "adicionar-lista" ? sortearPeso(r, PRODUTOS.map(function (p, i) { return [p, PESO_PRODUTOS[i]]; }), 1)[0] : tipo[1], pagina: "/index.html", criado_em: quando() });
      }
      var nBuscas = Math.round(nVisitas * 0.16);
      for (var b = 0; b < nBuscas; b++) {
        var termo = TERMOS[Math.floor(Math.pow(r(), 1.6) * TERMOS.length)];
        pesquisas.push({ termo: termo[0], resultados: termo[1], origem: "busca", pagina: "/index.html", criado_em: quando() });
      }
      var nOrc = Math.round((semana === 0 ? 1 : 3) + r() * 4 * crescimento);
      for (var o = 0; o < nOrc; o++) {
        var cliente = escolher(1.8);
        var itens = [];
        var nItens = 1 + Math.floor(r() * 4);
        for (var i = 0; i < nItens; i++) {
          var x = r();
          if (x < 0.25) {
            itens.push({ nome: MANGUEIRAS[Math.floor(r() * MANGUEIRAS.length)], detalhe: "bitola " + BITOLAS[Math.floor(r() * BITOLAS.length)] + " · " + (1 + Math.floor(r() * 6)) + ",5 m", qtd: 1 + Math.floor(r() * 3) });
          } else if (x < 0.4) {
            var livre = LIVRES[Math.floor(r() * LIVRES.length)];
            itens.push({ nome: livre, detalhe: "", qtd: 1 + Math.floor(r() * 10) });
            pesquisas.push({ termo: livre, resultados: 0, origem: "item-livre", pagina: "/index.html", cliente_whatsapp: cliente.whatsapp, criado_em: quando() });
          } else {
            itens.push({ nome: sortearPeso(r, PRODUTOS.map(function (p, j) { return [p, PESO_PRODUTOS[j]]; }), 1)[0], detalhe: "", qtd: 1 + Math.floor(r() * 4) });
          }
        }
        var criado = quando();
        var idade = d;
        var status = idade < 1 ? "novo" : idade < 3 ? (r() < 0.5 ? "atendendo" : "novo") : (r() < 0.62 ? "fechado" : r() < 0.6 ? "perdido" : "atendendo");
        orcamentos.push({ id: idOrc++, nome: cliente.nome, whatsapp: cliente.whatsapp, cidade: cliente.cidade, itens: itens, pagina: "/index.html", status: status, criado_em: criado });
        identificacoes.push({ nome: cliente.nome, whatsapp: cliente.whatsapp, cidade: cliente.cidade, origem: "lista", criado_em: criado });
      }
      if (r() < 0.7) {
        var c2 = escolher(1);
        identificacoes.push({ nome: c2.nome, whatsapp: c2.whatsapp, cidade: c2.cidade, origem: "entrar", criado_em: quando() });
      }
    }

    return { visitas: visitas, cliques: cliques, pesquisas: pesquisas, identificacoes: identificacoes, orcamentos: orcamentos };
  }

  window.SanAdminDemo = { gerar: gerar };
})();
