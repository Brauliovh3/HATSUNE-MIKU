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

    
    const status = subBotManager.getStatus();
    

    const connectedIds = new Set(status.list.map(b => String(b.id || '')));

    
    const startingIds = new Set(
      [...subBotManager.subbots.keys()].filter(id => !connectedIds.has(id))
    );

    
    const inactiveIds = allSessions.filter(id =>
      !connectedIds.has(id) && !startingIds.has(id)
    );

    const connectedCount   = status.connected;           
    const startingCount    = startingIds.size;
    const inactiveCount    = inactiveIds.length;
    const totalSubbots     = allSessions.length;
    const totalBots        = totalSubbots + 1;          

    const mainBotId   = global.client?.user?.id?.split(':')[0] || 'Principal';
    const mainBotJid  = mainBotId + '@s.whatsapp.net';
    const mainBotName = global.db?.data?.settings?.[mainBotJid]?.namebot || '💙HATSUNE MIKU💙';

    let msg = '';
    msg += `╭━━━━━━━━━━━━━━━━━━━━━━━━━╮\n`;
    msg += `│  💙 *HATSUNE MIKU BOT* 💙  │\n`;
    msg += `│     🤖 *PANEL DE BOTS*     │\n`;
    msg += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

    msg += `╭━━━ 📊 *RESUMEN GENERAL* ━━━╮\n`;
    msg += `│\n`;
    msg += `│  💠 Total Bots: ${totalBots}\n`;
    msg += `│  🟢 Conectados: ${connectedCount + 1}\n`;       
    msg += `│  🔄 Iniciando: ${startingCount}\n`;
    msg += `│  💤 Sin sesión activa: ${inactiveCount}\n`;
    msg += `│\n`;
    msg += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

    
    msg += `╭━━━ 👑 *BOT PRINCIPAL* ━━━╮\n`;
    msg += `│\n`;
    msg += `│  💙 ${mainBotName}\n`;
    msg += `│  📱 wa.me/${mainBotId}\n`;
    msg += `│  ✅ *ACTIVO*\n`;
    msg += `│\n`;
    msg += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

   
    if (status.list.length > 0) {
      msg += `╭━━━ 🤖 *SUBBOTS ACTIVOS* (${connectedCount}) ━━━╮\n`;
      msg += `│\n`;
      status.list.forEach((bot, i) => {
        const cleanId = String(bot.id || bot.userId || '');
        const botJid  = cleanId + '@s.whatsapp.net';
        const botName = global.db?.data?.settings?.[botJid]?.namebot || `Subbot ${i + 1}`;
        msg += `│  ${i + 1}. 💠 *${botName}*\n`;
        msg += `│     📱 wa.me/${cleanId}\n`;
        msg += `│     🟢 *EN LÍNEA*\n`;
        msg += `│\n`;
      });
      msg += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
    }

   
    if (startingCount > 0) {
      msg += `╭━━━ 🔄 *INICIANDO* (${startingCount}) ━━━╮\n`;
      msg += `│\n`;
      let i = 1;
      for (const id of startingIds) {
        msg += `│  ${i++}. ⏳ ${id}\n`;
      }
      msg += `│\n`;
      msg += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
    }

    
    if (inactiveCount > 0) {
      msg += `╭━━━ 💤 *SESIONES INACTIVAS* (${inactiveCount}) ━━━╮\n`;
      msg += `│\n`;
      inactiveIds.forEach((id, i) => {
        msg += `│  ${i + 1}. ⚪ ${id}\n`;
      });
      msg += `│\n`;
      msg += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
    }

   
    msg += `╭━━━ 🎵 *COMANDOS RÁPIDOS* ━━━╮\n`;
    msg += `│\n`;
    msg += `│  ${usedPrefix}sub\n`;
    msg += `│  └ Vincular nuevo subbot\n`;
    msg += `│\n`;
    msg += `│  ${usedPrefix}restartsub <número>\n`;
    msg += `│  └ Reiniciar subbot\n`;
    msg += `│\n`;
    msg += `│  ${usedPrefix}deletesub <número>\n`;
    msg += `│  └ Eliminar sesión\n`;
    msg += `│\n`;
    msg += `│  ${usedPrefix}deletebot\n`;
    msg += `│  └ Desvincular mi subbot\n`;
    msg += `│\n`;
    msg += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

    msg += `💙 *🄿🄾🅆🄴🅁🄴🄳 (ㅎㅊDEPOOLㅊㅎ)* 🎤`;

    await client.sendMessage(m.chat, {
      image: { url: 'https://files.catbox.moe/70548q.png' },
      caption: msg
    }, { quoted: m });
  }
};