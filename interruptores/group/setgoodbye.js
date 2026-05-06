export default {
  command: ['setgoodbye'],
  category: 'grupo',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command, text) => {
    if (!global?.db?.data?.chats) global.db.data.chats = {}
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
    const chat = global.db.data.chats[m.chat]
    const value = text ? text.trim() : ''

    if (/^(off|disable|desactivar)$/i.test(value)) {
      chat.goodbye = false
      return m.reply('💙 Despedida desactivada correctamente.', m, global.miku)
    }

    if (/^(on|enable|activar)$/i.test(value)) {
      chat.goodbye = true
      return m.reply('💙 Despedida activada correctamente.', m, global.miku)
    }

    if (!value) {
      return m.reply(`💙 Debes enviar un mensaje para establecerlo como mensaje de despedida.
> Puedes usar {usuario}, {grupo} y {desc} como variables dinámicas.

🌱 Ejemplo:
${usedPrefix + command} Adiós {usuario}, te extrañaremos en {grupo}!`, m, global.miku)
    }

    chat.sGoodbye = value
    chat.goodbye = true
    return m.reply('💙 Has establecido el mensaje de despedida correctamente.', m, global.miku)
  }
}
