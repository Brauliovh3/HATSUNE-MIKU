import { delay } from "@whiskeysockets/baileys"

let buatall = 1
export default {
  command: ['apostar', 'casino'],
  category: 'economy',
  run: async (client, m, args, usedPrefix, command) => {
    const db = global.db.data
    const chatData = db.chats[m.chat]
    if (chatData.adminonly || !chatData.economy) return m.reply(`💙 ${global.miku || 'HATSUNE MIKU'} Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const bot = db.settings[botId]
    const currency = bot.currency
    const botname = bot.botname
    const user = db.chats[m.chat].users[m.sender]
    user.lastApuesta ||= 0
    let Aku = Math.floor(Math.random() * 101)
    let Kamu = Math.floor(Math.random() * 55)
    let count = args[0]
    const userName = db.users[m.sender]?.name || m.sender.split('@')[0]
    const tiempoEspera = 30 * 1000
    const ahora = Date.now()
    if (user.lastApuesta && ahora - user.lastApuesta < tiempoEspera) {
      const restante = user.lastApuesta + tiempoEspera - ahora
      const tiempoRestante = formatTime(restante)
      return client.reply(m.chat, `🌱 ${global.miku || 'HATSUNE MIKU'} Debes esperar *${tiempoRestante}* para usar *${usedPrefix + command}* nuevamente.`, m)
    }
    user.lastApuesta = ahora
    count = count ? /all/i.test(count) ? Math.floor(db.users[m.sender].limit / buatall) : parseInt(count) : args[0] ? parseInt(args[0]) : 1
    count = Math.max(1, count)
    if (args.length < 1) {
      return client.reply(m.chat, `💙 ${global.miku || 'HATSUNE MIKU'} Ingresa la cantidad de *${currency}* que deseas aportar contra *${botname}*\n> Ejemplo: *${usedPrefix + command} 100*`, m)
    }
    if (user.coins >= count) {
      user.coins -= count
      let resultado = ''
      let ganancia = 0
      if (Aku > Kamu) {
        resultado = `> ${userName}, *Perdiste ¥${formatNumber(count)} ${currency}*.`
      } else if (Aku < Kamu) {
        ganancia = count * 2
        user.coins += ganancia
        resultado = `> ${userName}, *Ganaste ¥${formatNumber(ganancia)} ${currency}*.`
      } else {
        ganancia = count
        user.coins += ganancia
        resultado = `> ${userName}, *Ganaste ¥${formatNumber(ganancia)} ${currency}*.`
      }
      let { key } = await client.sendMessage(m.chat, { text: "🎲 💙 El crupier lanza los dados... ¡Las apuestas están cerradas!" }, { quoted: m })
      await delay(2000)
      await client.sendMessage(m.chat, { text: "🌱 Los números están girando... ¡Prepárate para el resultado!", edit: key }, { quoted: m })
      await delay(2000)
      const replyMsg = `💙 ${global.miku || 'HATSUNE MIKU'} \`Veamos qué números tienen!\`\n\n➠ *${botname}* : ${Aku}\n➠ *${userName}* : ${Kamu}\n\n${resultado}`
      await client.sendMessage(m.chat, { text: replyMsg.trim(), edit: key }, { quoted: m })
    } else {
      client.reply(m.chat, `🌱 ${global.miku || 'HATSUNE MIKU'} No tienes *¥${formatNumber(count)} ${currency}* para apostar!`, m)
    }
  }
}

function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function formatTime(ms) {
  if (ms <= 0 || isNaN(ms)) return 'Ahora'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const partes = []
  if (min) partes.push(`${min} minuto${min !== 1 ? 's' : ''}`)
  partes.push(`${sec} segundo${sec !== 1 ? 's' : ''}`)
  return partes.join(' ')
}