import { prepareWAMessageMedia, generateWAMessageFromContent, getDevice } from '@whiskeysockets/baileys'

const games = [
  { name: 'Teaching Feeling v3.0', size: '519 MB', file: 'Teaching-Feeling.apk' },
  { name: 'Lonely Girl v1.0', size: '39.5 MB', file: 'Lonely.Girl.apk' },
  { name: 'FHB v1.0', size: '40.7 MB', file: 'FHBQuickieHalloween.Mavis.apk' },
  { name: 'Kaguya Player v2.0', size: '49 MB', file: 'KAGUYA_PLAYER.apk' },
  { name: 'Coco-nut Shake v1.5', size: '42.2 MB', file: 'Coco-nut_shake.apk' },
  { name: 'Tatsumaki-TH v1.0', size: '30.3 MB', file: 'Tatsumaki-TH.apk' },
  { name: 'Nicole v1 v1.17', size: '48.4 MB', file: 'Nicole.v1.17.apk' },
  { name: 'Fapwall v1.0', size: '13.5 MB', file: 'Fapwall.apk' },
  { name: 'Fuckerwatch v1.0', size: '63.2 MB', file: 'FUCKERWATCH.apk' },
  { name: 'Survive v1.0', size: '46.1 MB', file: 'survive.apk' },
  { name: 'Together Again', size: '298 MB', file: 'Together_Again.apk' },
  { name: 'The-Queen-Of-Martial', size: '157 MB', file: 'The-Queen-Of-Martial.apk' },
  { name: 'Lovely Piston Trap', size: '93.5 MB', file: 'LovelyCraftPistonTrap.apk' },
  { name: 'Intimate Brothel', size: '151 MB', file: 'Intimate-Brothel.apk' },
  { name: 'My College', size: '180 MB', file: 'My_College.apk' },
  { name: 'Pocket Touch Simulation', size: '395 MB', file: 'Pocket_Touch_Simulation.apk' },
  { name: 'Shopkeepers Wife NTR', size: '221 MB', file: 'Shopkeepers.Wife.NTR.apk' },
  { name: 'Sister Fight', size: '56.4 MB', file: 'Sister_Fight.apk' },
  { name: 'Pocket Sweeties 2', size: '340 MB', file: 'PocketSweeties2.apk' },
  { name: 'Horny Union', size: '249 MB', file: 'Horny.Union.apk' },
  { name: 'Sweet Deviance', size: '394 MB', file: 'SweetDeviance.apk' },
  { name: 'Happy Summer', size: '408 MB', file: 'HS.apk' },
  { name: 'My Daughter Forever', size: '405 MB', file: 'MyDaughterForever.apk' },
  { name: 'My Best Deal', size: '519 MB', file: 'MY.BEST.DEAL.apk' },
  { name: 'Nemurimouto', size: '240 MB', file: 'NEMURIMOUTO.apk' }
]

const COVER_URL = 'https://cdn.somoskudasai.com/image/b41e537b8184463d78b6b98b3e382938/1920x1080/portada_hatsune-miku-38.jpg'
const BASE_DL   = 'https://github.com/Brauliovh3/BVH3_INDUSTRIES/releases/download/v1.0-hgames'

global.hgameSessions = global.hgameSessions || {}

async function enviarListaJuegos(conn, chat, m, usedPrefix) {

  const now = Date.now()
  for (const k of Object.keys(global.hgameSessions))
    if (global.hgameSessions[k].expiry < now) delete global.hgameSessions[k]


  const sessionKey = `${chat}|${m.sender}`
  global.hgameSessions[sessionKey] = { owner: m.sender, chat, expiry: Date.now() + 300_000 }

  const device   = getDevice(m.key.id)
  const isMobile = device !== 'desktop' && device !== 'web'

  const filas = games.map((game, i) => ({
    rowId:       `hgame_${i + 1}`,
    title:       `${(i + 1).toString().padStart(2, '0')}. ${game.name}`,
    description: `📁 ${game.size}`
  }))

  const descripcion = `*JUEGOS H - DESCARGAS*\n━━━━━━━━━━━━━━━━━━\n📦 Total: *${games.length} juegos*\n━━━━━━━━━━━━━━━━━━\n💡 Selecciona un juego o usa *${usedPrefix}hgames <número>*`

  if (isMobile) {
    try {
      const media  = await prepareWAMessageMedia(
        { image: { url: COVER_URL } },
        { upload: conn.waUploadToServer }
      )
      const interactiveMessage = {
        body:   { text: descripcion },
        footer: { text: '💙 Hatsune Miku Bot' },
        nativeFlowMessage: {
          buttons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: '🎮 Elegir juego',
              sections: [{
                title: '🎮 Juegos disponibles',
                highlight_label: '',
                rows: filas.map(r => ({
                  header:      r.title,
                  title:       r.title,
                  description: r.description,
                  id:          r.rowId
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
      console.error('[hgames interactiveMessage]', err.message)
      
    }
  }


  let txt = `${descripcion}\n\n`
  games.forEach((g, i) => {
    txt += `${(i + 1).toString().padStart(2, '0')}. *${g.name}* — 📁 ${g.size}\n`
  })
  txt += `\n_Responde con el número del juego._`

  await conn.sendMessage(chat, { image: { url: COVER_URL }, caption: txt }, { quoted: m })
}

async function sendGame(client, m, index) {
  if (index < 0 || index >= games.length)
    return await m.reply(`❌ Número inválido. Elige del 1 al ${games.length}`)

  const game = games[index]
  await m.reply(`🎮 *DESCARGANDO JUEGO* 🎮\n\n📱 *${game.name}*\n📁 Tamaño: ${game.size}\n📄 Archivo: ${game.file}\n\n⏳ Enviando archivo...\n\n💙 Hatsune Miku Bot`)

  try {
    await client.sendMessage(m.chat, {
      document: { url: `${BASE_DL}/${game.file}` },
      mimetype: 'application/vnd.android.package-archive',
      fileName: game.file,
      caption:  `🎮 ${game.name}\n\n💙 Hatsune Miku Bot`
    }, { quoted: m })
  } catch {
    await m.reply(`❌ Error al descargar.\n\n💡 Enlace directo:\n${BASE_DL}/${game.file}`)
  }
}

export async function processHgameButton(client, m, buttonId) {
  await sendGame(client, m, parseInt(buttonId.replace('hgame_', '')) - 1)
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
      if (!selectedId || !selectedId.startsWith('hgame_')) return true

      const sessionKey = `${m.chat}|${m.sender}`
      const session    = global.hgameSessions?.[sessionKey]
      if (!session || session.owner !== m.sender || Date.now() > session.expiry) return true

      delete global.hgameSessions[sessionKey]
      await sendGame(conn, m, parseInt(selectedId.replace('hgame_', '')) - 1)
    } catch (err) { console.error('[hgames before nativeFlow]', err.message) }
    return false
  }

  
  const rawInput = m.message?.listResponseMessage?.singleSelectReply?.selectedRowId
    || (m.text && /^\d+$/.test(m.text.trim()) ? m.text.trim() : null)

  if (!rawInput) return false

  const sessionKey = `${m.chat}|${m.sender}`
  const session    = global.hgameSessions?.[sessionKey]
  if (!session || session.owner !== m.sender || Date.now() > session.expiry) return false

  delete global.hgameSessions[sessionKey]

  const index = parseInt(rawInput) - 1
  await sendGame(conn, m, index)
  return true
}

export default {
  command: ['hgames', 'juegosh', 'adultgames', 'gamesh'],
  category: 'nsfw',
  nsfw: true,
  run: handler
    }
