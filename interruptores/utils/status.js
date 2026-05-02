import healthCheck from '../../nucleo/system/healthCheck.js'
import os from 'os'

export default {
  command: ['status', 'estado', 'diag', 'health'],
  category: 'utils',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const stats = healthCheck.getStats()
      const memUsage = process.memoryUsage()
      
      const statusEmoji = stats.isHealthy ? '🟢' : '🔴'
      const uptime = stats.uptimeFormatted
      
      let msg = `${statusEmoji} *ESTADO DEL BOT* ${statusEmoji}\n\n`
      msg += `⏱️ *Uptime:* ${uptime}\n`
      msg += `📊 *Mensajes procesados:* ${stats.totalMessages.toLocaleString()}\n`
      msg += `⚡ *Comandos ejecutados:* ${stats.totalCommands.toLocaleString()}\n`
      msg += `❌ *Errores:* ${stats.errors}\n`
      msg += `🔄 *Reconexiones:* ${stats.reconnections}\n\n`
      
      msg += `💾 *MEMORIA*\n`
      msg += `• RSS: ${stats.memory.rss}\n`
      msg += `• Heap Used: ${stats.memory.heapUsed}\n`
      msg += `• Heap Total: ${stats.memory.heapTotal}\n`
      msg += `• External: ${stats.memory.external}\n\n`
      
      msg += `💻 *SISTEMA*\n`
      msg += `• Plataforma: ${os.platform()}\n`
      msg += `• Arquitectura: ${os.arch()}\n`
      msg += `• CPUs: ${os.cpus().length}\n`
      msg += `• Memoria Libre: ${(os.freemem() / 1024 / 1024).toFixed(2)} MB\n`
      msg += `• Memoria Total: ${(os.totalmem() / 1024 / 1024).toFixed(2)} MB\n\n`
      
      if (stats.lastError) {
        const timeAgo = Math.floor((Date.now() - stats.lastError.time) / 1000)
        msg += `⚠️ *Último Error:* Hace ${timeAgo}s\n`
        msg += `\`${stats.lastError.message.slice(0, 50)}\`\n\n`
      }
      
      msg += `✅ Bot funcionando ${stats.isHealthy ? 'correctamente' : 'con problemas'}`
      
      await m.reply(msg)
    } catch (error) {
      console.error('Error en comando status:', error)
      await m.reply('❌ Error al obtener el estado del bot')
    }
  }
}
