export default {
  command: ['banlist', 'banned', 'baneados'],
  category: 'owner',
  isOwner: true,
  run: async (client, m, args, usedPrefix, command) => {
    const users = global.db.data.users || {}
    const bannedUsers = Object.entries(users).filter(([_, user]) => user?.banned === true)

    if (bannedUsers.length === 0) {
      return m.reply('💙 No hay usuarios baneados.')
    }

    let message = `🚫 *LISTA DE USUARIOS BANEADOS*\n\n`
    message += `📊 Total baneados: ${bannedUsers.length}\n\n`

    for (let i = 0; i < bannedUsers.length; i++) {
      const [userId, userData] = bannedUsers[i]
      const userName = userData?.name || 'Sin nombre'
      const reason = userData?.bannedReason || 'Sin especificar'

      message += `${i + 1}. @${userId.split('@')[0]}\n`
      message += `> 👤 Nombre: ${userName}\n`
      message += `> 📝 Razón: ${reason}\n\n`
    }

    message += `💡 Usa *${usedPrefix}unban @usuario* para desbanear`

    const mentions = bannedUsers.map(([userId]) => userId)

    await client.sendMessage(m.chat, {
      text: message,
      mentions: mentions
    }, { quoted: m })
  }
}
