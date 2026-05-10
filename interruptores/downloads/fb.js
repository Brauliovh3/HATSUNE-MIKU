import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { DOWNLOAD_TMP_DIR, STORAGE_LIMITS, ensureDir, hasEnoughDiskSpace, isNoSpaceError, cleanProjectStorage, readableBytes } from '../../nucleo/system/storage.js'

export default {
  command: ['fb', 'facebook'],
  category: 'downloader',
  run: async (client, m, args, usedPrefix, command) => {
    if (!args[0]) {
      return m.reply(`💙 Ingresa un enlace de Facebook.\nEjemplo: *${usedPrefix}${command} https://fb.watch/xxx*`)
    }
    if (!args[0].match(/facebook\.com|fb\.watch|video\.fb\.com/)) {
      return m.reply(`💙 Enlace inválido. Envía un link de Facebook válido.\nEjemplo: *${usedPrefix}${command} https://fb.watch/xxx*`)
    }

    await m.react('⏳')

    
    const hasSpace = await hasEnoughDiskSpace(STORAGE_LIMITS.maxDownloadBytes)
    if (!hasSpace) {
      await m.reply('💙 *Limpiando espacio de almacenamiento...*', global.miku)
      const cleaned = await cleanProjectStorage()
      if (cleaned.freed > 0) {
        await m.reply(`💙 *Liberados ${readableBytes(cleaned.freed)} en ${cleaned.cleaned} archivos*`, global.miku)
      }
      
      const hasSpaceAfter = await hasEnoughDiskSpace(STORAGE_LIMITS.maxDownloadBytes)
      if (!hasSpaceAfter) {
        await m.react('❌')
        return m.reply('💙 *Espacio insuficiente*\n\nEl servidor no tiene espacio disponible para descargar videos.\nContacta al administrador.', global.miku)
      }
    }

    try {
      const data = await getFacebookMedia(args[0])
      if (!data) {
        await m.react('❌')
        return m.reply('💙 No se pudo obtener el contenido.', global.miku)
      }
      
      const caption = `╭━━━━━━━━━━━━━━━╮
┃ 💙 *FACEBOOK DOWNLOAD*
┃━━━━━━━━━━━━━━━${data.title ? `\n┃ 📌 ${data.title}` : ''}${data.resolution ? `\n┃ 🎬 ${data.resolution}` : ''}${data.duration ? `\n┃ ⏱️ ${data.duration}` : ''}
╰━━━━━━━━━━━━━━━╯`
      
     
      const filename = `fb_${Date.now()}.${data.format || 'mp4'}`
      const tempPath = await downloadFile(data.url, filename)

      try {
        if (data.type === 'video') {
          await client.sendMessage(m.chat, {
            video: fs.readFileSync(tempPath),
            caption,
            mimetype: 'video/mp4',
            ...global.miku
          }, { quoted: m })
        } else if (data.type === 'image') {
          await client.sendMessage(m.chat, {
            image: fs.readFileSync(tempPath),
            caption,
            ...global.miku
          }, { quoted: m })
        } else {
          throw new Error('Contenido no soportado.')
        }
        await m.react('✅')
      } finally {
       
        try { fs.unlinkSync(tempPath) } catch {}
      }
    } catch (e) {
      await m.react('❌')

      
      if (isNoSpaceError(e)) {
      
        const cleaned = await cleanProjectStorage()
        let msg = '💙 *ERROR: Sin espacio en disco*\n\n'
        msg += 'El video es muy grande o el servidor no tiene espacio disponible.'
        if (cleaned.freed > 0) {
          msg += `\n\n🧹 Se liberaron ${readableBytes(cleaned.freed)} automáticamente.`
          msg += '\n💡 Intenta nuevamente el comando.'
        } else {
          msg += '\n\n📞 Contacta al administrador del servidor.'
        }
        return await m.reply(msg, global.miku)
      }

      await m.reply(`💙 *ERROR*\n\nOcurrió un error: ${e.message}`, global.miku)
    }
  }
}

async function downloadFile(url, filename) {
  const tempDir = ensureDir(DOWNLOAD_TMP_DIR)
  const tempPath = path.join(tempDir, filename)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90000)

  try {
    console.log(`[FB] Descargando: ${filename}`)
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
      }
    })
    clearTimeout(timer)

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

    const contentLength = Number(res.headers.get('content-length') || 0)
    if (contentLength > STORAGE_LIMITS.maxDownloadBytes) {
      throw new Error(`Archivo demasiado grande (${readableBytes(contentLength)}). Límite: ${readableBytes(STORAGE_LIMITS.maxDownloadBytes)}`)
    }

   
    if (!(await hasEnoughDiskSpace(contentLength || STORAGE_LIMITS.maxDownloadBytes))) {
      await cleanProjectStorage({ maxAgeMs: 0 })
      if (!(await hasEnoughDiskSpace(contentLength || STORAGE_LIMITS.maxDownloadBytes))) {
        throw new Error('No hay espacio libre suficiente para esta descarga.')
      }
    }

    const fileStream = fs.createWriteStream(tempPath)
    await new Promise((resolve, reject) => {
      let downloaded = 0
      res.body.on('data', (chunk) => {
        downloaded += chunk.length
        if (downloaded > STORAGE_LIMITS.maxDownloadBytes) {
          res.body.destroy(new Error(`Archivo demasiado grande. Límite: ${readableBytes(STORAGE_LIMITS.maxDownloadBytes)}`))
          return
        }
      })
      res.body.pipe(fileStream)
      res.body.on('error', reject)
      fileStream.on('finish', resolve)
      fileStream.on('error', reject)
    })

    const stats = fs.statSync(tempPath)
    if (stats.size < 1024) {
      fs.unlinkSync(tempPath)
      throw new Error(`Archivo muy pequeño (${stats.size} bytes)`)
    }

    console.log(`[FB] Descarga completada: ${readableBytes(stats.size)}`)
    return tempPath
  } catch (e) {
    clearTimeout(timer)
    if (fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath) } catch {}
    if (isNoSpaceError(e)) {
      await cleanProjectStorage({ maxAgeMs: 0 }).catch(() => {})
      throw new Error('ENOSPC: el disco se quedó sin espacio durante la descarga; se limpió el temporal.')
    }
    throw e
  }
}

async function getFacebookMedia(url) {
  const apis = [
    { endpoint: `${global.APIs.stellar.url}/dl/facebook?url=${encodeURIComponent(url)}&key=${global.APIs.stellar.key}`, extractor: res => {
        if (!res.status || !Array.isArray(res.resultados)) return null
        const hd = res.resultados.find(x => x.quality?.includes('720p') || x.quality?.includes('1080p'))
        const sd = res.resultados.find(x => x.quality?.includes('360p'))
        const media = hd || sd
        if (!media?.url) return null
        return { type: 'video', title: null, resolution: media.quality || null, format: 'mp4', url: media.url }
      }
    },
    { endpoint: `${global.APIs.ootaizumi.url}/downloader/facebook?url=${encodeURIComponent(url)}`, extractor: res => {
        if (!res.status || !res.result?.downloads?.length) return null
        const hd = res.result.downloads.find(x => x.quality?.includes('720p') || x.quality?.includes('1080p'))
        const sd = res.result.downloads.find(x => x.quality?.includes('360p'))
        const media = hd || sd
        if (!media?.url) return null
        return { type: media.url.includes('.jpg') ? 'image' : 'video', title: null, resolution: media.quality || null, format: media.url.includes('.jpg') ? 'jpg' : 'mp4', url: media.url, thumbnail: res.result.thumbnail || null }
      }
    },    
    { endpoint: `${global.APIs.vreden.url}/api/v1/download/facebook?url=${encodeURIComponent(url)}`, extractor: res => {
        if (!res.status || !res.result?.download) return null
        const hd = res.result.download.hd
        const sd = res.result.download.sd
        const urlVideo = hd || sd
        if (!urlVideo) return null
        return { type: 'video', title: res.result.title || null, resolution: hd ? 'HD' : 'SD', format: 'mp4', url: urlVideo, thumbnail: res.result.thumbnail || null, duration: res.result.durasi || null }
      }
    },
    { endpoint: `${global.APIs.delirius.url}/download/facebook?url=${encodeURIComponent(url)}`, extractor: res => {
        if (!res.urls || !Array.isArray(res.urls)) return null
        const hd = res.urls.find(x => x.hd)?.hd
        const sd = res.urls.find(x => x.sd)?.sd
        const urlVideo = hd || sd
        if (!urlVideo) return null
        return { type: 'video', title: res.title || null, resolution: hd ? 'HD' : 'SD', format: 'mp4', url: urlVideo }
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
