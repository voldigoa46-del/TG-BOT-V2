const axios = require("axios");

module.exports = {
  nix: {
    name: "copilot",
    aliases: ["cp", "cop"],
    version: "1.0.0",
    author: "Christus (Nix Port)",
    role: 0,
    category: "AI",
    description: "Discute avec l'intelligence artificielle Copilot.",
    cooldown: 5,
    guide: "{p}copilot [votre message] ou répondez à un message avec {p}copilot"
  },

  async onStart({ bot, msg, chatId, args }) {
    let message = args.join(" ");
    const userId = msg.from.id;

    // Gestion de la réponse à un message (Reply)
    if (!message && msg.reply_to_message) {
      message = msg.reply_to_message.text || "";
    }

    if (!message) {
      return bot.sendMessage(chatId, "❓ Veuillez fournir un message.\n\nExemple : /copilot Bonjour, comment vas-tu ?");
    }

    // Indicateur d'écriture dans Telegram
    bot.sendChatAction(chatId, "typing");

    try {
      const response = await axios.get("https://christus-api.vercel.app/ai/copilot", {
        params: {
          message: message,
          model: "default"
        },
        headers: {
          "Accept": "application/json",
          "User-Agent": "Copilot-AI-Client/1.0"
        }
      });

      if (!response.data || !response.data.answer) {
        return bot.sendMessage(chatId, "❌ Réponse invalide reçue de Copilot AI.");
      }

      const answer = response.data.answer;
      
      // Envoi de la réponse
      await bot.sendMessage(chatId, `🤖 Copilot AI\n\n${answer}\n\nRépondez à ce message pour continuer la conversation.`, {
        reply_to_message_id: msg.message_id
      });

    } catch (err) {
      console.error("Erreur Copilot AI :", err.message);
      bot.sendMessage(chatId, "⚠️ Le service Copilot AI est actuellement indisponible.");
    }
  }
};
