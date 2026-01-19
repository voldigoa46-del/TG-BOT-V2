const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

/* ================= CONFIG ================= */

const PIN_API = "https://egret-driving-cattle.ngrok-free.app/api/pin";
const CACHE_DIR = path.join(__dirname, "cache", "pinterest");

/* ================= NIX META ================= */

const nix = {
  name: "pinterest",
  version: "1.1.0",
  aliases: ["pin"],
  description: "Search and download images from Pinterest",
  author: "Christus",
  prefix: false,
  category: "media",
  type: "anyone",
  cooldown: 10,
  guide: "{p}pinterest <query> -<count>\nExample: {p}pinterest cat -10",
};

/* ================= COMMAND ================= */

async function onStart({ bot, message, msg, chatId, args }) {
  try {
    const input = args.join(" ").trim();

    if (!input) {
      return message.reply("❌ Please provide a search query.");
    }

    /* ===== PARSE QUERY & COUNT ===== */

    let query = input;
    let count = 6;

    const match = input.match(/(.+?)(?:\s*-\s*(\d+))?$/);
    if (match) {
      query = match[1].trim();
      if (match[2]) count = parseInt(match[2], 10);
    }

    if (count > 20) count = 20;
    if (count < 1) count = 1;

    const waitMsg = await message.reply(
      `📌 Searching Pinterest...\n━━━━━━━━━━━━━━━\n🔍 Query: ${query}\n🖼️ Images: ${count}`
    );

    /* ===== API CALL ===== */

    const { data } = await axios.get(
      `${PIN_API}?query=${encodeURIComponent(query)}&num=${count}`
    );

    const urls = data?.results || [];

    if (!urls.length) {
      await bot.deleteMessage(chatId, waitMsg.message_id);
      return message.reply(`❌ No images found for "${query}".`);
    }

    /* ===== DOWNLOAD IMAGES ===== */

    await fs.ensureDir(CACHE_DIR);
    const paths = [];

    for (let i = 0; i < Math.min(count, urls.length); i++) {
      try {
        const imgPath = path.join(
          CACHE_DIR,
          `${chatId}_${Date.now()}_${i}.jpg`
        );

        const res = await axios.get(urls[i], {
          responseType: "arraybuffer",
        });

        await fs.writeFile(imgPath, res.data);
        paths.push(imgPath);
      } catch {}
    }

    if (!paths.length) {
      await bot.deleteMessage(chatId, waitMsg.message_id);
      return message.reply("❌ Failed to download images.");
    }

    /* ===== SEND MEDIA GROUP ===== */

    const media = paths.map((p) => ({
      type: "photo",
      media: fs.createReadStream(p),
    }));

    await bot.deleteMessage(chatId, waitMsg.message_id);

    await bot.sendMediaGroup(chatId, media, {
      reply_to_message_id: msg.message_id,
    });

    await bot.sendMessage(
      chatId,
      `📌 Pinterest Results\n━━━━━━━━━━━━━━━\n🔍 Query: ${query}\n🖼️ Images sent: ${media.length}`,
      { reply_to_message_id: msg.message_id }
    );

    /* ===== CLEANUP ===== */

    await fs.remove(CACHE_DIR);

  } catch (err) {
    console.error("Pinterest Error:", err);
    return message.reply("⚠️ An error occurred while fetching Pinterest images.");
  }
}

module.exports = { nix, onStart };
