import yts from 'yt-search'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { DOWNLOAD_TMP_DIR, STORAGE_LIMITS, ensureDir, hasEnoughDiskSpace, isNoSpaceError, cleanProjectStorage, readableBytes } from '../../nucleo/system/storage.js'

const _h=[82,101,115,116,46,97,112,105,99,97,117,115,97,115,46,120,121,122].map(c=>String.fromCharCode(c)).join('')
const NEW_API_BASE = process.env.NEW_API_BASE || `https://${_h}`
const NEW_API_KEY = process.env.NEW_API_KEY || [68,69,80,79,79,76,45,107,101,121,50,53,50,53,56,48].map(c=>String.fromCharCode(c)).join('')
const ALYA_KEY = [68,69,80,79,79,76,45,107,101,121,54,48,48,49,53,48,57,49].map(c => String.fromCharCode(c)).join('')
const ALYA_TIMEOUT_MS = Number(process.env.ALYA_TIMEOUT_MS || 15000)
const ALYA_RETRIES = Number(process.env.ALYA_RETRIES || 2)
const ALYA_RETRY_DELAY_MS = Number(process.env.ALYA_RETRY_DELAY_MS || 800)

const DIVIDER_START = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮`
const DIVIDER_END   = `╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`

const activeYouTubeDownloads = global.activeYouTubeDownloads || (global.activeYouTubeDownloads = new Map())

function extractYouTubeId(url) {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9\-_]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9\-_]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9\-_]{11})/,
  ]
  for (const p of patterns) {
    const match = String(url || '').match(p)
    if (match) return match[1]
  }
  return null
}

function formatViews(views) {
  if (!views && views !== 0) return 'No disponible'
  const n = parseInt(views)
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}

async function fetchJson(url, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    const text = await res.text()
    const trimmed = text.trim()
    const start = trimmed.indexOf('{')
    if (start === -1) return null
    return JSON.parse(trimmed.substring(start))
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function fetchJsonWithRetry(url, timeoutMs = 15000, maxRetries = 2, delayMs = 800) {
  for (let i = 1; i <= maxRetries; i++) {
    const json = await fetchJson(url, timeoutMs)
    if (json && json.status !== false) return json
    if (json && json.status === false) {
      const msg = String(json.error || json.msg || '').toLowerCase()
      const isRetriable =
        msg.includes('reintenta') ||
        msg.includes('procesando') ||
        msg.includes('descarga fallida') ||
        msg.includes('timeout')
      if (!isRetriable) return json
    }
    if (i < maxRetries) await new Promise(r => setTimeout(r, delayMs * i))
  }
  return null
}

function pickFirstUrl(obj, paths = []) {
  for (const p of paths) {
    let cur = obj
    for (const k of p.split('.')) {
      if (cur == null) { cur = null; break }
      cur = cur[k]
    }
    if (typeof cur === 'string' && /^https?:\/\//i.test(cur)) return cur
  }
  return null
}

function collectUrls(value, out = []) {
  if (!value) return out
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) out.push(value)
    return out
  }
  if (Array.isArray(value)) {
    for (const v of value) collectUrls(v, out)
    return out
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value)) collectUrls(v, out)
  }
  return out
}

function extractAlyaDownloadUrl(json = {}, kind = 'audio') {
  const preferredPaths = kind === 'video'
    ? [
        'data.dl',
        'data.url',
        'download.url',
        'result.dl',
        'result.url',
        'url',
      ]
    : [
        'data.dl',
        'data.url',
        'download.url',
        'result.dl',
        'result.url',
      ]

  const preferred = pickFirstUrl(json, preferredPaths)
  if (preferred) return preferred

  const all = collectUrls(json)
  const filtered = all.filter((u) => {
    const s = String(u).toLowerCase()
    if (kind === 'audio') return /\.(mp3|m4a|aac|ogg)(\?|$)/i.test(s) || /ytmp3|audio/i.test(s)
    return /\.(mp4|mkv|webm)(\?|$)/i.test(s) || /ytmp4|video|play\//i.test(s)
  })

  return filtered[0] || null
}

async function getNewApiDownload(youtubeUrl, type, timeoutMs = 20000) {
  const url = `${NEW_API_BASE}/api/v1/descargas/youtube?apikey=${encodeURIComponent(NEW_API_KEY)}&url=${encodeURIComponent(youtubeUrl)}&type=${type}`
  const json = await fetchJsonWithRetry(url, timeoutMs, 2, 1500)
  if (json?.status === true && json?.data?.download?.url) {
    return {
      downloadUrl: json.data.download.url,
      isGoogleVideo: /googlevideo\.com/i.test(json.data.download.url),
      title: json.data.title || json.data.uploader || 'Download',
      thumbnail: json.data.thumbnail || null,
    }
  }
  return null
}

function getAudioApis(youtubeUrl) {
  return [
    async () => {
      const alyaUrl = `https://api.alyacore.xyz/dl/ytmp3v2?url=${encodeURIComponent(youtubeUrl)}&key=${encodeURIComponent(ALYA_KEY)}`
      const alyaJson = await fetchJsonWithRetry(alyaUrl, ALYA_TIMEOUT_MS, ALYA_RETRIES, ALYA_RETRY_DELAY_MS)
      const alyaDl = alyaJson?.status !== false ? (alyaJson?.data?.dl || extractAlyaDownloadUrl(alyaJson, 'audio')) : null
      if (alyaDl) return { downloadUrl: alyaDl, isGoogleVideo: false, title: alyaJson?.data?.title || 'Audio', thumbnail: alyaJson?.data?.thumbnail || null }
      throw new Error('AlyaCore v2 Falló')
    },
    async () => {
      const alyaUrl = `https://api.alyacore.xyz/dl/ytmp3?url=${encodeURIComponent(youtubeUrl)}&key=${encodeURIComponent(ALYA_KEY)}`
      const alyaJson = await fetchJsonWithRetry(alyaUrl, ALYA_TIMEOUT_MS, ALYA_RETRIES, ALYA_RETRY_DELAY_MS)
      const alyaDl = alyaJson?.status !== false ? (alyaJson?.data?.dl || extractAlyaDownloadUrl(alyaJson, 'audio')) : null
      if (alyaDl) return { downloadUrl: alyaDl, isGoogleVideo: false, title: alyaJson?.data?.title || 'Audio', thumbnail: alyaJson?.data?.thumbnail || null }
      throw new Error('AlyaCore v1 Falló')
    },
    async () => {
      const newApiResult = await getNewApiDownload(youtubeUrl, 'audio')
      if (newApiResult) return newApiResult
      throw new Error('NewAPI Falló')
    }
  ];
}

function getVideoApis(youtubeUrl, quality = '360') {
  return [
    async () => {
      const alyaUrl = `https://api.alyacore.xyz/dl/ytmp4v2?url=${encodeURIComponent(youtubeUrl)}&quality=${quality}&key=${encodeURIComponent(ALYA_KEY)}`
      const alyaJson = await fetchJsonWithRetry(alyaUrl, ALYA_TIMEOUT_MS, ALYA_RETRIES, ALYA_RETRY_DELAY_MS)
      const alyaDl = alyaJson?.status !== false ? (alyaJson?.data?.dl || extractAlyaDownloadUrl(alyaJson, 'video')) : null
      if (alyaDl) return { downloadUrl: alyaDl, isGoogleVideo: /googlevideo\.com/i.test(alyaDl), title: alyaJson?.data?.title || 'Video', thumbnail: alyaJson?.data?.thumbnail || null }
      throw new Error('AlyaCore v2 Falló')
    },
    async () => {
      const alyaUrl = `https://api.alyacore.xyz/dl/ytmp4?url=${encodeURIComponent(youtubeUrl)}&quality=${quality}&key=${encodeURIComponent(ALYA_KEY)}`
      const alyaJson = await fetchJsonWithRetry(alyaUrl, ALYA_TIMEOUT_MS, ALYA_RETRIES, ALYA_RETRY_DELAY_MS)
      const alyaDl = alyaJson?.status !== false ? (alyaJson?.data?.dl || extractAlyaDownloadUrl(alyaJson, 'video')) : null
      if (alyaDl) return { downloadUrl: alyaDl, isGoogleVideo: /googlevideo\.com/i.test(alyaDl), title: alyaJson?.data?.title || 'Video', thumbnail: alyaJson?.data?.thumbnail || null }
      throw new Error('AlyaCore v1 Falló')
    },
    async () => {
      const newApiResult = await getNewApiDownload(youtubeUrl, 'video', 20000)
      if (newApiResult) return newApiResult
      throw new Error('NewAPI Falló')
    }
  ];
}

async function downloadFile(url, filename, isGoogleVideo = false) {
  const tempDir = ensureDir(DOWNLOAD_TMP_DIR)
  const tempPath = path.join(tempDir, filename)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90000)
  const headers = isGoogleVideo
    ? {
        'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
      }
    : {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
      }
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow', headers })
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
      throw new Error(`Archivo muy pequeno (${stats.size} bytes)`)
    }
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

async function fetchThumbnailBuffer(url) {
  if (!url) return null
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length > 500 ? buf : null
  } catch {
    return null
  }
}

function getMikuMenuText(title, author, duration, views) {
  return (
    `${DIVIDER_START}\n` +
    `│💙 *MIKU YOUTUBE PLAY*\n` +
    `│\n` +
    `│🎵 *Título:* ${String(title).substring(0, 45)}\n` +
    (author   ? `│ 👤 *Canal:* ${author}\n`                   : '') +
    (duration ? `│ ⏱️ *Duración:* ${duration}\n`                 : '') +
    (views    ? `│ 👁️ *Vistas:* ${formatViews(views)}\n` : '') +
    `│\n` +
    `│ 『 *OPCIONES DE DESCARGA* 』\n` +
    `│ 1️⃣ 🌱 Audio MP3\n` +
    `│ 2️⃣ 🌱 Video 360p\n` +
    `│ 3️⃣ 🌱 Doc MP4\n` +
    `│ 4️⃣ 🌱 Doc MP3\n` +
    `│\n` +
    `│✨ _Responde con número 1-4_\n` +
    `│⏳ _Expira en 10 minutos_\n` +
    `│💎 _Costo: 🌱 500 Cebollines_\n` +
    `${DIVIDER_END}`
  )
}

function deleteFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {}
}

export async function processDownload(conn, m, videoInfo, option) {
  const lockKey = m.chat
  if (activeYouTubeDownloads.has(lockKey)) {
    await conn.reply(m.chat, `${DIVIDER_START}\n│ ⏳ *DESCARGA EN PROCESO*\n│\n│ 🎵 Ya hay una descarga activa en este chat.\n│ 🌱 Por favor, espera a que termine.\n${DIVIDER_END}`, m)
    return false
  }
  activeYouTubeDownloads.set(lockKey, { startedAt: Date.now(), sender: m.sender })
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
  const isAudio    = option === 1 || option === 4
  const asDocument = option === 3 || option === 4
  const fileName   = String(videoInfo.title || 'descarga').replace(/[^\w\s]/gi, '').trim().substring(0, 50) || 'descarga'
  const ext        = isAudio ? 'mp3' : 'mp4'
  
  
  const mimetype   = isAudio ? 'audio/mp4' : 'video/mp4' 
  
  let tempFilePath = null
  let success = false
  let lastError = null

  const apis = isAudio ? getAudioApis(videoInfo.url) : getVideoApis(videoInfo.url, '360')

  for (const api of apis) {
    try {
      const data = await api()
      if (!data || !data.downloadUrl) continue

      let thumbnailBuffer = null
      if (isAudio) {
        const thumbUrl = data.thumbnail || videoInfo.thumbnail || `https://i.ytimg.com/vi/${extractYouTubeId(videoInfo.url) || ''}/hqdefault.jpg`
        thumbnailBuffer = await fetchThumbnailBuffer(thumbUrl)
      }

      let retries = 3
      let delay = 2000
      while (retries > 0) {
        try {
          tempFilePath = await downloadFile(data.downloadUrl, `${Date.now()}_${fileName}.${ext}`, data.isGoogleVideo ?? false)

          const adReply = {
            title: videoInfo.title ? videoInfo.title.substring(0, 60) : 'Descarga',
            body: '💙 Hatsune Miku Bot',
            sourceUrl: videoInfo.url,
            mediaType: 1,
            renderLargerThumbnail: false
          }
          if (thumbnailBuffer) {
            adReply.thumbnail = thumbnailBuffer
          } else {
            adReply.thumbnailUrl = videoInfo.thumbnail || `https://i.ytimg.com/vi/${extractYouTubeId(videoInfo.url) || ''}/hqdefault.jpg`
          }

          if (asDocument) {
            await conn.sendMessage(m.chat, {
              document: { url: tempFilePath }, 
              mimetype,
              fileName: `${fileName}.${ext}`,
              caption: `📄 ${videoInfo.title}`,
              contextInfo: { externalAdReply: adReply }
            }, { quoted: m })
          } else if (isAudio) {
            adReply.body = '🎵 Hatsune Miku Audio'
            await conn.sendMessage(m.chat, {
              audio: { url: tempFilePath }, 
              mimetype: 'audio/mp4', 
              ptt: false,
              fileName: `${fileName}.mp3`,
              contextInfo: { externalAdReply: adReply }
            }, { quoted: m })
          } else {
            await conn.sendMessage(m.chat, {
              video: { url: tempFilePath },
              mimetype: 'video/mp4',
              fileName: `${fileName}.mp4`,
              caption: `🎬 ${videoInfo.title}`,
            }, { quoted: m })
          }

          success = true
          
          deleteFile(tempFilePath) 
          tempFilePath = null
          break
        } catch (e) {
          if (tempFilePath) {
            deleteFile(tempFilePath)
            tempFilePath = null
          }
          retries--
          if (retries === 0) throw e
          if (e.message?.includes('rate-overlimit') || e.message?.includes('timed out') || e.message?.includes('timeout') || e.message?.includes('socket hang up')) {
            await new Promise(resolve => setTimeout(resolve, delay))
            delay *= 2
          } else {
            throw e
          }
        }
      }

      if (success) {
        break
      }
    } catch (e) {
      lastError = e
      continue
    }
  }

  try {
    if (!success) {
      throw lastError || new Error('Todas las APIs están caídas o devuelven archivos corruptos.')
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    const chat = global.db?.data?.chats?.[m.chat]
    const user = chat?.users?.[m.sender]
    if (user && !user.monedaDeducted) {
      user.coins = (user.coins || 0) - 500
      user.monedaDeducted = true
      conn.reply(m.chat, '💙 Has utilizado 🌱 500 *Cebollines*', m)
    }
    return true
  } catch (error) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await conn.reply(m.chat, `${DIVIDER_START}\n│ 💔 *ERROR DE DESCARGA*\n│\n│ 🎵 Hubo un problema al procesar.\n│ 🌱 Detalle: ${error.message}\n│ ✨ Inténtalo de nuevo más tarde.\n${DIVIDER_END}`, m)
    throw error
  } finally {
    activeYouTubeDownloads.delete(lockKey)
  }
}

export async function processYouTubeButton(conn, m) {
  let buttonId = m.body || m.text || null
  if (m.message?.buttonsResponseMessage) {
    buttonId = m.message.buttonsResponseMessage.selectedButtonId
  }
  if (m.message?.templateButtonReplyMessage) {
    buttonId = m.message.templateButtonReplyMessage.selectedId
  }
  if (m.message?.interactiveResponseMessage) {
    try {
      const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson
      if (paramsJson) {
        const params = JSON.parse(paramsJson)
        buttonId = params.id
      }
    } catch (e) {}
  }
  if (!buttonId) return false
  let option = null
  if      (buttonId === '1' || (buttonId.includes('youtube_audio_') && !buttonId.includes('_doc'))) option = 1
  else if (buttonId === '2' || buttonId.includes('youtube_video_360_'))                        option = 2
  else if (buttonId === '3' || buttonId.includes('youtube_video_doc_'))                        option = 3
  else if (buttonId === '4' || buttonId.includes('youtube_audio_doc_'))                        option = 4
  if (!option) return false
  const chat = global.db?.data?.chats?.[m.chat]
  const user = chat?.users?.[m.sender]
  if (!user?.lastYTSearch) {
    await conn.reply(m.chat, `${DIVIDER_START}\n│ ⏳ *TIEMPO AGOTADO*\n│\n│ 🎵 No hay búsqueda activa.\n│ 🌱 Realiza una nueva búsqueda con .play\n${DIVIDER_END}`, m)
    return false
  }
  if (Date.now() - (user.lastYTSearch.timestamp || 0) > 10 * 60 * 1000) {
    await conn.reply(m.chat, `${DIVIDER_START}\n│ ⏳ *BÚSQUEDA EXPIRADA*\n│\n│ 🎵 La búsqueda expiró.\n│ 🌱 Realiza una nueva búsqueda con .play\n${DIVIDER_END}`, m)
    return false
  }
  user.monedaDeducted = false
  try {
    await processDownload(conn, m, user.lastYTSearch.videoInfo, option)
    user.lastYTSearch = null
    return true
  } catch {
    return false
  }
}

export default {
  command: ['play', 'ytdlv2'],
  category: 'downloader',
  register: true,
  run: async (conn, m, args, usedPrefix, command) => {
    try {
      if (!args.length) {
        const rawBody = String(m.text || m.body || '').trim()
        const cmdStr = String(usedPrefix || '') + String(command || '')
        const stripped = rawBody.replace(new RegExp('^' + cmdStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim()
        if (stripped) args = stripped.split(/\s+/)
      }
      if (!args.length) {
        return conn.reply(
          m.chat,
          `${DIVIDER_START}\n` +
          `│ 💙 *YOUTUBE PLAY*\n` +
          `│\n` +
          `│ 🎵 *Uso correcto:*\n` +
          `│ \`${usedPrefix}${command} <canción o URL>\`\n` +
          `│\n` +
          `│ 🌱 *Ejemplo:*\n` +
          `│ \`${usedPrefix}${command} miku world is mine\`\n` +
          `│\n` +
          `│ 💎 _Costo: 🌱 500 Cebollines_\n` +
          `${DIVIDER_END}`,
          m
        )
      }
      const query = args.join(' ')
      await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })
      let videoUrl, videoTitle, videoDuration, videoThumbnail, videoViews, videoAuthor
      if (query.includes('youtu.be') || query.includes('youtube.com')) {
        videoUrl       = query.trim()
        videoTitle     = 'Video de YouTube'
        videoThumbnail = `https://i.ytimg.com/vi/${extractYouTubeId(videoUrl) || ''}/hqdefault.jpg`
      } else {
        const result = await yts(query)
        const video  = result?.videos?.[0]
        if (!video) {
          await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
          return conn.reply(m.chat, `${DIVIDER_START}\n│ 💔 *SIN RESULTADOS*\n│\n│ 🎵 No se encontraron canciones para tu búsqueda.\n${DIVIDER_END}`, m)
        }
        videoUrl       = video.url
        videoTitle     = video.title
        videoDuration  = video.timestamp
        videoThumbnail = video.thumbnail
        videoViews     = video.views
        videoAuthor    = video.author?.name
      }
      const chat = global.db?.data?.chats?.[m.chat]
      const user = chat?.users?.[m.sender]
      const videoInfo = { url: videoUrl, title: videoTitle, thumbnail: videoThumbnail }
      if (user) user.lastYTSearch = { videoInfo, timestamp: Date.now() }
      const videoId  = extractYouTubeId(videoUrl) || ''
      const infoText = getMikuMenuText(videoTitle, videoAuthor, videoDuration, videoViews)
      try {
        const thumbBuf = await fetchThumbnailBuffer(videoThumbnail)
        if (!thumbBuf) throw new Error('sin thumbnail')
        await conn.sendMessage(m.chat, {
          image: thumbBuf,
          caption: infoText,
          footer: '💙 Hatsune Miku Bot',
          buttons: [
            { buttonId: `youtube_audio_${videoId}`, buttonText: { displayText: '🎵 Audio MP3' }, type: 1 },
            { buttonId: `youtube_video_360_${videoId}`, buttonText: { displayText: '🎬 Video 360p' }, type: 1 },
            { buttonId: `youtube_video_doc_${videoId}`, buttonText: { displayText: '📁 Doc MP4' }, type: 1 },
            { buttonId: `youtube_audio_doc_${videoId}`, buttonText: { displayText: '📄 Doc MP3' }, type: 1 },
          ],
          headerType: 4,
          viewOnce: true,
        }, { quoted: m })
      } catch (e) {
        await conn.reply(m.chat, infoText, m)
      }
    } catch (error) {
      await conn.reply(m.chat, `${DIVIDER_START}\n│ 💔 *ERROR*\n│\n│ 🎵 Hubo un error de conexión.\n│ 🌱 Detalle: ${error.message}\n${DIVIDER_END}`, m)
    }
  },
}