export default {
  command: [
    'alerts', 'alertas',
    'nsfw',
    'antilink', 'antienlaces', 'antilinks',
    'rpg', 'economy', 'economia',
    'gacha',
    'audios', 'audio',
    'adminonly', 'onlyadmin',
    'bot', 'banchat', 'unbanchat'
  ],
  category: 'grupo',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command) => {
    const chatData = global.db.data.chats[m.chat]
    const botname = global.db.data.settings[client.user.id.split(':')[0] + "@s.whatsapp.net"].botname 
    const stateArg = args[0]?.toLowerCase()
    const validStates = ['on', 'off', 'enable', 'disable']
    const mapTerms = {
      antilinks: 'antilinks',
      antienlaces: 'antilinks',
      antilink: 'antilinks',
      alerts: 'alerts',
      alertas: 'alerts',
      economy: 'economy',      
      economia: 'economy',
      adminonly: 'adminonly',
      onlyadmin: 'adminonly',
      nsfw: 'nsfw',
      rpg: 'gacha',
      gacha: 'gacha',
      audios: 'audios',
      audio: 'audios',
      banchat: 'bot',
      unbanchat: 'bot',
      bot: 'bot'
    }
    const featureNames = {
      antilinks: 'el *AntiEnlace*',
      alerts: 'las *Alertas*',
      economy: 'los comandos de *Economía*',
      gacha: 'los comandos de *Gacha*',
      audios: 'los *Audios*',
      adminonly: 'el modo *Solo Admin*',
      nsfw: 'los comandos *NSFW*',
      bot: 'el *Bot en este grupo*'
    }
    const featureTitles = {
      antilinks: 'AntiEnlace',
      economy: 'Economía',
      gacha: 'Gacha',
      audios: 'Audios',
      adminonly: 'AdminOnly',
      nsfw: 'NSFW',
      bot: 'Bot'
    }
    const normalizedKey = mapTerms[command] || command

    if (command === 'banchat') {
      chatData.isBanned = true
      return client.reply(m.chat, `💙 Has *desactivado* ${featureNames.bot}.\n_(El bot ya no responderá a ningún comando ni audio en este grupo)_`, m, global.miku)
    }
    if (command === 'unbanchat') {
      chatData.isBanned = false
      return client.reply(m.chat, `💙 Has *activado* ${featureNames.bot}.`, m, global.miku)
    }

    const current = normalizedKey === 'bot' ? !chatData.isBanned : chatData[normalizedKey] === true
    const estado = current ? '✅ Activado' : '❌ Desactivado'
    const nombreBonito = featureNames[normalizedKey] || `la función *${normalizedKey}*`
    const titulo = featureTitles[normalizedKey] || normalizedKey
    if (!stateArg) {
      return client.reply(m.chat, `💙 *${titulo}* 💙\n\n🎵 Un administrador puede activar o desactivar ${nombreBonito} utilizando:\n\n💙 _Habilitar ›_ *${usedPrefix + normalizedKey} enable*\n💙 _Deshabilitar ›_ *${usedPrefix + normalizedKey} disable*\n\n💙 *Estado actual ›* ${estado}`, m, global.miku)
    }
    if (!validStates.includes(stateArg)) {
      return client.reply(m.chat, `💙 Estado no válido. Usa *on*, *off*, *enable* o *disable*\n\nEjemplo:\n${usedPrefix}${normalizedKey} enable`, m, global.miku)
    }
    const enabled = ['on', 'enable'].includes(stateArg)
    if (chatData[normalizedKey] === enabled) {
      return client.reply(m.chat, `💙 *${titulo}* ya estaba *${enabled ? 'activado' : 'desactivado'}*.`, m, global.miku)
    }
    if (normalizedKey === 'bot') {
      chatData.isBanned = !enabled
    } else {
      chatData[normalizedKey] = enabled
    }
    return client.reply(m.chat, `💙 Has *${enabled ? 'activado' : 'desactivado'}* ${nombreBonito}.`, m, global.miku)
  }
};