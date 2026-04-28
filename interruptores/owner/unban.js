import { resolveLidToRealJid } from "../../nucleo/utils.js"

export default {
  command: ['unban', 'unbanuser', 'desbanear'],
  category: 'owner',
  isOwner: true,
  run: async (client, m, args, usedPrefix, command) => {
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : (m.quoted ? m.quoted.sender : null)
    if (!who2) {
      return client.reply(m.chat, `💙 Etiqueta o responde al mensaje del usuario que deseas desbanear del bot.\n\n🌱 Ejemplo: *${usedPrefix + command} @usuario*`, m)
    }
    
    const who = await resolveLidToRealJid(who2, client, m.chat)
    if (!who) return

    if (!global.db.data.users) global.db.data.users = {}
    if (!global.db.data.users[who]) global.db.data.users[who] = {}
    
    global.db.data.users[who].banned = false
    global.db.data.users[who].bannedReason = ''

    await client.reply(m.chat, `✅ *USUARIO DESBANEADO*\n\nEl usuario ya puede volver a usar mis comandos con total normalidad.\n\n> 👤 *Usuario:* @${who.split('@')[0]}`, m, { mentions: [who] })
  }
}