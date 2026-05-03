import subBotManager from '../../nucleo/subbotManager.js'

export default {
  command: ['self'],
  category: 'socket',
  run: async (client, m, args) => {
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
    
    const estado = config?.self ?? false
    const botType = isSubBot ? 'Socket' : 'Bot Principal'
    
    if (args[0] === 'enable' || args[0] === 'on') {
      if (estado) return m.reply(`💙 El modo *Self* ya estaba activado en el ${botType}.`)
      config.self = true
      return m.reply(`💙 Has *Activado* el modo *Self* en el ${botType}.`)
    }
    if (args[0] === 'disable' || args[0] === 'off') {
      if (!estado) return m.reply(`💙 El modo *Self* ya estaba desactivado en el ${botType}.`)
      config.self = false
      return m.reply(`💙 Has *Desactivado* el modo *Self* en el ${botType}.`)
    }
    return m.reply(`*💙 Self (✿❛◡❛)*\n➮ *${botType}*\n➮ *Estado ›* ${estado ? '✓ Activado' : '✗ Desactivado'}\n\n💙 Puedes cambiarlo con:\n> ● _Activar ›_ *self enable*\n> ● _Desactivar ›_ *self disable*`)
  },
};
