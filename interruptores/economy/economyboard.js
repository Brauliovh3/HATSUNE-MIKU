import { getBuffer } from "../../nucleo/message.js"

export default {
  command: ['economyboard', 'eboard', 'baltop'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId] || {}
    const monedas = botSettings.currency || 'Coins'
    const imgBoard = 'https://i.ibb.co/1Jq1LCPD/miku2.jpg'
    const canalId = botSettings.id || "120363315369913363@newsletter"
    const canalName = botSettings.nameid || "Hatsune Miku Channel"
    const chatData = db.chats[chatId]
    if (chatData.adminonly || !chatData.economy) return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    try {
      
      const globalUsers = new Map()
      
      for (const [chatKey, chat] of Object.entries(db.chats || {})) {
        for (const [userKey, userData] of Object.entries(chat.users || {})) {
          const total = (userData.coins || 0) + (userData.bank || 0)
          if (total < 1000) continue
          
          const existing = globalUsers.get(userKey)
          if (existing) {
            
            existing.coins = (existing.coins || 0) + (userData.coins || 0)
            existing.bank = (existing.bank || 0) + (userData.bank || 0)
          } else {
            const name = db.users[userKey]?.name || userData.name || 'Usuario'
            globalUsers.set(userKey, {
              jid: userKey,
              name,
              coins: userData.coins || 0,
              bank: userData.bank || 0
            })
          }
        }
      }
      
      const users = Array.from(globalUsers.values()).filter(u => (u.coins + u.bank) >= 1000)
      if (users.length === 0) return m.reply(`💙 No hay usuarios globales con más de 1,000 ${monedas}.`)
      const sorted = users.sort((a, b) => (b.coins || 0) + (b.bank || 0) - ((a.coins || 0) + (a.bank || 0)))
      const page = parseInt(args[0]) || 1
      const pageSize = 10
      const totalPages = Math.ceil(sorted.length / pageSize)
      if (isNaN(page) || page < 1 || page > totalPages) return m.reply(`💙 La página *${page}* no existe. Hay *${totalPages}* páginas.`)
      const start = (page - 1) * pageSize
      const end = start + pageSize
      let text = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮\n│ 🏆 *GLOBAL ECONOMY BOARD* 🏆\n│ 🌍 Ranking Mundial\n│\n`
      text += sorted.slice(start, end).map(({ name, coins, bank }, i) => {
          const total = (coins || 0) + (bank || 0)
          return `│ 👑 ${start + i + 1} › *${name}*\n│      🌱 ${total.toLocaleString()} ${monedas}`
        }).join('\n│\n')
      text += `\n│\n│ 📄 *Página:* ${page}/${totalPages}`
      if (page < totalPages)
        text += `\n│ ➡️ *Siguiente:* ${usedPrefix + command} ${page + 1}`
      text += `\n╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`

      if (!global.imageBannerCache) global.imageBannerCache = new Map()
      let imageObj = { url: imgBoard }
      try {
        if (!global.imageBannerCache.has(imgBoard)) {
          const buf = await getBuffer(imgBoard)
          if (Buffer.isBuffer(buf)) global.imageBannerCache.set(imgBoard, buf)
        }
        if (global.imageBannerCache.has(imgBoard)) imageObj = global.imageBannerCache.get(imgBoard)
      } catch (e) {}

      await client.sendMessage(chatId, {
        image: imageObj,
        caption: text,
        contextInfo: {
          mentionedJid: [m.sender],
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: canalId,
            serverMessageId: '',
            newsletterName: canalName
          }
        }
      }, { quoted: m })
    } catch (e) {
      await m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  }
}
