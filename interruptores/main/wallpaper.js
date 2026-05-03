import fetch from 'node-fetch';

export default {
  command: ['wallpaper', 'wp', 'fondo'],
  category: 'main',
  isAdmin: false,
  run: async (client, m, args, usedPrefix, command) => {
    try {
      await m.react('⏳');
      
      const wallpaperUrl = 'https://github.com/Brauliovh3/HATSUNE-MIKU/releases/download/Juegosv1/WALLPAPER.apk';
      
      const res = await fetch(wallpaperUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (!res.ok) {
        await m.react('❌');
        return m.reply('💙 No se pudo descargar el wallpaper.');
      }
      
      const buffer = await res.arrayBuffer();
      
      await client.sendMessage(m.chat, {
        document: Buffer.from(buffer),
        mimetype: 'application/vnd.android.package-archive',
        fileName: 'BVH3_Wallpaper_Oficial.apk',
        caption: `🎨 *BVH3 INDUSTRIES*\n📱 Wallpaper Oficial\n© By ${global.owner?.[0] || 'DEPOOL'}`,
        contextInfo: {
          externalAdReply: {
            title: '🎨 BVH3 INDUSTRIES',
            body: 'Wallpaper Oficial Edition',
            mediaType: 1,
            thumbnailUrl: 'https://i.pinimg.com/736x/30/42/b8/3042b89ced13fefda4e75e3bc6dc2a57.jpg',
            sourceUrl: wallpaperUrl
          }
        }
      }, { quoted: m });
      
      await m.react('✅');

    } catch (e) {
      console.error(e);
      await m.react('❌');
      await m.reply(`💙 Error: ${e.message}`);
    }
  }
};
