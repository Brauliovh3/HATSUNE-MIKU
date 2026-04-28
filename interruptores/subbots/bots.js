import subBotManager from '../../nucleo/subbotManager.js';
import fs from 'fs';
import path from 'path';

export default {
  command: ['bots', 'listabots', 'subbots'],
  category: 'subbots',
  run: async (client, m, args, usedPrefix, command) => {
    const subsPath = './Sessions/subbots';

   
    let allSessions = [];
    if (fs.existsSync(subsPath)) {
      allSessions = fs.readdirSync(subsPath).filter(dir =>
        fs.existsSync(path.join(subsPath, dir, 'creds.json'))
      );
    }

    const connectedBots = [];
    const startingBots = new Set(subBotManager.startingSubbots);

   
    for (const [sessionId, sock] of subBotManager.subbots.entries()) {
      if (sock.isInit) {
        connectedBots.push({ sessionId, sock });
      } else {
        startingBots.add(sessionId);
      }
    }

    const inactiveIds = allSessions.filter(id => 
      !connectedBots.some(b => b.sessionId === id) && !startingBots.has(id)
    );

    const connectedCount   = connectedBots.length;           
    const startingCount    = startingBots.size;
    const inactiveCount    = inactiveIds.length;
    const totalSubbots     = allSessions.length;
    const totalBots        = totalSubbots + 1;          

    const mainBotId   = global.client?.user?.id?.split(':')[0] || 'Principal';
    const mainBotJid  = mainBotId + '@s.whatsapp.net';
    const mainBotName = global.db?.data?.settings?.[mainBotJid]?.namebot || 'Hatsune Miku';
    const divider = `╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌`;

    let msg = `💙 *P A N E L   D E   S U B B O T S* 💙\n${divider}\n\n`;
    msg += `📊 *Resumen General*\n`;
    msg += `🌿 *Total:* ${totalBots}\n`;
    msg += `🎵 *Conectados:* ${connectedCount + 1}\n`;       
    msg += `⏳ *Iniciando:* ${startingCount}\n`;
    msg += `💤 *Inactivos:* ${inactiveCount}\n\n${divider}\n\n`;

    msg += `👑 *BOT PRINCIPAL*\n\n`;
    msg += `🎵 *Nombre:* ${mainBotName}\n`;
    msg += `🌿 *Número:* wa.me/${mainBotId}\n`;
    msg += `💙 *Estado:* ✅ Activo\n\n`;

    if (connectedCount > 0) {
      msg += `${divider}\n\n`;
      msg += `🤖 *SUBBOTS CONECTADOS*\n\n`;
      connectedBots.forEach((bot, i) => {
        const botJid  = bot.sessionId + '@s.whatsapp.net';
        const botName = global.db?.data?.settings?.[botJid]?.namebot || `Subbot ${i + 1}`;
        msg += `🎵 *${i + 1}. ${botName}*\n`;
        msg += `🌿 *Número:* wa.me/${bot.sessionId}\n`;
        msg += `💙 *Estado:* ✅ En línea\n\n`;
      });
    }

   
    if (startingCount > 0) {
      msg += `${divider}\n\n`;
      msg += `⏳ *INICIANDO CONEXIÓN*\n\n`;
      let i = 1;
      for (const id of startingBots) {
        msg += `🌿 *${i++}.* wa.me/${id}\n`;
      }
      msg += `\n`;
    }

    
    if (inactiveCount > 0) {
      msg += `${divider}\n\n`;
      msg += `💤 *SESIONES INACTIVAS*\n\n`;
      inactiveIds.forEach((id, i) => {
        msg += `🌿 *${i + 1}.* wa.me/${id}\n`;
      });
      msg += `\n`;
    }

    msg += `${divider}\n🎵 *Hatsune Miku* 💙 *Bot* 🎵`;

    await client.sendMessage(m.chat, {
      image: { url: 'https://i.pinimg.com/736x/46/8d/e3/468de3ae91716d0b8033fc2b0d85772f.jpg' },
      caption: msg
    }, { quoted: m });
  }
};