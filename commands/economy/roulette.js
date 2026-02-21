export default {
  command: ['rt', 'roulette', 'ruleta'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const db = global.db.data
    const chatId = m.chat
    const senderId = m.sender
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId]
    const chatData = db.chats[chatId]
    if (chatData.adminonly || !chatData.economy) return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    const user = chatData.users[m.sender]
    const currency = botSettings.currency || 'Monedas'
    if (args.length < 2) return m.reply(`💙 Debes ingresar una cantidad de ${currency} y apostar a un color.`)
    let amount, color
    if (!isNaN(parseInt(args[0]))) {
      amount = parseInt(args[0])
      color = args[1].toLowerCase()
    } else if (!isNaN(parseInt(args[1]))) {
      color = args[0].toLowerCase()
      amount = parseInt(args[1])
    } else {
      return m.reply(`💙 Formato inválido. Ejemplo: *rt 2000 black* o *rt black 2000*`)
    }
    const validColors = ['red', 'black', 'green']
    if (isNaN(amount) || amount < 200) return m.reply(`💙 La cantidad mínima de ${currency} a apostar es 200.`)
    if (!validColors.includes(color)) return m.reply(`💙 Por favor, elige un color válido: red, black, green.`)
    if (user.coins < amount) return m.reply(`💙 No tienes suficientes *${currency}* para hacer esta apuesta.`)
    const resultColor = validColors[Math.floor(Math.random() * validColors.length)]
    if (resultColor === color) {
      const reward = amount * (resultColor === 'green' ? 14 : 2)
      user.coins += reward
      await client.sendMessage(chatId, { text: `💙 La ruleta salió en *${resultColor}* y has ganado *¥${reward.toLocaleString()} ${currency}*.`, mentions: [senderId] }, { quoted: m })
    } else {
      user.coins -= amount
      await client.sendMessage(chatId, { text: `💙 La ruleta salió en *${resultColor}* y has perdido *¥${amount.toLocaleString()} ${currency}*.`, mentions: [senderId] }, { quoted: m })
    }
  },
}