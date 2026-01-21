const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  nix: {
    name: "drawgenix",
    aliases: ["draw", "genix", "aiart"],
    version: "1.0.0",
    author: "RIFAT / Christus (Nix Port)",
    role: 0,
    category: "AI",
    description: "Génère des images par IA à partir d'un texte.",
    cooldown: 10,
    guide: "{p}drawgenix [votre texte] --[modèle optionnel]"
  },

  async onStart({ bot, msg, chatId, args }) {
    if (!args.length) {
      return bot.sendMessage(chatId, "❌ Veuillez fournir un texte pour générer une image.");
    }

    let prompt = args.join(" ");
    let model = "";

    // Détection du modèle (ex: --v3 ou --anime)
    const modelMatch = prompt.match(/--(\w+)/);
    if (modelMatch) {
      model = modelMatch[1];
      prompt = prompt.replace(`--${model}`, "").trim();
    }

    const waitMsg = await bot.sendMessage(chatId, `🎨 Génération de l'image en cours...\n📌 Prompt : ${prompt}\n🧠 Modèle : ${model || "par défaut"}`);

    try {
      // Construction de l'URL de l'API
      const apiUrl = `https://mj-s6wm.onrender.com/draw?prompt=${encodeURIComponent(prompt)}${model ? `&model=${model}` : ""}`;

      const { data } = await axios.get(apiUrl);
      const images = data?.images;

      if (!images || !Array.isArray(images) || images.length === 0) {
        throw new Error("Aucune image retournée par l'API.");
      }

      // Téléchargement de l'image
      const imageUrl = images[0];
      const filePath = path.join(__dirname, `draw_${Date.now()}.png`);
      const res = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(filePath, Buffer.from(res.data));

      // Envoi du résultat
      await bot.sendPhoto(chatId, filePath, {
        caption: `✅ Image générée avec succès !\nPrompt : ${prompt}`
      });

      // Nettoyage
      bot.deleteMessage(chatId, waitMsg.message_id);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    } catch (err) {
      console.error("Drawgenix Error:", err);
      bot.editMessageText("❌ Échec de la génération de l'image. L'API est peut-être hors ligne.", {
        chat_id: chatId,
        message_id: waitMsg.message_id
      });
    }
  }
};
