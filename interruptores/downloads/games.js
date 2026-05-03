let handler = async (client, m, args, usedPrefix, command) => {

  const games = [
    { name: 'Minecraft v1.21', size: '433 MB', file: 'Minecraft.apk' },
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
    { name: 'Plants vs Zombies 2', size: '290 MB', file: 'PlantsVsZombies2.apk' },
    { name: 'Alto\'s Odyssey', size: '200 MB', file: 'AltosOdyssey.apk' },
    { name: 'Monument Valley 2', size: '220 MB', file: 'MonumentValley2.apk' },
  ];

  let message = `🎮 *JUEGOS - DESCARGAS* 🎮\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `📦 Total: *${games.length} juegos*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;

  games.forEach((game, index) => {
    const num = (index + 1).toString().padStart(2, '0');
    message += `${num}. ${game.name}\n`;
    message += `   📁 ${game.size}\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `💡 *Instrucciones:*\n`;
  message += `• Usa ${usedPrefix}games <número> para descargar\n`;
  message += `• Ejemplo: ${usedPrefix}games 1\n`;
  message += `━━━━━━━━━━━━━━━━━━`;

  if (args[0] && !isNaN(args[0])) {
    const index = parseInt(args[0]) - 1;
    if (index >= 0 && index < games.length) {
      const game = games[index];

      let downloadMsg = `🎮 *DESCARGANDO JUEGO* 🎮\n\n`;
      downloadMsg += `📱 *${game.name}*\n`;
      downloadMsg += `📁 Tamaño: ${game.size}\n`;
      downloadMsg += `📄 Archivo: ${game.file}\n\n`;
      downloadMsg += `⏳ Enviando archivo...\n\n`;
      downloadMsg += `🎮 Bot de Juegos`;

      await m.reply(downloadMsg);

      try {
        await client.sendMessage(m.chat, {
          document: { url: `https://github.com/Brauliovh3/HATSUNE-MIKU/releases/download/Juegosv1/${game.file}` },
          mimetype: 'application/vnd.android.package-archive',
          fileName: game.file,
          caption: `🎮 ${game.name}\n\n🤖 Bot de Juegos`
        }, { quoted: m });
      } catch (err) {
        console.error('Error descargando juego:', err);
        await m.reply(`❌ Error al descargar el juego. El archivo podría no estar disponible.\n\n💡 Intenta más tarde o usa el enlace directo:\nhttps://github.com/Brauliovh3/HATSUNE-MIKU/releases/download/Juegosv1/${game.file}`);
      }
      return;
    } else {
      await m.reply(`❌ Número inválido. Elige entre 1 y ${games.length}.`);
      return;
    }
  }

  await client.sendMessage(m.chat, { text: message }, { quoted: m });
};

export default {
  command: ['games', 'juegos', 'descargar'],
  category: 'games',
  nsfw: false,
  run: handler
};
