const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  nix: {
    name: "midjourney",
    aliases: ["mj"],
    version: "1.0.0",
    author: "Christus",
    role: 0,
    category: "AI-Image",
    description: "Génère 4 images via Midjourney. Répondez avec U1-U4 pour choisir.",
    cooldown: 20,
    guide: "{p}midjourney [votre prompt]"
  },

  async onStart({ bot, msg, chatId, args }) {
    const prompt = args.join(" ").trim();
    if (!prompt) {
      return bot.sendMessage(chatId, "❌ Veuillez fournir un prompt pour générer une image.");
    }

    const waitMsg = await bot.sendMessage(chatId, "⏳ Génération des images Midjourney en cours, veuillez patienter...");

    try {
      const API_ENDPOINT = "https://dev.oculux.xyz/api/mj-proxy-pub";
      const { data } = await axios.get(`${API_ENDPOINT}?prompt=${encodeURIComponent(prompt)}&usepolling=false`, { timeout: 300000 });

      if (!data || data.status === "failed" || !Array.isArray(data.results) || data.results.length < 4) {
        throw new Error(data?.message || "Données invalides reçues de l'API");
      }

      const imageUrls = data.results.slice(0, 4);
      const mediaGroup = [];
      const tempPaths = [];

      // Téléchargement des 4 images
      for (let i = 0; i < imageUrls.length; i++) {
        const filePath = path.join(__dirname, `mj_${msg.from.id}_${i}.jpg`);
        const res = await axios.get(imageUrls[i], { responseType: 'arraybuffer' });
        fs.writeFileSync(filePath, Buffer.from(res.data));
        
        mediaGroup.push({
          type: 'photo',
          media: fs.createReadStream(filePath),
          caption: i === 0 ? `✨ Images Midjourney pour : ${prompt}\n\nRépondez à ce message avec U1, U2, U3 ou U4 pour obtenir une image précise.` : ""
        });
        tempPaths.push(filePath);
      }

      // Envoi de l'album
      await bot.sendMediaGroup(chatId, mediaGroup);
      bot.deleteMessage(chatId, waitMsg.message_id);

      // Nettoyage après envoi
      setTimeout(() => {
        tempPaths.forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
      }, 5000);

    } catch (err) {
      console.error("MJ Error:", err);
      bot.sendMessage(chatId, `❌ Échec de la génération : ${err.message}`);
    }
  },

  // Logique pour gérer la réponse (U1-U4)
  async onReply({ bot, msg, chatId, Reply }) {
    const text = msg.text.trim().toUpperCase();
    const match = text.match(/^U([1-4])$/);
    
    if (!match) return; // Si ce n'est pas U1-U4, on ignore

    // Note : Cette partie nécessite que ton framework Nix stocke les URLs dans l'objet Reply
    // Si ton framework ne supporte pas onReply nativement, ignore cette partie.
    const index = parseInt(match[1]) - 1;
    bot.sendMessage(chatId, `⏳ Traitement de l'image ${match[1]}...`);
    
    // Logique simplifiée pour cette version : l'utilisateur devra relancer ou le bot 
    // peut être configuré pour stocker les sessions.
  }
};
