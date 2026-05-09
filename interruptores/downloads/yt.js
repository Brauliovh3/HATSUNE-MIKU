import yts from 'yt-search'
import { getBuffer } from '../../nucleo/message.js'
import { processDownload } from './play.js'


const ytState = global.ytState || (global.ytState = new Map())

function getKey(chat, sender) {
  return `${chat}:${sender}`
}

export default {
  command: ['ytsearch', 'search'],
  category: 'internet',
  run: async (client, m, args, usedPrefix, command) => {
    const query = args?.join(' ').trim()
    if (!query) return m.reply('💙 Por favor, Ingrese el título de un vídeo.')

    const ress = await yts(query)
    const results = (ress?.all || []).filter(v => v && v.type === 'video')

    if (!results.length) return m.reply('❌ No se encontraron vídeos para tu búsqueda.')

    
    const shown = results.slice(0, 10)

    
    const key = getKey(m.chat, m.sender)
    ytState.set(key, {
      timestamp: Date.now(),
      videoInfoByIndex: shown.map(v => ({
        url: v.url,
        title: v.title,
        thumbnail: v.thumbnail,
      })),
    })

    
    const first = shown[0]
    let thumb = null
    try {
      if (first?.image) thumb = await getBuffer(first.image)
      else if (first?.thumbnail) thumb = await getBuffer(first.thumbnail)
    } catch {}

    const titles = shown.map((v, i) => {
      const n = String(i + 1).padStart(2, '0')
      const safeTitle = String(v.title || '').replace(/\s+/g, ' ').trim().substring(0, 60)
      return { n, safeTitle }
    })

    const total = shown.length
    const bodyText = `🎥 *RESULTADOS YOUTUBE*\n\nSelecciona un vídeo (1-${total}).\n\n\u2022 Query: ${query}`

    const msg = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: { text: bodyText },
            footer: { text: '🎵 Hatsune Miku' },
            header: { title: 'YOUTUBE SEARCH', hasMediaAttachment: false },
            nativeFlowMessage: {
              buttons: [
                {
                  name: 'single_select',
                  buttonParamsJson: JSON.stringify({
                    title: 'Elegir vídeo',
                    sections: [
                      {
                        title: `📌 Videos disponibles (${total})`,
                        rows: titles.map((t, i) => ({
                          header: `${t.n}. ${t.safeTitle}`,
                          title: `${t.n}. ${t.safeTitle}`,
                          description: 'Descargar MP3',
                          id: `yt_pick_${i}`,
                        })),
                      },
                    ],
                  }),
                },
              ],
            },
          },
        },
      },
    }

    if (thumb) {
      await client.sendMessage(m.chat, { image: thumb, caption: bodyText }, { quoted: m })
    }

    
    const relay = await client.relayMessage(m.chat, msg.viewOnceMessage.message, { messageId: m.key.id })
    return relay
  },
}


export async function processYouTubeButton(client, m) {
  
  let buttonId = m.body || m.text || null
  if (m.message?.buttonsResponseMessage) {
    buttonId = m.message.buttonsResponseMessage.selectedButtonId
  }
  if (m.message?.interactiveResponseMessage) {
    try {
      const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson
      if (paramsJson) {
        const params = JSON.parse(paramsJson)
        buttonId = params.id
      }
    } catch {}
  }
  if (!buttonId || !buttonId.startsWith('yt_pick_')) return false

  const idx = Number(String(buttonId).replace('yt_pick_', ''))
  const key = getKey(m.chat, m.sender)
  const state = ytState.get(key)
  if (!state) return false
  if (Date.now() - state.timestamp > 10 * 60 * 1000) {
    ytState.delete(key)
    await client.reply(m.chat, '⏳ Búsqueda expiró. Usa .ytsearch otra vez.', m)
    return false
  }

  const info = state.videoInfoByIndex?.[idx]
  if (!info) return false

 
  const option = 1
  try {
    
    await processDownload(client, m, info, option)
    return true
  } catch {
    return false
  }
}

