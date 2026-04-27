import fetch from 'node-fetch'
import { proto, generateWAMessageFromContent, generateWAMessageContent } from '@whiskeysockets/baileys'

const TIKVID_API = 'https://tikvid.io/api'
const TIKVID_TOKEN = 'b38d39701ec772de08022ad2982ddaed2f04667463e01c52dddfeb1ad38706ac'
const TIKVID_EXP = '1775201104'

const _a = [82,101,115,116,46,97,112,105,99,97,117,115,97,115,46,120,121,122].map(c=>String.fromCharCode(c)).join('')
const _b = [68,69,80,79,79,76,45,107,101,121,50,53,50,53,56,48].map(c=>String.fromCharCode(c)).join('')
const NEW_API_BASE = process.env.NEW_API_BASE || `https://${_a}`
const NEW_API_KEY = process.env.NEW_API_KEY || _b
const ALYA_BASE = 'https://api.alyacore.xyz'
const ALYA_KEY = [68,69,80,79,79,76,45,107,101,121,54,48,48,49,53,48,57,49].map(c => String.fromCharCode(c)).join('')
const DOWNLOAD_COMMANDS = new Set(['tiktok', 'tt'])
const SEARCH_COMMANDS = new Set(['tiktoksearch', 'ttsearch', 'tts'])
const IMAGE_COMMANDS = new Set(['tiktokimg', 'ttimg'])
const MP3_COMMANDS = new Set(['tiktokmp3', 'ttmp3'])

const MIN_VIDEO_SIZE = 51200 
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 
const VIDEO_DOWNLOAD_TIMEOUT = 60000 
const PROBE_TIMEOUT = 8000
const FETCH_TIMEOUT = 15000

function isValidUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

function isTikTokUrl(text) {
  return /(?:https?:\/\/)?(?:www\.)?(?:vm|vt|m|t)?\.?tiktok\.com\/[^\s]+/i.test(String(text || ''))
}

function extractApiPayload(json) {
  return json?.data?.data || json?.data || json?.result || json?.results || null
}

async function fetchJson(url, options, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        ...(options?.headers || {}),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

async function fetchJsonWithRetry(url, options, maxRetries = 3, baseDelay = 2000) {
  let lastError
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchJson(url, options)
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

async function probeUrl(url, timeoutMs = PROBE_TIMEOUT) {
  if (!isValidUrl(url)) return null

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    Accept: '*/*',
    'Accept-Encoding': 'identity',
  }

  for (const method of ['HEAD', 'GET']) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        headers,
        signal: controller.signal,
      })
      if (!res.ok) continue

      const contentType = String(res.headers.get('content-type') || '').toLowerCase()
      const contentLength = Number(res.headers.get('content-length') || 0)
      
      if (method === 'HEAD' && contentLength === 0) continue

      return {
        ok: true,
        url: res.url || url,
        contentType,
        contentLength,
      }
    } catch {
      continue
    } finally {
      clearTimeout(timer)
    }
  }

  return null
}

async function safeBuffer(url, timeoutMs = VIDEO_DOWNLOAD_TIMEOUT) {
  if (!isValidUrl(url)) return null
  
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: '*/*',
        'Accept-Encoding': 'identity',
      },
    })
    if (!res.ok) return null

    const buf = Buffer.from(await res.arrayBuffer())
    
    
    if (buf.length < MIN_VIDEO_SIZE) return null
    if (buf.length > MAX_VIDEO_SIZE) return null

    const contentType = String(res.headers.get('content-type') || '').toLowerCase()
    
    return {
      buffer: buf,
      contentType,
      size: buf.length,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function uniqueUrls(list = []) {
  return [...new Set(list.filter(isValidUrl))]
}

function extractImages(data) {
  const candidates = [
    data?.images,
    data?.media?.images,
    data?.image_post,
    data?.imagePost,
    data?.photo,
    data?.photos,
    data?.slider_data,
    data?.item_info?.images,
    data?.image_post_info?.images,
    data?.imagePostInfo?.images,
  ]

  for (const entry of candidates) {
    if (!entry) continue
    if (Array.isArray(entry) && entry.length > 0) {
      const urls = entry.map((item) => {
        if (typeof item === 'string') return item
        return (
          item?.url ||
          item?.image ||
          item?.display_image ||
          item?.origin_url ||
          item?.download_url ||
          item?.imageURL?.urlList?.[0] ||
          item?.thumbnailList?.[0] ||
          ''
        )
      })
      const filtered = uniqueUrls(urls)
      if (filtered.length) return filtered
    }
  }

  return []
}

function normalizeTikTokData(data) {
  return {
    title: data?.title || data?.desc || data?.caption || 'Sin titulo',
    author: {
      nickname: data?.author?.nickname || data?.author?.name || data?.author?.username || data?.nickname || 'Desconocido',
      username: data?.author?.username || data?.author?.unique_id || data?.username || '',
      avatar: data?.author?.avatar || data?.author?.avatar_thumb || data?.avatar || '',
    },
    media: {
      video_safe:
        data?.dl ||
        data?.download ||
        data?.download_url ||
        data?.no_watermark ||
        data?.noWatermark ||
        data?.nowm ||
        data?.media?.video ||
        data?.play ||
        '',
      video_hd:
        data?.media?.video_hd ||
        data?.media?.hd ||
        data?.video_hd ||
        data?.hdplay ||
        data?.hd ||
        '',
      video_sd:
        data?.media?.video ||
        data?.video ||
        data?.play ||
        data?.wmplay ||
        '',
      video_wm:
        data?.media?.video_wm ||
        data?.media?.wm ||
        data?.video_wm ||
        data?.wmplay ||
        data?.watermark ||
        '',
      audio: data?.media?.audio || data?.music || data?.audio || data?.music_info?.play || '',
      cover: data?.media?.cover || data?.cover || data?.origin_cover || data?.thumbnail || '',
    },
    stats: {
      views: Number(data?.stats?.views || data?.stats?.plays || data?.play_count || data?.views || 0),
      likes: Number(data?.stats?.likes || data?.digg_count || data?.likes || 0),
      comments: Number(data?.stats?.comments || data?.comment_count || data?.comments || 0),
      shares: Number(data?.stats?.shares || data?.share_count || data?.shares || 0),
    },
    images: extractImages(data),
  }
}

async function getTikTokData(url, options = {}) {
  const { alyaOnly = false } = options
  const errors = []

  try {
    const json = await fetchJsonWithRetry(
      `${NEW_API_BASE}/api/v1/descargas/tiktok?apikey=${encodeURIComponent(NEW_API_KEY)}&url=${encodeURIComponent(url)}`,
      undefined,
      2,
      2000
    )
    if (json?.status !== true) throw new Error(json?.msg || 'status false')
    const d = json?.data
    if (!d) throw new Error('sin datos')
    const videoUrl = d.download?.url || d.url || ''
    if (!videoUrl) throw new Error('sin url de video')

    const normalized = normalizeTikTokData({
      title: d.titulo || d.title || '',
      desc: d.titulo || '',
      author: { nickname: d.autor || d.author || 'Desconocido' },
      stats: { views: d.vistas || 0 },
      dl: videoUrl,
      download: videoUrl,
      download_url: videoUrl,
      no_watermark: videoUrl,
      play: videoUrl,
    })

    if (!normalized.media.video_safe && !normalized.media.video_sd && normalized.images.length === 0)
      throw new Error('sin medios utilizables')

    return normalized
  } catch (error) {
    errors.push(`C1: ${error.message}`)
  }

  try {
    const json = await fetchJsonWithRetry(
      `${ALYA_BASE}/dl/tiktok?url=${encodeURIComponent(url)}&key=${encodeURIComponent(ALYA_KEY)}`,
      undefined,
      2,
      2000
    )
    if (json?.status === false) throw new Error(json?.message || 'status false')
    const payload = extractApiPayload(json)
    if (!payload) throw new Error('sin datos')
    const normalized = normalizeTikTokData(payload)
    if (!normalized.media.video_safe && !normalized.media.video_sd && normalized.images.length === 0)
      throw new Error('sin medios utilizables')
    return normalized
  } catch (error) {
    errors.push(`C2: ${error.message}`)
  }

  if (alyaOnly) throw new Error(errors[0] || 'sin datos')

  try {
    const r = await fetchJsonWithRetry(
      'https://tikwm.com/api/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Cookie: 'current_language=en',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/116.0.0.0 Mobile Safari/537.36',
        },
        body: new URLSearchParams({ url, hd: '1' }),
      },
      2,
      2000
    )
    if (!r?.data) throw new Error('sin datos')
    if (r.code !== 0 && r.code !== undefined) throw new Error(r.msg || 'error')
    const normalized = normalizeTikTokData(r.data)
    if (!normalized.media.video_safe && !normalized.media.video_sd && normalized.images.length === 0)
      throw new Error('sin medios utilizables')
    return normalized
  } catch (error) {
    errors.push(`C3: ${error.message}`)
  }

  throw new Error('No se pudo obtener el video. Intenta con otro enlace.')
}

async function getTikTokMp3(url) {
  const json = await fetchJsonWithRetry(
    `${ALYA_BASE}/dl/tiktokmp3?url=${encodeURIComponent(url)}&key=${encodeURIComponent(ALYA_KEY)}`,
    undefined,
    3,
    3000
  )
  if (json?.status === false) throw new Error(json?.message || 'AlyaCore MP3 devolvio status false')
  const data = json?.data
  if (!data) throw new Error('AlyaCore MP3 no devolvio datos')
  if (!data.dl) throw new Error('AlyaCore MP3 no devolvio URL de audio')
  return data
}

async function getTikTokImages(url) {
  const tikwm = await fetchJsonWithRetry(
    'https://tikwm.com/api/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie: 'current_language=en',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      },
      body: new URLSearchParams({ url, hd: '1' }),
    },
    3,
    3000
  )

  if (!tikwm) throw new Error('TikWM no devolvio respuesta')
  if (tikwm.code && tikwm.code !== 0) throw new Error(tikwm.msg || 'TikWM devolvio un error')
  if (!tikwm.data) throw new Error('TikWM no devolvio datos')

  const data = tikwm.data
  const normalized = normalizeTikTokData(data)

  if (normalized.images.length === 0) {
    throw new Error('Este TikTok no tiene imágenes, usa *.tt* para descargarlo como video.')
  }

  return { normalized, raw: data }
}


async function searchTikWm(keywords) {
  return fetchJsonWithRetry(
    'https://tikwm.com/api/feed/search',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie: 'current_language=en',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      },
      body: new URLSearchParams({ keywords, count: '8', cursor: '0', HD: '1' }),
    },
    3,
    3000
  )
}

function formatCaption(data) {
  const views = (data?.stats?.views || 0).toLocaleString()
  const likes = (data?.stats?.likes || 0).toLocaleString()
  const comments = (data?.stats?.comments || 0).toLocaleString()
  const shares = (data?.stats?.shares || 0).toLocaleString()
  return (
    `╭───────────────╮\n` +
    `│ 💙 *TIKTOK*\n` +
    `│───────────────\n` +
    `│ 📌 ${(data?.title || 'Sin titulo').substring(0, 60)}\n` +
    `│ 👤 ${data?.author?.nickname || 'Desconocido'}\n` +
    `│ 👁️ ${views}  ❤️ ${likes}\n` +
    `│ 💬 ${comments}  🔁 ${shares}\n` +
    `╰───────────────╯`
  )
}

async function resolvePlayableVideo(media) {
  const candidates = [
    media?.video_safe,
    media?.video_sd,
    media?.video_hd,
    media?.video_wm,
  ].filter(isValidUrl)

  const seen = new Set()
  const unique = candidates.filter(u => { if (seen.has(u)) return false; seen.add(u); return true })

  
  return unique.map((url, i) => ({
    url,
    isHd: i === 2,
    quality: ['safe','sd','hd','wm'][i] || 'safe',
    priority: i,
    contentType: 'video/mp4',
    contentLength: 0,
  }))
}

function inspectMp4Buffer(buffer) {
  const chunk = buffer.subarray(0, Math.min(buffer.length, 4 * 1024 * 1024)).toString('latin1')
  const hasFtyp = chunk.includes('ftyp')
  const hasMoov = chunk.includes('moov')
  const hasMdat = chunk.includes('mdat')
  const hasVideoTrack = chunk.includes('vide')
  const hasAudioTrack = chunk.includes('soun')
  const hasAvc = chunk.includes('avc1') || chunk.includes('avc3') || chunk.includes('mp4v')
  const hasHevc = chunk.includes('hvc1') || chunk.includes('hev1')

  return { hasFtyp, hasMoov, hasMdat, hasVideoTrack, hasAudioTrack, hasAvc, hasHevc }
}

async function validateVideoBuffer(buffer, contentType) {
  if (!buffer || buffer.length < MIN_VIDEO_SIZE) return false
  if (buffer.length > MAX_VIDEO_SIZE) return false
  if (contentType && !contentType.includes('video') && !contentType.includes('octet-stream')) return false
  return true
}

async function sendVideoWithFallback(conn, chat, m, videoCandidates, caption) {
  let lastError = null
  let videoSent = false

  for (const candidate of videoCandidates) {
    let downloaded = null
    try {
      downloaded = await safeBuffer(candidate.url, VIDEO_DOWNLOAD_TIMEOUT)
      if (!downloaded?.buffer) {
        console.log('Buffer inválido o vacío')
        continue
      }

      
      if (!await validateVideoBuffer(downloaded.buffer, downloaded.contentType)) {
        console.log(`Buffer no válido: ${downloaded.size} bytes, ${downloaded.contentType}`)
        continue
      }

      await conn.sendMessage(
        chat,
        {
          video: downloaded.buffer,
          mimetype: 'video/mp4',
          fileName: candidate.isHd ? 'tiktok-hd.mp4' : 'tiktok.mp4',
          caption,
        },
        { quoted: m }
      )
      videoSent = true
      break
    } catch (error) {
      lastError = error
      console.log(`Intento buffer fallido: ${error.message}`)
    }

    try {
      if (!downloaded?.buffer) continue

      if (!await validateVideoBuffer(downloaded.buffer, downloaded.contentType)) continue

      await conn.sendMessage(
        chat,
        {
          document: downloaded.buffer,
          mimetype: 'video/mp4',
          fileName: candidate.isHd ? 'tiktok-hd.mp4' : 'tiktok.mp4',
          caption: `${caption}\n\n📎 Enviado como documento por problemas de compatibilidad`,
        },
        { quoted: m }
      )
      videoSent = true
      break
    } catch (error) {
      lastError = error
      console.log(`Intento documento fallido: ${error.message}`)
    }
  }

  if (!videoSent) {
    if (lastError) throw lastError
    throw new Error('No se pudo enviar un video compatible')
  }
}

async function sendAudioIfAvailable(conn, chat, m, audioUrl) {
  if (!isValidUrl(audioUrl)) return

  try {
    await conn.sendMessage(
      chat,
      { audio: { url: audioUrl }, mimetype: 'audio/mpeg', ptt: false },
      { quoted: m }
    )
    return
  } catch {}

  const downloaded = await safeBuffer(audioUrl, 45000)
  if (downloaded?.buffer) {
    await conn.sendMessage(
      chat,
      { audio: downloaded.buffer, mimetype: 'audio/mpeg', ptt: false },
      { quoted: m }
    )
  }
}

async function combineImageAndAudioToVideo(conn, chat, m, tiktokUrl, caption) {
  try {
    console.log('Usando API de TikVid.io para convertir slideshow...')
    
    const searchResponse = await fetch(`${TIKVID_API}/ajaxSearch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Origin': 'https://tikvid.io',
        'Referer': 'https://tikvid.io/'
      },
      body: new URLSearchParams({
        q: tiktokUrl
      })
    })
    
    const searchData = await searchResponse.json()
    console.log('TikVid search response:', JSON.stringify(searchData))
    
    if (!searchData?.data?.videoUrl && !searchData?.video_url) {
      console.log('TikVid no devolvió video, intentando con imágenes...')
      return false
    }
    
    const videoUrl = searchData?.data?.videoUrl || searchData?.video_url
    if (!videoUrl) {
      console.log('No se encontró URL de video en respuesta de TikVid')
      return false
    }
    
    console.log('Video encontrado, descargando...')
    const videoBuffer = await safeBuffer(videoUrl, 90000)
    
    if (!videoBuffer?.buffer) {
      console.log('No se pudo descargar el video de TikVid')
      return false
    }
    
    try {
      await conn.sendMessage(chat, {
        video: videoBuffer.buffer,
        mimetype: 'video/mp4',
        caption
      }, { quoted: m })
    } catch (sendErr) {
      console.log('Error enviando video, intentando como documento:', sendErr.message)
      await conn.sendMessage(chat, {
        document: videoBuffer.buffer,
        mimetype: 'video/mp4',
        fileName: 'tiktok-video.mp4',
        caption
      }, { quoted: m })
    }
    
    return true
  } catch (e) {
    console.log('Error en TikVid API:', e.message)
    return false
  }
}

async function resolveImages(images) {
  const valid = []

  for (const url of uniqueUrls(images)) {
    const info = await probeUrl(url, 10000)
    if (!info?.ok) {
      valid.push(url)
      continue
    }
    const ct = info.contentType || ''
    const isBlocked = ct && !ct.startsWith('image/') && !ct.includes('octet-stream') && !ct.includes('webp') && !ct.includes('jpeg') && !ct.includes('png')
    if (isBlocked) continue
    valid.push(info.url || url)
  }

  return valid
}

async function sendImagesWithFallback(conn, chat, m, images, caption) {
  const medias = images.slice(0, 10).map((url, index) => ({
    type: 'image',
    data: { url },
    caption: index === 0 ? caption : '',
  }))

  if (medias.length === 0) throw new Error('No se encontraron imagenes validas')

  try {
    if (medias.length === 1) {
      await conn.sendMessage(chat, { image: { url: medias[0].data.url }, caption }, { quoted: m })
    } else {
      await conn.sendAlbumMessage(chat, medias, { quoted: m })
    }
    return true
  } catch {}

  const downloaded = []
  for (const url of images.slice(0, 10)) {
    const file = await safeBuffer(url, 30000)
    if (!file?.buffer) continue
    downloaded.push(file.buffer)
  }

  if (downloaded.length === 0) throw new Error('No se pudieron descargar las imagenes')

  if (downloaded.length === 1) {
    await conn.sendMessage(chat, { image: downloaded[0], caption }, { quoted: m })
    return true
  }

  await conn.sendAlbumMessage(
    chat,
    downloaded.map((buffer, index) => ({
      type: 'image',
      data: buffer,
      caption: index === 0 ? caption : '',
    })),
    { quoted: m }
  )
  return true
}

function getSearchVideoCandidates(video) {
  return uniqueUrls([video?.play, video?.hdplay, video?.wmplay]).map((url) => ({
    url,
    isHd: url === video?.hdplay,
  }))
}

async function sendImagesCarousel(conn, m, images, caption) {
  const list = images.slice(0, 6)
  if (!list.length) throw new Error('No se encontraron imágenes para el carrusel')

  const cards = []
  for (const url of list) {
    try {
      const { imageMessage } = await generateWAMessageContent(
        { image: { url } },
        { upload: conn.waUploadToServer },
      )
      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text: '' }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: '' }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: '',
          hasMediaAttachment: true,
          imageMessage,
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: [] }),
      })
    } catch {}
  }

  if (!cards.length) {
    await sendImagesWithFallback(conn, m.chat, m, images, caption)
    return
  }

  const msg = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: '' }),
            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards }),
          }),
        },
      },
    },
    { quoted: m },
  )

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

async function _xV(conn, m, entries = []) {
  const list = entries.slice(0, 6)
  if (!list.length) throw new Error('No se encontraron videos para enviar')

  const cards = []
  for (const { meta, selected } of list) {
    if (!selected?.url) continue
    try {
      const { videoMessage } = await generateWAMessageContent(
        { video: { url: selected.url } },
        { upload: conn.waUploadToServer },
      )

      const title = String(meta?.title || 'Sin titulo').replace(/\s+/g, ' ').slice(0, 64)
      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: `💙 ${title}`,
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: '' }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: '',
          hasMediaAttachment: true,
          videoMessage,
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: [] }),
      })
    } catch {}
  }

  if (!cards.length) throw new Error('No se pudo construir carrusel de videos')

  const msg = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({ text: '💙 Resultados TikTok' }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: '' }),
            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards }),
          }),
        },
      },
    },
    { quoted: m },
  )

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

export default {
  command: ['tiktok', 'tt', 'tiktoksearch', 'ttsearch', 'tts', 'tiktokimg', 'ttimg', 'tiktokmp3', 'ttmp3'],
  category: 'downloader',
  register: true,

  run: async (conn, m, args, usedPrefix, command) => {
    if (!args.length) {
      return conn.reply(
        m.chat,
        `Uso: *${usedPrefix}${command}* <enlace o busqueda>\n\n` +
        `Ejemplo:\n` +
        `• ${usedPrefix}tt https://vm.tiktok.com/xxx\n` +
        `• ${usedPrefix}ttsearch gato gracioso\n` +
        `• ${usedPrefix}tiktokimg https://vm.tiktok.com/xxx\n` +
        `• ${usedPrefix}tiktokmp3 https://vm.tiktok.com/xxx`,
        m
      )
    }

    const text = args.join(' ').trim()
    const isUrl = isTikTokUrl(text)
    const currentCommand = String(command || '').toLowerCase()
    const isSearchCommand = SEARCH_COMMANDS.has(currentCommand)
    const isImageCommand = IMAGE_COMMANDS.has(currentCommand)
    const isMp3Command = MP3_COMMANDS.has(currentCommand)
    const isDownloadCommand = DOWNLOAD_COMMANDS.has(currentCommand) || (!isSearchCommand && !isImageCommand && !isMp3Command)

    if ((isDownloadCommand || isImageCommand || isMp3Command) && !isUrl) {
      return conn.reply(
        m.chat,
        `💙 *Uso correcto*\n\n` +
        `• ${usedPrefix}${currentCommand} <enlace tiktok>\n` +
        `• ${usedPrefix}ttsearch <texto>`,
        m
      )
    }

    if (isSearchCommand && isUrl) {
      return conn.reply(
        m.chat,
        `💙 Ese comando es solo para buscar.\n` +
        `Usa *${usedPrefix}tt* para enlaces directos.`,
        m
      )
    }

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    try {
      if (isImageCommand) {
        const { normalized, raw } = await getTikTokImages(text)
        const validImages = await resolveImages(normalized.images)

        if (validImages.length === 0) {
          await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
          return conn.reply(m.chat, '💙 No se encontraron imágenes en ese TikTok.\nQuizás es un video, usa *.tt* para descargarlo.', m)
        }

        const caption = formatCaption(normalized)
        await sendImagesCarousel(conn, m, validImages, caption)
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        return
      }

      if (isMp3Command) {
        const mp3Data = await getTikTokMp3(text)

        const musicTitle = mp3Data?.music_info?.title || mp3Data?.title || 'Sin título'
        const musicAuthor = mp3Data?.music_info?.author || mp3Data?.author?.nickname || 'Desconocido'
        const duration = mp3Data?.music_info?.duration || mp3Data?.duration || ''

        const caption =
          `╭───────────────╮\n` +
          `│ 🎵 *TIKTOK MP3*\n` +
          `│───────────────\n` +
          `│ 🎼 ${musicTitle.substring(0, 60)}\n` +
          `│ 👤 ${musicAuthor}\n` +
          (duration ? `│ ⏱️ ${duration}\n` : '') +
          `╰───────────────╯`

        const audioUrl = mp3Data.dl
        let audioSent = false

        try {
          await conn.sendMessage(
            m.chat,
            { audio: { url: audioUrl }, mimetype: 'audio/mpeg', ptt: false },
            { quoted: m }
          )
          audioSent = true
        } catch {}

        if (!audioSent) {
          const downloaded = await safeBuffer(audioUrl, 60000)
          if (downloaded?.buffer) {
            await conn.sendMessage(
              m.chat,
              { audio: downloaded.buffer, mimetype: 'audio/mpeg', ptt: false },
              { quoted: m }
            )
            audioSent = true
          }
        }

        if (!audioSent) throw new Error('No se pudo descargar el audio')

        await conn.reply(m.chat, caption, m)
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        return
      }

      if (isDownloadCommand) {
        const data = await getTikTokData(text)
        const caption = formatCaption(data)
        const media = data.media || {}
        const playableVideos = await resolvePlayableVideo(media)
        const validImages = playableVideos.length === 0 ? await resolveImages(data.images) : []
        const isSlideshow = playableVideos.length === 0 && validImages.length > 0

        if (isSlideshow) {
          if (media.audio && isValidUrl(media.audio)) {
            const combined = await combineImageAndAudioToVideo(conn, m.chat, m, text, caption)
            if (combined) {
              await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
              return
            }
          }
          await sendImagesWithFallback(conn, m.chat, m, validImages, caption)
          await sendAudioIfAvailable(conn, m.chat, m, media.audio)
        } else if (playableVideos.length > 0) {
          try {
            await sendVideoWithFallback(conn, m.chat, m, playableVideos, caption)
          } catch (videoError) {
            console.log('Video falló, intentando TikVid:', videoError.message)
            if (validImages.length > 0 && media.audio && isValidUrl(media.audio)) {
              const combined = await combineImageAndAudioToVideo(conn, m.chat, m, text, caption)
              if (combined) {
                await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
                return
              }
            }
            if (validImages.length > 0) {
              await sendImagesWithFallback(conn, m.chat, m, validImages, caption)
              await sendAudioIfAvailable(conn, m.chat, m, media.audio)
            } else {
              throw videoError
            }
          }
        } else {
          throw new Error('No se encontró video descargable')
        }

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        return
      }

      const json = await searchTikWm(text)
      const videos = Array.isArray(json?.data?.videos) ? json.data.videos : []

      if (videos.length === 0) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return conn.reply(m.chat, '💙 No se encontraron resultados.', m)
      }

      const seenIds = new Set()
      const seenUrls = new Set()
      const valid = []

      for (const video of videos.slice(0, 12)) {
        const videoId = video?.video_id || video?.id || null
        if (videoId && seenIds.has(videoId)) continue
        if (videoId) seenIds.add(videoId)

        const candidates = getSearchVideoCandidates(video)
        let selected = null

        for (const candidate of candidates) {
          if (seenUrls.has(candidate.url)) continue

          for (const timeout of [10000, 7000, 5000]) {
            const info = await probeUrl(candidate.url, timeout)
            if (!info?.ok) continue
            if (info.contentType && !info.contentType.includes('video')) continue
            if (info.contentLength > 0) {
              if (info.contentLength < MIN_VIDEO_SIZE) continue
              if (info.contentLength > MAX_VIDEO_SIZE) continue
            }
            selected = { ...candidate, url: info.url || candidate.url }
            break
          }

          if (selected) break
        }

        if (!selected) continue
        if (seenUrls.has(selected.url)) continue
        seenUrls.add(selected.url)

        valid.push({ meta: video, selected })
        if (valid.length >= 6) break
      }

      if (valid.length === 0) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return conn.reply(m.chat, '💙 No se encontraron videos validos.', m)
      }

      await _xV(conn, m, valid)

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (e) {
      console.error('Error en tiktok:', e.message)
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      await conn.reply(m.chat, `💙 Error: ${e.message}`, m)
    }
  },
}