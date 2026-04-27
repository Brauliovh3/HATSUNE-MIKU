import fetch from 'node-fetch'

export default {
  command: ['waifu', 'neko'],
  category: 'anime',
  run: async (client, m, args, usedPrefix, command, text) => {
    try {
      const isNSFW = global.db.data.chats[m.chat].nsfw;
      
      if (!isNSFW) {
        const res = await fetch(`https://api.waifu.pics/sfw/${command}`);
        const json = await res.json();
        const img = Buffer.from(await (await fetch(json.url)).arrayBuffer());
        return client.sendFile(m.chat, img, 'waifu.jpg', `💙 Aquí tienes tu *${command.toUpperCase()}* 💙^•ﻌ•^💙`, m, global.miku);
      }
      
      const res = await fetch('https://api.waifu.pics/nsfw/waifu');
      const json = await res.json();
      const img = Buffer.from(await (await fetch(json.url)).arrayBuffer());
      await client.sendFile(m.chat, img, 'waifu.jpg', '💙 Aquí tienes tu *WAIFU* 💙^•ﻌ•^💙', m, global.miku);
    } catch (e) {
      await m.react('✖️')
      await m.reply(`💙 An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if it persists.\n> [Error: *${e.message}*]`)
    }
  },
}