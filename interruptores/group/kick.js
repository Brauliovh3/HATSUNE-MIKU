export default {
  command: ['kick'],
  category: 'grupo',
  isAdmin: true,
  botAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    if (!m.mentionedJid[0] && !m.quoted) {
      return m.reply('💙 Etiqueta o responde al *mensaje* de la *persona* que quieres eliminar', m, global.miku)
    }
    let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted.sender
    const groupInfo = await client.groupMetadata(m.chat)
    const ownerGroup = groupInfo.owner || m.chat.split`-`[0] + '@s.whatsapp.net'
    const ownerBot = global.owner[0][0] + '@s.whatsapp.net'
    const participant = groupInfo.participants.find((p) => p.id === user || p.phoneNumber === user || p.jid === user || p.lid === user)
    if (!participant) {
      return client.sendMessage(m.chat, { text: `💙 @${user.split('@')[0]} ya no está en el grupo.`, mentions: [user], ...global.miku }, { quoted: m })
    }
    // Obtener número real si es LID
    const phone = participant.phoneNumber || participant.id?.split('@')[0] || user.split('@')[0]
    if (user === client.decodeJid(client.user.id)) {
      return m.reply('💙 No puedo eliminar al *bot* del grupo')
    }
    if (user === ownerGroup) {
      return m.reply('💙 No puedo eliminar al *propietario* del grupo')
    }
    if (user === ownerBot) {
      return m.reply('💙 No puedo eliminar al *propietario* del bot')
    }
    try {
      await client.groupParticipantsUpdate(m.chat, [user], 'remove')
      await client.sendMessage(m.chat, { text: `💙 @${phone} eliminado correctamente`, mentions: [user], ...global.miku }, { quoted: m })
    } catch (e) {
      return m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  },
};
