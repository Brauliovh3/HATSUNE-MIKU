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
        `${D_START}
│ 💙 *ANIME DOWNLOADER*
│
│ 🎵 Uso:
│ \`${usedPrefix + command} <nombre> <episodio>\`
│
│ 📌 Ejemplo:
│ \`${usedPrefix + command} Tonikaku Kawaii 01\`
${D_END}`,
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
        `${D_START}
│ 💔 Nombre inválido
${D_END}`,
        m,
        global.miku,
      )
    }

    await m.react(MIKU.wait)

    try {
      const { data } = await axios.get(_b, {
        params: { query, ep, key: _k },
        timeout: 15000,
      })

      if (!data?.status) {
        await m.react(MIKU.cross)
        return client.reply(
          m.chat,
          `${D_START}
│ 💔 No encontrado: ${query} Ep ${ep}
${D_END}`,
          m,
          global.miku,
        )
      }

      const { title, episode, language, pixeldrain, dl } = data

      const info = `${D_START}
│ 📺 ${title}
│ 🎬 Ep: ${episode}
│ 🌐 ${language}
${D_END}`

      await client.sendMessage(m.chat, { text: info }, { quoted: m })

     

      let sent = false

    
      try {
        await client.sendMessage(
          m.chat,
          {
            video: { url: dl },
            mimetype: 'video/mp4',
            caption: `💙 ${title} - Ep ${episode}`
          },
          { quoted: m }
        )
        sent = true
      } catch (e) {
        console.log('❌ Direct video failed:', e.message)
      }

      if (!sent) {
        try {
          const res = await axios.get(dl, {
            responseType: 'arraybuffer',
            timeout: 30000
          })

          await client.sendMessage(
            m.chat,
            {
              video: Buffer.from(res.data),
              mimetype: 'video/mp4',
              caption: `💙 ${title} - Ep ${episode}`
            },
            { quoted: m }
          )
          sent = true
        } catch (e) {
          console.log('❌ Buffer failed:', e.message)
        }
      }

      
      if (!sent) {
        await client.sendMessage(
          m.chat,
          {
            text: `${D_START}
│ 💔 No se pudo enviar el video
│
│ 🔗 Ver / descargar:
│ ${pixeldrain}
${D_END}`
          },
          { quoted: m }
        )
      }

      await m.react(MIKU.check)

    } catch (e) {
      await m.react(MIKU.cross)
      return client.reply(
        m.chat,
        `${D_START}
│ 💔 Error:
│ ${e.message}
${D_END}`,
        m,
        global.miku,
      )
    }
  },
}