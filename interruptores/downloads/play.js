import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import {
  DOWNLOAD_TMP_DIR,
  STORAGE_LIMITS,
  ensureDir,
  hasEnoughDiskSpace,
  isNoSpaceError,
  cleanProjectStorage,
  readableBytes,
} from '../../nucleo/system/storage.js'

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


async function getRemoteSize(url, headers = {}) {
  try {
    const res = await axios.head(url, { timeout: 8000, headers })
    const len = res.headers['content-length']
    return len ? parseInt(len, 10) : null
  } catch {
    return null
  }
}

async function downloadAnimeFile(url, destPath) {
  const fileId = extractPixeldrainId(url)

  const dlUrl = fileId
    ? `https://pixeldrain.com/api/file/${fileId}?download`
    : url

  const headers = {
    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept':          'video/mp4,video/*;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'identity',
    'Connection':      'keep-alive',
    ...(fileId ? { 'Referer': `https://pixeldrain.com/u/${fileId}` } : {}),
  }

  const response = await axios({
    url:              dlUrl,
    method:           'GET',
    responseType:     'stream',
    timeout:          180000,
    maxContentLength: Infinity,
    maxBodyLength:    Infinity,
    headers,
  })

  const ct = response.headers['content-type'] || ''
  if (ct.includes('text/html') || ct.includes('application/json')) {
    response.data.destroy()
    throw new Error(`Pixeldrain devolvió ${ct} en vez de video. Posible rate limit o captcha.`)
  }

  const writer = createWriteStream(destPath)
  await pipeline(response.data, writer)

  const stat = fs.statSync(destPath)
  if (stat.size < 102400) {
    const preview = fs.readFileSync(destPath).slice(0, 150).toString('utf8')
    throw new Error(`Archivo demasiado pequeño (${readableBytes(stat.size)}). Respuesta: ${preview.substring(0, 100)}`)
  }


  const fd    = fs.openSync(destPath, 'r')
  const magic = Buffer.alloc(8)
  fs.readSync(fd, magic, 0, 8, 0)
  fs.closeSync(fd)

  const box = magic.slice(4, 8).toString('ascii')
  if (!['ftyp', 'mdat', 'moov', 'free', 'wide'].includes(box)) {
    const preview = fs.readFileSync(destPath).slice(0, 150).toString('utf8')
    throw new Error(`No es un MP4 válido (magic="${box}"). Respuesta: ${preview.substring(0, 100)}`)
  }

  return stat.size
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

      
      const fileId = extractPixeldrainId(dl)
      const remoteHeaders = fileId ? {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer':    `https://pixeldrain.com/u/${fileId}`,
      } : {}

      const remoteSize = await getRemoteSize(
        fileId ? `https://pixeldrain.com/api/file/${fileId}?download` : dl,
        remoteHeaders,
      )

      
      if (remoteSize && remoteSize > STORAGE_LIMITS.maxDownloadBytes) {
        await m.react('❌')
        return client.reply(
          m.chat,
          `${D_S}\n│ ⚠️ *ARCHIVO MUY GRANDE*\n│\n│ 📦 Tamaño: ${readableBytes(remoteSize)}\n│ 🔒 Límite: ${readableBytes(STORAGE_LIMITS.maxDownloadBytes)}\n│\n│ 🔗 Descárgalo directamente:\n│ ${pixeldrain}\n${D_E}`,
          m,
          global.miku,
        )
      }

      
      const needed = remoteSize ?? 200 * 1024 * 1024 
      const hasSpace = await hasEnoughDiskSpace(needed)

      if (!hasSpace) {
        
        await client.reply(
          m.chat,
          `${D_S}\n│ 🧹 *Limpiando espacio...*\n│ Por favor espera.\n${D_E}`,
          m,
          global.miku,
        )

        const cleaned = await cleanProjectStorage()
        const hasSpaceNow = await hasEnoughDiskSpace(needed)

        if (!hasSpaceNow) {
          await m.react('❌')
          return client.reply(
            m.chat,
            `${D_S}\n│ 💔 *SIN ESPACIO EN DISCO*\n│\n│ 🧹 Liberado: ${readableBytes(cleaned.freed)}\n│ ❌ Sigue sin espacio suficiente.\n│\n│ 🔗 Descárgalo directamente:\n│ ${pixeldrain}\n${D_E}`,
            m,
            global.miku,
          )
        }
      }

     
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

      const finalSize = await downloadAnimeFile(dl, tmpPath)

      const caption = `${D_S}\n│ 🎵 *${title}*\n│ 🎬 Ep. ${episode}  🌐 ${language}\n│ 📦 ${readableBytes(finalSize)}\n│\n│ 💙 _Hatsune Miku Bot_ ✨\n${D_E}`

      
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

      
      const msg = isNoSpaceError(e)
        ? 'Sin espacio en disco. Usa /limpiar o libera espacio en el servidor.'
        : e.message

      return client.reply(
        m.chat,
        `${D_S}\n│ 💔 *ERROR*\n│\n│ ⚙️ *Cmd:* ${usedPrefix + command}\n│ 🌱 ${msg}\n│\n│ ✨ Inténtalo de nuevo.\n${D_E}`,
        m,
        global.miku,
      )
    } finally {
      deleteSafe(tmpPath)
    }
  },
}