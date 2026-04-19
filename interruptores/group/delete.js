export default {
  command: ['delete', 'del', 'eliminar'],
  category: 'grupo',
  run: async (client, m, args, usedPrefix, command) => {
    if (!m.quoted) {
      return m.reply('💙 Responde al mensaje que deseas eliminar.', m, global.miku)
    }
    
    try {
      const key = {
        remoteJid: m.chat,
        fromMe: m.quoted.fromMe,
        id: m.quoted.id,
        participant: m.quoted.sender
      }
      
      await client.sendMessage(m.chat, { delete: key })
      await m.react('🗑️')
    } catch (e) {
      console.error('[DELETE] Error:', e)
      return m.reply(`💙 No se pudo eliminar el mensaje. Asegúrate de que el mensaje no sea muy antiguo.`)
    }
  },
}
