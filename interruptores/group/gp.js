export default {
  command: ['gp', 'groupinfo'],
  category: 'grupo',
  run: async (client, m, args, usedPrefix, command) => {
    const from = m.chat
    const groupMetadata = m.isGroup ? await client.groupMetadata(from).catch((e) => {}) : ''
    const groupName = groupMetadata.subject;
    const groupBanner = await client.profilePictureUrl(m.chat, 'image').catch(() => 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Hatsune_Miku_logo_%28Project_Sekai%29.svg/1280px-Hatsune_Miku_logo_%28Project_Sekai%29.svg.png')
    const groupCreator = groupMetadata.owner ? '@' + groupMetadata.owner.split('@')[0] : 'Desconocido';
    const groupAdmins = groupMetadata?.participants.filter(p => (p.admin === 'admin' || p.admin === 'superadmin')) || []
    const totalParticipants = groupMetadata.participants.length;
    const chatId = m.chat;
    const chat = global.db.data.chats[chatId] || {};
    const chatUsers = chat.users || {};
    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net";
    const botSettings = global.db.data.settings[botId];
    const botname = botSettings.botname;
    const monedas = botSettings.currency;
    let totalCoins = 0;
    let registeredUsersInGroup = 0;
    const resolvedUsers = await Promise.all(
      groupMetadata.participants.map(async (participant) => {
        return { ...participant, phoneNumber: participant.phoneNumber, jid: participant.jid };
      })
    );
    resolvedUsers.forEach((participant) => {
      const fullId = participant.phoneNumber || participant.jid || participant.id;
      const user = chatUsers[fullId];
      if (user) {
        registeredUsersInGroup++;
        totalCoins += Number(user.coins) || 0;
      }
    });
    const allCharacters = Object.values(global.db.data.characters || {})
    const totalCharacters = allCharacters.length
    const claimedIDs = Object.entries(global.db.data.chats[m.chat]?.characters || {}).filter(([, c]) => c.user).map(([id]) => id)
    const claimedCount = claimedIDs.length
    const claimRate = totalCharacters > 0 ? ((claimedCount / totalCharacters) * 100).toFixed(2) : '0.00'
    const rawPrimary = typeof chat.primaryBot === 'string' ? chat.primaryBot : '';
    const botprimary = rawPrimary.endsWith('@s.whatsapp.net') ? `@${rawPrimary.split('@')[0]}` : 'Aleatorio';
    const settings = {
      bot: chat.isBanned ? '✘ Desactivado' : '✓ Activado',
      antilinks: chat.antilinks ? '✓ Activado' : '✘ Desactivado',
      welcome: chat.welcome ? '✓ Activado' : '✘ Desactivado',
      goodbye: chat.goodbye ? '✓ Activado' : '✘ Desactivado',
      alerts: chat.alerts ? '✓ Activado' : '✘ Desactivado',
      gacha: chat.gacha ? '✓ Activado' : '✘ Desactivado',
      economy: chat.economy ? '✓ Activado' : '✘ Desactivado',
      nsfw: chat.nsfw ? '✓ Activado' : '✘ Desactivado',
      adminmode: chat.adminonly ? '✓ Activado' : '✘ Desactivado',
      botprimary: botprimary
    };
    try {
      const on = '✅'
      const off = '❌'
      
      let message = `╭─────────❀ MIKU BOT ❀─────────╮\n`;
      message += `│ ${groupName?.substring(0, 28) || 'Grupo'}\n`;
      message += `├─────────❀ INFO ❀────────────┤\n`;
      message += `│ 👤 Creador: ${groupCreator}\n`;
      message += `│ 🤖 Bot: ${botprimary}\n`;
      message += `│ 👮 Admins: ${groupAdmins.length}\n`;
      message += `│ 👥 Miembros: ${totalParticipants}\n`;
      message += `│ 📝 Registrados: ${registeredUsersInGroup}\n`;
      message += `├─────────❀ GACHA ❀───────────┤\n`;
      message += `│ 🎴 Claims: ${claimedCount}/${totalCharacters}\n`;
      message += `│ 📊 Porcentaje: ${claimRate}%\n`;
      message += `│ 💰 Economia: ${totalCoins.toLocaleString()} ${monedas}\n`;
      message += `├─────────❀ SETTINGS ❀────────┤\n`;
      message += `│ Bot: ${chat.isBanned ? off : on}\n`;
      message += `│ AntiLink: ${chat.antilinks ? on : off}\n`;
      message += `│ Welcome: ${chat.welcome ? on : off}\n`;
      message += `│ Goodbye: ${chat.goodbye ? on : off}\n`;
      message += `│ Alerts: ${chat.alerts ? on : off}\n`;
      message += `│ Gacha: ${chat.gacha ? on : off}\n`;
      message += `│ Economy: ${chat.economy ? on : off}\n`;
      message += `│ NSFW: ${chat.nsfw ? on : off}\n`;
      message += `│ AdminMode: ${chat.adminonly ? on : off}\n`;
      message += `╰─────────❀ ${botname} ❀─────────╯`;
      
      const mentionOw = groupMetadata.owner ? groupMetadata.owner : '';
      const mentions = [rawPrimary, mentionOw].filter(Boolean);
      await client.sendContextInfoIndex(m.chat, message, {}, null, false, mentions, { banner: groupBanner, title: groupName, body: dev, redes: global.db.data.settings[client.user.id.split(':')[0] + "@s.whatsapp.net"].link })
    } catch (e) {
      await m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  }
};
