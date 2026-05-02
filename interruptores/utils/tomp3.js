import { toMp3 } from '../../utils/tomp3.js'

const DIVIDER_START = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮`
const DIVIDER_END   = `╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`

export default {
  command: ['tomp3', 'toaudio', 'mp3'],
  category: 'utils',
  run: async (client, m, args, usedPrefix, command) => {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || ''
    
    if (!/video|audio/.test(mime)) {
      return m.reply(`💙 Responde a un *video* o *nota de voz* con *${usedPrefix + command}* para convertirlo a MP3.`)
    }

    await m.react('⏳')
    
    try {
      const media = await q.download()
      if (!media) throw new Error('No se pudo descargar el archivo.')
      
      const ext = mime.split('/')[1] || 'mp4'
      const mp3Buffer = await toMp3(media, ext)

      const caption = `${DIVIDER_START}\n│ 💙 *CONVERSIÓN A MP3*\n│\n│ 🎵 *Estado:* Completado ✓\n│ 🌱 *Origen:* ${mime.split('/')[1].toUpperCase()}\n${DIVIDER_END}`

      await client.sendMessage(m.chat, {
        audio: mp3Buffer,
        mimetype: 'audio/mpeg',
        ptt: false,
        contextInfo: {
          ...global.miku.contextInfo,
          externalAdReply: {
            ...global.miku.contextInfo.externalAdReply,
            title: '💙 Miku MP3 Converter',
            body: '✨ Conversión finalizada con éxito',
          }
        }
      }, { quoted: m })

      await m.react('✅')
    } catch (e) {
      await m.react('❌')
      console.error(e)
      m.reply(`${DIVIDER_START}\n│ 💔 *ERROR DE CONVERSIÓN*\n│\n│ 🌱 Detalle: ${e.message}\n│ ✨ Inténtalo de nuevo.\n${DIVIDER_END}`)
    }
  }
}