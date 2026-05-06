import axios from 'axios'
import fs    from 'fs'

const _k = Buffer.from('REVQT09MLWtleTYwMDE1MDkx', 'base64').toString()
const _b = Buffer.from('aHR0cHM6Ly9hcGkuYWx5YWNvcmUueHl6L3Rvb2xzL2JyYXR2Mg==', 'base64').toString()

const D_S = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮`
const D_E = `╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`

const fetchBratVideo = async (text) => {
  const { data } = await axios.get(_b, {
    params:       { text, key: _k },
    responseType: 'arraybuffer',
    timeout:      20000,
  })
  if (!data) throw new Error('La API no devolvió datos.')
  return data
}

export default {
  command:  ['bratv', 'bv2'],
  category: 'stickers',

  run: async (client, m, args, usedPrefix, command, text) => {
    try {
      text = m.quoted?.text || text || args.join(' ').trim()

      if (!text) {
        return client.reply(
          m.chat,
          `${D_S}\n│ 💙 *BRAT STICKER V2*\n│\n│ 🎵 Responde a un mensaje o\n│ ingresa el texto deseado.\n│\n│ 📌 *Uso:*\n│ \`${usedPrefix + command} <texto>\`\n│\n│ 🎬 *Ejemplo:*\n│ \`${usedPrefix + command} DEPOOL TU KING\`\n${D_E}`,
          m,
          global.miku,
        )
      }

      await m.react('⏳')

      const db    = global.db.data
      const user  = db.users[m.sender] || {}
      const name  = user.name || m.sender.split('@')[0]
      const meta1 = user.metadatos  ? String(user.metadatos).trim()  : ''
      const meta2 = user.metadatos2 ? String(user.metadatos2).trim() : ''

      const packname = meta1 ? meta1 : '💙 HATSUNE MIKU'
      const author   = meta1 ? (meta2 ? meta2 : '') : `@${name}`

      const videoBuffer = await fetchBratVideo(text)
      const tmpFile     = `./tmp/bratv2-${Date.now()}.mp4`

      await fs.promises.writeFile(tmpFile, videoBuffer)
      await client.sendVideoAsSticker(m.chat, tmpFile, m, { packname, author })

      try { await fs.promises.unlink(tmpFile) } catch {}

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
