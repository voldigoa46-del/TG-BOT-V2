const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");
const { v4: uuidv4 } = require("uuid");

/* ================= CONFIG ================= */

const API_ENDPOINT = "https://shizuai.vercel.app/chat";
const CLEAR_ENDPOINT = "https://shizuai.vercel.app/chat/clear";
const TMP_DIR = path.join(__dirname, "cache");

/* ================= NIX META ================= */

const nix = {
  name: "ai",
  version: "3.0.1",
  aliases: ["shizu"],
  description: "Advanced AI (text, image, music, video, lyrics)",
  author: "Aryan Chauchan • fixed by Christus",
  prefix: false,
  category: "ai",
  type: "anyone",
  cooldown: 3,
  guide: "{p}ai <message | image>\n{p}ai reset",
};

/* ================= UTILS ================= */

async function download(url, ext) {
  await fs.ensureDir(TMP_DIR);
  const filePath = path.join(TMP_DIR, `${uuidv4()}.${ext}`);
  const res = await axios.get(url, { responseType: "arraybuffer" });
  await fs.writeFile(filePath, res.data);
  return filePath;
}

function normalizeText(text) {
  if (!text) return text;
  return text
    .replace(/Aryan\s*Chauchan/gi, "Christus")
    .replace(/Aryan\s*Chauhan/gi, "Christus")
    .replace(/A\.?\s*Chauchan/gi, "Christus");
}

/* ================= COMMAND ================= */

async function onStart({ bot, message, chatId, args, event }) {
  const input = args.join(" ").trim();
  const userId = event?.senderID || chatId;

  if (!input && !event?.attachments?.length && !event?.messageReply?.attachments?.length) {
    return message.reply("💬 Please provide a message or an image.");
  }

  /* ===== RESET ===== */

  if (["reset", "clear"].includes(input.toLowerCase())) {
    try {
      await axios.delete(`${CLEAR_ENDPOINT}/${encodeURIComponent(userId)}`);
      return message.reply("♻️ Conversation reset successfully.");
    } catch {
      return message.reply("❌ Failed to reset conversation.");
    }
  }

  const timestamp = moment()
    .tz("Asia/Manila")
    .format("MMMM D, YYYY h:mm A");

  const waitMsg = await message.reply(
    `🤖 AI is thinking...\n━━━━━━━━━━━━━━━\n📅 ${timestamp}`
  );

  /* ===== IMAGE DETECTION (SAFE) ===== */

  let imageUrl = null;

  // Image envoyée directement
  if (event?.attachments?.length) {
    const img = event.attachments.find(a => a.type === "photo");
    if (img?.url) imageUrl = img.url;
  }

  // Image en réponse à un message
  if (!imageUrl && event?.messageReply?.attachments?.length) {
    const img = event.messageReply.attachments.find(a => a.type === "photo");
    if (img?.url) imageUrl = img.url;
  }

  const createdFiles = [];

  try {
    const res = await axios.post(API_ENDPOINT, {
      uid: userId,
      message: input || "",
      image_url: imageUrl || null,
    });

    const {
      reply,
      image_url,
      music_data,
      video_data,
      shoti_data,
      lyrics_data,
    } = res.data;

    let text = normalizeText(reply || "✅ AI Response");
    const attachments = [];

    if (image_url) {
      const file = await download(image_url, "jpg");
      attachments.push({ type: "photo", path: file });
      createdFiles.push(file);
    }

    if (music_data?.downloadUrl) {
      const file = await download(music_data.downloadUrl, "mp3");
      attachments.push({ type: "audio", path: file });
      createdFiles.push(file);
    }

    if (video_data?.downloadUrl || shoti_data?.downloadUrl) {
      const url = video_data?.downloadUrl || shoti_data?.downloadUrl;
      const file = await download(url, "mp4");
      attachments.push({ type: "video", path: file });
      createdFiles.push(file);
    }

    if (lyrics_data?.lyrics) {
      text += `\n\n🎵 ${lyrics_data.track_name}\n${normalizeText(
        lyrics_data.lyrics.slice(0, 1500)
      )}`;
    }

    await bot.deleteMessage(chatId, waitMsg.message_id);

    if (attachments.length) {
      for (const media of attachments) {
        if (media.type === "photo") {
          await bot.sendPhoto(chatId, fs.createReadStream(media.path), {
            caption: text,
          });
        } else if (media.type === "audio") {
          await bot.sendAudio(chatId, fs.createReadStream(media.path), {
            caption: text,
          });
        } else {
          await bot.sendVideo(chatId, fs.createReadStream(media.path), {
            caption: text,
          });
        }
      }
    } else {
      await message.reply(text);
    }

  } catch (err) {
    console.error("AI Command Error:", err);
    await bot.editMessageText("❌ An AI error occurred.", {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  } finally {
    for (const file of createdFiles) {
      if (await fs.pathExists(file)) {
        await fs.remove(file);
      }
    }
  }
}

module.exports = { nix, onStart };
