import moment   from 'moment'
import chalk    from 'chalk'
import gradient from 'gradient-string'

import seeCommands from './nucleo/system/commandLoader.js'
import initDB      from './nucleo/system/initDB.js'
import antilink    from './interruptores/antilink.js'
import level       from './interruptores/level.js'
import { markDatabaseDirty } from './nucleo/system/database.js'

const COMMAND_TIMEOUT = 15000
const commandTimeouts = new Map()


const getGroupMetadata = async (client, jid) => {
  const { getGroupMetadata: fn } = await import('./nucleo/utils.js')
  return fn(client, jid)
}

seeCommands()

global.gallerySessions = global.gallerySessions || new Map()


function runAllPlugins(tasks) {
  if (tasks.length === 0) return
  for (const task of tasks) {
    task().catch(() => {})
  }
}


function safeMsg(fn) {
  return fn().catch(err => {
    const msg = err?.message || ''
    if (msg.includes('rate-overlimit') || msg.includes('429') ||
        msg.includes('Internal Server Error') || msg.includes('timed out')) return
    throw err
  })
}

const normalizeJidDigits    = (jid = '') => String(jid).split(':')[0].replace(/\D/g, '')
const getBotJid             = (client) => (client.user?.id?.split(':')[0] || client.user?.lid || '') + '@s.whatsapp.net'
const getAssignedPrimaryBot = (chat)   => chat?.primaryBot || null

const isOwnerBot = (client) => {
  const botJid = getBotJid(client)
  return global.owner?.some(num => {
    const ownerJid = num + '@s.whatsapp.net'
    return normalizeJidDigits(ownerJid) === normalizeJidDigits(botJid)
  }) || false
}

const isPrimaryHandler = (client, chat) => {
  const assignedBot = getAssignedPrimaryBot(chat)

  if (isOwnerBot(client)) return true

  if (!assignedBot) return false

  const assignedBotClean = normalizeJidDigits(assignedBot)
  const currentBotClean = normalizeJidDigits(getBotJid(client))
  const isPrimaryConnected = global.conns?.some(c => {
    const connId = c.user?.id || c.userId
    return normalizeJidDigits(connId) === assignedBotClean && c.isInit
  })

  if (!isPrimaryConnected) return true

  return assignedBotClean === currentBotClean
}

export default async (client, m) => {
  const sender = m.sender
  let body = m.message?.conversation
    || m.message?.extendedTextMessage?.text
    || m.message?.imageMessage?.caption
    || m.message?.videoMessage?.caption
    || m.message?.buttonsResponseMessage?.selectedButtonId
    || m.message?.listResponseMessage?.singleSelectReply?.selectedRowId
    || m.message?.templateButtonReplyMessage?.selectedId
    || m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
    || ''

  
  let buttonId = m.body || m.text || null
  if (m.message?.buttonsResponseMessage?.selectedButtonId)
    buttonId = m.message.buttonsResponseMessage.selectedButtonId
  if (m.message?.templateButtonReplyMessage?.selectedId)
    buttonId = m.message.templateButtonReplyMessage.selectedId
  if (m.message?.listResponseMessage?.singleSelectReply?.selectedRowId)
    buttonId = m.message.listResponseMessage.singleSelectReply.selectedRowId
  if (m.message?.interactiveResponseMessage) {
    try {
      const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson
      if (paramsJson) {
        const params = JSON.parse(paramsJson)
        if (params?.id) buttonId = params.id
      }
    } catch {}
  }

  
  if (m.message?.buttonsResponseMessage || m.message?.templateButtonReplyMessage
      || m.message?.listResponseMessage  || m.message?.interactiveResponseMessage) {
    
    await safeMsg(() => client.readMessages([m.key]))
  }

  
  if (buttonId && (buttonId.startsWith('menu_') || buttonId.startsWith('shop_') || buttonId.startsWith('buy_'))) {
    const chatDataBtn = global.db?.data?.chats?.[m.chat]
    if (m.isGroup && (!isPrimaryHandler(client, chatDataBtn) || chatDataBtn?.isBanned)) return

    if (buttonId.startsWith('menu_')) {
      const { processMenuButton } = await import('./interruptores/main/menu.js')
      await processMenuButton(client, m)
    }
    if (buttonId.startsWith('shop_') || buttonId.startsWith('buy_')) {
      const { processFishingShopButton } = await import('./interruptores/economy/pescaderia.js')
      await processFishingShopButton(client, m)
    }
    return
  }

  
  if (buttonId && (
    buttonId.includes('youtube_audio_') ||
    buttonId.includes('youtube_video_360_') ||
    buttonId.includes('youtube_video_doc_') ||
    buttonId.includes('youtube_audio_doc_') ||
    (/^[1-4]$/.test(buttonId) && m.quoted?.text?.includes('MIKU YOUTUBE PLAY'))
  )) {
    const chatDataBtn = global.db?.data?.chats?.[m.chat]
    if (m.isGroup && (!isPrimaryHandler(client, chatDataBtn) || chatDataBtn?.isBanned)) return

    const { processDownload } = await import('./interruptores/downloads/play.js')
    let option = null
    if      (buttonId.includes('youtube_audio_') && !buttonId.includes('_doc')) option = 1
    else if (buttonId.includes('youtube_video_360_'))                            option = 2
    else if (buttonId.includes('youtube_video_doc_'))                            option = 3
    else if (buttonId.includes('youtube_audio_doc_'))                            option = 4
    else if (/^[1-4]$/.test(buttonId))                                           option = parseInt(buttonId)

    if (option) {
      const user = global.db?.data?.users?.[m.sender]
      if (!user?.lastYTSearch) {
        safeMsg(() => client.sendMessage(m.chat, { react: { text: '❌', key: m.key } }))
        return
      }
      if (Date.now() - (user.lastYTSearch.timestamp || 0) > 10 * 60 * 1000) {
        safeMsg(() => client.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }))
        return
      }
      user.monedaDeducted = false
      try {
        await processDownload(client, m, user.lastYTSearch.videoInfo, option).catch(() => {})
        user.lastYTSearch = null
      } catch {}
    }
    return
  }

  
  if (buttonId && (buttonId.startsWith('waifu_claim_') || buttonId.startsWith('waifu_sell_'))) {
    const chatDataBtn = global.db?.data?.chats?.[m.chat]
    if (m.isGroup && (!isPrimaryHandler(client, chatDataBtn) || chatDataBtn?.isBanned)) return

    let userId
    try {
      const parts = buttonId.split('_')
      if (parts.length < 3) return
      userId = parts.slice(2).join('_') + '@s.whatsapp.net'
    } catch { return }

    if (!global.db.data)                   global.db.data          = {}
    if (!global.db.data.users)             global.db.data.users    = {}
    if (!global.db.data.users[userId])     global.db.data.users[userId] = {}
    const user = global.db.data.users[userId]
    if (!user.waifu) user.waifu = { characters: [], pending: null, cooldown: 0 }
    if (!Array.isArray(user.waifu.characters)) user.waifu.characters = []

    if (!user.waifu.pending) {
      safeMsg(() => client.sendMessage(m.chat, { react: { text: '❌', key: m.key } }))
      return
    }

    if (m.sender !== userId) {
      if (buttonId.startsWith('waifu_sell_')) {
        safeMsg(() => client.sendMessage(m.chat, { react: { text: '❌', key: m.key } }))
        return
      }

      const thiefUser = global.db.data.users[m.sender] ||= {}
      if (!thiefUser.waifu) thiefUser.waifu = { characters: [], pending: null, cooldown: 0 }
      thiefUser.waifu.lastSteal = thiefUser.waifu.lastSteal || 0
      if (Date.now() - thiefUser.waifu.lastSteal < 10_000) {
        safeMsg(() => client.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }))
        return
      }
      thiefUser.waifu.lastSteal = Date.now()

      const chance       = Math.random()
      const currentWaifu = user.waifu.pending
      const rarityColors = { 'común': '⚪', 'rara': '🔵', 'épica': '🟣', 'ultra rara': '🟡', 'legendaria': '🔴' }
      const emoji        = rarityColors[currentWaifu?.rarity] || '💙'

      if (chance < 0.20) {
        if (!Array.isArray(thiefUser.waifu.characters)) thiefUser.waifu.characters = []
        thiefUser.waifu.characters.push(currentWaifu)
        user.waifu.pending = null
        let msg = `🥷 *¡ROBO EXITOSO!* 🥷\n\n`
        msg += `Le has robado el personaje a @${userId.split('@')[0]}!\n\n`
        msg += `${emoji} *${currentWaifu.name}*\n`
        msg += `💎 *${currentWaifu.rarity?.toUpperCase() || 'COMÚN'}*\n`
        await client.reply(m.chat, msg, m, { mentions: [userId] })
      } else {
        await client.reply(m.chat, `❌ *ROBO FALLIDO* ❌\n\nIntentaste robar a *${currentWaifu.name}* pero fallaste y huiste.`, m)
      }
      return
    }

    let userName = user.name || userId.split('@')[0]

    if (buttonId.startsWith('waifu_claim_')) {
      const currentWaifu = user.waifu.pending
      user.waifu.pending = null
      const waifuName    = currentWaifu?.name || 'personaje'
      const rarityColors = { 'común': '⚪', 'rara': '🔵', 'épica': '🟣', 'ultra rara': '🟡', 'legendaria': '🔴' }
      const emoji        = rarityColors[currentWaifu?.rarity] || '💙'
      let msg = `✅ ¡RECLAMADO! ✅\n\n`
      msg += `${emoji} *${waifuName}*\n`
      msg += `💎 *${currentWaifu?.rarity?.toUpperCase() || 'COMÚN'}*\n`
      msg += `👤 ${userName}\n`
      msg += `📊 Total: *${user.waifu.characters.length + 1}* personajes\n\n`
      msg += `🔍 Usa *.miwaifu* para ver tu colección completa\n`
      user.waifu.characters.push(currentWaifu)
      await m.reply(msg)
      return
    }

    if (buttonId.startsWith('waifu_sell_')) {
      const currentWaifu = user.waifu.pending
      user.waifu.pending = null
      const SELL_PRICES  = { 'común': 10, 'rara': 25, 'épica': 50, 'ultra rara': 100, 'legendaria': 200 }
      const sellPrice    = SELL_PRICES[currentWaifu?.rarity] || 10
      if (!user.coin) user.coin = 0
      user.coin += sellPrice
      const rarityColors = { 'común': '⚪', 'rara': '🔵', 'épica': '🟣', 'ultra rara': '🟡', 'legendaria': '🔴' }
      const emoji        = rarityColors[currentWaifu?.rarity] || '💙'
      let msg = `💰 VENDIDO!💰\n\n`
      msg += `${emoji} *${currentWaifu?.name || 'personaje'}*\n`
      msg += `💎 *${currentWaifu?.rarity?.toUpperCase() || 'COMÚN'}*\n`
      msg += `💵 *Recibiste:* ${sellPrice} cebollines\n`
      msg += `💳 *Total cebollines:* ${user.coin}\n\n`
      msg += `🏪 Usa *.tienda* para gastar tus cebollines`
      await m.reply(msg)
      return
    }
  }

  
  if (buttonId && (buttonId.startsWith('gallery_prev_') || buttonId.startsWith('gallery_next_'))) {
    const chatDataBtn = global.db?.data?.chats?.[m.chat]
    if (m.isGroup && (!isPrimaryHandler(client, chatDataBtn) || chatDataBtn?.isBanned)) return

    const sessionId = buttonId.split('_').slice(2).join('_')
    const session   = gallerySessions.get(sessionId)
    if (!session) {
      safeMsg(() => client.sendMessage(m.chat, { react: { text: '❌', key: m.key } }))
      return
    }
    if (m.sender !== session.userId) {
      safeMsg(() => client.sendMessage(m.chat, { react: { text: '❌', key: m.key } }))
      return
    }

    const action         = buttonId.startsWith('gallery_prev_') ? 'prev' : 'next'
    const userCharacters = session.characters || []
    let newIndex         = session.index

    if (action === 'prev') {
      newIndex = newIndex - 1
      if (newIndex < 0) newIndex = userCharacters.length - 1
    } else {
      newIndex = newIndex + 1
      if (newIndex >= userCharacters.length) newIndex = 0
    }

    const waifu = userCharacters[newIndex]
    const rarityColors = { 'común': '⚪', 'rara': '🔵', 'épica': '🟣', 'ultra rara': '🟡', 'legendaria': '🔴' }
    const emoji        = rarityColors[waifu.rarity] || '💙'

    let message = `🎨 *MI COLECCIÓN* 🎨\n\n`
    message += `${emoji} *${waifu.name}*\n`
    message += `💎 *Rareza:* ${waifu.rarity.toUpperCase()}\n`
    message += `⚡ *Poder:* ${waifu.power}\n`
    message += `🎯 *Habilidad:* ${waifu.skill}\n`
    message += `📜 *Descripción:* ${waifu.skillDesc}\n\n`
    message += `📖 Personaje ${newIndex + 1} de ${userCharacters.length}\n`
    message += `📊 Total en colección: ${userCharacters.length}\n\n`
    message += `💡 Usa los botones para navegar`

    await client.sendButton(
      m.chat, message, '🎮 Mi Colección - Hatsune Miku Bot',
      waifu.img,
      [['⬅️ Anterior', `gallery_prev_${sessionId}`], ['➡️ Siguiente', `gallery_next_${sessionId}`], ['🎲 Invocar', '.rw']],
      null, null, m,
    )

    gallerySessions.set(sessionId, { index: newIndex, chat: m.chat, userId: session.userId, characters: userCharacters, lastAccess: Date.now() })
    return
  }

  
  if (m.isBot && !m.message?.interactiveResponseMessage) return
  initDB(m, client)

  if (m.isGroup) {
    const chat = global.db.data.chats[m.chat]
    if (chat?.mutedUsers?.[m.sender]) {
      const muteData = chat.mutedUsers[m.sender]
      const now = Date.now()

      if (muteData.unmuteAt && now >= muteData.unmuteAt) {
        delete chat.mutedUsers[m.sender]
      } else {
        try {
          await client.sendMessage(m.chat, { delete: m.key })
        } catch {}
        return
      }
    }
  }

  antilink(client, m)

  const from     = m.key.remoteJid
  const botJid   = getBotJid(client)

  const chat = global.db.data.chats[m.chat] || {}
  const settings = global.db.data.settings[botJid] || {}

  const user   = global.db.data.users[sender] ||= {}
  const users  = chat.users[sender] || {}
  const pushname = m.pushName || 'Sin nombre'

  
  let groupMetadata = null
  let groupAdmins   = null
  let groupName     = null
  let _groupContextPromise = null

  const ensureGroupContext = async () => {
    if (!m.isGroup || groupAdmins) return
    if (_groupContextPromise) return _groupContextPromise
    
    _groupContextPromise = getGroupMetadata(client, m.chat).then(meta => {
      groupMetadata = meta
      groupName = meta?.subject || ''
      groupAdmins = meta?.participants?.filter(
        p => p.admin === 'admin' || p.admin === 'superadmin'
      ) || []
    }).catch(() => {
      groupAdmins = []
    })
    return _groupContextPromise
  }

  let isBotAdmins = false
  let isAdmins    = false
  const isOwners  = [
    botJid,
    ...(settings.owner ? [settings.owner] : []),
    ...global.owner.map(num => num + '@s.whatsapp.net'),
  ].includes(sender)

  
  const allPlugins = Object.entries(global.plugins)
    .filter(([, p]) => p && typeof p.all === 'function')
  if (allPlugins.length > 0) {
    const allTasks = allPlugins.map(([name, plugin]) => async () => {
      try { await plugin.all.call(client, m, { client }) } catch {}
    })
    runAllPlugins(allTasks)
  }


  const today = new Date().toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).split('/').reverse().join('-')

  if (!users.stats)        users.stats        = {}
  if (!users.stats[today]) users.stats[today] = { msgs: 0, cmds: 0 }
  users.stats[today].msgs++

  
  const rawBotname    = settings.namebot || 'Miku'
  const tipo          = settings.type    || 'Sub'
  const cleanBotname  = rawBotname.replace(/[^a-zA-Z0-9\s]/g, '')
  const namebot       = cleanBotname || 'Miku'
  const shortForms    = [namebot.charAt(0), namebot.split(' ')[0], tipo.split(' ')[0], namebot.split(' ')[0].slice(0, 2), namebot.split(' ')[0].slice(0, 3)]
  const prefixes      = shortForms.map(n => n)
  prefixes.unshift(namebot)

  let prefix
  if (Array.isArray(settings.prefix) || typeof settings.prefix === 'string') {
    const prefixArray = Array.isArray(settings.prefix) ? settings.prefix : [settings.prefix]
    prefix = new RegExp(
      '^(' + prefixes.join('|') + ')?(' +
      prefixArray.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
      'i'
    )
  } else if (settings.prefix === true) {
    prefix = new RegExp('^', 'i')
  } else {
    prefix = new RegExp('^(' + prefixes.join('|') + ')?', 'i')
  }

  const strRegex      = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
  let   pluginPrefix  = client.prefix ? client.prefix : prefix
  const textToMatch   = m.text || body || ''

  let matchs = pluginPrefix instanceof RegExp
    ? [[pluginPrefix.exec(textToMatch), pluginPrefix]]
    : Array.isArray(pluginPrefix)
      ? pluginPrefix.map(p => { const r = p instanceof RegExp ? p : new RegExp(strRegex(p)); return [r.exec(textToMatch), r] })
      : typeof pluginPrefix === 'string'
        ? [[new RegExp(strRegex(pluginPrefix)).exec(textToMatch), new RegExp(strRegex(pluginPrefix))]]
        : [[null, null]]

  let match = matchs.find(p => p[0])

  
  if (global.plugins && m.command) {
    const beforeEntries = Object.entries(global.plugins)
      .filter(([, p]) => p && !p.disabled && typeof p.before === 'function')
    
    
    if (beforeEntries.length > 10) {
      const cmdData = global.comandos.get(m.command)
      if (cmdData?.pluginName) {
        const plugin = global.plugins[cmdData.pluginName]
        if (plugin?.before) {
          try {
            const result = await Promise.race([
              plugin.before.call(client, m, { client }),
              new Promise(r => setTimeout(() => r(false), 2000)),
            ])
            if (result) return
          } catch {}
        }
      }
    } else if (beforeEntries.length > 0) {
      
      const results = await Promise.allSettled(
        beforeEntries.map(([, p]) => 
          Promise.race([
            p.before.call(client, m, { client }),
            new Promise(r => setTimeout(() => r(false), 3000))
          ])
        )
      )
      if (results.some(r => r.value === true)) return
    }
  }

  if (!match) return
  let usedPrefix = (match[0] || [])[0] || ''
  let args       = textToMatch.slice(usedPrefix.length).trim().split(' ')
  let command    = (args.shift() || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  let text       = args.join(' ')
  if (!command) return

  
  const chatData      = global.db.data.chats[from] || {}
  const consolePrimary = getAssignedPrimaryBot(chatData)
  if (m.message || !consolePrimary || consolePrimary === botJid) {
    if (m.isGroup && !groupName) await ensureGroupContext()
    const bodyPreview = typeof body === 'string' && body.length > 50 ? `${body.slice(0, 50)}…` : body
    const h = chalk.bold.blue('╔⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍···')
    const t = chalk.bold.blue('╚⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍···')
    const v = chalk.bold.blue('┇')
    console.log(`\n${h}\n${chalk.bold.yellow(`${v} Fecha: ${chalk.whiteBright(moment().format('DD/MM/YY HH:mm:ss'))} p. m.`)}\n${chalk.bold.blueBright(`${v} Usuario: ${chalk.whiteBright(`(${pushname})`)}`)}\n${chalk.bold.magentaBright(`${v} Remitente: ${gradient('deepskyblue', 'darkorchid')(sender)}`)}\n${m.isGroup ? chalk.bold.cyanBright(`${v} Grupo: ${chalk.greenBright(groupName || m.chat.split('@')[0])}\n${v} Mensaje: ${bodyPreview}`) : chalk.bold.greenBright(`${v} Mensaje: ${bodyPreview}`)}\n${t}`)
  }

  const hasPrefix    = settings.prefix === true ? true
    : (Array.isArray(settings.prefix) ? settings.prefix : typeof settings.prefix === 'string' ? [settings.prefix] : [])
      .some(p => textToMatch?.startsWith(p))
  
  if (m.isGroup && hasPrefix && !isPrimaryHandler(client, chat) && command !== 'setprimary') {
    return
  }

if (!isOwners && settings.self)   return
if (m.chat && !m.chat.endsWith('g.us')) {
  const allowedInPrivate = ['allmenu','help','menu','infobot','botinfo','invite','invitar','ping','speed','p','status','estado','report','reporte','sug','suggest','token','join','unir','logout','reload','self','setbanner','setbotbanner','setchannel','setbotchannel','setbotcurrency','setcurrency','seticon','setboticon','setlink','setbotlink','setbotname','setname','setbotowner','setowner','setimage','setpfp','setprefix','setbotprefix','setstatus','setusername','code','qr']
  if (!global.owner.map(n => n + '@s.whatsapp.net').includes(sender) && !allowedInPrivate.includes(command)) return
}
if (chat?.isBanned && !/^(bot|banchat|unbanchat|enable|disable|options)$/i.test(command)) return
if (m.text && user.banned && !global.owner.map(n => n + '@s.whatsapp.net').includes(sender)) {
  await m.reply(`💙 Estás ${user.genre === 'Mujer' ? 'baneada' : user.genre === 'Hombre' ? 'baneado' : 'baneado/a'}, no puedes usar comandos en este bot!\n\n> 🌱 *Razón ›* ${user.bannedReason || 'Sin especificar'}\n\n> 🌱 Si tienes evidencia que respalde que este mensaje es un error, puedes exponer tu caso con un moderador.`)
  return
}

if (m.isGroup && chat.adminonly) {
  await ensureGroupContext()
  isAdmins = groupAdmins.some(p => p.phoneNumber === sender || p.jid === sender || p.id === sender || p.lid === sender)
}
if (chat.adminonly && !isAdmins) return

  
  const cmdData = global.comandos.get(command)
  if (!cmdData) {
    if (settings.prefix === true) return
    await safeMsg(() => client.readMessages([m.key]))
    return m.reply(`💙 El comando *${command}* no existe.\n> 🌱 Usa *${usedPrefix}help* para ver la lista de comandos disponibles.`)
  }
  if (cmdData.isOwner && !global.owner.map(n => n + '@s.whatsapp.net').includes(sender)) {
    if (settings.prefix === true) return
    return m.reply(`El comando *${command}* no existe.\n> Usa *${usedPrefix}help* para ver la lista de comandos disponibles.`)
  }
  if (m.isGroup && (cmdData.isAdmin || cmdData.botAdmin)) {
    await ensureGroupContext()
    isAdmins    = groupAdmins.some(p => p.phoneNumber === sender || p.jid === sender || p.id === sender || p.lid === sender)
    isBotAdmins = groupAdmins.some(p => p.phoneNumber === botJid  || p.jid === botJid  || p.id === botJid  || p.lid === botJid)
  }

  if (cmdData.isAdmin  && !isAdmins)    return client.reply(m.chat, mess.admin,    m)
  if (cmdData.botAdmin && !isBotAdmins) return client.reply(m.chat, mess.botAdmin, m)
  if (cmdData.isOwner  && !isOwners)    return

  if (m.isGroup && (cmdData.nsfw || cmdData.category === 'nsfw') && !chat.nsfw) {
    safeMsg(() => client.readMessages([m.key]))
    return client.sendMessage(m.chat, { text: `💙 El contenido *NSFW* está desactivado en este grupo.\n\nUn *administrador* puede activarlo con el comando:\n» *${usedPrefix}nsfw on*` }, { quoted: m })
  }

  
  try {
    await safeMsg(() => client.readMessages([m.key]))
    user.usedcommands           = (user.usedcommands  || 0) + 1
    settings.commandsejecut     = (settings.commandsejecut || 0) + 1
    users.usedTime              = new Date()
    users.lastCmd               = Date.now()
    user.exp                    = (user.exp || 0) + Math.floor(Math.random() * 100)
    user.name                   = m.pushName
    users.stats[today].cmds++

    markDatabaseDirty()

    const cmdPromise = cmdData.run(client, m, args, usedPrefix, command, text)
    const timeoutPromise = new Promise((_, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Command ${command} timeout`))
      }, COMMAND_TIMEOUT)
      commandTimeouts.set(m.sender + command, timeout)
    })

    await Promise.race([cmdPromise, timeoutPromise])
  } catch (error) {
    clearTimeout(commandTimeouts.get(m.sender + command))
    commandTimeouts.delete(m.sender + command)

    const errMsg = error?.message || String(error)
    if (
      errMsg.includes('rate-overlimit') || errMsg.includes('429') ||
      errMsg.includes('Internal Server Error') ||
      errMsg.includes('timeout')
    ) return
    await client.sendMessage(m.chat, { text: `💙 *ERROR*\n\n💙 Ocurrió un error al ejecutar el comando.\n🌱 *Error:* ${errMsg}` }, { quoted: m })
  } finally {
    clearTimeout(commandTimeouts.get(m.sender + command))
    commandTimeouts.delete(m.sender + command)
  }

  level(m)
}