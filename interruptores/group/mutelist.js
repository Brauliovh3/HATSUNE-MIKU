import { resolveLidToRealJid } from "../../nucleo/utils.js"

export default {
  command: ['mutelist', 'muted', 'muteados'],
  category: 'group',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    if (!chat) return m.reply('💙 Error: Este grupo no está registrado.')

    const mutedUsers = chat.mutedUsers || {}
    const mutedIds = Object.keys(mutedUsers)

    if (mutedIds.length === 0) {
      return m.reply('💙 No hay usuarios muteados en este grupo.')
    }

    const now = Date.now()
    let message = `🔇 *LISTA DE USUARIOS MUTEADOS*\n\n`
    let activeMutes = 0

    for (let i = 0; i < mutedIds.length; i++) {
      const userId = mutedIds[i]
      const muteData = mutedUsers[userId]

      if (muteData.unmuteAt && now >= muteData.unmuteAt) {
        delete chat.mutedUsers[userId]
        continue
      }

      activeMutes++
      const userName = global.db.data.users[userId]?.name || userId.split('@')[0]
      const adminName = global.db.data.users[muteData.mutedBy]?.name || muteData.mutedBy.split('@')[0]

      const timeInfo = muteData.unmuteAt
        ? `\n> ⏰ Expira en: ${formatRemainingTime(muteData.unmuteAt - now)}`
        : '\n> ⏰ Permanente'

      message += `${activeMutes}. @${userId.split('@')[0]}\n`
      message += `> 👤 Usuario: ${userName}\n`
      message += `> 📝 Razón: ${muteData.reason}${timeInfo}\n`
      message += `> 👮 Muteado por: ${adminName}\n\n`
    }

    if (activeMutes === 0) {
      return m.reply('💙 No hay usuarios muteados activos en este grupo.\n> Los mutes temporales han expirado.')
    }

    message += `📊 Total muteados: ${activeMutes}`

    await client.sendMessage(m.chat, {
      text: message,
      mentions: mutedIds
    }, { quoted: m })
  }
}

function formatRemainingTime(ms) {
  const seconds = Math.floor((ms / 1000) % 60)
  const minutes = Math.floor((ms / (1000 * 60)) % 60)
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds}s`)

  return parts.join(' ') || '0s'
}
