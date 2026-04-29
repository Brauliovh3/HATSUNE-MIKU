import { resolveLidToRealJid } from "../../nucleo/utils.js"
import { getBuffer } from "../../nucleo/message.js"

export default {
  command: ['topcount', 'topmensajes', 'topmsgcount', 'topmessages'],
  category: 'rpg',
  run: async (client, m, args, command, text, prefix) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId] || {}
    const banner = botSettings.banner || 'https://i.pinimg.com/736x/0c/1e/f8/0c1ef8e804983e634fbf13df1044a41f.jpg'
    const canalId = botSettings.id || "120363315369913363@newsletter"
    const canalName = botSettings.nameid || "Hatsune Miku Channel"
    const chatData = db.chats[chatId]
    const now = new Date()
    const daysArg = args[0] ? parseInt(args[0]) : 1
    if (daysArg < 1) return m.reply(`💙 El número de días debe ser mayor a 0.`)
    const cutoff = new Date(now.getTime() - daysArg * 24 * 60 * 60 * 1000)
    const ranking = Object.entries(chatData.users || {})
      .map(([jid, user]) => {
        const stats = user.stats || {}
        const days = Object.entries(stats).filter(([date]) => new Date(date) >= cutoff)
        const totalMsgs = days.reduce((acc, [, d]) => acc + (d.msgs || 0), 0)
        const totalCmds = days.reduce((acc, [, d]) => acc + (d.cmds || 0), 0)
        return { jid, totalMsgs, totalCmds }
      })
      .filter(u => u.totalMsgs > 0)
      .sort((a, b) => b.totalMsgs - a.totalMsgs)
    if (ranking.length === 0) return m.reply(`💙 No hay actividad registrada en los últimos ${daysArg} días.`)
    const page = parseInt(args[1]) || 1
    const perPage = 10
    const totalPages = Math.ceil(ranking.length / perPage)
    if (page < 1 || page > totalPages) return m.reply(`💙 Página inválida. Solo hay ${totalPages} páginas disponibles.`)
    const start = (page - 1) * perPage
    const end = start + perPage
    const pageRanking = ranking.slice(start, end)
    const fechaActual = now.toLocaleString('es-CO', { 
      timeZone: 'America/Bogota', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    let report = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮\n│ 🏆 *TOP MENSAJES* 🏆\n│\n│ 📅 *Periodo:* Últimos ${daysArg} día${daysArg > 1 ? 's' : ''}\n│\n`
    pageRanking.forEach((u, i) => {
      const name = db.users[u.jid]?.name || u.jid.split('@')[0]
      report += `│ 👑 ${start + i + 1} › *${name}*\n`
      report += `│      💬 \`${u.totalMsgs}\` msgs  ⚡ \`${u.totalCmds}\` cmds\n│\n`
    })
    report += `│ 📄 *Página:* ${page}/${totalPages}`
    if (page < totalPages) {
      report += `\n│ ➡️ *Siguiente:* ${prefix + command} ${daysArg} ${page + 1}`
    }
    report += `\n╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`
    
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
      caption: report,
      contextInfo: {
        mentionedJid: [m.sender],
        isForwarded: true,
        forwardedNewsletterMessageInfo: { newsletterJid: canalId, serverMessageId: '', newsletterName: canalName }
      }
    }, { quoted: m })
  }
}