console.log(`[BAN/UNBAN] Archivo ban.js cargado`)
export default {
  command: ['ban', 'unban'],
  category: 'grupo',
  isAdmin: true,
  isOwner: true,
  run: async (client, m, args, usedPrefix, command) => {
    console.log(`[BAN/UNBAN] Comando ejecutado: ${command}, sender: ${m.sender}, args:`, args)
    console.log(`[BAN/UNBAN] global.owner:`, global.owner)
    let target = m.mentionedJid[0] || m.quoted?.sender
    
    if (!target && args[0]) {
      const number = args[0].replace(/[^0-9]/g, '')
      if (number.length >= 10) {
        target = number + '@s.whatsapp.net'
      }
    }
    
    if (!target) {
      console.log(`[BAN/UNBAN] No se especificó objetivo`)
      return m.reply(`💙 *Uso del comando*\n\n💙 _Banear ›_ *${usedPrefix}ban @usuario [razón]*\n💙 _Desbanear ›_ *${usedPrefix}unban @usuario*\n\n💙 _Ejemplo:_ *${usedPrefix}ban @1234567890 irrespeto*`, m, global.miku)
    }
    
    const targetJid = target.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    console.log(`[BAN/UNBAN] Objetivo: ${targetJid}`)
    
    if (!global.db.data.users) {
      global.db.data.users = {}
    }
    
    let userData = global.db.data.users[targetJid]
    
    if (!userData) {
      userData = { banned: false, bannedReason: null }
      global.db.data.users[targetJid] = userData
      console.log(`[BAN/UNBAN] Usuario creado en DB`)
    }
    
    const reason = args.slice(1).join(' ') || 'Comportamiento irrespetuoso'
    console.log(`[BAN/UNBAN] Razón: ${reason}`)
    console.log(`[BAN/UNBAN] Estado actual de ban: ${userData.banned}`)
    
    if (command === 'ban') {
      if (userData.banned) {
        console.log(`[BAN/UNBAN] Usuario ya baneado`)
        return m.reply(`💙 @${targetJid.split('@')[0]} ya está baneado.\n\n💙 _Razón actual:_ ${userData.bannedReason || 'Sin especificar'}`, m, global.miku)
      }
      userData.banned = true
      userData.bannedReason = reason
      console.log(`[BAN/UNBAN] Usuario baneado exitosamente`)
      return m.reply(`💙 @${targetJid.split('@')[0]} ha sido *baneado* y no podrá usar comandos del bot.\n\n💙 _Razón:_ ${reason}`, m, global.miku)
    } else {
      if (!userData.banned) {
        console.log(`[BAN/UNBAN] Usuario no está baneado`)
        return m.reply(`💙 @${targetJid.split('@')[0]} no está baneado.`, m, global.miku)
      }
      userData.banned = false
      userData.bannedReason = null
      console.log(`[BAN/UNBAN] Usuario desbaneado exitosamente`)
      return m.reply(`💙 @${targetJid.split('@')[0]} ha sido *desbaneado* y ahora puede usar comandos del bot.`, m, global.miku)
    }
  }
}
