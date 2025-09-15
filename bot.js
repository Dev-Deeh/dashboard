const TelegramBot = require("node-telegram-bot-api");

// Coloque aqui o token do BotFather
const TOKEN = "Seu token aqui rapeize";

const bot = new TelegramBot(TOKEN, { polling: true });

// Banco de dados em memória
const usuarios = {};

function menuPrincipal() {
  return {
    reply_markup: {
      keyboard: [
        ["📚 Cadastrar Disciplina", "➕ Adicionar Prova"],
        ["📊 Ver Faltas", "💡 Motivacional"],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
}

// ==================== START ====================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  usuarios[chatId] = {
    disciplinas: [], // {nome, professor, sala, horario, intervalo, diaSemana}
    provas: [], // {nome, data, hora}
    faltas: [],
    etapa: null,
    ultimaPergunta: null,
    buffer: {},
  };

  bot.sendMessage(
    chatId,
    "👋 Olá, estudante!\n\n" +
      "Eu sou o Assistente Acadêmico 🤖 que vai te ajudar a organizar suas aulas, provas e intervalos!\n\n" +
      "➡️ Use o menu abaixo para começar:",
    menuPrincipal()
  );
});

// ==================== MENSAGENS ====================
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text.trim();
  const user = usuarios[chatId];
  if (!user) return;

  // ========== MENU ==========
  if (texto === "📚 Cadastrar Disciplina") {
    user.buffer = {};
    user.etapa = "disciplina_nome";
    bot.sendMessage(chatId, "📚 Digite o nome da disciplina:");
    return;
  }

  if (texto === "➕ Adicionar Prova") {
    user.buffer = {};
    user.etapa = "prova_nome";
    bot.sendMessage(chatId, "✏️ Digite o nome da prova:");
    return;
  }

  if (texto === "📊 Ver Faltas") {
    let faltas = "📊 *Suas faltas acumuladas:*\n\n";
    user.disciplinas.forEach((disc, i) => {
      faltas += `• ${disc.nome}: ${user.faltas[i]} faltas\n`;
    });
    bot.sendMessage(chatId, faltas, {
      parse_mode: "Markdown",
      ...menuPrincipal(),
    });
    return;
  }

  if (texto === "💡 Motivacional") {
    const frases = [
      "🌟 Cada aula é um passo rumo ao sucesso!",
      "💪 Você consegue! Continue firme nos estudos!",
      "🚀 O futuro é construído agora, com dedicação.",
      "📚 Estudar hoje é colher conquistas amanhã.",
    ];
    bot.sendMessage(
      chatId,
      frases[Math.floor(Math.random() * frases.length)],
      menuPrincipal()
    );
    return;
  }

  // ========== CADASTRO DISCIPLINA ==========
  if (user.etapa === "disciplina_nome") {
    user.buffer.nome = texto;
    user.etapa = "disciplina_professor";
    bot.sendMessage(chatId, "👨‍🏫 Digite o nome do professor:");
    return;
  }

  if (user.etapa === "disciplina_professor") {
    user.buffer.professor = texto;
    user.etapa = "disciplina_sala";
    bot.sendMessage(chatId, "🏫 Digite a sala da disciplina:");
    return;
  }

  if (user.etapa === "disciplina_sala") {
    user.buffer.sala = texto;
    user.etapa = "disciplina_inicio";
    bot.sendMessage(
      chatId,
      "🕒 Digite o horário de início da aula (ex: 19:00):"
    );
    return;
  }

  if (user.etapa === "disciplina_inicio") {
    const partes = texto.split(":");
    if (partes.length !== 2)
      return bot.sendMessage(chatId, "Formato inválido. Use HH:MM");
    user.buffer.inicio = {
      hora: parseInt(partes[0]),
      minuto: parseInt(partes[1]),
    };
    user.etapa = "disciplina_fim";
    bot.sendMessage(
      chatId,
      "🕒 Digite o horário de término da aula (ex: 22:10):"
    );
    return;
  }

  if (user.etapa === "disciplina_fim") {
    const partes = texto.split(":");
    if (partes.length !== 2)
      return bot.sendMessage(chatId, "Formato inválido. Use HH:MM");
    user.buffer.fim = {
      hora: parseInt(partes[0]),
      minuto: parseInt(partes[1]),
    };
    user.etapa = "disciplina_intervalo";
    bot.sendMessage(chatId, "⏸️ Essa disciplina tem intervalo? (sim/não)");
    return;
  }

  if (user.etapa === "disciplina_intervalo") {
    if (texto.toLowerCase() === "sim") {
      user.etapa = "intervalo_inicio";
      bot.sendMessage(
        chatId,
        "⏸️ Digite o horário de início do intervalo (ex: 20:30):"
      );
    } else {
      user.buffer.intervalo = null;
      user.etapa = "disciplina_dia";
      bot.sendMessage(chatId, "📅 Escolha o dia da semana:", {
        reply_markup: {
          keyboard: [
            ["Segunda", "Terça", "Quarta"],
            ["Quinta", "Sexta", "Sábado"],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
    }
    return;
  }

  if (user.etapa === "intervalo_inicio") {
    const partes = texto.split(":");
    if (partes.length !== 2)
      return bot.sendMessage(chatId, "Formato inválido. Use HH:MM");
    user.buffer.intervalo = {
      inicio: { hora: parseInt(partes[0]), minuto: parseInt(partes[1]) },
      fim: null,
    };
    user.etapa = "intervalo_fim";
    bot.sendMessage(
      chatId,
      "▶️ Digite o horário de término do intervalo (ex: 20:45):"
    );
    return;
  }

  if (user.etapa === "intervalo_fim") {
    const partes = texto.split(":");
    if (partes.length !== 2)
      return bot.sendMessage(chatId, "Formato inválido. Use HH:MM");
    user.buffer.intervalo.fim = {
      hora: parseInt(partes[0]),
      minuto: parseInt(partes[1]),
    };
    user.etapa = "disciplina_dia";
    bot.sendMessage(chatId, "📅 Escolha o dia da semana:", {
      reply_markup: {
        keyboard: [
          ["Segunda", "Terça", "Quarta"],
          ["Quinta", "Sexta", "Sábado"],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
    return;
  }

  if (user.etapa === "disciplina_dia") {
    user.buffer.diaSemana = texto;
    user.disciplinas.push({
      nome: user.buffer.nome,
      professor: user.buffer.professor,
      sala: user.buffer.sala,
      horario: { inicio: user.buffer.inicio, fim: user.buffer.fim },
      intervalo: user.buffer.intervalo,
      diaSemana: texto,
    });
    user.faltas.push(0);
    user.etapa = null;
    bot.sendMessage(
      chatId,
      "✅ Disciplina cadastrada com sucesso!",
      menuPrincipal()
    );
    return;
  }

  // ========== CADASTRO PROVA ==========
  if (user.etapa === "prova_nome") {
    user.buffer.nome = texto;
    user.etapa = "prova_data";
    bot.sendMessage(chatId, "📅 Digite a data da prova (dd/mm/aaaa):");
    return;
  }

  if (user.etapa === "prova_data") {
    user.buffer.data = texto;
    user.etapa = "prova_hora";
    bot.sendMessage(chatId, "🕒 Digite o horário da prova (HH:MM):");
    return;
  }

  if (user.etapa === "prova_hora") {
    const partes = texto.split(":");
    if (partes.length !== 2)
      return bot.sendMessage(chatId, "Formato inválido. Use HH:MM");
    user.buffer.hora = {
      hora: parseInt(partes[0]),
      minuto: parseInt(partes[1]),
    };
    user.provas.push({
      nome: user.buffer.nome,
      data: user.buffer.data,
      hora: user.buffer.hora,
    });
    user.etapa = null;
    bot.sendMessage(
      chatId,
      "✅ Prova cadastrada com sucesso!",
      menuPrincipal()
    );
    return;
  }
});

// ==================== NOTIFICAÇÕES AUTOMÁTICAS ====================
setInterval(() => {
  const agora = new Date();
  const hora = agora.getHours();
  const minuto = agora.getMinutes();
  const hojeStr = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(
    agora
  );

  Object.keys(usuarios).forEach((chatId) => {
    const user = usuarios[chatId];
    if (!user.disciplinas.length) return;

    user.disciplinas.forEach((disc, i) => {
      if (hojeStr.toLowerCase() === disc.diaSemana.toLowerCase()) {
        const hInicio = disc.horario.inicio;
        const hFim = disc.horario.fim;

        // 1h antes da aula
        if (hora === hInicio.hora - 1 && minuto === hInicio.minuto) {
          bot.sendMessage(
            chatId,
            `⏰ Falta 1 hora para sua aula de ${disc.nome} com ${disc.professor} na ${disc.sala}.`
          );
        }

        // Intervalo
        if (disc.intervalo) {
          if (
            hora === disc.intervalo.inicio.hora &&
            minuto === disc.intervalo.inicio.minuto
          ) {
            bot.sendMessage(
              chatId,
              "⏸️ Intervalo! Beba água 💧 e faça um lanche 🍎"
            );
          }
          if (
            hora === disc.intervalo.fim.hora &&
            minuto === disc.intervalo.fim.minuto
          ) {
            bot.sendMessage(
              chatId,
              "▶️ Intervalo acabando, volte para a sala!"
            );
          }
        }

        // Fim da aula
        if (hora === hFim.hora && minuto === hFim.minuto) {
          bot.sendMessage(
            chatId,
            "🌟 Parabéns por concluir mais um dia de estudos!"
          );
        }
      }
    });

    // Provas
    user.provas.forEach((prova) => {
      const [dia, mes, ano] = prova.data.split("/");
      const dataProva = new Date(`${ano}-${mes}-${dia}`);
      if (
        agora.toDateString() === dataProva.toDateString() &&
        hora === prova.hora.hora - 0 &&
        minuto === prova.hora.minuto - 30
      ) {
        bot.sendMessage(
          chatId,
          `📢 Lembrete: Prova de ${prova.nome} hoje às ${
            prova.hora.hora
          }:${prova.hora.minuto.toString().padStart(2, "0")}!`
        );
      }
    });
  });
}, 60000);
