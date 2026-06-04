import axios from 'axios'
import fs from 'fs'
import path from 'path'

const _k = Buffer.from('5445645664', 'base64').toString()
const _b = Buffer.from('6456457457=', 'base64').toString()

const BANNER = 'https://i.pinimg.com/736x/0c/1e/f8/0c1ef8e804983e634fbf13df1044a41f.jpg'

const D_S = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮`
const D_E = `╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`

function extractPixeldrainId(url) {
  const match = url.match(/pixeldrain\.com\/(?:api\/file|u)\/([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}


async function downloadToFile(url, destPath) {
  const fileId = extractPixeldrainId(url)

  const dlUrl = fileId
    ? `https://pixeldrain.com/api/file/${fileId}?download`
    : url

  const headers = fileId ? {
    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer':         `https://pixeldrain.com/u/${fileId}`,
    'Accept':          'video/mp4,video/*;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'identity',
    'Connection':      'keep-alive',
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
    throw new Error(`Pixeldrain no envió video (content-type: ${ct}). Posible rate limit o captcha.`)
  }

  await fs.promises.mkdir(path.dirname(destPath), { recursive: true })

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(destPath)
    let received = 0

    response.data.on('data', chunk => {
      received += chunk.length
      writeStream.write(chunk)
    })

    response.data.on('end', async () => {
      writeStream.end()
      try {
        const stat = await fs.promises.stat(destPath)
        if (stat.size < 102400) {
          await fs.promises.unlink(destPath).catch(() => {})
          return reject(new Error(`Archivo demasiado pequeño (${stat.size} bytes). El servidor puede haber devuelto un error.`))
        }

        const fileHandle = await fs.promises.open(destPath, 'r')
        const header = Buffer.alloc(12)
        await fileHandle.read(header, 0, 12, 0)
        await fileHandle.close()

        const box = header.slice(4, 8).toString('ascii')
        if (!['ftyp', 'mdat', 'moov', 'free', 'wide'].includes(box)) {
          const preview = header.toString('utf8', 0, 100)
          await fs.promises.unlink(destPath).catch(() => {})
          return reject(new Error(`No es un MP4 válido (magic="${box}"). Respuesta del servidor: ${preview.substring(0, 100)}`))
        }

        resolve(destPath)
      } catch (err) {
        await fs.promises.unlink(destPath).catch(() => {})
        reject(err)
      }
    })

    response.data.on('error', async err => {
      writeStream.destroy()
      await fs.promises.unlink(destPath).catch(() => {})
      reject(err)
    })

    writeStream.on('error', async err => {
      response.data.destroy()
      await fs.promises.unlink(destPath).catch(() => {})
      reject(err)
    })
  })
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

      const tmpDir = path.join(process.cwd(), 'tmp-descargas')
      await fs.promises.mkdir(tmpDir, { recursive: true })
      const destPath = path.join(tmpDir, `${safeName}_ep${episode}.mp4`)
      await downloadToFile(dl, destPath)

      const stat = await fs.promises.stat(destPath)
      const isLarge = stat.size > 40 * 1024 * 1024
      const caption = `${D_S}\n│ 🎵 *${title}*\n│ 🎬 Ep. ${episode}  🌐 ${language}\n│\n│ 💙 _Hatsune Miku Bot_ ✨\n${D_E}`

      const messagePayload = isLarge
        ? {
            document: fs.createReadStream(destPath),
            mimetype: 'video/mp4',
            fileName: `${safeName}_ep${episode}.mp4`,
            caption,
          }
        : {
            video: fs.createReadStream(destPath),
            mimetype: 'video/mp4',
            fileName: `${safeName}_ep${episode}.mp4`,
            caption,
          }

      await client.sendMessage(m.chat, messagePayload, { quoted: m })
      await fs.promises.unlink(destPath).catch(() => {})
      await m.react('✅')

    } catch (e) {
      await m.react('❌')
      return client.reply(
        m.chat,
        `${D_S}\n│ 💔 *ERROR*\n│\n│ ⚙️ *Cmd:* ${usedPrefix + command}\n│ 🌱 ${e.message}\n│\n│ ✨ Inténtalo de nuevo.\n${D_E}`,
        m,
        global.miku,
      )
    }
  },
}
