import fetch from 'node-fetch'
import { proto, generateWAMessageFromContent, generateWAMessageContent } from '@whiskeysockets/baileys'

const _k = [68,69,80,79,79,76,45,107,101,121,54,48,48,49,53].map(c=>String.fromCharCode(c)).join('')

const _u = (s = '') => /^https?:\/\//i.test(String(s || '').trim())
const _s = (x = '') => String(x || '').trim()
const _w = (ms = 1200) => new Promise((r) => setTimeout(r, ms))

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
    .filter((i) => i && (i.hd || i.image || i.url))
    .slice(0, 7)
    .map((i) => ({
      hd: i.hd || i.image || i.url,
      title: i.title || i.grid_title || 'Imagen de Pinterest',
      source: i.full_name || i.username || i.name || 'Pinterest',
    }))
}

async function _search(q = '') {
  const a = [
    `https://api.alyacore.xyz/search/pinterest?query=${encodeURIComponent(q)}&key=${encodeURIComponent(_k)}`,
    global?.APIs?.stellar?.url
      ? `${global.APIs.stellar.url}/search/pinterest?query=${encodeURIComponent(q)}&key=${global.APIs.stellar.key}`
      : null,
  ].filter(Boolean)

  for (const e of a) {
    try {
      const r = await _j(e)
      if (r?.status && Array.isArray(r?.data) && r.data.length) return _n(r.data)
      if (Array.isArray(r?.data) && r.data.length) return _n(r.data)
    } catch {}
    await _w(350)
  }
  return []
}

async function _carousel(conn, m, q, list) {
  const cards = []

  for (const it of list) {
    try {
      const { imageMessage } = await generateWAMessageContent(
        { image: { url: it.hd } },
        { upload: conn.waUploadToServer },
      )

      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: `💙 *${it.title}*\n🌱 Fuente: ${it.source}`,
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: '' }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: '',
          hasMediaAttachment: true,
          imageMessage,
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: [] }),
      })
    } catch (err) {
      console.error(`Error cargando imagen ${it.hd}:`, err.message)
    }
  }

  if (!cards.length) {
    throw new Error('No se pudo construir el carrusel con las imágenes encontradas')
  }

  const x = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({
              text: `💙 Resultados de Pinterest para: *${q}*`,
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
              text: `${global?.botname || '💙Hatsune Miku💙'} \n ${global?.dev || 'DEPOOL'}`,
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

export default {
  command: ['pinterest', 'pin'],
  category: 'search',
  run: async (conn, m, args, usedPrefix, command) => {
    const text = _s(args.join(' '))
    if (!text) {
      return conn.reply(
        m.chat,
        `💙 Uso correcto: *${usedPrefix + command}* <texto o enlace>\n🌱 Ejemplo: *${usedPrefix + command} miku aesthetic*`,
        m,
      )
    }

    try {
      try { await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }) } catch {}

      let r = []
      if (_u(text)) {
        r = [{ hd: text, title: 'Imagen directa', source: text }]
      } else {
        r = await _search(text)
      }

      if (!r.length) {
        try { await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }) } catch {}
        return conn.reply(m.chat, `💙 No se encontraron imágenes para *${text}*.`, m)
      }

      await _carousel(conn, m, text, r)
      try { await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } }) } catch {}
    } catch (e) {
      try { await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }) } catch {}
      return conn.reply(
        m.chat,
        `💙 *ERROR*\n\n💙 Ocurrió un error al ejecutar *${usedPrefix + command}*\n🌱 *Error:* ${e.message}`,
        m,
      )
    }
  },
}
