import optimizer from '../../nucleo/system/optimizer.js';

export default {
  command: ['optstats', 'optimizerstats', 'optclean', 'optimizerclean', 'optstart', 'optstop'],
  category: 'owner',
  isOwner: true,
  run: async (client, m, args) => {
    const cmd = m.text?.split(' ')[0]?.slice(1);
    const stats = optimizer.getStats();
    
    if (['optstats', 'optimizerstats'].includes(cmd)) {
      const mem = stats.memory || {};
      const report = [
        '📊 *ESTADÍSTICAS DEL OPTIMIZADOR*',
        '',
        `🧹 *Limpiezas realizadas:* ${stats.cleanups}`,
        `💾 *Memoria liberada:* ${(stats.memoryFreed / 1024 / 1024).toFixed(2)} MB`,
        `📱 *Sesiones limpiadas:* ${stats.sessionsCleaned}`,
        `🔑 *Prekeys rotadas:* ${stats.prekeysRotated}`,
        '',
        '🖥️ *MEMORIA ACTUAL*',
        `📈 RSS: ${mem.rss || 'N/A'} MB`,
        `🔋 Heap: ${mem.heapUsed || 'N/A'} / ${mem.heapTotal || 'N/A'} MB`,
        '',
        '📡 *CONEXIONES*',
        `👤 Owner: ${global.client?.user ? '✅' : '❌'}`,
        `📋 Sesiones registradas: ${stats.activeSessions}`
      ].join('\n');
      
      await m.reply(report);
    }
    
    if (['optclean', 'optimizerclean'].includes(cmd)) {
      await m.react('🧹');
      await optimizer.aggressiveCleanup();
      await m.reply('✅ Limpieza agresiva completada manualmente.');
    }
    
    if (cmd === 'optstart') {
      optimizer.start();
      await m.reply('✅ Optimizador iniciado.');
    }
    
    if (cmd === 'optstop') {
      optimizer.stop();
      await m.reply('⏹️ Optimizador detenido.');
    }
  }
};
