const axios = require("axios");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

module.exports = {
  nix: {
    name: "xnx",
    aliases: ["xnxx"],
    version: "1.0.0",
    author: "Christus",
    role: 2, // Limité aux admins/rôles élevés
    category: "média",
    description: "Recherche et télécharge des vidéos via XNX.",
    cooldown: 10,
    guide: "{p}xnx [mots-clés]"
  },

  async onStart({ bot, msg, chatId, args }) {
    const query = args.join(" ");

    if (!query) {
      return bot.sendMessage(chatId, "❌ Veuillez fournir un mot-clé pour la recherche.");
    }

    try {
      // 1. Récupération de l'API Base
      const apiConfigRes = await axios.get("https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json");
      const apiBase = apiConfigRes.data.api;

      const waitMsg = await bot.sendMessage(chatId, "🔍 Recherche en cours sur XNX...");

      // 2. Recherche des vidéos
      const searchRes = await axios.get(`${apiBase}/xnx?q=${encodeURIComponent(query)}`);
      const videos = searchRes.data.result;

      if (!videos || videos.length === 0) {
        return bot.editMessageText("❌ Aucun résultat trouvé pour cette recherche.", {
          chat_id: chatId,
          message_id: waitMsg.message_id
        });
      }

      // On prend la première vidéo trouvée
      const selectedVideo = videos[0];
      const time = moment().tz("Africa/Abidjan").format("HH:mm:ss");

      bot.editMessageText(`⏳ Téléchargement de la vidéo...\n🎬 Titre : ${selectedVideo.title}\n⏱️ Durée : ${selectedVideo.duration || "inconnue"}\n⌚ Heure : ${time}`, {
        chat_id: chatId,
        message_id: waitMsg.message_id
      });

      // 3. Récupération du lien de téléchargement (Download)
      const downloadRes = await axios.get(`${apiBase}/xnxdl?url=${encodeURIComponent(selectedVideo.link)}`);
      const fileUrl = downloadRes.data?.result?.files?.high || downloadRes.data?.result?.files?.low;

      if (!fileUrl) {
        throw new Error("Impossible de récupérer le fichier vidéo.");
      }

      // 4. Téléchargement local temporaire
      const filePath = path.join(__dirname, `xnx_${Date.now()}.mp4`);
      const writer = fs.createWriteStream(filePath);
      const response = await axios({ url: fileUrl, responseType: "stream" });

      response.data.pipe(writer);

      writer.on("finish", async () => {
        try {
          // 5. Envoi du fichier sur Telegram
          await bot.sendVideo(chatId, filePath, {
            caption: `✅ Vidéo chargée : ${selectedVideo.title}`
          });

          bot.deleteMessage(chatId, waitMsg.message_id);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          bot.sendMessage(chatId, "❌ Erreur lors de l'envoi de la vidéo (trop lourde ?).");
        }
      });

      writer.on("error", () => {
        bot.sendMessage(chatId, "❌ Erreur pendant l'écriture du fichier.");
      });

    } catch (error) {
      console.error("Erreur XNX:", error.message);
      bot.sendMessage(chatId, "❌ Une erreur est survenue lors de la recherche ou du téléchargement.");
    }
  }
};
