import axios from 'axios'
import { DOWNLOAD_TMP_DIR, ensureDir } from '../../nucleo/system/storage.js'

const _k = Buffer.from('REVQT09MLWtleTYwMDE1MDkx', 'base64').toString()
const _b = Buffer.from('aHR0cHM6Ly9hcGkuYWx5YWNvcmUueHl6L2RsL2FuaW1lL2VwaXNvZGU=', 'base64').toString()

const BANNER = 'https://i.pinimg.com/736x/0c/1e/f8/0c1ef8e804983e634fbf13df1044a41f.jpg'

const D_S = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮`
const D_E = `╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`

async function downloadToBuffer(url) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'arraybuffer',
    timeout: 90000,
  })
  return Buffer.from(response.data)
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

      const fileBuffer = await downloadToBuffer(dl)

      if (!fileBuffer || fileBuffer.length < 1024) {
        throw new Error('El archivo descargado está vacío o incompleto')
      }

      await client.sendMessage(
        m.chat,
        {
          document: fileBuffer,
          mimetype: 'video/mp4',
          fileName: `${safeName}_ep${episode}.mp4`,
          caption:  `${D_S}\n│ 🎵 *${title}*\n│ 🎬 Ep. ${episode}  🌐 ${language}\n│\n│ 💙 _Hatsune Miku Bot_ ✨\n${D_E}`,
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
    }
  },
}