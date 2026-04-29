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
    const banner = botSettings.banner || 'https://i.ibb.co/1Jq1LCPD/miku2.jpg'
    const canalId = botSettings.id || "120363315369913363@newsletter"
    const canalName = botSettings.nameid || "Hatsune Miku Channel"
    const chatData = db.chats[chatId]
    if (chatData.adminonly || !chatData.economy) return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    try {
      const users = Object.entries(chatData.users || {}).filter(([_, data]) => {
          const total = (data.coins || 0) + (data.bank || 0)
          return total >= 1000
        }).map(([key, data]) => {
          const name = db.users[key]?.name || data.name || 'Usuario'
          return { ...data, jid: key, name }
        })
      if (users.length === 0) return m.reply(`💙 No hay usuarios en el grupo con más de 1,000 ${monedas}.`)
      const sorted = users.sort((a, b) => (b.coins || 0) + (b.bank || 0) - ((a.coins || 0) + (a.bank || 0)))
      const page = parseInt(args[0]) || 1
      const pageSize = 10
      const totalPages = Math.ceil(sorted.length / pageSize)
      if (isNaN(page) || page < 1 || page > totalPages) return m.reply(`💙 La página *${page}* no existe. Hay *${totalPages}* páginas.`)
      const start = (page - 1) * pageSize
      const end = start + pageSize
      let text = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮\n│ 🏆 *ECONOMY BOARD* 🏆\n│\n`
      text += sorted.slice(start, end).map(({ name, coins, bank }, i) => {
          const total = (coins || 0) + (bank || 0)
          return `│ 👑 ${start + i + 1} › *${name}*\n│      🌱 ${total.toLocaleString()} ${monedas}`
        }).join('\n│\n')
      text += `\n│\n│ 📄 *Página:* ${page}/${totalPages}`
      if (page < totalPages)
        text += `\n│ ➡️ *Siguiente:* ${usedPrefix + command} ${page + 1}`
      text += `\n╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`

      if (!global.imageBannerCache) global.imageBannerCache = new Map()
      let imageObj = { url: banner }
      try {
        if (!global.imageBannerCache.has(banner)) {
          const buf = await getBuffer(banner)
          if (buf) global.imageBannerCache.set(banner, Buffer.from(buf))
        }
        if (global.imageBannerCache.has(banner)) imageObj = global.imageBannerCache.get(banner)
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
