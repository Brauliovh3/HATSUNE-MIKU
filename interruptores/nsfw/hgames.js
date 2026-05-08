import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

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

export async function processHgameButton(client, m, buttonId) {
  const index = parseInt(buttonId.replace('hgame_', '')) - 1
  await sendGame(client, m, index)
}

async function sendGame(client, m, index) {
  if (index < 0 || index >= games.length) {
    return await m.reply(`❌ Número inválido. Elige del 1 al ${games.length}`)
  }
  const game = games[index]
  await m.reply(`🎮 *DESCARGANDO JUEGO* 🎮\n\n📱 *${game.name}*\n📁 Tamaño: ${game.size}\n📄 Archivo: ${game.file}\n\n⏳ Enviando archivo...\n\n💙 Hatsune Miku Bot`)
  try {
    await client.sendMessage(m.chat, {
      document: { url: `https://github.com/Brauliovh3/BVH3_INDUSTRIES/releases/download/v1.0-hgames/${game.file}` },
      mimetype: 'application/vnd.android.package-archive',
      fileName: game.file,
      caption: `🎮 ${game.name}\n\n💙 Hatsune Miku Bot`
    }, { quoted: m })
  } catch {
    await m.reply(`❌ Error al descargar.\n\n💡 Enlace directo:\nhttps://github.com/Brauliovh3/BVH3_INDUSTRIES/releases/download/v1.0-hgames/${game.file}`)
  }
}

let handler = async (client, m, args, usedPrefix, command) => {

  if (args[0] && !isNaN(args[0])) {
    await sendGame(client, m, parseInt(args[0]) - 1)
    return
  }


  await client.sendMessage(m.chat, {
    image: { url: 'https://cdn.somoskudasai.com/image/b41e537b8184463d78b6b98b3e382938/1920x1080/portada_hatsune-miku-38.jpg' },
    caption: `🎮 *JUEGOS H - DESCARGAS* 🎮\n━━━━━━━━━━━━━━━━━━\n📦 Total: *${games.length} juegos*\n━━━━━━━━━━━━━━━━━━\n💙 Hatsune Miku Bot`
  }, { quoted: m })

  
  try {
    await client.sendMessage(m.chat, {
      text: `💡 *Selecciona un juego para descargar:*`,
      footer: `💙 Hatsune Miku Bot | ${usedPrefix}hgames <número>`,
      title: '🎮 JUEGOS H',
      buttonText: '🎮 Elegir juego',
      sections: [{
        title: '🎮 Juegos disponibles',
        rows: games.map((game, index) => ({
          title: `${(index + 1).toString().padStart(2, '0')}. ${game.name}`,
          description: `📁 ${game.size}`,
          rowId: `hgame_${index + 1}`
        }))
      }]
    }, { quoted: m })
  } catch {
  
    try {
      const msg = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
          message: {
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({
                text: `💡 Selecciona un juego o usa *${usedPrefix}hgames <número>*`
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({
                text: '💙 Hatsune Miku Bot'
              }),
              header: proto.Message.InteractiveMessage.Header.create({
                title: '🎮 JUEGOS H',
                hasMediaAttachment: false
              }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [proto.Message.InteractiveMessage.NativeFlowMessage.NativeFlowButton.create({
                  name: 'single_select',
                  buttonParamsJson: JSON.stringify({
                    title: '🎮 Elegir juego',
                    sections: [{
                      title: '🎮 Juegos disponibles',
                      rows: games.map((game, index) => ({
                        header: `${(index + 1).toString().padStart(2, '0')}. ${game.name}`,
                        title: `${(index + 1).toString().padStart(2, '0')}. ${game.name}`,
                        description: `📁 ${game.size}`,
                        id: `hgame_${index + 1}`
                      }))
                    }]
                  })
                })]
              })
            })
          }
        }
      }, { quoted: m })
      await client.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    } catch {
   
      let message = `🎮 *JUEGOS H - DESCARGAS* 🎮\n━━━━━━━━━━━━━━━━━━\n📦 Total: *${games.length} juegos*\n━━━━━━━━━━━━━━━━━━\n\n`
      games.forEach((game, index) => {
        message += `${(index + 1).toString().padStart(2, '0')}. ${game.name}\n   📁 ${game.size}\n\n`
      })
      message += `━━━━━━━━━━━━━━━━━━\n💡 Usa *${usedPrefix}hgames <número>* para descargar\n• Ejemplo: ${usedPrefix}hgames 1\n━━━━━━━━━━━━━━━━━━`
      await m.reply(message)
    }
  }
}

export default {
  command: ['hgames', 'juegosh', 'adultgames', 'gamesh'],
  category: 'nsfw',
  nsfw: true,
  run: handler
}
