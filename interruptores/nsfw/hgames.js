import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

let handler = async (client, m, args, usedPrefix, command) => {

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

  const sendGame = async (index) => {
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
    } catch (err) {
      await m.reply(`❌ Error al descargar.\n\n💡 Enlace directo:\nhttps://github.com/Brauliovh3/BVH3_INDUSTRIES/releases/download/v1.0-hgames/${game.file}`)
    }
  }


  if (args[0] && !isNaN(args[0])) {
    await sendGame(parseInt(args[0]) - 1)
    return
  }

  
  if (m.listResponseMessage) {
    const selectedId = m.listResponseMessage.singleSelectReply?.selectedRowId || ''
    if (selectedId.startsWith('hgame_')) {
      await sendGame(parseInt(selectedId.replace('hgame_', '')) - 1)
      return
    }
  }


  const nativeResponse = m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
    || m.message?.viewOnceMessageV2?.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
  if (nativeResponse) {
    try {
      const parsed = JSON.parse(nativeResponse)
      const selectedId = parsed.id || parsed.selectedId || ''
      if (selectedId.startsWith('hgame_')) {
        await sendGame(parseInt(selectedId.replace('hgame_', '')) - 1)
        return
      }
    } catch {}
  }

  
  try {
    const imageBuffer = await (await fetch('https://cdn.somoskudasai.com/image/b41e537b8184463d78b6b98b3e382938/1920x1080/portada_hatsune-miku-38.jpg')).arrayBuffer()
    const imageBytes = Buffer.from(imageBuffer)

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: { text: `🎮 *JUEGOS H - DESCARGAS* 🎮\n━━━━━━━━━━━━━━━━━━\n📦 Total: *${games.length} juegos*\n━━━━━━━━━━━━━━━━━━\n\n💡 Selecciona un juego para descargar\no usa *${usedPrefix}hgames <número>*` },
            footer: { text: '💙 Hatsune Miku Bot' },
            header: {
              title: '🎮 JUEGOS H',
              hasMediaAttachment: true,
              imageMessage: {
                url: 'https://cdn.somoskudasai.com/image/b41e537b8184463d78b6b98b3e382938/1920x1080/portada_hatsune-miku-38.jpg',
                mimetype: 'image/jpeg',
                jpegThumbnail: imageBytes
              }
            },
            nativeFlowMessage: {
              buttons: [{
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
              }]
            }
          }
        }
      }
    }, { quoted: m })

    await client.relayMessage(m.chat, msg.message, { messageId: msg.key.id })

  } catch (err) {
    
    let message = `🎮 *JUEGOS H - DESCARGAS* 🎮\n━━━━━━━━━━━━━━━━━━\n📦 Total: *${games.length} juegos*\n━━━━━━━━━━━━━━━━━━\n\n`
    games.forEach((game, index) => {
      message += `${(index + 1).toString().padStart(2, '0')}. ${game.name}\n   📁 ${game.size}\n\n`
    })
    message += `━━━━━━━━━━━━━━━━━━\n💡 Usa *${usedPrefix}hgames <número>* para descargar\n• Ejemplo: ${usedPrefix}hgames 1\n━━━━━━━━━━━━━━━━━━`
    await client.sendFile(m.chat, 'https://cdn.somoskudasai.com/image/b41e537b8184463d78b6b98b3e382938/1920x1080/portada_hatsune-miku-38.jpg', 'hgames.jpg', message, m)
  }
}

export default {
  command: ['hgames', 'juegosh', 'adultgames', 'gamesh'],
  category: 'nsfw',
  nsfw: true,
  run: handler
}
