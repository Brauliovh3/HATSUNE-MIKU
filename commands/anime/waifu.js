import fetch from 'node-fetch'

export default {
  command: ['waifu', 'neko'],
  category: 'anime',
  run: async (client, m, args, usedPrefix, command, text) => {
    try {
      await m.react('🎤')
      let mode = db.data.chats[m.chat]?.nsfw ? 'nsfw' : 'sfw'
      let res = await fetch(`https://api.waifu.pics/${mode}/${command}`)
      if (!res.ok) return
      let json = await res.json()
      if (!json.url) return
      let img = Buffer.from(await (await fetch(json.url)).arrayBuffer())
      await client.sendFile(m.chat, img, 'thumbnail.jpg', `🎤 ${global.miku || 'HATSUNE MIKU'} Aquí tienes tu *${command.toUpperCase()}* ฅ^•ﻌ•^ฅ`, m)
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      await m.reply(`🎤 ${global.miku || 'HATSUNE MIKU'} 🎵 An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> � [Error: *${e.message}*]`)
    }
  },
}