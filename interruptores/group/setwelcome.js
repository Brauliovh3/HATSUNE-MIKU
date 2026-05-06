export default {
  command: ['setwelcome'],
  category: 'grupo',
  isAdmin: true,
  run: async (client, m, args, usedPrefix, command, text) => {
    if (!global?.db?.data?.chats) global.db.data.chats = {}
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
    const chat = global.db.data.chats[m.chat]
    const value = text ? text.trim() : ''

    if (/^(off|disable|desactivar)$/i.test(value)) {
      chat.welcome = false
      return m.reply('💙 Bienvenida desactivada correctamente.', m, global.miku)
    }

    if (/^(on|enable|activar)$/i.test(value)) {
      chat.welcome = true
      return m.reply('💙 Bienvenida activada correctamente.', m, global.miku)
    }

    if (!value) {
      return m.reply(`💙 Debes enviar un mensaje para establecerlo como mensaje de bienvenida.
> Puedes usar {usuario}, {grupo} y {desc} como variables dinámicas.

🌱 Ejemplo:
${usedPrefix}setwelcome Bienvenido {usuario} a {grupo}!`, m, global.miku)
    }

    chat.sWelcome = value
    chat.welcome = true
    return m.reply('💙 Has establecido el mensaje de bienvenida correctamente.', m, global.miku)
  }
}
