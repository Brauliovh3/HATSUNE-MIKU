import subBotManager from '../../nucleo/subbotManager.js'

export default {
  command: ['setlink', 'setbotlink'],
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
    
    const value = args.join(' ').trim()
    if (!value) {
      return m.reply(`💙 Ingresa un enlace válido que comience con http:// o https://`)
    }
    if (!/^https?:\/\//i.test(value)) {
      return m.reply('💙 El enlace debe comenzar con http:// o https://')
    }
    config.link = value
    
    const botType = isSubBot ? 'Socket' : 'Bot Principal'
    return m.reply(`💙 Se cambió el enlace del ${botType} correctamente.`)
  },
};