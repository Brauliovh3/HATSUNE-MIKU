import axios from 'axios'
import path from 'path'
import { lookup } from 'mime-types'
import { getBuffer } from '../../nucleo/message.js'
import cheerio from 'cheerio'


const MIKU = {
  heart:   '💙',
  note:    '🎵',
  leaf:    '',
  sparkle: '✨',
  check:   '✅',
  cross:   '❌',
  wait:    '⏳',
  file:    '📦',
  link:    '🔗',
  size:    '⚖️',
  source:  '🌐',
  clock:   '🕐',
  type:    '🗂️',
  banner:  'https://i.pinimg.com/736x/0c/1e/f8/0c1ef8e804983e634fbf13df1044a41f.jpg',
}

const DIVIDER_START = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮`
const DIVIDER_END   = `╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`

export default {
  command: ['mediafire', 'mf'],
  category: 'downloader',
  run: async (client, m, args, usedPrefix, command) => {
    const text = args.join(' ').trim()

    if (!text) {
      return client.reply(
        m.chat,
        `${DIVIDER_START}\n│ 💙 *MEDIAFIRE DOWNLOADER*\n│\n│ 🎵 Ingresa un enlace de *MediaFire*\n│ 🌱 o una *palabra clave* para buscar.\n│\n│ 🔗 *Ejemplo:*\n│ \`${usedPrefix + command} https://www.mediafire.com/file/xxxx/archivo.zip/file\`\n│\n│ 🔍 *Ejemplo búsqueda:*\n│ \`${usedPrefix + command} miku mugen\`\n${DIVIDER_END}`,
        m,
        global.miku,
      )
    }

    await m.react(MIKU.wait)

    try {
      const isMediafireUrl = /^https?:\/\/(www\.)?mediafire\.com\/.+/i.test(text)
      const isAnyUrl       = /^https?:\/\//i.test(text)

      
      if (isAnyUrl && !isMediafireUrl) {
        await m.react(MIKU.cross)
        return client.reply(
          m.chat,
          `${DIVIDER_START}\n│ 💔 *ENLACE INVÁLIDO*\n│\n│ 🎵 Solo se aceptan enlaces de *MediaFire*.\n│\n│ 🔗 *Ejemplo correcto:*\n│ \`${usedPrefix + command} https://www.mediafire.com/file/xxxx/archivo.zip/file\`\n${DIVIDER_END}`,
          m,
          global.miku,
        )
      }

     
      if (!isMediafireUrl) {
        const res  = await axios.get(
          `${global.APIs.stellar.url}/search/mediafire?query=${encodeURIComponent(text)}&key=${global.APIs.stellar.key}`,
          { timeout: 15000 }
        )
        const data = res.data

        if (!data?.status || !data.results?.length) {
          await m.react(MIKU.cross)
          return client.reply(
            m.chat,
            `${DIVIDER_START}\n│ 💙 *SIN RESULTADOS*\n│\n│ 🎵 No se encontraron archivos para:\n│ 🌱 *"${text}"*\n│\n│ ✨ Intenta con otras palabras clave.\n${DIVIDER_END}`,
            m,
            global.miku,
          )
        }

        let caption  = `${DIVIDER_START}\n│ 💙 *MEDIAFIRE SEARCH*\n│\n│ 🔍 *Resultados:* ${data.results.length} archivos encontrados\n│\n`

        data.results.forEach((r, i) => {
          caption += `│ 💙 *${i + 1}. ${r.filename}*\n`
          caption += `│    ${MIKU.size} ${r.filesize}  ${MIKU.source} ${r.source_title}\n`
          caption += `│    ${MIKU.link} ${r.url}\n│\n`
        })

        caption += DIVIDER_END

        await m.react(MIKU.check)
        return client.reply(m.chat, caption, m, global.miku)
      }

      
      const scraped = await mediafireDl(text)

      if (!scraped?.downloadLink) {
        await m.react(MIKU.cross)
        return client.reply(
          m.chat,
          `${DIVIDER_START}\n│ 💔 *ARCHIVO NO DISPONIBLE*\n│\n│ 🎵 Posibles causas:\n│ 🌱 • El archivo fue eliminado por el dueño\n│ 🌱 • El enlace expiró\n│ 🌱 • MediaFire bloqueó el acceso\n│\n│ ✨ Verifica el link e inténtalo de nuevo.\n${DIVIDER_END}`,
          m,
          global.miku,
        )
      }

      const title = (scraped.filename || 'archivo').trim()
      const ext   = path.extname(title) || (scraped.type ? `.${scraped.type}` : '')
      const tipo  = lookup((ext || '').toLowerCase()) || 'application/octet-stream'

      const caption = `${DIVIDER_START}\n│ 💙 *MEDIAFIRE DOWNLOAD*\n│\n│ ${MIKU.file} *Nombre:* ${title}\n│ ${MIKU.type} *Tipo:* ${tipo}${scraped.size ? `\n│ ${MIKU.size} *Peso:* ${scraped.size}` : ''}${scraped.uploaded ? `\n│ ${MIKU.clock} *Subido:* ${scraped.uploaded}` : ''}\n│\n│ ⏳ *Enviando archivo...*\n│ ⏱️ *Esto puede tardar varios minutos*\n${DIVIDER_END}`

      

      try {
        await client.sendMessage(
          m.chat,
          {
            image: { url: MIKU.banner },
            caption: caption
          },
          { quoted: m }
        )
      } catch {
      }

      await client.sendMessage(
        m.chat,
        {
          document: { url: scraped.downloadLink },
          mimetype: tipo,
          fileName: title
        },
        { quoted: m }
      )

      await m.react(MIKU.check)

    } catch (e) {
      await m.react(MIKU.cross)

     
      if (e.message?.includes('TIMEOUT') || e.message?.includes('timed out')) {
        return client.reply(
          m.chat,
          `${DIVIDER_START}\n│ ⏳ *DESCARGA EN PROCESO*\n│\n│ 🎵 El archivo está siendo enviado\n│ 🌱 Puede tardar varios minutos\n│\n│ 💙 *No reenvíes el comando*\n│ ✨ Espera a que llegue el archivo\n${DIVIDER_END}`,
          m,
          global.miku,
        )
      }

      return client.reply(
        m.chat,
        `${DIVIDER_START}\n│ 💔 *ERROR*\n│\n│ 🎵 Ocurrió un error al ejecutar *${usedPrefix + command}*\n│\n│ 🌱 *Detalle:* ${e.message}\n│\n│ ✨ Inténtalo de nuevo o contacta soporte.\n${DIVIDER_END}`,
        m,
        global.miku,
      )
    }
  }
}




const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const HEADERS = {
  'User-Agent':                UA,
  'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language':           'en-US,en;q=0.9,es;q=0.8',
  'Accept-Encoding':           'gzip, deflate, br',
  'Connection':                'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest':            'document',
  'Sec-Fetch-Mode':            'navigate',
  'Sec-Fetch-Site':            'none',
  'Cache-Control':             'max-age=0'
}

function cleanText(x)    { return String(x || '').replace(/\s+/g, ' ').trim() }

function normalizeUrl(u) {
  const s = cleanText(u)
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('//'))       return 'https:' + s
  if (s.startsWith('/'))        return 'https://www.mediafire.com' + s
  return s
}

function pickFilename($) {
  return (
    cleanText($('.intro .filename').text())                    ||
    cleanText($('meta[property="og:title"]').attr('content')) ||
    cleanText($('title').text())                               ||
    null
  )
}

function pickFiletypeText($) {
  const t = cleanText($('.filetype').text())
  return t || null
}

function pickTypeFromFilename(name) {
  if (!name) return null
  const m = String(name).match(/\.([a-z0-9]{1,10})$/i)
  return m?.[1]?.toLowerCase() || null
}

function pickDetails($) {
  let size     = null
  let uploaded = null

  $('ul.details li').each((_, el) => {
    const text = cleanText($(el).text())
    if (!size     && /File size:/i.test(text))  size     = cleanText($(el).find('span').text()) || null
    if (!uploaded && /Uploaded:/i.test(text))   uploaded = cleanText($(el).find('span').text()) || null
  })

  return { size, uploaded }
}

async function mediafireDl(url, timeout = 45000) {
  const mediafireUrl = cleanText(url)
  if (!mediafireUrl) throw new Error('URL requerida')

  const res = await axios.get(mediafireUrl, {
    timeout,
    maxRedirects: 10,
    headers:      HEADERS,
    validateStatus: () => true
  })

  if (res.status === 404)                       throw new Error('El archivo no existe o fue eliminado (404)')
  if (res.status < 200 || res.status >= 400)    throw new Error(`MediaFire HTTP ${res.status}`)

  const $ = cheerio.load(String(res.data || ''))

  const downloadLinkRaw =
    $('#downloadButton').attr('href')          ||
    $('a#downloadButton').attr('href')         ||
    $('.download-btn').attr('href')            ||
    $('a[class*="download"]').attr('href')     ||
    $('input[name="download"]').val()          ||
    null

  const downloadLink = normalizeUrl(downloadLinkRaw)

  if (!downloadLink) {
    throw new Error('No se encontró el enlace de descarga. El archivo podría estar protegido o eliminado.')
  }

  const filename = pickFilename($)
  const filetype = pickFiletypeText($)
  const { size, uploaded } = pickDetails($)
  const type = pickTypeFromFilename(filename) || (filetype ? cleanText(filetype).toLowerCase() : null)

  return { downloadLink, filename, filetype, size, uploaded, type }
}