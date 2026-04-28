import { resolveLidToRealJid } from "../../nucleo/utils.js"

export default {
  command: ['ban', 'banuser', 'banear'],
  category: 'owner',
  isOwner: true, // Esto asegura que SOLO TÚ (Owner) puedas usar el comando
  run: async (client, m, args, usedPrefix, command) => {
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : (m.quoted ? m.quoted.sender : null)
    if (!who2) {
      return client.reply(m.chat, `💙 Etiqueta o responde al mensaje del usuario que deseas banear del bot.\n\n🌱 Ejemplo: *${usedPrefix + command} @usuario spam*`, m)
    }
    
    const who = await resolveLidToRealJid(who2, client, m.chat)
    if (!who) return
    
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net'
    if (who === botJid) return client.reply(m.chat, `💙 No me puedo banear a mí misma.`, m)

    const owners = global.owner.map(num => num + '@s.whatsapp.net')
    if (owners.includes(who)) return client.reply(m.chat, `💙 No puedes banear a un creador del bot.`, m)

    const reason = args.slice(1).join(' ') || 'Sin especificar'

    if (!global.db.data.users) global.db.data.users = {}
    if (!global.db.data.users[who]) global.db.data.users[who] = {}
    
    global.db.data.users[who].banned = true
    global.db.data.users[who].bannedReason = reason

    await client.reply(m.chat, `✅ *USUARIO BANEADO*\n\nEl usuario ha sido bloqueado a nivel de sistema y ya no podrá usar mis comandos en ningún chat.\n\n> 👤 *Usuario:* @${who.split('@')[0]}\n> 📝 *Razón:* ${reason}`, m, { mentions: [who] })
  }
}