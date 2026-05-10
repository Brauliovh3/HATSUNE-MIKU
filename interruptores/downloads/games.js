import { generateWAMessageFromContent, prepareWAMessageMedia, getDevice } from '@whiskeysockets/baileys'

const COVER_URL = 'https://cdn.somoskudasai.com/image/b41e537b8184463d78b6b98b3e382938/1920x1080/portada_hatsune-miku-38.jpg'

const games = [
  { name: 'Minecraft', size: '433 MB', file: 'Minecraft.apk' },
  { name: 'Plants vs Zombies 2', size: '1.0 GB', file: 'PVZ2.apk' },
  { name: 'BVH3 Wallpaper', size: '8 MB', file: 'WALLPAPER.apk' },
  { name: 'Terraria', size: '170 MB', file: 'terraria.apk' },
  { name: 'Among Us', size: '777 MB', file: 'among-us.apk' },
  { name: 'Geometry Dash v2', size: '171 MB', file: 'Geometry-Dash-v2.apk' },
  { name: 'Zombie Tsunami', size: '90 MB', file: 'zombie.tsunami.apk' },
]

export async function processGamesButton(client, m, buttonId) {
  await sendGame(client, m, parseInt(buttonId.replace('game_', '')) - 1)
}

async function sendGame(client, m, index) {
  if (index < 0 || index >= games.length) {
    return await m.reply(`❌ Número inválido. Elige entre 1 y ${games.length}.`)
  }
  const game = games[index]
  await m.reply(`🎮 *DESCARGANDO JUEGO* 🎮\n\n📱 *${game.name}*\n📁 Tamaño: ${game.size}\n📄 Archivo: ${game.file}\n\n⏳ Enviando archivo...\n\n🎮 Bot de Juegos`)
  try {
    await client.sendMessage(m.chat, {
      document: { url: `https://github.com/Brauliovh3/HATSUNE-MIKU/releases/download/Juegosv1/${game.file}` },
      mimetype: 'application/vnd.android.package-archive',
      fileName: game.file,
      caption: `🎮 ${game.name}\n\n🤖 Bot de Juegos`
    }, { quoted: m })
  } catch {
    await m.reply(`❌ Error al descargar.\n\n💡 Enlace directo:\nhttps://github.com/Brauliovh3/HATSUNE-MIKU/releases/download/Juegosv1/${game.file}`)
  }
}

global.gameSessions = global.gameSessions || {}

async function enviarListaJuegos(conn, chat, m, usedPrefix) {
  const now = Date.now()
  for (const k of Object.keys(global.gameSessions))
    if (global.gameSessions[k].expiry < now) delete global.gameSessions[k]

  const sessionKey = `${chat}|${m.sender}`
  global.gameSessions[sessionKey] = { owner: m.sender, chat, expiry: Date.now() + 300_000 }

  const device   = getDevice(m.key.id)
  const isMobile = device !== 'desktop' && device !== 'web'

  const descripcion = `🎮 *DESCARGAS* 🎮\n━━━━━━━━━━━━━━━━━━\n📦 Total: *${games.length} juegos*\n━━━━━━━━━━━━━━━━━━\n💡 Selecciona un juego o usa *${usedPrefix}juegos <número>*`

  if (isMobile) {
    try {
      const media  = await prepareWAMessageMedia(
        { image: { url: COVER_URL } },
        { upload: conn.waUploadToServer }
      )
      const interactiveMessage = {
        body:   { text: descripcion },
        footer: { text: '🎮 Seccion de Juegos' },
        header: {
          title: '🎮 JUEGOS',
          hasMediaAttachment: true
        },
        nativeFlowMessage: {
          buttons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: '🎮 Elegir juego',
              sections: [{
                title: '🎮 Juegos disponibles',
                highlight_label: '',
                rows: games.map((game, index) => ({
                  header:      `${(index + 1).toString().padStart(2, '0')}. ${game.name}`,
                  title:       `${(index + 1).toString().padStart(2, '0')}. ${game.name}`,
                  description: `📁 ${game.size}`,
                  id:          `game_${index + 1}`
                }))
              }]
            })
          }],
          messageParamsJson: ''
        }
      }

      const msg = generateWAMessageFromContent(
        chat,
        { viewOnceMessage: { message: { interactiveMessage } } },
        { userJid: conn.user.jid, quoted: m }
      )
      await conn.relayMessage(chat, msg.message, { messageId: msg.key.id })
      return
    } catch (err) {
      console.error('[games interactiveMessage]', err.message)
    }
  }

  let txt = `${descripcion}\n\n`
  games.forEach((g, i) => {
    txt += `${(i + 1).toString().padStart(2, '0')}. *${g.name}* — 📁 ${g.size}\n`
  })
  txt += `\n_Responde con el número del juego._`

  await conn.sendMessage(chat, { image: { url: COVER_URL }, caption: txt }, { quoted: m })
}

let handler = async (client, m, args, usedPrefix, command) => {
  if (args[0] && !isNaN(args[0])) {
    await sendGame(client, m, parseInt(args[0]) - 1)
    return
  }

  await enviarListaJuegos(client, m.chat, m, usedPrefix)
}

handler.before = async (m, { conn }) => {
  const nativeFlow = m.message?.interactiveResponseMessage?.nativeFlowResponseMessage
  if (nativeFlow) {
    try {
      const selectedId = JSON.parse(nativeFlow.paramsJson || '{}')?.id || null
      if (!selectedId || !selectedId.startsWith('game_')) return true

      const sessionKey = `${m.chat}|${m.sender}`
      const session    = global.gameSessions?.[sessionKey]
      if (!session || session.owner !== m.sender || Date.now() > session.expiry) return true

      delete global.gameSessions[sessionKey]
      await sendGame(conn, m, parseInt(selectedId.replace('game_', '')) - 1)
    } catch (err) { console.error('[games before nativeFlow]', err.message) }
    return false
  }

  const rawInput = m.message?.listResponseMessage?.singleSelectReply?.selectedRowId
    || (m.text && /^\d+$/.test(m.text.trim()) ? m.text.trim() : null)

  if (!rawInput) return false

  const sessionKey = `${m.chat}|${m.sender}`
  const session    = global.gameSessions?.[sessionKey]
  if (!session || session.owner !== m.sender || Date.now() > session.expiry) return false

  delete global.gameSessions[sessionKey]

  const index = parseInt(rawInput) - 1
  await sendGame(conn, m, index)
  return true
}

export default {
  command: ['games', 'juegos', 'descargar'],
  category: 'games',
  nsfw: false,
  run: handler
}
