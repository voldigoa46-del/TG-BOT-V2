const axios = require("axios");

const baseApiUrl = "https://www.noobs-api.rf.gd/dipto";

const nix = {
  name: "spy",
  aliases: ["hackerspy"],
  version: "1.2",
  role: 0,
  author: "Christus",
  description: "Get user information and profile photo",
  category: "information",
  cooldown: 10,
  guide: "/spy [user_id|profile_link|reply|mention]",
};

async function onStart({ bot, message, chatId, args }) {
  try {
    // User id from argument, mention, or reply
    let uid = null;

    // Telegram: check if message is reply
    if (message.reply_to_message) {
      uid = message.reply_to_message.from.id.toString();
    } else if (args.length > 0) {
      const arg = args[0];
      // Check if arg is plain user id (number)
      if (/^\d+$/.test(arg)) {
        uid = arg;
      } else {
        // Try to extract from URL pattern: profile.php?id=123
        const match = arg.match(/profile\.php\?id=(\d+)/);
        if (match) uid = match[1];
      }
    } else if (message.entities) {
      // Telegram mentions (like @username) are more complex to resolve; skip for now
    }

    // If still no uid, fallback to sender (self info)
    if (!uid) {
      uid = message.from.id.toString();
    }

    // Fetch baby data (some remote API, safely)
    let babyTeach = 0;
    try {
      const resp = await axios.get(`${baseApiUrl}/baby?list=all`);
      const dataa = resp?.data || {};
      babyTeach =
        dataa?.teacher?.teacherList?.find((t) => t?.[uid])?.[uid] || 0;
    } catch {
      babyTeach = 0;
    }

    // Fetch user info from Telegram API - simulated as Telegram does not provide full info like Facebook
    // So here, we'll just prepare basic info from message.from or fallback
    // (Your environment might have extended user data — adapt if yes)
    const userInfo = {
      name: `${message.from.first_name || ""} ${message.from.last_name || ""}`.trim() || "Unknown",
      username: message.from.username || "Not set",
      id: uid,
      is_bot: message.from.is_bot || false,
      language_code: message.from.language_code || "unknown",
    };

    // Avatar URL: Telegram profile photos require API calls; simulate fallback
    let avatarUrl = `https://api.telegram.org/file/bot<YOUR_BOT_TOKEN>/photos/${uid}.jpg`;
    // For demo, fallback to placeholder
    avatarUrl = "https://i.imgur.com/TPHk4Qu.png";

    // Gender unknown in Telegram, mark neutral
    const genderText = "⚧️ Unknown";

    // Format current date/time in UTC (no Africa/Abidjan in Telegram)
    const now = new Date();
    const reportDate = now.toISOString().replace("T", " ").split(".")[0] + " UTC";

    // Compose info message (simple for Telegram)
    const userInformation = [
      "𝐒𝐏𝐘",
      "━━━━━━━━━━━━",
      "",
      "👤 𝐏𝐄𝐑𝐒𝐎𝐍𝐀𝐋 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍",
      `📝 𝖥𝗎𝗅𝗅 𝖭𝖺𝗆𝖾: ${userInfo.name}`,
      `🆔 𝖴𝗌𝖾𝗋 𝖨𝖣: ${userInfo.id}`,
      `⚧️ 𝖦𝖾𝗇𝖽𝖾𝗋: ${genderText}`,
      `🔗 𝖴𝗌𝖾𝗋𝗇𝖺𝗆𝖾: ${userInfo.username}`,
      `🤖 𝖨𝗌 𝖡𝗈𝗍: ${userInfo.is_bot ? "✅ Yes" : "❌ No"}`,
      `🕐 𝖳𝗂𝗆𝖾 𝖱𝖾𝗉𝗈𝗋𝗍𝖾𝖽: ${reportDate}`,
      "",
      "ℹ️ *Note:* Telegram API limits detailed user info; this is basic public info.",
    ].join("\n");

    // Send reply with avatar (from URL)
    await bot.sendPhoto(chatId, avatarUrl, {
      caption: userInformation,
      parse_mode: "Markdown",
      reply_to_message_id: message.message_id,
    });

  } catch (err) {
    console.error("SPY command error:", err);
    await message.reply("❌ An error occurred while fetching user info.");
  }
}

module.exports = { nix, onStart };

// Helper for name splitting if needed
function extractFirstName(full) {
  if (!full) return "Unknown";
  const parts = String(full).trim().split(/\s+/);
  return parts[0] || "Unknown";
}
function extractLastName(full) {
  if (!full) return "";
  const parts = String(full).trim().split(/\s+/);
  return parts.slice(1).join(" ") || "";
}
function formatMoney(num) {
  num = Number(num) || 0;
  const units = ["", "K", "M", "B", "T"];
  let unit = 0;
  while (num >= 1000 && unit < units.length - 1) {
    num /= 1000;
    unit++;
  }
  return (Math.round(num * 10) / 10).toString().replace(/\.0$/, "") + units[unit];
  }
