import fetch from 'node-fetch';

export default {
  command: ['tiktok', 'tt', 'tiktoksearch', 'ttsearch', 'tts'],
  category: 'downloader',
  run: async (client, m, args, usedPrefix, command) => {
    if (!args.length) {
      return m.reply(`💙 Por favor, ingresa un término de búsqueda o enlace de TikTok.`)
    }
    const text = args.join(" ")
    const isUrl = /(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/gi.test(text)
    const endpoint = isUrl  ? `${global.APIs.stellar.url}/dl/tiktok?url=${encodeURIComponent(text)}&key=${global.APIs.stellar.key}` : `${global.APIs.stellar.url}/search/tiktok?query=${encodeURIComponent(text)}&key=${global.APIs.stellar.key}`
    try {
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error(`El servidor respondió con ${res.status}`)
      const json = await res.json()
      if (!json.status) return m.reply('💙 No se encontró contenido válido en TikTok.')
      if (isUrl) {
        const { title, duration, dl, author, stats, created_at, type } = json.data
        if (!dl || (Array.isArray(dl) && dl.length === 0)) return m.reply('💙 Enlace inválido o sin contenido descargable.')
        const caption = `💙🌱 ㅤ۟∩　ׅ　★ ໌　ׅ　🅣𝗂𝗄𝖳𝗈𝗄 🅓ownload　ׄᰙ

💙 *Título:* ${title || 'Sin título'}
🌱 *Autor:* ${author?.nickname || author?.unique_id || 'Desconocido'}
💙 *Duración:* ${duration || 'N/A'}
🌱 *Likes:* ${(stats?.likes || 0).toLocaleString()}
💙 *Comentarios:* ${(stats?.comments || 0).toLocaleString()}
🌱 *Vistas:* ${(stats?.views || stats?.plays || 0).toLocaleString()}
💙 *Compartidos:* ${(stats?.shares || 0).toLocaleString()}
🌱 *Fecha:* ${created_at || 'N/A'}`.trim()
        if (type === 'image') {
          const medias = dl.map(url => ({ type: 'image', data: { url }, caption }))
          await client.sendAlbumMessage(m.chat, medias, { quoted: m })
          const audioRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(text)}&hd=1`)
          const audioJson = await audioRes.json()
          const audioUrl = audioJson?.data?.play
          if (audioUrl) {
            await client.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: 'audio/mp4', fileName: 'tiktok_audio.mp4' }, { quoted: m })
          }
        } else {
          const videoUrl = Array.isArray(dl) ? dl[0] : dl
          await client.sendMessage(m.chat, { video: { url: videoUrl }, caption }, { quoted: m })
        }
      } else {
        const validResults = json.data?.filter(v => v.dl)
        if (!validResults || validResults.length < 2) {
          return m.reply('💙 Se requieren al menos 2 resultados válidos con contenido.')
        }
        const medias = validResults.filter(v => typeof v.dl === 'string' && v.dl.startsWith('http')).map(v => {
            const caption = `💙🌱 ㅤ۟∩　ׅ　★ ໌　ׅ　🅣𝗂𝗄𝖳𝗈𝗄 🅓ownload　ׄᰙ

💙 *Título:* ${v.title || 'Sin título'}
🌱 *Autor:* ${v.author?.nickname || 'Desconocido'} ${v.author?.unique_id ? `@${v.author.unique_id}` : ''}
💙 *Duración:* ${v.duration || 'N/A'}
🌱 *Likes:* ${(v.stats?.likes || 0).toLocaleString()}
💙 *Comentarios:* ${(v.stats?.comments || 0).toLocaleString()}
🌱 *Vistas:* ${(v.stats?.views || 0).toLocaleString()}
💙 *Compartidos:* ${(v.stats?.shares || 0).toLocaleString()}
🌱 *Audio:* ${v.music?.title || `[${v.author?.nickname || 'No disponible'}] original sound - ${v.author?.unique_id || 'unknown'}`}`.trim()
            return { type: 'video', data: { url: v.dl }, caption }
          }).slice(0, 10)
        await client.sendAlbumMessage(m.chat, medias, { quoted: m })
      }
    } catch (e) {
      await m.reply(`> 💙 HATSUNE MIKU 💙 An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> 🌱 [Error: *${e.message}*]`)
    }
  },
}