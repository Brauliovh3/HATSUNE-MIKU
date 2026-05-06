import axios from 'axios'


const _k = Buffer.from('REVQT09MLWtleTYwMDE1MDkx', 'base64').toString()
const _b = Buffer.from('aHR0cHM6Ly9hcGkuYWx5YWNvcmUueHl6L2RsL2FuaW1lL2VwaXNvZGU=', 'base64').toString()


const MIKU = {
  heart:   '💙',
  note:    '🎵',
  sparkle: '✨',
  check:   '✅',
  cross:   '❌',
  wait:    '⏳',
  film:    '🎬',
  tv:      '📺',
  globe:   '🌐',
  dl:      '⬇️',
  pin:     '📌',
  banner:  'https://i.pinimg.com/736x/0c/1e/f8/0c1ef8e804983e634fbf13df1044a41f.jpg',
}

const D_START = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮`
const D_END   = `╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`

export default {
  command:  ['anime', 'animedl', 'adl'],
  category: 'downloader',

  run: async (client, m, args, usedPrefix, command) => {
    const text = args.join(' ').trim()

    
    if (!text) {
      return client.reply(
        m.chat,
        `${D_START}\n│ 💙 *ANIME DOWNLOADER*\n│\n│ 🎵 Descarga episodios de anime fácilmente.\n│\n│ 📌 *Uso:*\n│ \`${usedPrefix + command} <nombre> <episodio>\`\n│\n│ 🎬 *Ejemplo:*\n│ \`${usedPrefix + command} Tonikaku Kawaii 01\`\n│\n│ ✨ El episodio es opcional (por defecto: 01)\n${D_END}`,
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
        `${D_START}\n│ 💔 *NOMBRE INVÁLIDO*\n│\n│ 🎵 Debes escribir el nombre del anime.\n│\n│ 📌 *Ejemplo:*\n│ \`${usedPrefix + command} Tonikaku Kawaii 01\`\n${D_END}`,
        m,
        global.miku,
      )
    }

    await m.react(MIKU.wait)

    try {
      
      const { data } = await axios.get(_b, {
        params:  { query, ep, key: _k },
        timeout: 15000,
      })

      if (!data?.status) {
        await m.react(MIKU.cross)
        return client.reply(
          m.chat,
          `${D_START}\n│ 💔 *NO ENCONTRADO*\n│\n│ 🎵 No se encontró:\n│ 📺 *"${query}"* — Ep. ${ep}\n│\n│ ✨ Revisa el nombre e inténtalo de nuevo.\n${D_END}`,
          m,
          global.miku,
        )
      }

      const { title, episode, language, pixeldrain, dl } = data

      
      const info = `${D_START}\n│ 💙 *ANIME ENCONTRADO*\n│\n│ 📺 *Título:*   ${title}\n│ 🎬 *Episodio:* ${episode}\n│ 🌐 *Idioma:*   ${language}\n│\n${D_END}`

      await client.sendContextInfoIndex(m.chat, info, {}, m, true, null, {
        banner: MIKU.banner,
        title:  '💙 Anime Downloader',
        body:   '✨ Descarga tu anime favorito',
        redes:  global.db.data.settings[client.user.id.split(':')[0] + '@s.whatsapp.net'].link,
      })

      
      await client.sendMessage(
        m.chat,
        {
          document: { url: dl },
          mimetype: 'video/mp4',
          fileName: `${title} - Ep${String(episode).padStart(2, '0')}.mp4`,
          caption:
            `${D_START}\n│ 💙 *ANIME DOWNLOADER*\n│\n│ 📺 *${title}*\n│ 🎬 Episodio: *${episode}*\n│ 🌐 Idioma: ${language}\n│\n│ 🔗 *Ver online:*\n│ ${pixeldrain}\n│\n│ ✨ _Powered by Miku Bot_ 💙\n${D_END}`,
        },
        { quoted: m },
      )

      await m.react(MIKU.check)

    } catch (e) {
      await m.react(MIKU.cross)
      return client.reply(
        m.chat,
        `${D_START}\n│ 💔 *ERROR*\n│\n│ 🎵 Ocurrió un error al ejecutar *${usedPrefix + command}*\n│\n│ 🌱 *Detalle:* ${e.message}\n│\n│ ✨ Inténtalo de nuevo o contacta soporte.\n${D_END}`,
        m,
        global.miku,
      )
    }
  },
}
