import { resolveLidToRealJid } from "../../nucleo/utils.js"

const DIVIDER_START = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮`
const DIVIDER_END   = `╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`

export default {
  command: ['balance', 'bal', 'coins', 'bank'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const db = global.db.data
    const chatId = m.chat
    const chatData = db.chats[chatId]
    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net"
    const botSettings = db.settings[botId]
    const monedas = botSettings.currency
    if (chatData.adminonly || !chatData.economy) return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    const mentioned = m.mentionedJid
    const who2 = mentioned.length > 0 ? mentioned[0] : (m.quoted ? m.quoted.sender : m.sender)
    const who = await resolveLidToRealJid(who2, client, m.chat);
    if (!(who in db.chats[m.chat].users)) {
      return m.reply(`💙 El usuario mencionado no está registrado en el bot.`)
    }
    const user = chatData.users[who]
    const total = (user.coins || 0) + (user.bank || 0)
    const userName = global.db.data.users[who]?.name || who.split('@')[0]
    
    const bal = `${DIVIDER_START}\n` +
                `│ 🏦 *BANCO CENTRAL MIKU*\n` +
                `│\n` +
                `│ 👤 *Cliente:* ${userName}\n` +
                `│ 👝 *Cartera:* 🌱 ${user.coins?.toLocaleString() || 0} ${monedas}\n` +
                `│ 🏦 *Banco:* 🌱 ${user.bank?.toLocaleString() || 0} ${monedas}\n` +
                `│ 💰 *Total:* 🌱 ${total.toLocaleString()} ${monedas}\n` +
                `│\n` +
                `│ ✨ _Tip: Protege tu dinero usando ${usedPrefix}dep all_\n` +
                `${DIVIDER_END}`
                
    await client.sendMessage(chatId, { image: { url: 'https://file.garden/ae-9DPf0ekWVe7ex/banco.png' }, caption: bal }, { quoted: m })
  }
};