export default {
  command: ['ban', 'unban'],
  category: 'grupo',
  isAdmin: true,
  isOwner: true,
  run: async (client, m, args, usedPrefix, command) => {
    let target = m.mentionedJid[0] || m.quoted?.sender
    
    if (!target && args[0]) {
      const number = args[0].replace(/[^0-9]/g, '')
      if (number.length >= 10) {
        target = number + '@s.whatsapp.net'
      }
    }
    
    if (!target) {
      return m.reply(`💙 *Uso del comando*\n\n💙 _Banear ›_ *${usedPrefix}ban @usuario [razón]*\n💙 _Desbanear ›_ *${usedPrefix}unban @usuario*\n\n💙 _Ejemplo:_ *${usedPrefix}ban @1234567890 irrespeto*`, global.miku)
    }
    
    const targetJid = target.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    
    if (!global.db.data.users) {
      global.db.data.users = {}
    }
    
    let userData = global.db.data.users[targetJid]
    
    if (!userData) {
      userData = { banned: false, bannedReason: null }
      global.db.data.users[targetJid] = userData
    }
    
    const reason = args.slice(1).join(' ') || 'Comportamiento irrespetuoso'
    
    if (command === 'ban') {
      if (userData.banned) {
        return m.reply(`💙 @${targetJid.split('@')[0]} ya está baneado.\n\n💙 _Razón actual:_ ${userData.bannedReason || 'Sin especificar'}`, global.miku)
      }
      userData.banned = true
      userData.bannedReason = reason
      return m.reply(`💙 @${targetJid.split('@')[0]} ha sido *baneado* y no podrá usar comandos del bot.\n\n💙 _Razón:_ ${reason}`, global.miku)
    } else {
      if (!userData.banned) {
        return m.reply(`💙 @${targetJid.split('@')[0]} no está baneado.`, global.miku)
      }
      userData.banned = false
      userData.bannedReason = null
      return m.reply(`💙 @${targetJid.split('@')[0]} ha sido *desbaneado* y ahora puede usar comandos del bot.`, global.miku)
    }
  }
}
