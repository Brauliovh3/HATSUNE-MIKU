import { getBuffer } from "../../nucleo/message.js"

export default {
  command: ['cofre', 'chest', 'recompensa'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const db = global.db.data
    const chatId = m.chat
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = db.settings[botId] || {}
    const monedas = botSettings.currency || 'Coins'
    const banner = botSettings.banner || 'https://i.pinimg.com/736x/0c/1e/f8/0c1ef8e804983e634fbf13df1044a41f.jpg'
    const canalId = botSettings.id || "120363315369913363@newsletter"
    const canalName = botSettings.nameid || "Hatsune Miku Channel"
    const chatData = db.chats[chatId]
    
    if (chatData.adminonly || !chatData.economy) return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    
    const user = chatData.users[m.sender]
    const now = Date.now()
    const cooldown = 8 * 60 * 60 * 1000 // 8 horas de espera
    
    user.lastcofre = user.lastcofre || 0
    
    if (now < user.lastcofre) {
      const restante = formatRemainingTime(user.lastcofre - now)
      return m.reply(`💙 Ya has abierto tu cofre mágico.\n> Puedes abrir otro en *${restante}*`)
    }
    
    const recompensa = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000 // Entre 5k y 15k monedas
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
    let imageObj = { url: banner }
    try {
      if (!global.imageBannerCache.has(banner)) {
        const buf = await getBuffer(banner)
        if (buf) global.imageBannerCache.set(banner, Buffer.from(buf))
      }
      if (global.imageBannerCache.has(banner)) imageObj = global.imageBannerCache.get(banner)
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