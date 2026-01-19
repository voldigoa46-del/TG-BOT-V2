const axios = require("axios");
const fs = require("fs");
const path = require("path");

const nix = {
  name: "lyrics",
  aliases: ["lyric", "songtext"],
  version: "1.2.0",
  author: "Christus dev AI",
  cooldown: 5,
  role: 0,
  prefix: true,
  category: "search",
  description: "Retrieve song lyrics with artist and artwork",
  guide: "{p}lyrics <song name>\nExample: {p}lyrics apt",
};

const UNISpectra = {
  charm: "✨",
  standardLine: "━━━━━━━━━━━━━━━━━━━━",
};

async function onStart({ bot, message, msg, chatId, args }) {
  const query = args.join(" ").trim();
  if (!query) return message.reply("⚠️ Please provide a song name.\nExample: lyrics apt");

  try {
    const { data } = await axios.get(
      `https://lyricstx.vercel.app/youtube/lyrics?title=${encodeURIComponent(query)}`
    );

    if (!data?.lyrics) return message.reply("❌ Lyrics not found.");

    const formatLyrics = (d) =>
      `${UNISpectra.charm} Lyrics Transmission
${UNISpectra.standardLine}
🎼 Title   : ${d.track_name}
👤 Artist  : ${d.artist_name}
${UNISpectra.standardLine}

${d.lyrics}

${UNISpectra.standardLine}
${UNISpectra.charm} ChristusBot 🌌`;

    const imagePath = path.join(__dirname, `lyrics_${Date.now()}.jpg`);

    try {
      const imgRes = await axios.get(data.artwork_url, { responseType: "stream" });
      const writer = fs.createWriteStream(imagePath);
      imgRes.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await bot.sendMessage(chatId, {
        body: formatLyrics(data),
        attachment: fs.createReadStream(imagePath),
        reply_to_message_id: msg.message_id,
      });

      fs.unlinkSync(imagePath);
    } catch {
      // fallback sans image
      await bot.sendMessage(chatId, {
        body: formatLyrics(data),
        reply_to_message_id: msg.message_id,
      });
    }
  } catch (err) {
    console.error("Lyrics Error:", err);
    await bot.sendMessage(chatId, {
      body: "❌ Error: Could not fetch lyrics.",
      reply_to_message_id: msg.message_id,
    });
  }
}

module.exports = {
  nix,
  onStart,
};
