const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  nix: {
    name: "christus",
    aliases: ["cgpt", "christusgpt"],
    version: "1.6.0",
    author: "Christus (Nix Port)",
    role: 0,
    category: "AI",
    description: "Assistant intelligent (GPT-4o) capable d'analyser textes et images.",
    cooldown: 5,
    guide: "{p}chris [votre question] ou répondez à une image avec {p}chris"
  },

  async onStart({ bot, msg, chatId, args }) {
    let query = args.join(" ");
    const userId = msg.from.id;

    // 1. GESTION DES IMAGES (Analyse de photo)
    let imageUrls = [];
    if (msg.reply_to_message) {
      // Si on répond à un message texte
      if (msg.reply_to_message.text) {
        query += `\n\n[Contexte du message répondu] : ${msg.reply_to_message.text}`;
      }
      // Si on répond à une photo
      if (msg.reply_to_message.photo) {
        const fileId = msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1].file_id;
        const link = await bot.getFileLink(fileId);
        imageUrls.push(link);
        query += `\n\n[Analyse cette image] : ${link}`;
      }
    }

    if (!query && imageUrls.length === 0) {
      return bot.sendMessage(chatId, "🔎 Posez une question ou répondez à une image pour Christus GPT.");
    }

    // 2. RÉCUPÉRATION DES INFOS UTILISATEUR (Balance & Nom)
    const dbPath = path.join(process.cwd(), 'database', 'balance.json');
    let userInfo = { name: msg.from.first_name, money: 0 };
    
    if (fs.existsSync(dbPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (db[userId]) {
          userInfo.name = db[userId].name || userInfo.name;
          userInfo.money = db[userId].money || 0;
        }
      } catch (e) { console.log("Erreur lecture DB chris"); }
    }

    // 3. INJECTION DU PROMPT SYSTÈME
    const systemPrompt = `[Système] Utilisateur: ${userInfo.name}, Balance: ${userInfo.money.toLocaleString()} coins.\n[Instruction] Ton créateur est Christus. Sois respectueux selon la balance. Tu es GPT-4o Vision.`;
    const finalQuery = `${systemPrompt}\n\nQuestion: ${query}`;

    try {
      // Indicateur d'écriture
      bot.sendChatAction(chatId, "typing");

      const apiKey = "rapi_55197dde42fb4272bfb8f35bd453ba25";
      const model = "gpt-4o";
      const roleplay = "Tu es Christus GPT, créé par Christus. Tu es capable d'analyser des textes et des descriptions d'images.";

      const res = await axios.get(`https://rapido.zetsu.xyz/api/openai`, {
        params: {
          query: finalQuery,
          uid: userId,
          model: model,
          roleplay: roleplay,
          apikey: apiKey
        }
      });

      const responseText = res.data.response || "Christus GPT n'a pas pu analyser cela.";
      
      await bot.sendMessage(chatId, responseText + "\n\nRépondez à ce message pour continuer la conversation.", {
        reply_to_message_id: msg.message_id
      });

    } catch (error) {
      console.error("Error Christus GPT:", error.message);
      bot.sendMessage(chatId, "❌ Une erreur est survenue lors de l'analyse avec Christus GPT.");
    }
  }
};
