import fetch from 'node-fetch'

export default {
  command: ['waifu', 'neko'],
  category: 'anime',
  run: async (client, m, args, usedPrefix, command, text) => {
    try {
      const isNSFW = global.db.data.chats[m.chat].nsfw;
      
      if (!isNSFW) {
        const res = await fetch(`https://api.alyacore.xyz/random/${command}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          redirect: 'follow'
        });
        const contentType = String(res.headers.get('content-type')).toLowerCase();
        let imagePayload;
        if (contentType.includes('application/json')) {
          const json = await res.json();
          imagePayload = { url: json.url || json.data?.url || json.image };
        } else {
          imagePayload = await res.buffer();
        }
        return client.sendMessage(m.chat, { image: imagePayload, caption: `💙 Aquí tienes tu *${command.toUpperCase()}* 💙^•ﻌ•^💙` }, { quoted: m });
      }
      
      const res = await fetch('https://api.waifu.pics/nsfw/waifu');
      const json = await res.json();
      await client.sendMessage(m.chat, { image: { url: json.url }, caption: '💙 Aquí tienes tu *WAIFU* 💙^•ﻌ•^💙' }, { quoted: m });
    } catch (e) {
      await m.react('✖️')
      await m.reply(`💙 An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if it persists.\n> [Error: *${e.message}*]`)
    }
  },
}