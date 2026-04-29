import fs from 'fs'
import os from 'os'
import { getBuffer } from '../../nucleo/message.js'
import { sizeFormatter } from 'human-readable'

function getDefaultHostId() {
  if (process.env.HOSTNAME) {
    return process.env.HOSTNAME.split('-')[0]
  }
  return 'default_host_id'
}

const format = sizeFormatter({ std: 'JEDEC', decimalPlaces: 2, keepTrailingZeroes: false, render: (literal, symbol) => `${literal} ${symbol}B` })

export default {
  command: ['status', 'estado'],
  category: 'info',
  run: async (client, m) => {
    const hostId = getDefaultHostId()
    const registeredGroups = global.db.data.chats ? Object.keys(global.db.data.chats).length : 0
    const botId = client.user.id.split(':')[0] + "@s.whatsapp.net" || false
    const botSettings = global.db.data.settings[botId] || {}
    const botname = botSettings.botname
    const logo = botSettings.logo || 'https://file.garden/ae-9DPf0ekWVe7ex/status.png' 
    
    const userCount = Object.keys(global.db.data.users).length || '0'
    const totalCommands = Object.values(global.db.data.users).reduce((acc, user) => acc + (user.usedcommands || 0), 0)

    const sistema = os.type()
    const cpu = os.cpus().length
    const ramTotal = format(os.totalmem())
    const ramUsada = format(os.totalmem() - os.freemem())
    const arquitectura = os.arch()

    const mensajeEstado = `╭─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╮
│ 💙 *ESTADO DEL SISTEMA* 💙
│
│ 🤖 *BOT INFO*
│ 💙 *Nombre ›* ${botname}
│ 👤 *Usuarios ›* ${userCount.toLocaleString()}
│ 👥 *Grupos ›* ${registeredGroups.toLocaleString()}
│ ⚡ *Comandos ›* ${toNum(totalCommands)}
│
│ 🖥️ *SERVER INFO*
│ 💙 *Sistema ›* ${sistema}
│ ⚙️ *CPU ›* ${cpu} núcleos
│ 🔋 *RAM Total ›* ${ramTotal}
│ 📈 *RAM Usada ›* ${ramUsada}
│ 🏗️ *Arquitectura ›* ${arquitectura}
│ 🆔 *Host ID ›* ${hostId}
│
│ 🧪 *NODEJS MEMORY*
│ 💙 *RSS ›* ${format(process.memoryUsage().rss)}
│ 💙 *Heap Total ›* ${format(process.memoryUsage().heapTotal)}
│ 💙 *Heap Usado ›* ${format(process.memoryUsage().heapUsed)}
│ 💙 *Módulos ›* ${format(process.memoryUsage().external)}
╰─💙 ━ ━ ━ ━ ━ ━ ━ ━ 💙─╯`.trim()

    if (!global.imageBannerCache) global.imageBannerCache = new Map()
    let imageObj = { url: logo }
    try {
      if (!global.imageBannerCache.has(logo)) {
        const buf = await getBuffer(logo)
        if (buf) global.imageBannerCache.set(logo, Buffer.from(buf))
      }
      if (global.imageBannerCache.has(logo)) imageObj = global.imageBannerCache.get(logo)
    } catch (e) {}

    await client.sendMessage(m.chat, {
      image: imageObj,
      caption: mensajeEstado,
      contextInfo: {
        mentionedJid: [m.sender],
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: botSettings.id || "120363315369913363@newsletter",
          serverMessageId: '',
          newsletterName: botSettings.nameid || "Hatsune Miku Status"
        }
      }
    }, { quoted: m })
  }
}

function toNum(number) {
  if (number >= 1000 && number < 1000000) {
    return (number / 1000).toFixed(1) + 'k'
  } else if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M'
  } else {
    return number.toString()
  }
}