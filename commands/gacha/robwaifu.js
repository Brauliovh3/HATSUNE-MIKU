import { resolveLidToRealJid } from "../../lib/utils.js"
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
  command: ['robwaifu', 'robarwaifu'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const chat = global.db.data.chats[m.chat]
      if (chat.adminonly || !chat.gacha) {
        return m.reply(`💙 Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}gacha on*`)
      }
      if (!chat.users) chat.users = {}
      if (!chat.characters) chat.characters = {}
      if (!chat.users[m.sender]) chat.users[m.sender] = {}
      const userData = chat.users[m.sender]
      if (!Array.isArray(userData.characters)) userData.characters = []
      if (userData.lastrobwaifu == null) userData.lastrobwaifu = 0
      const now = Date.now()
      const cooldown = 3 * 60 * 60 * 1000
      const nextAllowed = userData.lastrobwaifu
      if (userData.lastrobwaifu > 0 && now < nextAllowed) {
        const timeLeft = Math.ceil((nextAllowed - now) / 1000)
        const h = Math.floor(timeLeft / 3600)
        const m_ = Math.floor((timeLeft % 3600) / 60)
        const s = timeLeft % 60
        let timeText = ''
        if (h > 0) timeText += `${h} hora${h !== 1 ? 's' : ''} `
        if (m_ > 0) timeText += `${m_} minuto${m_ !== 1 ? 's' : ''} `
        if (s > 0 || timeText === '') timeText += `${s} segundo${s !== 1 ? 's' : ''}`
        return m.reply(`💙 Debes esperar ${timeText.trim()} para usar *${usedPrefix + command}* de nuevo.`)
      }
      const mentioned = m.mentionedJid || []
      const who2 = mentioned.length > 0 ? mentioned[0] : m.quoted ? m.quoted.sender : null
      const target = await resolveLidToRealJid(who2, client, m.chat)
      if (!target) return m.reply(`💙 Por favor, cita o menciona al usuario a quien quieras robarle una waifu.`)
      if (!chat.users[target]) return m.reply('💙 El usuario mencionado no está registrado.')
      if (!userData.robVictims) userData.robVictims = {}
      const last = userData.robVictims[target]
      if (last && now - last < 24 * 60 * 60 * 1000) {
        let targetName = global.db.data.users[target].name.trim() || target.split('@')[0]
        return m.reply(`💙 Ya robaste a *${targetName}* hoy. Solo puedes robarle a alguien una vez cada 24 horas.`)
      }
      let targetName = global.db.data.users[target].name.trim() || target.split('@')[0]
      let robberName = global.db.data.users[m.sender].name.trim() || m.sender.split('@')[0]
      if (target === m.sender) {
        return m.reply(`💙 No puedes robarte a ti mismo, *${robberName}*.`)
      }
      if (!chat.users[target]) chat.users[target] = {}
      const victim = chat.users[target]
      if (!Array.isArray(victim.characters)) victim.characters = []
      if (victim.characters.length === 0) {
        return m.reply(`💙 *${targetName}* no tiene waifus que puedas robar.`)
      }
      const success = Math.random() < 0.4
      userData.lastrobwaifu = now + cooldown
      userData.robVictims[target] = now
      if (!success) {
        return m.reply(`💙 El intento de robo ha fallado. *${targetName}* defendió a su waifu heroicamente.`)
      }
      const victimFavorite = chat.users[target]?.favorite || global.db.data.users[target]?.favorite
      const stealableCharacters = victim.characters.filter(id => id !== victimFavorite)
      if (stealableCharacters.length === 0) {
        return m.reply(`💙 *${targetName}* solo tiene a su favorito protegido, no puedes robarlo.`)
      }
      const stolenId = stealableCharacters[Math.floor(Math.random() * stealableCharacters.length)]
      const character = chat.characters?.[stolenId] || {}
      const charName = typeof character.name === 'string' ? character.name : `ID:${stolenId}`
      character.user = m.sender
      victim.characters = victim.characters.filter(id => id !== stolenId)
      if (!userData.characters.includes(stolenId)) {
        userData.characters.push(stolenId)
      }
      if (chat.sales?.[stolenId] && chat.sales[stolenId].user === target) {
        delete chat.sales[stolenId]
      }
      if (chat.users[target]?.favorite === stolenId) {
        delete chat.users[target].favorite
      }
      if (global.db.data.users?.[target]?.favorite === stolenId) {
        delete global.db.data.users[target].favorite
      }
      await m.reply(`💙 *${robberName}* ha robado a *${charName}* del harem de *${targetName}*.`)
    } catch (e) {
      return m.reply(`❌ Ocurrió un error inesperado al ejecutar el comando *${usedPrefix + command}*. Por favor, intenta nuevamente o contacta al soporte si el problema persiste.\n> [Error: *${e.message}*]`)
    }
  },
}
