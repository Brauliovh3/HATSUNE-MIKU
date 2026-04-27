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
    const participantInfo = groupInfo.participants.find((p) => p.phoneNumber === user || p.jid === user || p.id === user || p.lid === user)
    if (!participantInfo) {
      const realNumber = user.split('@')[0]
      return client.sendMessage(m.chat, { text: `💙 @${realNumber} ya no está en el grupo.`, mentions: [user], ...global.miku }, { quoted: m })
    }
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
      
      const displayName = participantInfo?.notify || participantInfo?.name || participantInfo?.phoneNumber || participantInfo?.id?.split('@')[0] || user.split('@')[0]
      await client.sendMessage(m.chat, { text: `🔰 @${displayName} eliminado correctamente`, mentions: [user], ...global.miku }, { quoted: m })
    } catch (e) {
      return m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  },
};
