const axios = require("axios");
const fs = require("fs");
const path = require("path");

const nix = {
  name: "autodl",
  author: "Christus dev AI / Nix Adapt",
  version: "3.0.3",
  description: "Auto-téléchargeur de médias (YT, TikTok, FB, etc.)",
  usage: "Envoyez simplement un lien ou /autodl <lien>",
  admin: false,
  category: "Media",
  prefix: false,
};

// Fonction pour télécharger proprement le flux
async function downloadFile(url, filepath) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
    timeout: 60000,
  });
  const writer = fs.createWriteStream(filepath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function handleDownload(url, bot, chatId, message) {
  const supportedRegex = /(facebook\.com|fb\.watch|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|spotify\.com)/i;
  if (!supportedRegex.test(url)) return;

  try {
    const apiUrl = `https://downvid.onrender.com/api/download?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl);

    if (!data || data.status !== "success") return;

    const mediaData = data?.data?.data || {};
    const videoUrl = data.video || mediaData.nowm || data.data?.video;
    const audioUrl = data.audio || data.data?.audio;
    
    const isSpotify = /spotify\.com/i.test(url);
    const cacheFolder = path.join(__dirname, "tmp");
    if (!fs.existsSync(cacheFolder)) fs.mkdirSync(cacheFolder);

    if (isSpotify && audioUrl) {
      const audioPath = path.join(cacheFolder, `audio_${Date.now()}.mp3`);
      await downloadFile(audioUrl, audioPath);
      await bot.sendAudio(chatId, audioPath, { caption: `🎵 ${mediaData.title || "Spotify"}` });
      fs.unlinkSync(audioPath);
    } 
    else if (videoUrl) {
      const videoPath = path.join(cacheFolder, `video_${Date.now()}.mp4`);
      await downloadFile(videoUrl, videoPath);
      await bot.sendVideo(chatId, videoPath, { 
        caption: `✅ **Titre :** ${mediaData.title || "Vidéo"}\n⏱️ **Durée :** ${data.duration || "N/A"}` 
      });
      fs.unlinkSync(videoPath);
    }
  } catch (err) {
    console.error("Autodl Error:", err.message);
  }
}

async function onStart({ bot, message, chatId, args, event }) {
  const body = event?.body || message?.text || "";
  const match = body.match(/https?:\/\/\S+/i);

  if (match) {
    await handleDownload(match[0], bot, chatId, message);
  } else {
    message.reply("📌 Envoyez un lien valide pour le télécharger.");
  }
}

// Pour l'écoute automatique des messages dans le chat
async function onChat({ bot, chatId, message, event }) {
  const body = event?.body || message?.text || "";
  const match = body.match(/https?:\/\/\S+/i);
  if (match) {
    await handleDownload(match[0], bot, chatId, message);
  }
}

module.exports = { nix, onStart, onChat };
