export default {
  command: ['enable', 'disable'],
  category: 'grupo',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    const chatData = global.db.data.chats[m.chat]
    const feature = args[0]?.toLowerCase()
    const validFeatures = ['nsfw', 'welcome', 'goodbye', 'alerts', 'antilinks', 'economy', 'gacha', 'adminonly']
    
    if (!feature) {
      return client.reply(m.chat, `💙 *Uso del comando*\n\n💙 _Activar ›_ *${usedPrefix}enable <opción>*\n💙 _Desactivar ›_ *${usedPrefix}disable <opción>*\n\n💙 *Opciones disponibles:*\n• nsfw\n• welcome\n• goodbye\n• alerts\n• antilinks\n• economy\n• gacha\n• adminonly\n\n💙 _Ejemplo:_ *${usedPrefix}enable nsfw*`, m, global.miku)
    }
    
    if (!validFeatures.includes(feature)) {
      return client.reply(m.chat, `💙 Opción no válida. Las opciones disponibles son:\n${validFeatures.map(f => `• ${f}`).join('\n')}`, m, global.miku)
    }
    
    const featureNames = {
      nsfw: 'los comandos *NSFW*',
      welcome: 'el mensaje de *Bienvenida*',
      goodbye: 'el mensaje de *Despedida*',
      alerts: 'las *Alertas*',
      antilinks: 'el *AntiEnlace*',
      economy: 'los comandos de *Economía*',
      gacha: 'los comandos de *Gacha*',
      adminonly: 'el modo *Solo Admin*'
    }
    
    const enabled = command === 'enable'
    const current = chatData[feature] === true
    
    if (current === enabled) {
      return client.reply(m.chat, `💙 ${featureNames[feature]} ya estaba *${enabled ? 'activado' : 'desactivado'}*.`, m, global.miku)
    }
    
    chatData[feature] = enabled
    return client.reply(m.chat, `💙 Has *${enabled ? 'activado' : 'desactivado'}* ${featureNames[feature]}.`, m, global.miku)
  }
}
