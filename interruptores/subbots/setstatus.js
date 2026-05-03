import subBotManager from '../../nucleo/subbotManager.js'

export default {
  command: ['setstatus'],
  category: 'socket',
  run: async (client, m, args, usedPrefix, command) => {
    const idBot = client.user.id.split(':')[0] + '@s.whatsapp.net'
    
   
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
    if (!value) return m.reply(`💙 Debes escribir un estado valido.\n> Ejemplo: *${usedPrefix + command} 💙 Hatsune Miku*`, m, global.miku)
    
    await client.updateProfileStatus(value)
    
    
    config.status = value
    
    const botType = isSubBot ? 'subbot' : 'bot principal'
    return m.reply(`💙 Se ha actualizado el estado del ${botType} a *${value}*!`, m, global.miku)
  },
};