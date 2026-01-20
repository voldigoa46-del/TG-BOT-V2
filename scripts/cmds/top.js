const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

const nix = {
  name: "top",
  version: "3.3",
  author: "Christus",
  cooldown: 10,
  role: 0,
  category: "classement",
  description: "Affiche le top 10 Niveau ou Argent avec une carte visuelle.",
  guide: "{p}top rank | {p}top money | {p}top setwall (en répondant à une image)"
};

/* ================= UTILS ================= */

const deltaNext = 5;
function expToLevel(exp) {
  return Math.floor((1 + Math.sqrt(1 + 8 * exp / deltaNext)) / 2);
}

function formatMoney(value) {
  if (value >= 1e15) return (value / 1e15).toFixed(2) + " Qt";
  if (value >= 1e12) return (value / 1e12).toFixed(2) + " T";
  if (value >= 1e9) return (value / 1e9).toFixed(2) + " B";
  if (value >= 1e6) return (value / 1e6).toFixed(2) + " M";
  if (value >= 1e3) return (value / 1e3).toFixed(2) + " k";
  return value.toString();
}

async function fetchAvatar(bot, userId) {
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
    const canvas = createCanvas(100, 100);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#3b0066";
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 50, 50);
    return canvas;
  }
}

/* ================= GÉNÉRATEUR D'IMAGE ================= */

async function drawTopBoard(users, type, bot, wallPath) {
  const W = 1200, H = 1000;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Fond
  if (wallPath && fs.existsSync(wallPath)) {
    const bgImg = await loadImage(wallPath);
    ctx.drawImage(bgImg, 0, 0, W, H);
  } else {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1e1e3f");
    bg.addColorStop(1, "#5c00ff");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  // Titre
  ctx.font = "bold 60px Arial";
  ctx.fillStyle = "#00ffee";
  ctx.textAlign = "center";
  ctx.fillText(type === "rank" ? "CLASSEMENT NIVEAUX" : "CLASSEMENT RICHESSE", W / 2, 80);

  // Podium (Top 3 Simplifié pour l'exemple)
  for (let i = 0; i < Math.min(users.length, 3); i++) {
    const u = users[i];
    const x = [W/2-90, W/2-300, W/2+120][i];
    const y = [140, 220, 220][i];
    const size = [180, 140, 140][i];

    const avatar = await fetchAvatar(bot, u.id);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, x, y, size, size);
    ctx.restore();

    ctx.font = "30px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(u.name.slice(0, 10), x + size/2, y + size + 40);
  }

  const filePath = path.join(__dirname, `top_${Date.now()}.png`);
  fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
  return filePath;
}

/* ================= ENTRÉE PRINCIPALE ================= */

async function onStart({ bot, msg, chatId, args }) {
  const type = args[0]?.toLowerCase();
  const userId = msg.from.id;

  // Gestion du Wallpaper
  if (type === "setwall") {
    if (!msg.reply_to_message || !msg.reply_to_message.photo) {
      return bot.sendMessage(chatId, "❌ Répondez à une image avec /top setwall");
    }
    const fileId = msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1].file_id;
    const fileLink = await bot.getFileLink(fileId);
    const wallPath = path.join(__dirname, `wall_${userId}.jpg`);
    const res = await axios.get(fileLink, { responseType: 'arraybuffer' });
    fs.writeFileSync(wallPath, res.data);
    return bot.sendMessage(chatId, "✅ Fond d'écran mis à jour !");
  }

  if (!["rank", "money"].includes(type)) {
    return bot.sendMessage(chatId, "⚠️ Utilisation : /top rank ou /top money");
  }

  // Simulation de données (à lier avec ta DB balance.json)
  const balances = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'database', 'balance.json'), 'utf8'));
  
  let sorted = Object.keys(balances).map(id => ({
    id: id,
    name: "Joueur", // Il faudrait récupérer le nom via bot.getChatMember
    money: balances[id].money || 0,
    exp: balances[id].exp || 0
  }));

  if (type === "rank") sorted.sort((a, b) => b.exp - a.exp);
  else sorted.sort((a, b) => b.money - a.money);

  sorted = sorted.slice(0, 10);

  const wallPath = path.join(__dirname, `wall_${userId}.jpg`);
  const imagePath = await drawTopBoard(sorted, type, bot, wallPath);

  await bot.sendPhoto(chatId, imagePath, {
    caption: `🏆 Voici le Top 10 ${type === "rank" ? "des niveaux" : "des plus riches"} !`
  });

  fs.unlinkSync(imagePath);
}

module.exports = { nix, onStart };
