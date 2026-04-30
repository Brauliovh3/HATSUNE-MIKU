import fetch from 'node-fetch'

export default {
  command: ['neko'],
  category: 'anime',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      await m.react('🕒')
      
      if (!global.nekoData) {
        const ne = await fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/anime/neko.txt')
        const nek = await ne.text()
        global.nekoData = nek.split('\n')
      }
      const neko = global.nekoData[Math.floor(Math.random() * global.nekoData.length)]
      
      if (!neko || neko === '') throw new Error('No se pudo obtener imagen')
      
      await client.sendFile(m.chat, neko, 'neko.jpg', `💙 Aquí tienes tu *NEKO* 💙^•ﻌ•^💙`, m, global.miku)
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      await m.reply(`💙 An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  },
}
