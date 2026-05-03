import { resolveLidToRealJid } from "../../nucleo/utils.js"

export default {
  command: ['mute', 'mutear', 'unmute', 'desmutear'],
  category: 'group',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    if (!chat) return m.reply('💙 Error: Este grupo no está registrado.')

    const isUnmute = command === 'unmute' || command === 'desmutear'

    const mentioned = m.mentionedJid || []
    const who2 = mentioned.length > 0 ? mentioned[0] : m.quoted ? m.quoted.sender : false
    const targetId = await resolveLidToRealJid(who2, client, m.chat)

    if (!who2 || !targetId) {
      return m.reply(`💙 Debes mencionar o responder al usuario que deseas ${isUnmute ? 'desmutear' : 'mutear'}.`)
    }

    if (targetId === m.sender) {
      return m.reply('💙 No puedes mutearte a ti mismo.')
    }

    if (targetId === client.user.id.split(':')[0] + '@s.whatsapp.net') {
      return m.reply('💙 No puedo mutearme a mí mismo.')
    }

    chat.mutedUsers ??= {}

    const targetName = global.db.data.users[targetId]?.name || targetId.split('@')[0]

    if (isUnmute) {
      if (!chat.mutedUsers[targetId]) {
        return m.reply(`💙 *${targetName}* no está muteado.`)
      }

      delete chat.mutedUsers[targetId]
      return m.reply(`💙 *${targetName}* ha sido desmuteado.\n> Ahora puede enviar mensajes normalmente.`, { mentions: [targetId] })
    }

    let duration = 0
    let durationText = 'permanentemente'

    if (args[0]) {
      const timeMatch = args[0].match(/^(\d+)([mhd])$/i)
      if (timeMatch) {
        const num = parseInt(timeMatch[1])
        const unit = timeMatch[2].toLowerCase()
        const multipliers = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }
        duration = num * multipliers[unit]

        const timeLabels = { m: 'minuto(s)', h: 'hora(s)', d: 'día(s)' }
        durationText = `por ${num} ${timeLabels[unit]}`
      }
    }

    const reason = args.slice(duration ? 1 : 0).join(' ') || 'Sin razón'
    const unmuteTime = duration ? Date.now() + duration : 0

    chat.mutedUsers[targetId] = {
      mutedAt: Date.now(),
      unmuteAt: unmuteTime,
      reason: reason,
      mutedBy: m.sender
    }

    const timeInfo = duration ? `\n> ⏰ Duración: ${formatDuration(duration)}` : ''
    const muteMsg = `💙 *${targetName}* ha sido muteado ${durationText}.\n> 📝 Razón: ${reason}${timeInfo}\n\n> 🔇 Todos sus mensajes serán eliminados automáticamente.`

    await m.reply(muteMsg, { mentions: [targetId] })
  }
}

function formatDuration(ms) {
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
