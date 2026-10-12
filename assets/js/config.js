/**
 * Configuração central do site San Comércio.
 * ÚNICO lugar a editar quando telefone, WhatsApp, horário, endereço
 * ou as credenciais públicas do Supabase mudarem. O resto do site lê
 * daqui (links de WhatsApp, horário no rodapé/localização, selo
 * "aberto agora", lista de orçamento).
 */
window.SAN_CONFIG = {
  nome: "San Comércio de Mangueiras e Conexões",

  // Fonte: perfil comercial do WhatsApp + artes da própria loja.
  whatsappNumero: "5515996836600",
  whatsappExibicao: "(15) 99683-6600",
  telefoneFixo: "(15) 3272-8295",
  telefoneFixoLink: "+551532728295",
  email: "sancomercio@hotmail.com",
  whatsappMensagemPadrao:
    "Olá! Vim pelo site da San Comércio e gostaria de um orçamento.",

  instagramUrl: "https://www.instagram.com/san_comercio_de_mangueiras/",
  instagramUsuario: "@san_comercio_de_mangueiras",

  enderecoCompleto:
    "Av. 5 de Novembro, 961 — Vila Nastri, Itapetininga - SP, 18207-320",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=San+Comercio+Mangueiras+e+Conexoes+Av.+5+de+Novembro+961+Itapetininga+SP",
  wazeUrl:
    "https://waze.com/ul?q=Av.%205%20de%20Novembro%20961%20Itapetininga%20SP&navigate=yes",

  // Horário: segunda 07:15–18:00 confirmado no perfil do WhatsApp.
  // Terça a sexta assumido igual e sábado SEM horário até o cliente
  // confirmar (ver MAPA-DO-SITE.md → Pendências). Formato "HH:MM".
  // dia: 0 = domingo ... 6 = sábado. null = fechado / a confirmar.
  horarios: {
    0: null,
    1: ["07:15", "18:00"],
    2: ["07:15", "18:00"],
    3: ["07:15", "18:00"],
    4: ["07:15", "18:00"],
    5: ["07:15", "18:00"],
    6: null,
  },
  sabadoTexto: "Consulte pelo WhatsApp",

  // Config pública do Supabase (anon key NÃO é segredo — a proteção é o
  // RLS). Enquanto estiver "SUBSTITUIR", o site só usa o WhatsApp.
  supabase: {
    url: "SUBSTITUIR_URL_SUPABASE",
    anonKey: "SUBSTITUIR_ANON_KEY",
  },
};
