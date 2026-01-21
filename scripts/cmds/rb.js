const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  nix: {
    name: "booru",
    aliases: ["rb", "realbooru"],
    version: "1.1.0",
    author: "Christus",
    role: 0,
    category: "image",
    description: "Récupère des images depuis RealBooru via l'API Christus.",
    cooldown: 5,
    guide: "{p}booru [mot-clé]"
  },

  async onStart({ bot, msg, chatId, args }) {
    const query = args.join(" ") || "1girl";
    const apiUrl = `https://christus-api.vercel.app/nsfw/RealBooru?query=${encodeURIComponent(query)}&limit=5`;

    try {
      const waitMsg = await bot.sendMessage(chatId, "🔍 Recherche en cours sur RealBooru...");

      const response = await axios.get(apiUrl);
      const data = response.data;

      // Vérification selon ta nouvelle structure JSON (data.results)
      if (!data.status || !data.results || data.results.length === 0) {
        return bot.editMessageText("❌ Aucune image trouvée pour cette recherche.", {
          chat_id: chatId,
          message_id: waitMsg.message_id
        });
      }

      const mediaGroup = [];
      const tempFiles = [];

      // On boucle sur data.results
      for (let i = 0; i < data.results.length; i++) {
        const item = data.results[i];
        const imageUrl = item.imageUrl;
        const filePath = path.join(__dirname, `booru_${msg.from.id}_${i}.jpg`);
        
        try {
          const res = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          fs.writeFileSync(filePath, res.data);
          
          mediaGroup.push({
            type: 'photo',
            media: fs.createReadStream(filePath),
            // On affiche un petit résumé des tags en légende sur la première image
            caption: i === 0 ? `🖼️ Résultats pour : ${query}\n📌 Source : RealBooru` : ""
          });
          
          tempFiles.push(filePath);
        } catch (e) {
          console.error(`Erreur image ${i}:`, e.message);
        }
      }

      if (mediaGroup.length > 0) {
        await bot.sendMediaGroup(chatId, mediaGroup);
        bot.deleteMessage(chatId, waitMsg.message_id);
      } else {
        bot.editMessageText("❌ Impossible de charger les fichiers images.", {
          chat_id: chatId,
          message_id: waitMsg.message_id
        });
      }

      // Nettoyage sécurisé
      setTimeout(() => {
        tempFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
      }, 10000);

    } catch (error) {
      console.error("Erreur API Booru:", error);
      bot.sendMessage(chatId, "❌ Une erreur est survenue lors de la connexion à l'API.");
    }
  }
};
