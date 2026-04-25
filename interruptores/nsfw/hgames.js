let handler = async (client, m, args, usedPrefix, command) => {
  const chat = global.db.data.chats[m.chat] || {};
  
  if (!chat.nsfw) {
    return m.reply(`🔞 *Contenido NSFW Bloqueado*\n\n` +
      `💙 Este comando requiere que el contenido NSFW esté activado en este chat.\n\n` +
      `💡 Usa ${usedPrefix}enable nsfw para activarlo.`);
  }

  const games = [
    { name: 'Teaching Feeling v3.0', size: '531 MB', file: 'Teaching-Feeling.apk' },
    { name: 'Lonely Girl v1.0', size: '39 MB', file: 'Lonely.Girl.apk' },
    { name: 'FHB v1.0', size: '40 MB', file: 'FHBQuickieHalloween.Mavis.apk' },
    { name: 'Kaguya Player v2.0', size: '49 MB', file: 'KAGUYA_PLAYER.apk' },
    { name: 'Coco-nut Shake v1.5', size: '42 MB', file: 'Coco-nut_shake.apk' },
    { name: 'Tatsumaki-TH v1.0', size: '30 MB', file: 'Tatsumaki-TH.apk' },
    { name: 'Nicole v1 v1.17', size: '48 MB', file: 'Nicole.v1.17.apk' },
    { name: 'Fapwall v1.0', size: '13 MB', file: 'Fapwall.apk' },
    { name: 'Fuckerwatch v1.0', size: '63 MB', file: 'FUCKERWATCH.apk' },
    { name: 'Survive v1.0', size: '46 MB', file: 'survive.apk' },
    { name: 'Together Again', size: '298 MB', file: 'Together_Again.apk' },
    { name: 'The-Queen-Of-Martial', size: '157 MB', file: 'The-Queen-Of-Martial.apk' },
    { name: 'Lovely Piston Trap', size: '93 MB', file: 'LovelyCraftPistonTrap.apk' },
    { name: 'Intimate Brothel', size: '151 MB', file: 'Intimate-Brothel.apk' },
    { name: 'My College', size: '180 MB', file: 'My_College.apk' },
    { name: 'Pocket Touch Simulation', size: '395 MB', file: 'Pocket_Touch_Simulation.apk' },
    { name: 'Shopkeepers Wife NTR', size: '221 MB', file: 'Shopkeepers.Wife.NTR.apk' },
    { name: 'Sister Fight', size: '56 MB', file: 'Sister_Fight.apk' },
    { name: 'Pocket Sweeties 2', size: '340 MB', file: 'PocketSweeties2.apk' },
    { name: 'Horny Union', size: '249 MB', file: 'Horny.Union.apk' },
    { name: 'Sweet Deviance', size: '393 MB', file: 'SweetDeviance.apk' },
    { name: 'Happy Summer', size: '407 MB', file: 'HS.apk' },
    { name: 'My Daughter Forever', size: '404 MB', file: 'MyDaughterForever.apk' },
    { name: 'My Best Deal', size: '519 MB', file: 'MY.BEST.DEAL.apk' }
  ];

  let message = `🎮 *JUEGOS H - DESCARGAS* 🎮\n`;
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
  message += `• Usa ${usedPrefix}hgames <número> para descargar\n`;
  message += `• Ejemplo: ${usedPrefix}hgames 1\n`;
  message += `━━━━━━━━━━━━━━━━━━`;

  if (args[0] && !isNaN(args[0])) {
    const index = parseInt(args[0]) - 1;
    if (index >= 0 && index < games.length) {
      const game = games[index];
      
      let downloadMsg = `🎮 *DESCARGANDO JUEGO* 🎮\n\n`;
      downloadMsg += `📱 *${game.name}*\n`;
      downloadMsg += `📁 Tamaño: ${game.size}\n`;
      downloadMsg += `📄 Archivo: ${game.file}\n\n`;
      downloadMsg += `⏳ Preparando descarga...\n\n`;
      downloadMsg += `💙 Hatsune Miku Bot`;
      
      await m.reply(downloadMsg);
      
      try {
        await client.sendFile(m.chat, `https://github.com/hgames-apk/files/releases/download/v1.0/${game.file}`, game.file, `🎮 ${game.name}\n\n💙 Hatsune Miku Bot`, m);
      } catch (err) {
        await m.reply(`❌ Error al descargar el juego. El archivo podría no estar disponible.\n\n💡 Intenta más tarde.`);
      }
      return;
    }
  }

  await client.sendFile(m.chat, 'https://cdn.somoskudasai.com/image/b41e537b8184463d78b6b98b3e382938/1920x1080/portada_hatsune-miku-38.jpg', 'hgames.jpg', message, m);
};

export default {
  command: ['hgames', 'juegosh', 'adultgames', 'gamesh'],
  category: 'nsfw',
  isNsfw: true,
  run: handler
};
