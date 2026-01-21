const axios = require("axios");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

module.exports = {
  nix: {
    name: "ghibli",
    aliases: ["ghibliart", "ghiblistyle"],
    version: "1.0.0",
    author: "Christus",
    role: 0,
    category: "générateur",
    description: "Transforme une image en style Studio Ghibli via IA.",
    cooldown: 10,
    guide: "{p}ghibli (en répondant à une image) ou {p}ghibli [lien]"
  },

  async onStart({ bot, msg, chatId, args }) {
    try {
      let imageUrl;

      // 1. Vérifier si on répond à une photo
      if (msg.reply_to_message && msg.reply_to_message.photo) {
        const fileId = msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1].file_id;
        imageUrl = await bot.getFileLink(fileId);
      } 
      // 2. Sinon vérifier si un lien est fourni en argument
      else if (args[0] && args[0].startsWith("http")) {
        imageUrl = args[0];
      }

      if (!imageUrl) {
        return bot.sendMessage(chatId, "⚠️ Veuillez répondre à une photo ou fournir un lien d'image direct.");
      }

      // Message de chargement
      const timestamp = moment().tz("Africa/Abidjan").format("HH:mm:ss");
      const waitMsg = await bot.sendMessage(chatId, `🎬 Transformation en style Studio Ghibli...\n⏳ Veuillez patienter... (Début : ${timestamp})`);

      // 3. Appel à l'API
      const apiUrl = `https://estapis.onrender.com/api/ai/img2img/ghibli/v12?imageUrl=${encodeURIComponent(imageUrl)}`;
      const res = await axios.get(apiUrl);

      if (!res.data || !res.data.url) {
        return bot.sendMessage(chatId, "❌ L'API n'a pas pu générer l'image. L'image est peut-être trop lourde ou invalide.");
      }

      const generatedUrl = res.data.url;
      const imgPath = path.join(__dirname, `ghibli_${Date.now()}.png`);

      // 4. Téléchargement de l'image résultante
      const imgRes = await axios.get(generatedUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(imgPath, Buffer.from(imgRes.data));

      // 5. Envoi de l'image
      await bot.sendPhoto(chatId, imgPath, {
        caption: "✅ Voici votre image transformée en style Studio Ghibli !"
      });

      // Nettoyage
      bot.deleteMessage(chatId, waitMsg.message_id);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

    } catch (error) {
      console.error("Erreur Ghibli AI:", error);
      bot.sendMessage(chatId, "❌ Une erreur est survenue lors de la transformation Ghibli.");
    }
  }
};
