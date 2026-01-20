const axios = require('axios');

module.exports = {
  nix: {
    name: "help",
    aliases: ["menu", "aide", "h"],
    version: "1.5.0",
    author: "ArYAN (Nix Port)",
    role: 0,
    category: "utilitaire",
    description: "Affiche le menu d'aide avec votre photo de profil.",
    guide: "{p}help [nom de commande]"
  },

  async onStart({ bot, msg, chatId, args }) {
    const userId = msg.from.id;
    const userName = msg.from.first_name;
    const prefix = "/";

    if (!global.teamnix || !global.teamnix.cmds) {
      return bot.sendMessage(chatId, "❌ Erreur : Système de commandes non chargé.");
    }

    const commands = global.teamnix.cmds;

    // --- LOGIQUE DE RÉCUPÉRATION DE L'AVATAR ---
    let avatarUrl = null;
    try {
      const photos = await bot.getUserProfilePhotos(userId);
      if (photos.total_count > 0) {
        const fileId = photos.photos[0][0].file_id;
        avatarUrl = await bot.getFileLink(fileId);
      }
    } catch (e) {
      console.log("Erreur récupération avatar help");
    }

    // --- CAS 1 : AIDE DÉTAILLÉE POUR UNE COMMANDE ---
    if (args.length) {
      const query = args[0].toLowerCase();
      const cmd = [...commands.values()].find(
        (c) => c.nix.name === query || (c.nix.aliases && c.nix.aliases.includes(query))
      );

      if (!cmd) return bot.sendMessage(chatId, `❌ Commande "${query}" introuvable.`);

      const info = cmd.nix;
      const detail = `
╭─────────────────────◊
│ ▸ Commande : ${info.name}
│ ▸ Alias : ${info.aliases?.length ? info.aliases.join(", ") : "Aucun"}
│ ▸ Permission : ${info.role === 2 ? "Admin" : info.role === 1 ? "VIP" : "Tous"}
│ ▸ Catégorie : ${info.category?.toUpperCase() || "AUTRES"}
│ ▸ Version : ${info.version || "1.0"}
│ ▸ Description : ${info.description || "Pas de description"}
╰─────────────────────◊
      `.trim();

      if (avatarUrl) {
        return bot.sendPhoto(chatId, avatarUrl, { caption: detail });
      } else {
        return bot.sendMessage(chatId, detail);
      }
    }

    // --- CAS 2 : MENU GÉNÉRAL ---
    const cats = {};
    [...commands.values()]
      .filter((command, index, self) =>
        index === self.findIndex((c) => c.nix.name === command.nix.name)
      )
      .forEach((c) => {
        const cat = c.nix.category || "Autres";
        if (!cats[cat]) cats[cat] = [];
        if (!cats[cat].includes(c.nix.name)) cats[cat].push(c.nix.name);
      });

    const catTitles = {
      media: "Média",
      utility: "Utilitaire",
      utilitaire: "Utilitaire",
      game: "Jeux",
      economy: "Économie",
      économie: "Économie",
      ai: "IA & Chat",
      image: "Images",
      system: "Système"
    };

    let menuMsg = `👋 Bonjour ${userName} !\nVoici la liste de mes capacités :\n\n`;

    Object.keys(cats).sort().forEach((cat) => {
      const title = catTitles[cat.toLowerCase()] || cat.toUpperCase();
      menuMsg += `🍓 ${title}\n`;
      menuMsg += `${cats[cat].sort().map(cmd => `✿ ${cmd}`).join("   ")}\n\n`;
    });

    const totalCmds = [...new Set([...commands.values()].map(c => c.nix.name))].length;
    menuMsg += `📊 Total : ${totalCmds} commandes\n`;
    menuMsg += `🔧 Aide : ${prefix}help [commande]`;

    // Envoi final avec ou sans photo
    if (avatarUrl) {
      return bot.sendPhoto(chatId, avatarUrl, { caption: menuMsg });
    } else {
      return bot.sendMessage(chatId, menuMsg);
    }
  }
};
