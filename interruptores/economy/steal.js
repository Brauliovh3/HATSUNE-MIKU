import { resolveLidToRealJid } from "../../nucleo/utils.js"

export default {
  command: ['robar', 'steal', 'rob'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const db = global.db.data
    const chatData = db.chats[m.chat]
    if (!chatData) return m.reply(`💙 Usa primero cualquier comando para registrarte.`)
    if (chatData.adminonly || !chatData.economy) return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)   
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const bot = db.settings[botId]
    const currency = bot?.currency || 'monedas'
    const user = chatData.users?.[m.sender]
    if (!user) return m.reply(`💙 Usa primero *.menu* o *.pescaderia* para activar tu cuenta.`)
    user.coins ||= 0
    user.laststeal ||= 0
    if (Date.now() < user.laststeal) {
      const restante = user.laststeal - Date.now()
      return client.reply(m.chat, `💙 Debes esperar *${formatTime(restante)}* para usar *${usedPrefix + command}* de nuevo.`, m, global.miku)
    }
    const mentioned = m.mentionedJid || []
    const who2 = mentioned[0] || (m.quoted ? m.quoted.sender : null)
    const who = await resolveLidToRealJid(who2, client, m.chat)
    if (!who) return client.reply(m.chat, `🌱 Debes mencionar a alguien para intentar robarle.`, m, global.miku)
    const target = chatData.users?.[who]
    if (!target) {
      return client.reply(m.chat, `💙 El usuario no se encuentra en mi base de datos.`, m, global.miku)
    }
    const name = db.users[who]?.name || who.split('@')[0]
    const lastCmd = chatData.users?.[who]?.lastCmd || 0
    const tiempoInactivo = Date.now() - lastCmd
    if (tiempoInactivo < 3600000) {
      return client.reply(m.chat, `💙 Solo puedes robarle *${currency}* a un usuario si estuvo más de 1 hora inactivo.`, m, global.miku)
    }
    const chance = Math.random()
    if (chance < 0.3) {
      let loss = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000
      const total = user.coins + (user.bank || 0)
      if (total >= loss) {
        if (user.coins >= loss) {
          user.coins -= loss
        } else {
          const restante = loss - user.coins
          user.coins = 0
          user.bank = Math.max(0, (user.bank || 0) - restante)
        }
      } else {
        loss = total
        user.coins = 0
        user.bank = 0
      }
      user.laststeal = Date.now() + 3600000
      return client.reply(m.chat, `💙 El robo salió mal y perdiste *🌱${loss.toLocaleString()} ${currency}*.`, m, global.miku)
    }
    const rob = Math.floor(Math.random() * (8000 - 4000 + 1)) + 4000
    if (target.coins < rob) {
      return client.reply(m.chat, `💙 *${name}* no tiene suficientes *${currency}* fuera del banco como para que valga la pena intentar robar.`, m, global.miku, { mentions: [who] })
    }
    user.coins += rob
    target.coins -= rob
    user.laststeal = Date.now() + 3600000
    client.reply(m.chat, `🌱 Le robaste *🌱${rob.toLocaleString()} ${currency}* a *${name}*`, m, global.miku, { mentions: [who] })
  }
}

function formatTime(ms) {
  const totalSec = Math.ceil(ms / 1000)
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const parts = []
  if (hours) parts.push(`${hours} hora${hours !== 1 ? 's' : ''}`)
  if (minutes) parts.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`)
  parts.push(`${seconds} segundo${seconds !== 1 ? 's' : ''}`)
  return parts.join(' ')
}