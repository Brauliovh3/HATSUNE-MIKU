import subBotManager from '../../nucleo/subbotManager.js';

export default {
  command: ['restartsub', 'reiniciar', 'restartbot'],
  category: 'subbots',
  isOwner: true,
  run: async (client, m, args, usedPrefix, command) => {
    const sessionId = args[0];
    
    if (!sessionId) {
      return m.reply(`💡 *Uso:* ${usedPrefix}restartsub <número>\n\n` +
        `Reinicia un subbot específico.`);
    }

    const cleanId = sessionId.replace(/\D/g, '');
    
    await m.reply(`🔄 Reiniciando subbot ${cleanId}...`);
    
    try {
      await subBotManager.stopSubBot(cleanId);
      await new Promise(resolve => setTimeout(resolve, 3000));
      await subBotManager.startSubBot(cleanId);
      m.reply(`✅ Subbot ${cleanId} reiniciado correctamente.`);
    } catch (err) {
      m.reply(`❌ Error reiniciando subbot: ${err.message}`);
    }
  }
};
