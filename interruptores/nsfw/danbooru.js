import fetch from 'node-fetch'

export default {
  command: ['danbooru', 'dbooru'],
  category: 'nsfw',
  nsfw: true,
  run: async (client, m, args, usedPrefix, command) => {
    try {
      if (!args[0]) return client.reply(m.chat, `💙 Debes especificar tags para buscar\n> Ejemplo » *${usedPrefix + command} neko*`, m)
      await m.react('🕒')
      const tag = args[0].replace(/\s+/g, '_')
      const url = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(tag)}`
      const res = await fetch(url)
      const json = await res.json()
      const mediaList = json.map(p => p?.file_url).filter(u => typeof u === 'string' && /\.(jpe?g|png|gif)$/.test(u))
      if (!mediaList.length) return client.reply(m.chat, `💙 No se encontraron resultados para ${tag}`, m)
      const media = mediaList[Math.floor(Math.random() * mediaList.length)]
      const caption = `💙 Resultados para » ${tag}`
      await client.sendMessage(m.chat, { image: { url: media }, caption, mentions: [m.sender] })
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      await m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  }
}