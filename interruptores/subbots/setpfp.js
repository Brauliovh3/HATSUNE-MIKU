import * as Jimp from 'jimp';
import subBotManager from '../../nucleo/subbotManager.js'

async function resizeImage(media) {
  const jimp = await Jimp.read(media)
  const min = jimp.getWidth()
  const max = jimp.getHeight()
  const cropped = jimp.crop(0, 0, min, max)
  return { img: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG), preview: await cropped.normalize().getBufferAsync(Jimp.MIME_JPEG) }
}

export default {
  command: ['setimage', 'setpfp'],
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
    
    const q = m.quoted || m
    const mime = (q.msg || q).mimetype || q.mediaType || ''
    if (!/image/g.test(mime)) return m.reply('💙 Debes enviar o citar una imagen para cambiar la foto de perfil del bot.', m, global.miku)
    const media = await q.download()
    if (!media) return m.reply('💙 No se pudo descargar la imagen.', m, global.miku)
    const jid = client.user.id.split(':')[0] + '@s.whatsapp.net'
    if (args[1] === 'full') {
      const { img } = await resizeImage(media)
      await client.query({ tag: 'iq', attrs: { to: jid, type: 'set', xmlns: 'w:profile:picture', }, content: [{ tag: 'picture', attrs: { type: 'image' }, content: img }]})
    } else {
      await client.updateProfilePicture(jid, media)
    }
    
    const botName = config?.namebot || (isSubBot ? 'Subbot' : 'Bot')
    return m.reply(`💙 Se ha actualizado la foto de perfil de *${botName}*!`, m, global.miku)
  },
};