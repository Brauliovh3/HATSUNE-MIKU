import fetch from 'node-fetch'

export default {
  command: ['waifu', 'neko'],
  category: 'anime',
  run: async (client, m, args, usedPrefix, command, text) => {
    if (!global.db.data.chats[m.chat].nsfw) return m.reply(`💙 El contenido *NSFW* está desactivado en este grupo.\n\nUn *administrador* puede activarlo con el comando:\n» *${usedPrefix}nsfw on*`, m, global.miku);
    try {
      await m.react('🕒')
      let mode = 'nsfw'
      let res = await fetch(`https://api.waifu.pics/${mode}/${command}`)
      if (!res.ok) return
      let json = await res.json()
      if (!json.url) return
      let img = Buffer.from(await (await fetch(json.url)).arrayBuffer())
      await client.sendFile(m.chat, img, 'thumbnail.jpg', `💙 Aquí tienes tu *${command.toUpperCase()}* 💙^•ﻌ•^💙`, m, global.miku)
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      await m.reply(`💙 An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  },
}