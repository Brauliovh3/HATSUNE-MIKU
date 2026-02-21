export default {
  command: ['aceptar'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      const db = global.db.data
      const chatId = m.chat
      const userId = m.sender
      const chatData = db.chats[chatId] ||= {}
      chatData.users ||= {}
      chatData.characters ||= {}
      chatData.intercambios ||= []
      chatData.regalosPendientes ||= []
      if (chatData.adminonly || !chatData.gacha) return m.reply(`💙 Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}gacha on*`)
      let intercambio = chatData.intercambios.find(i => i.expiracion > Date.now())
      if (intercambio) {
        if (userId !== intercambio.destinatario) {
          const receiverName = db.users[intercambio.destinatario]?.name || intercambio.destinatario.split('@')[0]
          return m.reply(`💙 Solo *${receiverName}* puede aceptar la solicitud de intercambio.`)
        }
        const solicitanteChars = chatData.users[intercambio.solicitante]?.characters || []
        const destinatarioChars = chatData.users[intercambio.destinatario]?.characters || []
        const pA = chatData.characters[intercambio.personaje1.id]
        const pB = chatData.characters[intercambio.personaje2.id]
        if (!pA || !pB) {
          chatData.intercambios = chatData.intercambios.filter(i => i !== intercambio)
          const nurme = !pA ? intercambio.personaje1.name : intercambio.personaje2.name
          return m.reply(`💙 El personaje *${nurme}* ya no está disponible para el intercambio.`)
        }
        pA.user = intercambio.destinatario
        pB.user = intercambio.solicitante
        chatData.users[intercambio.solicitante].characters = [
          ...solicitanteChars.filter(id => id !== intercambio.personaje1.id),
          intercambio.personaje2.id
        ]
        chatData.users[intercambio.destinatario].characters = [
          ...destinatarioChars.filter(id => id !== intercambio.personaje2.id),
          intercambio.personaje1.id
        ]
        chatData.intercambios = chatData.intercambios.filter(i => i !== intercambio)
        chatData.timeTrade = 0
        const mensajeConfirmacion = `💙 *Intercambio realizado exitosamente (✿❛◡❛)*\n\n✎ *${intercambio.personaje1.name}* ahora pertenece a *${db.users[userId]?.name || userId.split('@')[0]}*\n✎ *${intercambio.personaje2.name}* ahora pertenece a *${db.users[intercambio.solicitante]?.name || intercambio.solicitante.split('@')[0]}*`
        return await client.sendMessage(chatId, { text: mensajeConfirmacion }, { quoted: m })
      }
      let regalo = chatData.regalosPendientes.find(r => r.chatId === chatId && r.expiresAt > Date.now())
      if (regalo) {
        if (userId !== regalo.sender) {
          const sname = db.users[regalo.sender]?.name || regalo.sender.split('@')[0]
          return m.reply(`💙 Solo *${sname}* puede confirmar la transferencia.`)
        }
        const sender = chatData.users[regalo.sender]
        const receiver = chatData.users[regalo.to] ||= {}
        if (!Array.isArray(receiver.characters)) receiver.characters = []
        for (const id of regalo.ids) {
          const reg = chatData.characters[id]
          if (!reg || reg.user !== regalo.sender) continue
          reg.user = regalo.to
          if (!receiver.characters.includes(id)) receiver.characters.push(id)
          sender.characters = sender.characters.filter(c => c !== id)
          if (chatData.sales?.[id] && chatData.sales[id].user === regalo.sender) delete chatData.sales[id]
          if (sender.favorite === id) delete sender.favorite
          if (db.users?.[regalo.sender]?.favorite === id) delete db.users[regalo.sender].favorite
        }
        const name = db.users[regalo.to]?.name || regalo.to.split('@')[0]
        await client.sendMessage(chatId, { text: `💙 Has regalado con éxito todos tus personajes a ${name}!\n\n> ❏ Personajes regalados: ${regalo.count}\n> ⴵ Valor total: ${regalo.value.toLocaleString()}` }, { quoted: m })
        chatData.regalosPendientes = chatData.regalosPendientes.filter(r => r !== regalo)
        return
      }
    } catch (e) {
      return m.reply(`💙 An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  }
}