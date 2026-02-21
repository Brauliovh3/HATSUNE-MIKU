import axios from 'axios'
import cheerio from 'cheerio'
import fs from 'fs'
import exif from '../../lib/exif.js'

const { writeExif } = exif

export default {
  command: ['stickers', 'searchsticker'],
  category: 'utils',
  run: async (client, m, args) => {
    const raw = (args || []).join(' ').trim()
    if (!raw) return m.reply('《✧》 Por favor, ingresa el nombre de los *stickers* a buscar.')

    ensureTmp()

    try {
      const { query, packname, author } = parseQueryAndMeta(raw, m)

      const packs = await searchSticker(query)
      if (!packs.length) return m.reply('《✧》 No se encontraron resultados.')

      const pack = packs[0]
      const stickerUrls = await getStickers(pack.url)
      if (!stickerUrls.length) return m.reply('《✧》 El pack no contiene stickers.')

      await m.reply(`《✧》 Enviando *stickers* del pack: _*${pack.title}*_`)

      const limit = 5

      for (let i = 0; i < Math.min(stickerUrls.length, limit); i++) {
        try {
          const imgUrl = stickerUrls[i]
         
          const buffer = await downloadBuffer(imgUrl)

          if (!buffer || buffer.length === 0) continue

          const stickerPath = await writeExif(
            { mimetype: 'webp', data: buffer },
            { packname, author, categories: [''] }
          )

          await client.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })
          
          
          if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath)

        } catch (e) {
          console.error(e)
        }
      }

    } catch (e) {
      m.reply(`Error: ${e.message}`)
    }
  }
}

const ensureTmp = () => {
  if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true })
}

const downloadBuffer = async (url) => {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { Referer: 'https://getstickerpack.com' }
  })
  return Buffer.from(res.data)
}

const parseQueryAndMeta = (raw, m) => {
  const parts = raw.split('|').map(x => x.trim()).filter(Boolean)

  const user = global.db?.data?.users?.[m.sender] || {}

  return {
    query: parts[0],
    packname: parts[1] || user.metadatos || "ʏᴜᴋɪ 🧠 Wᴀʙᴏᴛ'ꜱ",
    author: parts[2] || user.metadatos2 || `${m.pushName}`
  }
}

async function searchSticker(query) {
  const res = await axios.get(`https://getstickerpack.com/stickers?query=${encodeURIComponent(query)}`)
  const $ = cheerio.load(res.data)

  const packs = []

  $('.sticker-pack-cols a').each((_, el) => {
    const title = $(el).find('.title').text().trim()
    let href = $(el).attr('href')
    if (title && href) {
      if (!href.startsWith('http')) {
        href = 'https://getstickerpack.com' + href
      }
      packs.push({ title, url: href })
    }
  })

  return packs
}

async function getStickers(url) {
  const res = await axios.get(url)
  const $ = cheerio.load(res.data)

  const links = []

  $('img.sticker-image').each((_, el) => {
    let src = $(el).attr('data-src-large') || $(el).attr('src')
    if (src) {
      if (!src.startsWith('http')) {
        src = 'https://getstickerpack.com' + src
      }
      links.push(src)
    }
  })

  return links
}