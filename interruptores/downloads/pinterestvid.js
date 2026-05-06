import fetch from 'node-fetch'
import { proto, generateWAMessageFromContent, generateWAMessageContent } from '@whiskeysockets/baileys'

const _k = [68,69,80,79,79,76,45,107,101,121,54,48,48,49,53,48,57,49].map(c => String.fromCharCode(c)).join('')
const _b = [104,116,116,112,115,58,47,47,97,112,105,46,97,108,121,97,99,111,114,101,46,120,121,122,47,100,108,47,112,105,110,118,105,100,101,111].map(c => String.fromCharCode(c)).join('')

const _s  = (x = '') => String(x || '').trim()
const _w  = (ms = 800) => new Promise((r) => setTimeout(r, ms))

async function _j(url, timeoutMs = 25000) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: c.signal, redirect: 'follow' })
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}

function _n(a = []) {
  return a
    .filter((i) => i && i.dl && i.type === 'video')
    .slice(0, 7)
    .map((i) => ({
      dl:     i.dl,
      titulo: i.titulo || 'Pinterest Video',
      autor:  i.autor  || 'Pinterest',
      pin:    i.pinUrl || '',
    }))
}

async function _search(q = '') {
  const url = `${_b}?query=${encodeURIComponent(q)}&key=${encodeURIComponent(_k)}`
  try {
    const r = await _j(url)
    if (r?.status && Array.isArray(r?.data) && r.data.length) return _n(r.data)
  } catch {}
  await _w(350)
  return []
}

async function _carousel(conn, m, q, list) {
  const cards = []

  for (const it of list) {
    try {
      const { videoMessage } = await generateWAMessageContent(
        { video: { url: it.dl } },
        { upload: conn.waUploadToServer },
      )

      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: `💙 *${it.titulo}*\n🌱 Autor: ${it.autor}`,
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: '' }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: '',
          hasMediaAttachment: true,
          videoMessage,
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: [] }),
      })
    } catch (err) {
      console.error(`Error cargando video ${it.dl}:`, err.message)
    }
  }

  if (!cards.length) {
    throw new Error('No se pudo construir el carrusel con los videos encontrados')
  }

  const x = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({
              text: `💙 Videos de Pinterest: *${q}*`,
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
              text: `${global?.botname || '💙 Hatsune Miku 💙'}\n${global?.dev || 'DEPOOL'}`,
            }),
            header: proto.Message.InteractiveMessage.Header.create({
              hasMediaAttachment: false,
            }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards }),
          }),
        },
      },
    },
    { quoted: m },
  )

  await conn.relayMessage(m.chat, x.message, { messageId: x.key.id })
}

const D_S = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮`
const D_E = `╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`

export default {
  command:  ['pinvideo', 'pvideo', 'pv'],
  category: 'search',

  run: async (conn, m, args, usedPrefix, command) => {
    const text = _s(args.join(' '))

    if (!text) {
      return conn.reply(
        m.chat,
        `${D_S}\n│ 💙 *PINTEREST VIDEO*\n│\n│ 🎵 Busca videos en Pinterest.\n│\n│ 📌 *Uso:*\n│ \`${usedPrefix + command} <búsqueda>\`\n│\n│ 🎬 *Ejemplo:*\n│ \`${usedPrefix + command} miku aesthetic\`\n${D_E}`,
        m,
      )
    }

    try {
      try { await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }) } catch {}

      const r = await _search(text)

      if (!r.length) {
        try { await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }) } catch {}
        return conn.reply(
          m.chat,
          `${D_S}\n│ 💔 *SIN RESULTADOS*\n│\n│ 🔍 *"${text}"*\n│\n│ ✨ Intenta con otras palabras.\n${D_E}`,
          m,
        )
      }

      await _carousel(conn, m, text, r)
      try { await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } }) } catch {}

    } catch (e) {
      try { await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }) } catch {}
      return conn.reply(
        m.chat,
        `${D_S}\n│ 💔 *ERROR*\n│\n│ ⚙️ *Cmd:* ${usedPrefix + command}\n│ 🌱 ${e.message}\n│\n│ ✨ Inténtalo de nuevo.\n${D_E}`,
        m,
      )
    }
  },
}
