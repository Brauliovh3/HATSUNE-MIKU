import { resolveLidToRealJid } from "../../nucleo/utils.js"
import subBotManager from '../../nucleo/subbotManager.js'

export default {
  command: ['setbotowner', 'setowner'],
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
    
    const text = args.join(' ').trim()
    const actual = config.owner || ''
    const botName = config?.namebot || (isSubBot ? 'Subbot' : 'Bot')
    const botType = isSubBot ? 'Socket' : 'Bot Principal'
    
    if (text.toLowerCase() === 'clear') {
      if (!actual) return m.reply(`💙 No hay ningún propietario asignado actualmente.`, m, global.miku)
      config.owner = ''
      return m.reply(`💙 Se ha eliminado el propietario del ${botType}.`, m, global.miku)
    }
    
    const mentionedJid = m.mentionedJid || []
    const who2 = mentionedJid.length > 0 ? mentionedJid[0] : (m.quoted ? m.quoted.sender : null)
    const who = who2 ? await resolveLidToRealJid(who2, client, m.chat) : null
    const limpio = text.replace(/[^0-9]/g, '')
    const nuevo = who || (limpio.length >= 10 ? (limpio.startsWith('52') && limpio.length === 12 ? `52${limpio[2] !== '1' ? '1' : ''}${limpio.slice(2)}@s.whatsapp.net` : `${limpio}@s.whatsapp.net`) : null)
    
    if (actual && ((!m.quoted && mentionedJid.length === 0 && !text) || (nuevo && actual === nuevo))) {
      return client.sendMessage(m.chat, { text: `💙 Ya tienes un dueño asignado @${actual.split('@')[0]}.\n\n🌱 Si quieres cambiarlo usa:\n> *${usedPrefix + command}* @${idBot.split('@')[0]}\n\n💙 Si quieres eliminar el dueño asignado usa:\n> *${usedPrefix + command} clear*`, mentions: [actual, idBot], ...global.miku }, { quoted: m })
    }
    
    if (!nuevo) return client.reply(m.chat, `💙 Debes mencionar al nuevo dueño del ${botType}.\n> Ejemplo: *${usedPrefix + command}* @${idBot.split('@')[0]}`, m, global.miku, { mentions: [idBot] })
    
    const [ownerActual, ownerNuevo] = [actual ? actual.split('@')[0] : null, nuevo.split('@')[0]]
    config.owner = nuevo
    
    return client.sendMessage(m.chat, { text: actual && actual !== nuevo ? `💙 El dueño del ${botType.toLowerCase()} ha sido cambiado de @${ownerActual} a @${ownerNuevo}!` : `💙 Se asignó a @${ownerNuevo} como nuevo propietario de *${botName}*!`, mentions: [nuevo, ...(actual && actual !== nuevo ? [actual] : [])], ...global.miku }, { quoted: m })
  },
}