const yts = require("yt-search");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_DL = "http://65.109.80.126:20409/aryan/yx";

const nix = {
  name: "youtube",
  aliases: ["ytb"],
  version: "1.0",
  description: "Search and download YouTube videos or audio",
  author: "Christus",
  prefix: false,
  cooldown: 5,
  type: "anyone",
  category: "media",
  guide: "{p}ytb -v <query>\n{p}ytb -a <query>",
};

/* ============================ */
/*   DOWNLOAD FUNCTION          */
/* ============================ */

async function downloadFromAPI(url, type, bot, chatId, replyId) {
  try {
    const { data } = await axios.get(
      `${API_DL}?url=${encodeURIComponent(url)}&type=${type}`
    );

    if (!data.status || !data.download_url) throw new Error("API failed");

    const filePath = path.join(__dirname, `yt_${Date.now()}.${type}`);
    const write = fs.createWriteStream(filePath);

    const dl = await axios({
      url: data.download_url,
      responseType: "stream",
    });

    dl.data.pipe(write);

    await new Promise((resolve, reject) => {
      write.on("finish", resolve);
      write.on("error", reject);
    });

    await bot.sendDocument(chatId, filePath, {
      caption: `Downloaded ${type.toUpperCase()}`,
      reply_to_message_id: replyId
    });

    fs.unlinkSync(filePath);

  } catch (err) {
    console.error("Download error:", err);
    bot.sendMessage(chatId, "❌ Failed to download file.");
  }
}

/* ============================ */
/*       MAIN COMMAND           */
/* ============================ */

async function onStart({ bot, message, chatId, args }) {
  const type = args[0]; // -v or -a

  if (!["-v", "-a"].includes(type)) {
    return message.reply("❌ Usage: /ytb [-v | -a] <query or URL>");
  }

  const query = args.slice(1).join(" ");
  if (!query) return message.reply("❌ Provide a search keyword or URL.");

  // If it's a URL → direct download
  if (query.startsWith("http")) {
    return downloadFromAPI(query, type === "-v" ? "mp4" : "mp3", bot, chatId, message.message_id);
  }

  // Search YouTube
  try {
    const search = await yts(query);
    const results = search.videos.slice(0, 6);

    if (results.length === 0) return message.reply("❌ No results found.");

    let text = "🎬 *Search Results*\nReply with a number (1–6):\n\n";
    const thumbs = [];

    results.forEach((v, i) => {
      text += `*${i + 1}.* ${v.title}\nDuration: ${v.timestamp}\n\n`;
      thumbs.push(v.thumbnail);
    });

    // Load images as streams
    const streams = await Promise.all(
      thumbs.map(url =>
        axios({ url, responseType: "stream" }).then(res => res.data)
      )
    );

    const sent = await bot.sendMediaGroup(
      chatId,
      streams.map((stream, i) => ({
        type: "photo",
        media: { source: stream },
        caption: i === 0 ? text : undefined,
      }))
    );

    // Save reply handler
    global.replyHandlers ??= new Map();

    global.replyHandlers.set(chatId, {
      type,
      results,
      messageId: sent[0].message_id,
      user: message.from.id
    });

  } catch (err) {
    console.error(err);
    message.reply("❌ YouTube search failed.");
  }
}

/* ============================ */
/*        REPLY HANDLER         */
/* ============================ */

async function onReply({ bot, message, chatId }) {
  const data = global.replyHandlers?.get(chatId);
  if (!data) return;

  // Only accept reply from original user
  if (message.from.id !== data.user) return;

  const choice = parseInt(message.text.trim());
  if (isNaN(choice) || choice < 1 || choice > data.results.length) {
    return message.reply("❌ Choose a number 1–6.");
  }

  const selected = data.results[choice - 1];

  await bot.sendMessage(chatId, "⏳ Downloading…");
  await downloadFromAPI(
    selected.url,
    data.type === "-v" ? "mp4" : "mp3",
    bot,
    chatId,
    message.message_id
  );

  global.replyHandlers.delete(chatId);
}

module.exports = { nix, onStart, onReply };
