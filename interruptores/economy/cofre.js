import { getBuffer } from "../../nucleo/message.js"

export default {
  command: ['cofre', 'chest', 'recompensa'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId] || {}
    const monedas = botSettings?.currency || 'monedas'
    const imgCofre = 'https://file.garden/ae-9DPf0ekWVe7ex/cofre.png'
    const canalId = botSettings.id || "120363315369913363@newsletter"
    const canalName = botSettings.nameid || "Hatsune Miku Channel"
    const chatData = db.chats[chatId]

    if (!chatData) return m.reply(`💙 Usa primero cualquier comando para registrarte.`)
    if (chatData.adminonly || !chatData.economy) return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)

    const user = chatData.users?.[m.sender]
    if (!user) return m.reply(`💙 Usa primero *.menu* o *.pescaderia* para activar tu cuenta.`)
    const now = Date.now()
    const cooldown = 8 * 60 * 60 * 1000 
    
    user.lastcofre = user.lastcofre || 0
    
    if (now < user.lastcofre) {
      const restante = formatRemainingTime(user.lastcofre - now)
      return m.reply(`💙 Ya has abierto tu cofre mágico.\n> Puedes abrir otro en *${restante}*`)
    }
    
    const recompensa = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000 
    user.coins = (user.coins || 0) + recompensa
    user.lastcofre = now + cooldown
    
    const userName = db.users[m.sender]?.name || m.sender.split('@')[0]
    const msg = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮
│ 🎁 *COFRE MÁGICO* 🎁
│
│ 👤 *Usuario ›* ${userName}
│ 🎉 *¡Has abierto un cofre!*
│
│ 🪙 *Recompensa ›* +🌱${recompensa.toLocaleString()} ${monedas}
│ 💳 *Saldo Total ›* 🌱${user.coins.toLocaleString()} ${monedas}
╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`.trim()

    if (!global.imageBannerCache) global.imageBannerCache = new Map()
    let imageObj = { url: imgCofre }
    try {
      if (!global.imageBannerCache.has(imgCofre)) {
        const buf = await getBuffer(imgCofre)
        if (Buffer.isBuffer(buf)) global.imageBannerCache.set(imgCofre, buf)
      }
      if (global.imageBannerCache.has(imgCofre)) imageObj = global.imageBannerCache.get(imgCofre)
    } catch (e) {}

    await client.sendMessage(chatId, { image: imageObj, caption: msg, contextInfo: { mentionedJid: [m.sender], isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: canalId, serverMessageId: '', newsletterName: canalName } } }, { quoted: m })
  }
}

function formatRemainingTime(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const seg = s % 60
  const partes = []
  if (h) partes.push(`${h} ${h === 1 ? 'hora' : 'horas'}`)
  if (m) partes.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`)
  if (seg || partes.length === 0) partes.push(`${seg} ${seg === 1 ? 'segundo' : 'segundos'}`)
  return partes.join(' ')
}