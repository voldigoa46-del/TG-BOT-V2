const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

const nix = {
  name: "pair",
  aliases: ["love", "match", "couple"],
  author: "Christus (Nix Port)",
  version: "1.0",
  role: 0,
  category: "amour",
  description: "Trouve votre partenaire idéal dans le groupe et génère une image.",
  cooldown: 10,
  guide: "{p}pair"
};

async function onStart({ bot, msg, chatId }) {
  try {
    const senderID = msg.from.id;
    const senderName = msg.from.first_name;

    // 1. Récupération des membres du groupe (Telegram)
    // Note : bot.getChatMemberCount et bot.getChat ne donnent pas la liste complète.
    // Pour que cela fonctionne bien, le bot doit avoir accès aux messages récents
    // ou on simule avec les membres actifs si le framework le permet.
    // Ici, on va utiliser une sélection basée sur les derniers participants connus.
    
    // Pour cet exemple, nous allons simuler la recherche de genre ou prendre un membre aléatoire
    // car l'API Telegram Bot classique ne permet pas de lister tous les membres (confidentialité).
    
    // Simulation d'une liste de candidats (en production, cela se base sur votre DB d'utilisateurs actifs)
    const mockMatch = {
      id: 567891234, // ID exemple
      name: "Une âme sœur"
    };

    // 2. Préparation du Canvas
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Chargement du fond romantique
    const background = await loadImage("https://files.catbox.moe/29jl5s.jpg");
    ctx.drawImage(background, 0, 0, width, height);

    // 3. Récupération des Avatars (Logique Telegram)
    const fetchAvatar = async (userId) => {
      try {
        const photos = await bot.getUserProfilePhotos(userId);
        if (photos.total_count > 0) {
          const fileId = photos.photos[0][0].file_id;
          const fileLink = await bot.getFileLink(fileId);
          const res = await axios.get(fileLink, { responseType: "arraybuffer" });
          return await loadImage(Buffer.from(res.data));
        }
        throw new Error();
      } catch (e) {
        // Avatar par défaut si caché ou inexistant
        const fallback = createCanvas(200, 200);
        const fctx = fallback.getContext("2d");
        fctx.fillStyle = "#ff4d4d";
        fctx.fillRect(0, 0, 200, 200);
        return fallback;
      }
    };

    const img1 = await fetchAvatar(senderID);
    // Ici on devrait prendre l'id du match sélectionné
    const img2 = await fetchAvatar(mockMatch.id);

    // Fonction pour dessiner des avatars circulaires
    function drawCircle(ctx, img, x, y, size) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, x, y, size, size);
      ctx.restore();
    }

    drawCircle(ctx, img1, 385, 40, 170);
    drawCircle(ctx, img2, width - 213, 190, 170);

    const filePath = path.join(__dirname, `pair_${senderID}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

    // 4. Message de sortie
    const lovePercent = Math.floor(Math.random() * 31) + 70;
    const message = `💞 MATCH AMOUREUX COMPLÉTÉ 💞\n\n` +
      `🎀 ${senderName} ✨️\n` +
      `🎀 ${mockMatch.name} ✨️\n\n` +
      `🕊️ Le destin a écrit vos noms ensemble 🌹 Que votre lien dure pour toujours ✨️\n\n` +
      `💘 Compatibilité : ${lovePercent}% 💘`;

    await bot.sendPhoto(chatId, filePath, { caption: message });

    // Nettoyage
    fs.unlinkSync(filePath);

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "❌ Une erreur est survenue lors du matchmaking.");
  }
}

module.exports = {
  nix,
  onStart
};
