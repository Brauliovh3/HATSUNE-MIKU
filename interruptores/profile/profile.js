import moment from 'moment-timezone';
import { resolveLidToRealJid } from "../../nucleo/utils.js"
import fetch from 'node-fetch'

const API_PARTS = ['DEPOOL', 'key', '252580']
const API_BASE = ['aHR0cHM6Ly9yZXN0', 'LmFwaWNhdXNhcy', '54eHl6']

function getApiKey() {
  return `${API_PARTS[0]}-${API_PARTS[1]}${API_PARTS[2]}`
}

function getApiBase() {
  const base = atob(API_BASE.join('').slice(0, -1) + '=')
  return base.replace(/\0/g, '')
}

const growth = Math.pow(Math.PI / Math.E, 1.618) * Math.E * 0.75
function xpRange(level, multiplier = global.multiplier || 2) {
  if (level < 0) throw new TypeError('level cannot be negative value')
  level = Math.floor(level)
  const min = level === 0 ? 0 : Math.round(Math.pow(level, growth) * multiplier) + 1
  const max = Math.round(Math.pow(level + 1, growth) * multiplier)
  return { min, max, xp: max - min }
}

export default {
  command: ['profile', 'perfil'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const texto = m.mentionedJid
    const who2 = texto.length > 0 ? texto[0] : m.quoted ? m.quoted.sender : m.sender
    const userId = await resolveLidToRealJid(who2, client, m.chat);
    const chat = global.db.data.chats[m.chat] || {}
    const chatUsers = chat.users || {}
    const globalUsers = global.db.data.users || {}
    const userss = global.db.data.chats[m.chat].users[userId] || {}
    if (!userss) {
      return m.reply('💙 El usuario *mencionado* no está *registrado* en el bot')
    }
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net' || ''
    const settings = global.db.data.settings[idBot] || {}
    const currency = settings.currency || ''
    const user = chatUsers[userId] || {}
    const user2 = globalUsers[userId] || {}
    const name = user2.name || ''
    const birth = user2.birth || 'Sin especificar'
    const genero = user2.genre || 'Oculto'
    const comandos = user2.usedcommands || '0'
    const pareja = user2.marry ? `${globalUsers[user2.marry].name}` : 'Nadie'
    const estadoCivil = genero === 'Mujer' ? 'Casada con' : genero === 'Hombre' ? 'Casado con' : 'Casadx con'
    const desc = user2.description ? `\n${user2.description}` : ''
    const pasatiempo = user2.pasatiempo ? `${user2.pasatiempo}` : 'No definido'
    const exp = user2.exp || 0
    const nivel = user2.level || 0
    const chocolates = user.coins || 0
    const banco = user.bank || 0
    const totalCoins = chocolates + banco
    const favId = user.favorite
    const favLine = favId && chat.characters?.[favId] ? `\n๑ Claim favorito » *${chat.characters[favId].name || '???'}*\n` : ''
    const ownedIDs = Object.entries(chat.characters || {}).filter(([, c]) => c.user === userId).map(([id]) => id)
    const haremCount = ownedIDs.length
    const haremValue = ownedIDs.reduce((acc, id) => {
    const local = chat.characters?.[id] || {}
    const globalRec = global.db.data.characters?.[id] || {}  
    const value = (globalRec && typeof globalRec.value === 'number') ? globalRec.value : (local && typeof local.value === 'number') ? local.value : 0
    return acc + value
    }, 0)
    const perfil = await client.profilePictureUrl(userId, 'image').catch((_) => '')
    const users = Object.entries(globalUsers).map(([key, value]) => ({ ...value, jid: key }))
    const sortedLevel = users.sort((a, b) => (b.level || 0) - (a.level || 0))
    try {
      const rank = sortedLevel.findIndex((u) => u.jid === userId) + 1
      const { min, xp } = xpRange(nivel, global.multiplier)
      const progreso = exp - min
      const porcentaje = xp > 0 ? Math.floor((progreso / xp) * 100) : 0
      const profileText = `💙 *Perfil* 🌱 ${name} 🌱${desc}

💙 Cumpleaños › *${birth}*
🌱 Pasatiempo › *${pasatiempo}*
💙 Género › *${genero}*
🌱 ${estadoCivil} › *${pareja}*

💙 Nivel › *${nivel}*
🌱 Experiencia › *${exp.toLocaleString()}*
💙 Progreso › *${progreso} => ${xp}* _(${porcentaje}%)_
🌱 Puesto › *#${rank}*

💙 Harem › *${haremCount}*
🌱 Valor total › *${haremValue.toLocaleString()}*${favLine}
💙 Coins totales › *🌱${totalCoins.toLocaleString()} ${currency}*
🌱 Comandos ejecutados › *${comandos.toLocaleString()}*`
      const perfil = await client.profilePictureUrl(userId, 'image').catch(() => '')

      const canvasUrl = `${getApiBase()}/api/v1/canvas/custom?apikey=${getApiKey()}&text=${encodeURIComponent(name)}&avatar=${encodeURIComponent(perfil || 'https://i.pinimg.com/736x/0c/1e/f8/0c1ef8e804983e634fbf13df1044a41f.jpg')}&theme=miku`

      let imageBuffer
      try {
        const response = await fetch(canvasUrl)
        if (response.ok) {
          imageBuffer = await response.buffer()
        } else {
          throw new Error('Canvas API error')
        }
      } catch {
        imageBuffer = { url: 'https://files.catbox.moe/fwzhps.jpg' }
      }

      await client.sendMessage(m.chat, {
        image: imageBuffer,
        caption: profileText
      }, { quoted: m })
    } catch (e) {
     return m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  }
}
