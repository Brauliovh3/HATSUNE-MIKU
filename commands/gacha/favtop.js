import { promises as fs } from 'fs'

const charactersFilePath = './lib/characters.json'
async function loadCharacters() {
  const data = await fs.readFile(charactersFilePath, 'utf-8')
  return JSON.parse(data)
}
function flattenCharacters(structure) {
  return Object.values(structure).flatMap(s => Array.isArray(s.characters) ? s.characters : [])
}

export default {
  command: ['favtop', 'favoritetop', 'favboard'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    if (chat.adminonly || !chat.gacha) {
      return m.reply(`💙 Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}gacha on*`)
    }
    if (!global.db.data.users) global.db.data.users = {}
    if (!global.db.data.characters) global.db.data.characters = {}
    try {
      const structure = await loadCharacters()
      const allCharacters = flattenCharacters(structure)
      const counts = {}
      for (const [id, user] of Object.entries(global.db.data.users)) {
        const favId = user.favorite
        if (favId) counts[favId] = (counts[favId] || 0) + 1
      }
      const enriched = allCharacters.map(c => ({ name: c.name, favorites: counts[c.id] || 0 })).filter(e => e.favorites > 0)
      const page = parseInt(args[0]) || 1
      const perPage = 10
      const totalPages = Math.max(1, Math.ceil(enriched.length / perPage))
      if (page < 1 || page > totalPages) {
        return m.reply(`💙 Página no válida. Hay un total de *${totalPages}* páginas.`)
      }
      const sorted = enriched.sort((a, b) => b.favorites - a.favorites)
      const sliced = sorted.slice((page - 1) * perPage, page * perPage)
      let msg = '✰ Top de personajes favoritos:\n\n'
      sliced.forEach((char, i) => {
        msg += `#${(page - 1) * perPage + i + 1} » *${char.name}*\n`
        msg += `   ♡ ${char.favorites} favorito${char.favorites !== 1 ? 's' : ''}.\n`
      })
      msg += `\n> Página ${page} de ${totalPages}`
      await client.reply(m.chat, msg.trim(), m)
    } catch (e) {
      await m.reply(`💙 An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  },
}