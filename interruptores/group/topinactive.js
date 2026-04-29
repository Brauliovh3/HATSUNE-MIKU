import { resolveLidToRealJid } from "../../nucleo/utils.js"
import { getBuffer } from "../../nucleo/message.js"

export default {
  command: ['topinactive','topinactivos','topinactiveusers'],
  category: 'rpg',
  run: async (client,m,args,command,text,prefix) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId] || {}
    const banner = botSettings.banner || 'https://i.pinimg.com/736x/0c/1e/f8/0c1ef8e804983e634fbf13df1044a41f.jpg'
    const canalId = botSettings.id || "120363315369913363@newsletter"
    const canalName = botSettings.nameid || "Hatsune Miku Channel"
    const chatData = db.chats[chatId]
    const now = new Date()

    let daysArg = args[0] ? parseInt(args[0]) : 30
    if (daysArg < 1) daysArg = 30
    const cutoff = new Date(now.getTime() - daysArg * 24 * 60 * 60 * 1000)

    const ranking = Object.entries(chatData.users || {})
      .map(([jid,user]) => {
        const stats = user.stats || {}
        const days = Object.entries(stats).filter(([date]) => new Date(date) >= cutoff)
        const totalMsgs = days.reduce((acc,[,d]) => acc + (d.msgs || 0),0)
        return { jid,totalMsgs }
      })
      .sort((a,b) => a.totalMsgs - b.totalMsgs)

    if (ranking.length === 0) return m.reply(`💙 No hay actividad registrada en los últimos ${daysArg} días.`)

    const page = parseInt(args[1]) || 1
    const perPage = 10
    const totalPages = Math.ceil(ranking.length / perPage)
    if (page < 1 || page > totalPages) return m.reply(`💙 Página inválida. Solo hay ${totalPages} páginas disponibles.`)

    const start = (page - 1) * perPage
    const end = start + perPage
    const pageRanking = ranking.slice(start,end)

    let report = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮\n│ 👻 *TOP INACTIVOS* 👻\n│\n│ 📅 *Filtro:* Menos activos en ${daysArg} días\n│\n`

    const mentions = []
    pageRanking.forEach((u,i) => {
      const name = db.users[u.jid]?.name || '@'+u.jid.split('@')[0]
      report += `│ 💀 ${start+i+1} › *${name}*\n`
      report += `│      💬 Mensajes: \`${u.totalMsgs}\`\n│\n`
      mentions.push(u.jid)
    })

    report += `│ 📄 *Página:* ${page}/${totalPages}`
    if (page < totalPages) {
      report += `\n│ ➡️ *Siguiente:* ${prefix+command} ${daysArg} ${page+1}`
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
        mentionedJid: mentions,
        isForwarded: true,
        forwardedNewsletterMessageInfo: { newsletterJid: canalId, serverMessageId: '', newsletterName: canalName }
      }
    }, { quoted: m })
  }
}