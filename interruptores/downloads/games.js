import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

const games = [
  { name: 'Minecraft v1.21', size: '433 MB', file: 'Minecraft.apk' },
  { name: 'Plants vs Zombies 2', size: '1.01 GB', file: 'plants_vs_zombies_2.apk' },
  { name: 'BVH3 Wallpaper', size: '8 MB', file: 'WALLPAPER.apk' },
  { name: 'GTA San Andreas v2.11', size: '2.4 GB', file: 'GTA_SanAndreas.apk' },
  { name: 'Terraria v1.4.4', size: '200 MB', file: 'Terraria.apk' },
  { name: 'Stardew Valley v1.5', size: '250 MB', file: 'StardewValley.apk' },
  { name: 'Among Us v2023', size: '180 MB', file: 'AmongUs.apk' },
  { name: 'Geometry Dash v2.2', size: '120 MB', file: 'GeometryDash.apk' },
  { name: 'Clash of Clans v15', size: '300 MB', file: 'ClashOfClans.apk' },
  { name: 'Brawl Stars v52', size: '350 MB', file: 'BrawlStars.apk' },
  { name: 'Stumble Guys v0.55', size: '400 MB', file: 'StumbleGuys.apk' },
  { name: 'Roblox v2.6', size: '180 MB', file: 'Roblox.apk' },
  { name: 'Angry Birds Reloaded', size: '150 MB', file: 'AngryBirds.apk' },
  { name: 'Subway Surfers v3.21', size: '130 MB', file: 'SubwaySurfers.apk' },
  { name: "Alto's Odyssey", size: '200 MB', file: 'AltosOdyssey.apk' },
  { name: 'Monument Valley 2', size: '220 MB', file: 'MonumentValley2.apk' },
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

let handler = async (client, m, args, usedPrefix, command) => {

  if (args[0] && !isNaN(args[0])) {
    await sendGame(client, m, parseInt(args[0]) - 1)
    return
  }

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body: { text: `🎮 *JUEGOS - DESCARGAS* 🎮\n━━━━━━━━━━━━━━━━━━\n📦 Total: *${games.length} juegos*\n━━━━━━━━━━━━━━━━━━\n\n💡 Selecciona un juego o usa *${usedPrefix}games <número>*` },
          footer: { text: '🎮 Bot de Juegos' },
          header: {
            title: '🎮 JUEGOS',
            hasMediaAttachment: false
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
                    id: `game_${index + 1}`
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
}

export default {
  command: ['games', 'juegos', 'descargar'],
  category: 'games',
  nsfw: false,
  run: handler
}
