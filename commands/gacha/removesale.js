export default {
  command: ['removesale', 'removerventa'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    if (!chat.sales) chat.sales = {}
    if (chat.adminonly || !chat.gacha) {
    return m.reply(`💙 Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con:\n» *${usedPrefix}gacha on*`)
    }
    if (!args.length) {
      return m.reply(`💙 Debes especificar un personaje para eliminar.\n> Ejemplo » *${usedPrefix + command} Yuki Suou*`)
    }
    try {
      const nameRemove = args.join(' ').toLowerCase()
      const idRemove = Object.keys(chat.sales).find(id => (chat.sales[id]?.name || '').toLowerCase() === nameRemove)
      if (!idRemove || chat.sales[idRemove].user !== m.sender) {
        return m.reply(`💙 El personaje *${args.join(' ')}* no está a la venta por ti.`)
      }
      delete chat.sales[idRemove]
      m.reply(`💙 *${args.join(' ')}* ha sido eliminado de la lista de ventas.`)
    } catch (e) {
      await m.reply(`❌ Ocurrió un error inesperado al ejecutar el comando *${usedPrefix + command}*. Por favor, intenta nuevamente o contacta al soporte si el problema persiste.\n> [Error: *${e.message}*]`)
    }
  },
}