let handler = async (client, m, args, usedPrefix, command) => {
  const userId = m.sender;
  const sessionId = `${userId}_${m.chat}`;
  
  if (!global.db.data) global.db.data = {}
  if (!global.db.data.users) global.db.data.users = {}
  if (!global.db.data.users[userId]) global.db.data.users[userId] = {}
  const user = global.db.data.users[userId]
  if (!user.waifu) user.waifu = { characters: [], pending: null, cooldown: 0 }
  if (!Array.isArray(user.waifu.characters)) user.waifu.characters = []

  if (user.waifu.characters.length === 0) {
    return m.reply(`🎨 *GALERÍA VACÍA* 🎨\n\n` +
      `💙 No tienes personajes en tu colección.\n\n` +
      `💡 Usa *.rw* para invocar tu primer personaje.`);
  }

  const userCharacters = user.waifu.characters;
  
  let index = 0;
  if (args[0] && !isNaN(args[0])) {
    index = parseInt(args[0]) - 1;
    if (index < 0) index = 0;
    if (index >= userCharacters.length) index = userCharacters.length - 1;
  }

  const waifu = userCharacters[index];
  
  const rarityColors = {
    'común': '⚪',
    'rara': '🔵',
    'épica': '🟣',
    'ultra rara': '🟡',
    'legendaria': '🔴'
  };

  const emoji = rarityColors[waifu.rarity] || '💙';

  let message = `🎨 *MI COLECCIÓN* 🎨\n\n`;
  message += `${emoji} *${waifu.name}*\n`;
  message += `💎 *Rareza:* ${waifu.rarity.toUpperCase()}\n`;
  message += `⚡ *Poder:* ${waifu.power}\n`;
  message += `🎯 *Habilidad:* ${waifu.skill}\n`;
  message += `📜 *Descripción:* ${waifu.skillDesc}\n\n`;
  message += `📖 Personaje ${index + 1} de ${userCharacters.length}\n`;
  message += `📊 Total en colección: ${userCharacters.length}\n\n`;
  message += `💡 Usa los botones para navegar`;

  const buttons = [
    { buttonId: `gallery_prev_${sessionId}`, buttonText: { displayText: '⬅️ Anterior' }, type: 1 },
    { buttonId: `gallery_next_${sessionId}`, buttonText: { displayText: '➡️ Siguiente' }, type: 1 },
    { buttonId: '.rw', buttonText: { displayText: '🎲 Invocar' }, type: 1 }
  ];

  await client.sendMessage(m.chat, {
    image: { url: waifu.img },
    caption: message,
    buttons: buttons,
    footer: '🎮 Mi Colección - Hatsune Miku Bot',
    headerType: 4
  }, { quoted: m });

  global.gallerySessions = global.gallerySessions || new Map();
  global.gallerySessions.set(sessionId, {
    index,
    chat: m.chat,
    userId,
    characters: userCharacters
  });
};

export default {
  command: ['gallery'],
  category: 'gacha',
  run: handler
};
