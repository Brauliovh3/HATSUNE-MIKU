import fetch from 'node-fetch';
import FormData from 'form-data';
import subBotManager from '../../nucleo/subbotManager.js'

export default {
  command: ['setbanner', 'setbotbanner'],
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
    if (!value && !m.quoted && !m.message.imageMessage && !m.message.videoMessage)
      return m.reply('💙 Debes enviar o citar una imagen o video para cambiar el banner del bot.')
    
    const botName = config?.namebot || (isSubBot ? 'Subbot' : 'Bot')
    
    if (value.startsWith('http')) {
      config.banner = value
      return m.reply(`💙 Se ha actualizado el banner de *${botName}*!`)
    }
    const q = m.quoted ? m.quoted : m.message.imageMessage ? m : m
    const mime = (q.msg || q).mimetype || q.mediaType || ''
    if (!/image\/(png|jpe?g|gif)|video\/mp4/.test(mime))
      return m.reply('💙 Responde a una imagen válida.')
    const buffer = await q.download()
    if (!buffer) return m.reply('💙 No se pudo descargar la imagen.')
    const url = await uploadImage(buffer, mime)
    config.banner = url
    return m.reply(`💙 Se ha actualizado el banner de *${botName}*!`)
  },
};

async function uploadImage(buffer, mime) {
  const body = new FormData()
  body.append('files[]', buffer, `file.${mime.split('/')[1]}`)
  const res = await fetch('https://uguu.se/upload.php', { method: 'POST', body, headers: body.getHeaders() })
  const json = await res.json()
  return json.files?.[0]?.url
}