import optimizer from '../../nucleo/system/optimizer.js';

const handler = async (m, { conn, isOwner, command }) => {
  if (!isOwner) return;
  
  const stats = optimizer.getStats();
  
  if (command === 'optstats' || command === 'optimizerstats') {
    const mem = stats.memory || {};
    const report = `
📊 *ESTADÍSTICAS DEL OPTIMIZADOR*

🧹 *Limpiezas realizadas:* ${stats.cleanups}
💾 *Memoria liberada:* ${(stats.memoryFreed / 1024 / 1024).toFixed(2)} MB
📱 *Sesiones limpiadas:* ${stats.sessionsCleaned}
🔑 *Prekeys rotadas:* ${stats.prekeysRotated}

🖥️ *MEMORIA ACTUAL*
📈 RSS: ${mem.rss || 'N/A'} MB
🔋 Heap: ${mem.heapUsed || 'N/A'} / ${mem.heapTotal || 'N/A'} MB

📡 *CONEXIONES*
👤 Owner: ${global.client?.user ? '✅' : '❌'}
🤖 Subbots: ${stats.connections}
📋 Sesiones registradas: ${stats.activeSessions}
    `.trim();
    
    await m.reply(report);
  }
  
  if (command === 'optclean' || command === 'optimizerclean') {
    m.react('🧹');
    await optimizer.aggressiveCleanup();
    await m.reply('✅ Limpieza agresiva completada manualmente.');
  }
  
  if (command === 'optstart') {
    optimizer.start();
    await m.reply('✅ Optimizador iniciado.');
  }
  
  if (command === 'optstop') {
    optimizer.stop();
    await m.reply('⏹️ Optimizador detenido.');
  }
};

handler.help = ['optstats', 'optclean', 'optstart', 'optstop'];
handler.tags = ['owner'];
handler.command = /^(optstats|optimizerstats|optclean|optimizerclean|optstart|optstop)$/i;
handler.rowner = true;

export default handler;
