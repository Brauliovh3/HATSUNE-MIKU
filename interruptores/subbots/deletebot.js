import fs from 'fs';
import path from 'path';

export default {
  command: ['deletebot', 'delbot', 'desvincular'],
  category: 'subbots',
  run: async (client, m, args, usedPrefix, command) => {
    const userId = m.sender;
    const phoneNumber = userId.split('@')[0];
    const sessionId = phoneNumber;
    const sessionFolder = `./Sessions/subbots/${sessionId}`;

    await m.reply(`💙 *Procesando desvinculación...*\n\n` +
      `⏳ Eliminando sesión de ${phoneNumber}...`);

    try {
      const { default: subBotManager } = await import('../../nucleo/subbotManager.js');
      
      if (subBotManager.subbots?.has(sessionId)) {
        await subBotManager.stopSubBot(sessionId);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (fs.existsSync(sessionFolder)) {
        fs.rmSync(sessionFolder, { recursive: true, force: true });
        
        const parentDir = './Sessions/subbots';
        const userDirs = fs.readdirSync(parentDir).filter(dir => {
          return dir.includes(phoneNumber) || dir === sessionId;
        });
        
        for (const dir of userDirs) {
          const fullPath = path.join(parentDir, dir);
          if (fs.existsSync(fullPath)) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          }
        }
      }

      await client.sendMessage(m.chat, {
        text: `✅ *DESVINCULACIÓN COMPLETADA* ✅\n\n` +
          `📱 Número: ${phoneNumber}\n` +
          `🗑️ Sesión eliminada correctamente\n\n` +
          `💡 *¿Quieres vincularte de nuevo?*\n` +
          `Usa: ${usedPrefix}sub\n\n` +
          `🌸 *Hatsune Miku Bot*`
      }, { quoted: m });

    } catch (err) {
      console.error('Error en deletebot:', err);
      await m.reply(`❌ *Error al eliminar sesión*\n\n` +
        `${err.message}\n\n` +
        `💡 Intenta nuevamente o contacta al soporte.`);
    }
  }
};
