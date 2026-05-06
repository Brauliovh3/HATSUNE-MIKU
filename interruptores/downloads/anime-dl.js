import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { DOWNLOAD_TMP_DIR, ensureDir } from '../../nucleo/system/storage.js'

const _k = Buffer.from('REVQT09MLWtleTYwMDE1MDkx', 'base64').toString()
const _b = Buffer.from('aHR0cHM6Ly9hcGkuYWx5YWNvcmUueHl6L2RsL2FuaW1lL2VwaXNvZGU=', 'base64').toString()

const BANNER = 'https://i.pinimg.com/736x/0c/1e/f8/0c1ef8e804983e634fbf13df1044a41f.jpg'

const D_S = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮`
const D_E = `╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`

function extractPixeldrainId(url) {
  const match = url.match(/pixeldrain\.com\/(?:api\/file|u)\/([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

function deleteSafe(filePath) {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath) } catch {}
}


async function downloadToFile(url, destPath) {
  const fileId = extractPixeldrainId(url)

  const dlUrl  = fileId
    ? `https://pixeldrain.com/api/file/${fileId}?download`
    : url

  const headers = fileId ? {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer':    `https://pixeldrain.com/u/${fileId}`,
    'Accept':     'video/mp4,video/*;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'identity',
  } : {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  }

  const response = await axios({
    url:          dlUrl,
    method:       'GET',
    responseType: 'stream',
    timeout:      180000,
    maxContentLength: Infinity,
    maxBodyLength:    Infinity,
    headers,
  })

  
  const ct = response.headers['content-type'] || ''
  if (ct.includes('text/html') || ct.includes('application/json')) {
    response.data.destroy()
    throw new Error(`El servidor respondió con ${ct} en vez de video. Posible rate limit o captcha en Pixeldrain.`)
  }

  const writer = createWriteStream(destPath)
  await pipeline(response.data, writer)

 
  const stat = fs.statSync(destPath)
  if (stat.size < 1024 * 100) { 
    throw new Error(`Archivo demasiado pequeño (${stat.size} bytes). Probablemente es una respuesta de error.`)
  }

  
  const fd     = fs.openSync(destPath, 'r')
  const magic  = Buffer.alloc(8)
  fs.readSync(fd, magic, 0, 8, 0)
  fs.closeSync(fd)

  const box = magic.slice(4, 8).toString('ascii')
  if (!['ftyp', 'mdat', 'moov', 'free', 'wide'].includes(box)) {
    
    const preview = fs.readFileSync(destPath).slice(0, 200).toString('utf8', 0, 200)
    throw new Error(`No es un MP4 válido (magic="${box}"). Respuesta del servidor:\n${preview.substring(0, 120)}`)
  }

  return destPath
}

export default {
  command:  ['anime', 'animedl', 'adl'],
  category: 'downloader',

  run: async (client, m, args, usedPrefix, command) => {
    const text = args.join(' ').trim()

    if (!text) {
      return client.reply(
        m.chat,
        `${D_S}\n│ 💙 *ANIME DOWNLOADER*\n│\n│ 🎵 Descarga episodios de anime.\n│\n│ 📌 *Uso:*\n│ \`${usedPrefix + command} <anime> <ep>\`\n│\n│ 🎬 *Ejemplo:*\n│ \`${usedPrefix + command} Tonikaku Kawaii 01\`\n│\n│ ✨ Episodio opcional (defecto: 01)\n${D_E}`,
        m,
        global.miku,
      )
    }

    const parts   = text.split(/\s+/)
    const lastArg = parts[parts.length - 1]
    let ep, query

    if (/^\d{1,4}$/.test(lastArg)) {
      ep    = String(lastArg).padStart(2, '0')
      query = parts.slice(0, -1).join(' ')
    } else {
      ep    = '01'
      query = parts.join(' ')
    }

    if (!query) {
      return client.reply(
        m.chat,
        `${D_S}\n│ 💙 *Uso:* \`${usedPrefix + command} <anime> <ep>\`\n${D_E}`,
        m,
        global.miku,
      )
    }

    await m.react('⏳')

    let tmpPath = null

    try {
      
      const { data } = await axios.get(_b, {
        params:  { query, ep, key: _k },
        timeout: 15000,
      })

      if (!data?.status) {
        await m.react('❌')
        return client.reply(
          m.chat,
          `${D_S}\n│ 💔 *NO ENCONTRADO*\n│\n│ 📺 *"${query}"* — Ep. ${ep}\n│\n│ ✨ Verifica el nombre e intenta de nuevo.\n${D_E}`,
          m,
          global.miku,
        )
      }

      const { title, episode, language, pixeldrain, dl } = data

      
      await client.sendContextInfoIndex(
        m.chat,
        `${D_S}\n│ 💙 *ANIME ENCONTRADO*\n│\n│ 📺 *Título:*   ${title}\n│ 🎬 *Episodio:* ${episode}\n│ 🌐 *Idioma:*   ${language}\n│\n│ 🔗 *Ver online:*\n│ ${pixeldrain}\n│\n│ ⬇️  _Enviando archivo..._\n${D_E}`,
        {},
        m,
        true,
        null,
        {
          banner: BANNER,
          title:  '💙 Anime Downloader',
          body:   '✨ Miku Bot',
          redes:  global.db.data.settings[client.user.id.split(':')[0] + '@s.whatsapp.net'].link,
        },
      )

      
      const safeName = String(title || 'anime')
        .replace(/[^\w\s]/gi, '')
        .trim()
        .substring(0, 40) || 'anime'

      const tmpDir = ensureDir(DOWNLOAD_TMP_DIR)
      tmpPath = path.join(tmpDir, `${Date.now()}_${safeName}_ep${episode}.mp4`)

      await downloadToFile(dl, tmpPath)

      const caption = `${D_S}\n│ 🎵 *${title}*\n│ 🎬 Ep. ${episode}  🌐 ${language}\n│\n│ 💙 _Hatsune Miku Bot_ ✨\n${D_E}`

      
      await client.sendMessage(
        m.chat,
        {
          video:    { stream: fs.createReadStream(tmpPath) },
          mimetype: 'video/mp4',
          fileName: `${safeName}_ep${episode}.mp4`,
          caption,
        },
        { quoted: m },
      )

      await m.react('✅')

    } catch (e) {
      await m.react('❌')
      return client.reply(
        m.chat,
        `${D_S}\n│ 💔 *ERROR*\n│\n│ ⚙️ *Cmd:* ${usedPrefix + command}\n│ 🌱 ${e.message}\n│\n│ ✨ Inténtalo de nuevo.\n${D_E}`,
        m,
        global.miku,
      )
    } finally {
      deleteSafe(tmpPath)
    }
  },
}