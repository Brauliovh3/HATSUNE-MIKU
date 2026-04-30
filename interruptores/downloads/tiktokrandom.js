import axios from 'axios'

const MIN_VIDEO_SIZE = 51200
const PROBE_TIMEOUT = 12000

const categories = {
  l4d2: {
    queries: ['left4f1', 'l4d2humor', 'left4dead2momentosf1'],
    title: 'LEFT 4 DEAD 2'
  },
  terror: {
    queries: ['michiparanormal', 'elmichimarcianotecuenta', 'lugaresmalditosdemexico', 'horrorjapones', 'videos de terror', 'casos paranormales'],
    title: 'VIDEO DE TERROR'
  },
  llanta: {
    queries: ['llantaarmy', 'lallantaarmy', 'sanosky','calsosky', 'llanta army', 'calsosky', 'sanosky'],
    title: 'LLANTA ARMY'
  },
  frases: {
    queries: ['frasesphonk', 'frasesfunk', 'frases de la vida', 'frases aesthetic', 'frases de reflexion'],
    title: 'FRASES'
  },
  random: {
    queries: ['videos random', 'shitpost', 'shitposting', 'memes random', 'videos graciosos', 'humor random'],
    title: 'TIKTOK RANDOM'
  }
}

const commandMap = {
  'l4d2': 'l4d2', 'l4drandom': 'l4d2', 'l4d2random': 'l4d2', 'left4': 'l4d2',
  'terror': 'terror', 'scary': 'terror', 'horror': 'terror', 'terrorvideo': 'terror',
  'llantarmy': 'llanta', 'llanta': 'llanta',
  'frases': 'frases', 'frase': 'frases',
  'ttrandom': 'random', 'tiktokrandom': 'random', 'shitpost': 'random'
}

export default {
  command: Object.keys(commandMap),
  category: 'downloader',
  run: async (client, m, args, usedPrefix, command) => {
    await m.react('⏳')
    
    try {
      const categoryKey = commandMap[command.toLowerCase()] || 'random'
      const categoryData = categories[categoryKey]
      const randomQuery = categoryData.queries[Math.floor(Math.random() * categoryData.queries.length)]
      const video = await getRandomVideo(randomQuery)
      
      const caption = `╭───────────╮
│ 💙 *${categoryData.title}*
│───────────
│ 📌 ${video.title}
╰───────────╯`
      
      await client.sendMessage(m.chat, { 
        video: { url: video.video_url }, 
        caption,
        ...global.miku
      }, { quoted: m })
      
      await m.react('✅')
    } catch (e) {
      await m.react('❌')
      await m.reply(`💙 *ERROR*\n\nNo se encontraron videos: ${e.message}`, global.miku)
    }
  }
}

function isValidUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

async function probeVideoUrl(url) {
  if (!isValidUrl(url)) return false

  for (const method of ['HEAD', 'GET']) {
    try {
      const response = await axios({
        method,
        url,
        timeout: PROBE_TIMEOUT,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
      })

      const contentType = String(response?.headers?.['content-type'] || '').toLowerCase()
      const contentLength = Number(response?.headers?.['content-length'] || 0)

      if (contentType && !contentType.includes('video')) continue
      if (contentLength > 0 && contentLength < MIN_VIDEO_SIZE) continue

      return true
    } catch {
      continue
    }
  }

  return false
}

const tikwmCache = new Map()

async function getRandomVideo(query) {
  let videos = tikwmCache.get(query)
  
  if (!videos) {
    const response = await axios({
      method: 'POST',
      url: 'https://tikwm.com/api/feed/search',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': 'current_language=en',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
      },
      data: {
        keywords: query,
        count: 10,
        cursor: 0,
        HD: 1
      }
    })
    videos = response.data.data.videos
    if (videos && videos.length > 0) tikwmCache.set(query, videos)
  }

  if (!videos || videos.length === 0) throw new Error('No se encontraron videos')
  
  const randomVideo = videos[Math.floor(Math.random() * videos.length)]
  const candidates = [randomVideo?.play, randomVideo?.wmplay, randomVideo?.hdplay]
  let selectedVideoUrl = null

  for (const url of candidates) {
    if (!isValidUrl(url)) continue
    const isPlayable = await probeVideoUrl(url)
    if (!isPlayable) continue
    selectedVideoUrl = url
    break
  }

  if (!selectedVideoUrl) throw new Error('No se encontro un video compatible')
  
  return {
    title: randomVideo?.title || 'Sin titulo',
    cover: randomVideo?.cover,
    origin_cover: randomVideo?.origin_cover,
    video_url: selectedVideoUrl,
    watermark: randomVideo?.wmplay,
    music: randomVideo?.music,
  }
}
