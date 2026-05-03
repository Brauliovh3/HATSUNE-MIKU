import fetch from 'node-fetch';

export default {
  command: ['wallpaper', 'wp', 'fondo'],
  category: 'main',
  isAdmin: false,
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const botSettings = global.db.data.settings[client.user?.id?.split(':')[0] + '@s.whatsapp.net'] || {};
      
      const wallpaperUrl = 'https://github.com/Brauliovh3/HATSUNE-MIKU/releases/download/Juegosv1/WALLPAPER.apk';
      
      const contextInfo = {
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: botSettings.id || '120363315369913363@newsletter',
          serverMessageId: '0',
          newsletterName: botSettings.nameid || '💙 HATSUNE MIKU CHANNEL💙'
        },
        externalAdReply: {
          title: '🎨 BVH3 INDUSTRIES - Wallpaper Oficial',
          body: '© By DEPOOL - Owner Oficial',
          mediaUrl: wallpaperUrl,
          description: 'Wallpaper exclusivo de BVH3 INDUSTRIES',
          previewType: 'PHOTO',
          thumbnailUrl: 'https://i.pinimg.com/736x/30/42/b8/3042b89ced13fefda4e75e3bc6dc2a57.jpg',
          sourceUrl: wallpaperUrl,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      };

      const caption = `╭━━━🌸━━━💙━━━🌸━━━╮
┃  🎨 *BVH3 INDUSTRIES* 🎨
┃     *WALLPAPER OFICIAL*
╰━━━🌸━━━💙━━━🌸━━━╯

🌸 *Creado por:* @${global.owner?.[0] || 'DEPOOL'}
💙 *Empresa:* BVH3 INDUSTRIES
🌱 *Versión:* Official Release
✨ *Diseño:* Premium Edition

📱 *Descripción:*
Fondo de pantalla oficial de BVH3 INDUSTRIES diseñado exclusivamente por el owner DEPOOL. Diseño premium con estilo único y elegante.

📥 *Descarga:*
${wallpaperUrl}

╭━━━🌸━━━💙━━━🌸━━━╮
┃ 💙 ¡Gracias por usar  💙
┃    HATSUNE MIKU BOT
╰━━━🌸━━━💙━━━🌸━━━╯`;

      await client.sendMessage(m.chat, {
        image: { url: 'https://i.pinimg.com/736x/2d/f3/3d/2df33d05677675f88fcd6bc16444ad2b.jpg' },
        caption,
        contextInfo,
        footer: '🎨 BVH3 INDUSTRIES © 2024'
      }, { quoted: m });

    } catch (e) {
      console.error(e);
      await m.reply(`❌ Error al enviar el wallpaper: ${e.message}`);
    }
  }
};
