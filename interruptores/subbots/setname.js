import subBotManager from '../../nucleo/subbotManager.js'

export default {
  command: ['setbotname', 'setname'],
  category: 'socket',
  run: async (client, m, args, usedPrefix, command) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    
    // Detectar subbot por registro en subBotManager o por tipo guardado
    const sessionId = idBot.split('@')[0]
    const isSubBot = subBotManager.subbots?.has(sessionId) || 
                     global.db.data?.settings?.[idBot]?.type === 'Sub'
    
   
    let config
    if (isSubBot) {
      global.db.data.subbots ||= {}
      global.db.data.subbots[idBot] ||= {}
      config = global.db.data.subbots[idBot]
    } else {
      config = global.db.data.settings[idBot]
    }
    
  
    const owners = [idBot, ...(config?.owner ? [config.owner] : []), ...global.owner.map(num => num + '@s.whatsapp.net')]
    if (!owners.includes(m.sender)) return m.reply(mess.socket)
    
    const value = args.join(' ').trim()
    if (!value) return m.reply(`💙 Debes escribir un nombre corto y un nombre largo valido.\n> Ejemplo: *${usedPrefix + command} Miku / Hatsune Miku*`, m, global.miku)
    
    const formatted = value.replace(/\s*\/\s*/g, '/')
    let [short, long] = formatted.includes('/') ? formatted.split('/') : [value, value]
    if (!short || !long) return m.reply('💙 Usa el formato: Nombre Corto / Nombre Largo', m, global.miku)
    if (/\s/.test(short)) return m.reply('💙 El nombre corto no puede contener espacios.', m, global.miku)
    
    config.namebot = short.trim()
    config.botname = long.trim()
    
    const botType = isSubBot ? 'subbot' : 'bot principal'
    return m.reply(`💙 El nombre del ${botType} ha sido actualizado!\n\n🌱 Nombre corto: *${short.trim()}*\n💙 Nombre largo: *${long.trim()}*`, m, global.miku)
  },
};