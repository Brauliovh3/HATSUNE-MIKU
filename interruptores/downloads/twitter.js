import fetch from 'node-fetch'

const _h=[142414141].map(c=>String.fromCharCode(c)).join('')
const NEW_API_BASE = process.env.NEW_API_BASE || `https://${_h}`
const NEW_API_KEY = process.env.NEW_API_KEY || [5112515155].map(c=>String.fromCharCode(c)).join('')

export default {
  command: ['twitter', 'x', 'xdl'],
  category: 'downloader',
  run: async (client, m, args, usedPrefix, command) => {
    if (!args[0]) {
      return m.reply(`💙 Ingresa un enlace de Twitter/X.\nEjemplo: *${usedPrefix}${command} https://x.com/user/status/xxx*`)
    }
    if (!args[0].match(/(twitter|x)\.com\/\w+\/status\//)) {
      return m.reply(`💙 Enlace inválido. Asegúrate de que sea de Twitter/X.\nEjemplo: *${usedPrefix}${command} https://x.com/user/status/xxx*`)
    }
    
    await m.react('⏳')
    
    try {
      const data = await getTwitterMedia(args[0])
      if (!data) {
        await m.react('❌')
        return m.reply('💙 No se pudo obtener el contenido.', m, global.miku)
      }
      const caption = `💙 *TWITTER DOWNLOAD* 💙

${data.title ? `💙 *Título:* ${data.title}\n` : ''}${data.author ? `🌱 *Autor:* ${data.author}\n` : ''}${data.date ? `💙 *Fecha:* ${data.date}\n` : ''}${data.duration ? `🌱 *Duración:* ${data.duration}\n` : ''}${data.resolution ? `💙 *Resolución:* ${data.resolution}\n` : ''}${data.views ? `🌱 *Vistas:* ${data.views}\n` : ''}${data.likes ? `💙 *Likes:* ${data.likes}\n` : ''}${data.comments ? `🌱 *Comentarios:* ${data.comments}\n` : ''}${data.retweets ? `💙 *Retweets:* ${data.retweets}\n` : ''}🌱 *Enlace:* ${args[0]}

💙 *HATSUNE MIKU* 💙`
      if (data.type === 'video') {
        await client.sendMessage(m.chat, { video: { url: data.url }, caption, mimetype: 'video/mp4', fileName: 'twitter.mp4' }, { quoted: m })
      } else if (data.type === 'image') {
        await client.sendMessage(m.chat, { image: { url: data.url }, caption }, { quoted: m })
      } else {
        throw new Error('Contenido no soportado.')
      }
      await m.react('✅')
    } catch (e) {
      await m.react('❌')
      await m.reply(`💙 *ERROR* 💙

💙 Ocurrió un error al ejecutar *${usedPrefix + command}*

🌱 *Error:* ${e.message}

💙 Inténtalo de nuevo o contacta soporte.`)
    }
  }
}

async function getTwitterMedia(url) {
  const apis = [
    { endpoint: `${NEW_API_BASE}/api/v1/descargas/twitter?apikey=${encodeURIComponent(NEW_API_KEY)}&url=${encodeURIComponent(url)}`, extractor: res => {
        if (!res.status || !res.data?.download?.url) return null
        return { type: res.data.download.type === 'video/mp4' ? 'video' : 'image', url: res.data.download.url }
      }
    },
    { endpoint: `${global.APIs.stellar.url}/dl/twitter?url=${encodeURIComponent(url)}&key=${global.APIs.stellar.key}`, extractor: res => {
        if (!res.status || !res.data?.result?.length) return null
        const media = res.data.result[0]
        return { type: res.data.type, title: res.data.title || null, duration: res.data.duration || null, resolution: media.quality || null, url: media.url, thumbnail: res.data.thumbnail || null }
      }
    },
    { endpoint: `${global.APIs.nekolabs.url}/downloader/twitter?url=${encodeURIComponent(url)}`, extractor: res => {
        if (!res.success || !res.result?.media?.length) return null
        const media = res.result.media[0]
        const variant = media.variants?.at(-1)
        return { type: media.type, title: res.result.title || null, resolution: variant?.resolution || null, url: variant?.url || null, thumbnail: media.thumbnail || null }
      }
    },
    { endpoint: `${global.APIs.delirius.url}/download/twitterv2?url=${encodeURIComponent(url)}`, extractor: res => {
        if (!res.status || !res.data?.media?.length) return null
        const media = res.data.media[0]
        const video = media.videos?.at(-1)
        return { type: media.type, title: res.data.description || null, author: res.data.author?.username || null, date: res.data.createdAt || null, duration: media.duration || null, resolution: video?.quality || null, url: video?.url || null, thumbnail: media.cover || null, views: res.data.view || null, likes: res.data.favorite || null, comments: res.data.replie || null, retweets: res.data.retweet || null }
      }
    },
    { endpoint: `${global.APIs.siputzx.url}/api/d/twitter?url=${encodeURIComponent(url)}`, extractor: res => {
        if (!res.status || !res.data?.downloadLink) return null
        return { type: 'video', title: res.data.videoTitle || null, url: res.data.downloadLink, thumbnail: res.data.imgUrl || null }
      }
    }
  ]

  for (const { endpoint, extractor } of apis) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(endpoint, { signal: controller.signal }).then(r => r.json())
      clearTimeout(timeout)
      const result = extractor(res)
      if (result) return result
    } catch {}
    await new Promise(r => setTimeout(r, 500))
  }
  return null
}
