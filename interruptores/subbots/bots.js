import subBotManager from '../../nucleo/subbotManager.js';
import fs from 'fs';
import path from 'path';

export default {
  command: ['bots', 'listabots', 'subbots'],
  category: 'subbots',
  run: async (client, m, args, usedPrefix, command) => {
    const status = subBotManager.getStatus();
    const subsPath = './Sessions/subbots';
    
    let allSessions = [];
    if (fs.existsSync(subsPath)) {
      allSessions = fs.readdirSync(subsPath).filter(dir => {
        return fs.existsSync(path.join(subsPath, dir, 'creds.json'));
      });
    }

    const mainBotId = global.client?.user?.id?.split(':')[0] || 'Principal';
    const mainBotJid = mainBotId + '@s.whatsapp.net';
    const mainBotName = global.db?.data?.settings?.[mainBotJid]?.namebot || 'Hatsune Miku';
    
    let msg = `╭━━━━━━━━━━━━━━━━━━━━━━━━━╮\n`;
    msg += `│  💙 *HATSUNE MIKU BOT* 💙  │\n`;
    msg += `│     🤖 *PANEL DE BOTS*     │\n`;
    msg += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
    
    msg += `╭━━━ 📊 *RESUMEN GENERAL* ━━━╮\n`;
    msg += `│\n`;
    msg += `│  💠 Total Bots: ${allSessions.length + 1}\n`;
    msg += `│  🟢 Conectados: ${status.connected + 1}\n`;
    msg += `│  🔴 Desconectados: ${status.disconnected}\n`;
    msg += `│  ⚪ Sin iniciar: ${allSessions.length - status.total}\n`;
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
      msg += `╭━━━ 🤖 *SUBBOTS ACTIVOS* (${status.connected}) ━━━╮\n`;
      msg += `│\n`;
      
      status.list.forEach((bot, i) => {
        if (!bot.connected) return;
        
        const botJid = (bot.userId || bot.id) + '@s.whatsapp.net';
        const botName = global.db?.data?.settings?.[botJid]?.namebot || `Subbot ${i + 1}`;
        const cleanId = bot.userId || bot.id;
        
        msg += `│  ${i + 1}. 💠 ${botName}\n`;
        msg += `│     📱 wa.me/${cleanId}\n`;
        msg += `│     🟢 *EN LÍNEA*\n`;
        
        if (i < status.list.length - 1) {
          const nextBot = status.list[i + 1];
          if (nextBot?.connected) {
            msg += `│\n`;
          }
        }
      });
      
      msg += `│\n`;
      msg += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
    }

    if (status.disconnected > 0) {
      msg += `╭━━━ ⚠️ *SUBBOTS DESCONECTADOS* (${status.disconnected}) ━━━╮\n`;
      msg += `│\n`;
      
      let dcCount = 0;
      status.list.forEach((bot) => {
        if (bot.connected) return;
        dcCount++;
        
        const botJid = (bot.userId || bot.id) + '@s.whatsapp.net';
        const botName = global.db?.data?.settings?.[botJid]?.namebot || `Subbot`;
        const cleanId = bot.userId || bot.id;
        const lastConn = bot.lastConnected 
          ? new Date(bot.lastConnected).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          : 'Nunca';
        
        msg += `│  ${dcCount}. 💠 ${botName}\n`;
        msg += `│     📱 wa.me/${cleanId}\n`;
        msg += `│     🔴 *OFFLINE* - ⏰ ${lastConn}\n`;
        msg += `│\n`;
      });
      
      msg += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
    }

    const inactiveSessions = allSessions.filter(id => {
      return !status.list.find(b => b.id === id || b.userId === id);
    });

    if (inactiveSessions.length > 0) {
      msg += `╭━━━ 💤 *SESIONES INACTIVAS* (${inactiveSessions.length}) ━━━╮\n`;
      msg += `│\n`;
      
      inactiveSessions.forEach((id, i) => {
        const shortId = id.length > 12 ? id.slice(0, 12) + '...' : id;
        msg += `│  ${i + 1}. ⚪ ${shortId}\n`;
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

    msg += `💙 *🄿🄾🅆🄴🅁🄴🄳 (ㅎㅊDEPOOLㅊㅎ)* 🎤\n`;
    msg += `✨ Sistema de Subbots Premium v2.0`;

    await client.sendMessage(m.chat, {
      image: { url: 'https://files.catbox.moe/70548q.png' },
      caption: msg
    }, { quoted: m });
  }
};
