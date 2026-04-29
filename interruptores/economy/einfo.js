import { getBuffer } from "../../nucleo/message.js"

export default {
  command: ['infoeconomy', 'cooldowns', 'economyinfo', 'einfo'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
    const botSettings = db.settings[botId] || {}
    const monedas = botSettings.currency || 'Coins'
    const banner = botSettings.banner || 'https://i.pinimg.com/736x/0c/1e/f8/0c1ef8e804983e634fbf13df1044a41f.jpg'
    const canalId = botSettings.id || "120363315369913363@newsletter"
    const canalName = botSettings.nameid || "Hatsune Miku Channel"
    const chatData = db.chats[chatId]
    if (chatData.adminonly || !chatData.economy) return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    const user = chatData.users[m.sender]
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    const cooldowns = {
      crime: Math.max(0, (user.lastcrime || 0) - now),
      mine: Math.max(0, (user.lastmine || 0) - now),
      ritual: Math.max(0, (user.lastinvoke || 0) - now),
      work: Math.max(0, (user.lastwork || 0) - now),
      slut: Math.max(0, (user.lastslut || 0) - now),
      steal: Math.max(0, (user.laststeal || 0) - now),
      daily: Math.max(0, (user.lastdaily || 0) + oneDay - now),
      weekly: Math.max(0, (user.lastweekly || 0) + 7 * oneDay - now),
      monthly: Math.max(0, (user.lastmonthly || 0) + 30 * oneDay - now)
    }
    const formatTime = (ms) => {
      const totalSeconds = Math.floor(ms / 1000)
      const days = Math.floor(totalSeconds / 86400)
      const hours = Math.floor((totalSeconds % 86400) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const parts = []
      if (days > 0) parts.push(`${days} d`)
      if (hours > 0) parts.push(`${hours} h`)
      if (minutes > 0) parts.push(`${minutes} m`)
      if (seconds > 0) parts.push(`${seconds} s`)
      return parts.length ? parts.join(', ') : 'Ahora.'
    }
    const coins = user.coins || 0
    const name = db.users[m.sender]?.name || m.sender.split('@')[0]
    const mensaje = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮
│ 💼 *INFO ECONOMÍA* 💼
│
│ 👤 *Usuario ›* ${name}
│ 🪙 *Coins totales ›* 🌱${coins.toLocaleString()} ${monedas}
│
│ ⏱️ *COOLDOWNS (TIEMPOS)*
│ 💼 *Work ›* ${formatTime(cooldowns.work)}
│ 💃 *Slut ›* ${formatTime(cooldowns.slut)}
│ 🥷 *Crime ›* ${formatTime(cooldowns.crime)}
│ ⛏️ *Mine ›* ${formatTime(cooldowns.mine)}
│ 🔮 *Ritual ›* ${formatTime(cooldowns.ritual)}
│ 🕵️ *Steal ›* ${formatTime(cooldowns.steal)}
│
│ 🎁 *RECOMPENSAS*
│ 📅 *Daily ›* ${formatTime(cooldowns.daily)}
│ 📆 *Weekly ›* ${formatTime(cooldowns.weekly)}
│ 🗓️ *Monthly ›* ${formatTime(cooldowns.monthly)}
╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`.trim()

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
      caption: mensaje,
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
  }
}