import yts from 'yt-search'
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'
import { getBuffer } from '../../nucleo/message.js'
import { processDownload } from './play.js'


const ytState = global.ytState || (global.ytState = new Map())

function getKey(chat, sender) {
  return `${chat}:${sender}`
}

function buildRowsForVideoOption(videos, optionKey) {
  return videos.map((v, i) => {
    const n = String(i + 1).padStart(2, '0')
    const safeTitle = String(v.title || '').replace(/\s+/g, ' ').trim().substring(0, 60)
    return {
      header: `${n}. ${safeTitle}`,
      title: `${n}. ${safeTitle}`,
      description: optionKey === 'mp3' ? 'Audio MP3' : 'Video 360p',
      id: `yt_${optionKey}_${i}`,
    }
  })
}

export async function processYouTubeButton(client, m) {
  let buttonId = null
  if (m.message?.interactiveResponseMessage) {
    try {
      const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson
      if (paramsJson) {
        const params = JSON.parse(paramsJson)
        buttonId = params?.id || null
      }
    } catch {}
  }
  if (!buttonId) return false
  if (!buttonId.startsWith('yt_')) return false

  const parts = buttonId.split('_')
  if (parts.length < 3) return false
  const kind = parts[1] 
  const idx = Number(parts[2]) 

  await sendYouTube(client, m, idx, kind)
  return true
}

async function sendYouTube(client, m, index, kind) {
  const key = getKey(m.chat, m.sender)
  const state = ytState.get(key)
  if (!state) {
    return await m.reply(`❌ Búsqueda expiró. Usa .ytsearch otra vez.`)
  }

  if (Date.now() - state.timestamp > 10 * 60 * 1000) {
    ytState.delete(key)
    return await m.reply(`⏳ Búsqueda expiró. Usa .ytsearch otra vez.`)
  }

  const info = state.videoInfoByIndex?.[index]
  if (!info) {
    return await m.reply(`❌ Número inválido. Elige entre 1 y ${state.videoInfoByIndex.length}.`)
  }

  const option = kind === 'mp3' ? 1 : 2


  await client.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
  
 
  await m.reply(`🎥 *DESCARGANDO VÍDEO* 🎥\n\n📱 *${info.title}*\n📁 Formato: ${option === 1 ? 'Audio MP3' : 'Video 360p'}\n📄 URL: ${info.url}\n\n⏳ Enviando archivo...\n\n🎵 Bot de YouTube`)
  
  try {
    await processDownload(client, m, info, option)
    
    await client.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (error) {
    console.log('Download error:', error)
    
    await client.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await m.reply(`❌ Error al descargar.\n\n💡 Intenta con otro enlace o formato.`)
  }
}

let handler = async (client, m, args, usedPrefix, command) => {
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

  const total = shown.length

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body: { text: `🎥 *DESCARGAS* 🎥\n━━━━━━━━━━━━━━━━━━\n📦 Total: *${total} vídeos*\n━━━━━━━━━━━━━━━━━━\n\n💡 Selecciona un vídeo o usa *${usedPrefix}yts <número>*\n\n• Query: ${query}` },
          footer: { text: '🎵 Seccion de YouTube' },
          header: {
            title: '🎥 YOUTUBE',
            hasMediaAttachment: false
          },
          nativeFlowMessage: {
            buttons: [{
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: '🎥 Elegir formato',
                sections: [
                  {
                    title: `🎵 Audio MP3 (${total})`,
                    rows: buildRowsForVideoOption(shown, 'mp3'),
                  },
                  {
                    title: `🎬 Video 360p (${total})`,
                    rows: buildRowsForVideoOption(shown, 'mp4'),
                  },
                ],
              })
            }]
          }
        }
      }
    }
  }, { quoted: m })

  await client.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

export default {
  command: ['ytsearch', 'search', 'yts'],
  category: 'internet',
  run: handler
}


