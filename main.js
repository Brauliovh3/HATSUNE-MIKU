import ws from 'ws';
import moment from 'moment';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import gradient from 'gradient-string';
import seeCommands from './nucleo/system/commandLoader.js';
import initDB from './nucleo/system/initDB.js';
import antilink from './interruptores/antilink.js';
import level from './interruptores/level.js';
import { getGroupAdmins } from './nucleo/message.js';

seeCommands();

export default async (client, m) => {
  const sender = m.sender;
  let body = m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || m.message?.buttonsResponseMessage?.selectedButtonId || m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || m.message?.templateButtonReplyMessage?.selectedId || m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '';

  let buttonId = m.body || m.text || null
  if (m.message?.buttonsResponseMessage?.selectedButtonId) {
    buttonId = m.message.buttonsResponseMessage.selectedButtonId
  }
  if (m.message?.templateButtonReplyMessage?.selectedId) {
    buttonId = m.message.templateButtonReplyMessage.selectedId
  }
  if (m.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
    buttonId = m.message.listResponseMessage.singleSelectReply.selectedRowId
  }
  if (m.message?.interactiveResponseMessage) {
    try {
      const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson
      if (paramsJson) {
        const params = JSON.parse(paramsJson)
        if (params?.id) {
          buttonId = params.id
        }
      }
    } catch (e) {}
  }
  if (buttonId && buttonId.startsWith('menu_')) {
    if (m.isGroup) {
      const chat = global.db?.data?.chats?.[m.chat] || {};
      const primaryBot = chat?.primaryBot;
      if (primaryBot) {
        const botJid = client.user?.id?.split(':')[0] + '@s.whatsapp.net' || ''
        const normalizeJid = (jid) => {
          if (!jid) return ''
          const clean = String(jid).split(':')[0].replace(/\D/g, '')
          return clean
        }
        const primaryDigits = normalizeJid(primaryBot)
        const currentDigits = normalizeJid(botJid)
        if (primaryDigits && primaryDigits !== currentDigits) {
          return
        }
      }
    }
    const { processMenuButton } = await import('./interruptores/main/menu.js')
    await processMenuButton(client, m)
    return
  }
  
  if (buttonId && (
    buttonId.includes('youtube_audio_') ||
    buttonId.includes('youtube_video_360_') ||
    buttonId.includes('youtube_video_doc_') ||
    buttonId.includes('youtube_audio_doc_')
  )) {
    if (m.isGroup) {
      const chat = global.db?.data?.chats?.[m.chat] || {};
      const primaryBot = chat?.primaryBot;
      if (primaryBot) {
        const botJid = client.user?.id?.split(':')[0] + '@s.whatsapp.net' || ''
        const normalizeJid = (jid) => {
          if (!jid) return ''
          const clean = String(jid).split(':')[0].replace(/\D/g, '')
          return clean
        }
        const primaryDigits = normalizeJid(primaryBot)
        const currentDigits = normalizeJid(botJid)
        if (primaryDigits && primaryDigits !== currentDigits) {
          return
        }
      }
    }
    
    const { processDownload } = await import('./interruptores/downloads/play.js')
    let option = null
    if      (buttonId.includes('youtube_audio_') && !buttonId.includes('_doc')) option = 1
    else if (buttonId.includes('youtube_video_360_'))                        option = 2
    else if (buttonId.includes('youtube_video_doc_'))                        option = 3
    else if (buttonId.includes('youtube_audio_doc_'))                        option = 4
    if (option) {
      const user = global.db?.data?.users?.[m.sender]
      if (!user?.lastYTSearch) {
        return client.reply(m.chat, '⏰ No hay búsqueda activa. Realiza una nueva búsqueda.', m)
      }
      if (Date.now() - (user.lastYTSearch.timestamp || 0) > 10 * 60 * 1000) {
        return client.reply(m.chat, '⏰ La búsqueda expiró. Realiza una nueva búsqueda.', m)
      }
      user.monedaDeducted = false
      try {
        await processDownload(client, m, user.lastYTSearch.videoInfo, option)
        user.lastYTSearch = null
      } catch {}
      return
    }
  }

  if (buttonId && (buttonId.startsWith('waifu_claim_') || buttonId.startsWith('waifu_sell_'))) {
    if (m.isGroup) {
      const chat = global.db?.data?.chats?.[m.chat] || {};
      const primaryBot = chat?.primaryBot;
      if (primaryBot) {
        const botJid = client.user?.id?.split(':')[0] + '@s.whatsapp.net' || ''
        const normalizeJid = (jid) => {
          if (!jid) return ''
          const clean = String(jid).split(':')[0].replace(/\D/g, '')
          return clean
        }
        const primaryDigits = normalizeJid(primaryBot)
        const currentDigits = normalizeJid(botJid)
        if (primaryDigits && primaryDigits !== currentDigits) {
          return
        }
      }
    }
    
    let userId;
    try {
      const parts = buttonId.split('_');
      if (parts.length >= 3) {
        const userPart = parts.slice(2).join('_');
        userId = userPart + '@s.whatsapp.net';
      } else {
        return;
      }
    } catch (e) {
      return;
    }

    if (m.sender !== userId) {
      await client.reply(m.chat, '❌ Este personaje no es tuyo. No puedes reclamarlo.', m);
      return;
    }

    let userName = global.db.data.users?.[userId]?.name || userId.split('@')[0]

    if (!global.db.data) global.db.data = {}
    if (!global.db.data.users) global.db.data.users = {}
    if (!global.db.data.users[userId]) global.db.data.users[userId] = {}
    const user = global.db.data.users[userId]
    if (!user.waifu) user.waifu = { characters: [], pending: null, cooldown: 0 }
    if (!Array.isArray(user.waifu.characters)) user.waifu.characters = []

    if (!user.waifu.pending) {
      await client.reply(m.chat, '❌ No tienes ningún personaje disponible para reclamar.\n\n💡 Usa *.rw* para obtener un nuevo personaje.', m);
      return;
    }

    if (buttonId.startsWith('waifu_claim_')) {
      user.waifu.characters.push(user.waifu.pending);
      user.waifu.pending = null;
      await client.reply(m.chat, `✅ Has reclamado a ${userName} en tu colección.`, m);
      return;
    }

    if (buttonId.startsWith('waifu_sell_')) {
      const sellPrice = Math.floor(user.waifu.pending.rarity * 50);
      user.coins = (user.coins || 0) + sellPrice;
      user.waifu.pending = null;
      await client.reply(m.chat, `💰 Has vendido el personaje por ${sellPrice} cebollines.`, m);
      return;
    }
  }

  if ((m.id.startsWith("3EB0") || (m.id.startsWith("BAE5") && m.id.length === 16) || (m.id.startsWith("B24E") && m.id.length === 20)) && !m.message?.interactiveResponseMessage) return
  initDB(m, client)
  antilink(client, m);

  const from = m.key.remoteJid;
  const botJid = client.user?.id?.split(':')[0] + '@s.whatsapp.net' || client.user?.lid || '';
  const chat = global.db.data.chats[m.chat] || {}
  const settings = global.db.data.settings[botJid] || {}
  const user = global.db.data.users[sender] ||= {}
  const users = chat.users[sender] || {}
  const pushname = m.pushName || 'Sin nombre';
  
  let groupMetadata = null
  let groupAdmins = []
  let groupName = ''
  if (m.isGroup) {
    groupMetadata = await client.groupMetadata(m.chat).catch(() => null)
    groupName = groupMetadata?.subject || ''
    groupAdmins = groupMetadata?.participants.filter(p => (p.admin === 'admin' || p.admin === 'superadmin')) || []
  }  
  const isBotAdmins = m.isGroup ? groupAdmins.some(p => p.phoneNumber === botJid || p.jid === botJid || p.id === botJid || p.lid === botJid ) : false
  const isAdmins = m.isGroup ? groupAdmins.some(p => p.phoneNumber === sender || p.jid === sender || p.id === sender || p.lid === sender ) : false
  const connectedSubbots = global.conns.map(c => c.userId + '@s.whatsapp.net') || []
  const isOwners = [botJid, ...(settings.owner ? [settings.owner] : []), ...global.owner.map(num => num + '@s.whatsapp.net'), ...connectedSubbots].includes(sender);

  for (const name in global.plugins) {
    const plugin = global.plugins[name];
    if (plugin && typeof plugin.all === "function") {
      try {
        await plugin.all.call(client, m, { client });
      } catch (err) {
        console.error(`Error en plugin.all -> ${name}`, err);
      }
    }
  }

  const today = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
  if (!users.stats) users.stats = {};
  if (!users.stats[today]) users.stats[today] = { msgs: 0, cmds: 0 };
  users.stats[today].msgs++;
  
  const rawBotname = settings.namebot || 'Miku';
  const tipo = settings.type || 'Sub';
  const cleanBotname = rawBotname.replace(/[^a-zA-Z0-9\s]/g, '')
  const namebot = cleanBotname || 'Miku';
  const shortForms = [namebot.charAt(0), namebot.split(" ")[0], tipo.split(" ")[0], namebot.split(" ")[0].slice(0, 2), namebot.split(" ")[0].slice(0, 3)];
  const prefixes = shortForms.map(name => `${name}`);
  prefixes.unshift(namebot);
  let prefix;
  if (Array.isArray(settings.prefix) || typeof settings.prefix === 'string') {
    const prefixArray = Array.isArray(settings.prefix) ? settings.prefix : [settings.prefix];
    prefix = new RegExp('^(' + prefixes.join('|') + ')?(' + prefixArray.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'i');
  } else if (settings.prefix === true) {
    prefix = new RegExp('^', 'i');
  } else {
    prefix = new RegExp('^(' + prefixes.join('|') + ')?', 'i');
  }
  const strRegex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  let pluginPrefix = client.prefix ? client.prefix : prefix;
  const textToMatch = m.text || body || '';
  let matchs = pluginPrefix instanceof RegExp ? [[pluginPrefix.exec(textToMatch), pluginPrefix]] : Array.isArray(pluginPrefix) ? pluginPrefix.map(p => {
    let regex = p instanceof RegExp ? p : new RegExp(strRegex(p));
    return [regex.exec(textToMatch), regex];
  }) : typeof pluginPrefix === 'string' ? [[new RegExp(strRegex(pluginPrefix)).exec(textToMatch), new RegExp(strRegex(pluginPrefix))]] : [[null, null]];
  let match = matchs.find(p => p[0]);

  for (const name in global.plugins) {
    const plugin = global.plugins[name];
    if (!plugin) continue;
    if (plugin.disabled) continue;
    if (typeof plugin.before === "function") {
      try {
        if (await plugin.before.call(client, m, { client })) {
          continue;
        }
      } catch (err) {
        console.error(`Error en plugin.all -> ${name}`, err);
      }
    }
  }

  if (!match) return;
  let usedPrefix = (match[0] || [])[0] || '';
  let args = textToMatch.slice(usedPrefix.length).trim().split(" ");
  let command = (args.shift() || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let text = args.join(' ');
  if (!command) return;
  
  const chatData = global.db.data.chats[from] || {};
  const consolePrimary = chatData.primaryBot;
  if (m.message || !consolePrimary || consolePrimary === botJid) {
    const bodyPreview = typeof body === 'string' && body.length > 50 ? `${body.slice(0, 50)}…` : body;
    const h = chalk.bold.blue('╔⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍···');
    const t = chalk.bold.blue('╚⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍⚍···');
    const v = chalk.bold.blue('┇');
    console.log(`\n${h}\n${chalk.bold.yellow(`${v} Fecha: ${chalk.whiteBright(moment().format('DD/MM/YY HH:mm:ss'))} p. m.`)}\n${chalk.bold.blueBright(`${v} Usuario: ${chalk.whiteBright(`(${pushname})`)}`)}\n${chalk.bold.magentaBright(`${v} Remitente: ${gradient('deepskyblue', 'darkorchid')(sender)}`)}\n${m.isGroup ? chalk.bold.cyanBright(`${v} Grupo: ${chalk.greenBright(groupName)}\n${v} Mensaje: ${bodyPreview}`) : chalk.bold.greenBright(`${v} Mensaje: ${bodyPreview}`)}\n${t}`);
  }
  
  const hasPrefix = settings.prefix === true ? true : (Array.isArray(settings.prefix) ? settings.prefix : typeof settings.prefix === 'string' ? [settings.prefix] : []).some(p => textToMatch?.startsWith(p));
  function getAllSessionBots() {
    const sessionDirs = ['./Sessions/Subs']
    let bots = []
    for (const dir of sessionDirs) {
      try {
        const subDirs = fs.readdirSync(path.resolve(dir))
        for (const sub of subDirs) {
          const credsPath = path.resolve(dir, sub, 'creds.json')
          if (fs.existsSync(credsPath)) {
            bots.push(sub + '@s.whatsapp.net')
          }
        }
      } catch {}
    }
    try {
      const ownerCreds = path.resolve('./Sessions/Owner/creds.json')
      if (fs.existsSync(ownerCreds)) {
        const ownerId = global.client?.user?.id?.split(':')[0] + '@s.whatsapp.net' || ''
        if (ownerId) bots.push(ownerId)
      }
    } catch {}
    return bots;
  }
  const botprimaryId = chat?.primaryBot
  if (botprimaryId && hasPrefix && m.isGroup) {
    const normalizeJid = (jid) => {
      if (!jid) return ''
      const clean = String(jid).split(':')[0].replace(/\D/g, '')
      return clean + '@s.whatsapp.net'
    }
    const normalizedPrimary = normalizeJid(botprimaryId)
    const normalizedCurrent = normalizeJid(botJid)
    if (normalizedPrimary !== normalizedCurrent) {
      return
    }
  }
  

  if (hasPrefix) {
    const ownerCreds = path.resolve('./Sessions/Owner/creds.json')
    if (fs.existsSync(ownerCreds)) {
      const ownerId = global.client?.user?.id?.split(':')[0] + '@s.whatsapp.net' || ''
      const normalizeJid = (jid) => {
        if (!jid) return ''
        const clean = String(jid).split(':')[0].replace(/\D/g, '')
        return clean + '@s.whatsapp.net'
      }
      const normalizedOwner = normalizeJid(ownerId)
      const normalizedCurrent = normalizeJid(botJid)
     
      if (normalizedOwner && normalizedOwner !== normalizedCurrent) {
        
        const mainBotConnected = fs.existsSync('./Sessions/Owner/creds.json') && 
          global.client?.user?.id
        if (mainBotConnected) {
         
          return
        }
      }
    }
  }
  
  if (!isOwners && settings.self) return;  
  if (m.chat && !m.chat.endsWith('g.us')) {
    const allowedInPrivateForUsers = ['allmenu', 'help', 'menu', 'infobot', 'botinfo', 'invite', 'invitar', 'ping', 'speed', 'p', 'status', 'estado', 'report', 'reporte', 'sug', 'suggest', 'token', 'join', 'unir', 'logout', 'reload', 'self', 'setbanner', 'setbotbanner', 'setchannel', 'setbotchannel', 'setbotcurrency', 'setcurrency', 'seticon', 'setboticon', 'setlink', 'setbotlink', 'setbotname', 'setname', 'setbotowner', 'setowner', 'setimage', 'setpfp', 'setprefix', 'setbotprefix', 'setstatus', 'setusername', 'code', 'qr']
    if (!global.owner.map(num => num + '@s.whatsapp.net').includes(sender) && !allowedInPrivateForUsers.includes(command)) return;
  }
  if (chat?.isBanned && !(command === 'bot' && text === 'on') && !global.owner.map(num => num + '@s.whatsapp.net').includes(sender)) {
    await m.reply(`💙 El bot *${settings.botname}* está desactivado en este grupo.\n\n> 🌱 Un *administrador* puede activarlo con el comando:\n> » *${usedPrefix}bot on*`);
    return;
  }
  if (m.text && user.banned && !global.owner.map(num => num + '@s.whatsapp.net').includes(sender)) {
    await m.reply(`💙 Estás ${user.genre === 'Mujer' ? 'baneada' : user.genre === 'Hombre' ? 'baneado' : 'baneado/a'}, no puedes usar comandos en este bot!\n\n> 🌱 *Razón ›* ${user.bannedReason || 'Sin especificar'}\n\n> 🌱 Si tienes evidencia que respalde que este mensaje es un error, puedes exponer tu caso con un moderador.`);
    return;
  }

  if (!users.stats) users.stats = {};
  if (!users.stats[today]) users.stats[today] = { msgs: 0, cmds: 0 }; 
  if (chat.adminonly && !isAdmins) return;
  const cmdData = global.comandos.get(command);
  if (!cmdData) {
    if (settings.prefix === true) return;
    await client.readMessages([m.key]);
    return m.reply(`💙 El comando *${command}* no existe.\n> 🌱 Usa *${usedPrefix}help* para ver la lista de comandos disponibles.`);
  }
  if (cmdData.isOwner && !global.owner.map(num => num + '@s.whatsapp.net').includes(sender)) {
    if (settings.prefix === true) return;
    return m.reply(`💙 El comando *${command}* no existe.\n> 🌱 Usa *${usedPrefix}help* para ver la lista de comandos disponibles.`);
  }
  if (cmdData.isAdmin && !isAdmins) return client.reply(m.chat, mess.admin, m);
  if (cmdData.botAdmin && !isBotAdmins) return client.reply(m.chat, mess.botAdmin, m);
  try {
    await client.readMessages([m.key]);
    user.usedcommands = (user.usedcommands || 0) + 1;
    settings.commandsejecut = (settings.commandsejecut || 0) + 1;
    users.usedTime = new Date();
    users.lastCmd = Date.now();
    user.exp = (user.exp || 0) + Math.floor(Math.random() * 100);
    user.name = m.pushName;
    users.stats[today].cmds++;
    await cmdData.run(client, m, args, usedPrefix, command, text);
  } catch (error) {
    await client.sendMessage(m.chat, { text: `💙 *ERROR*\n\n💙 Ocurrió un error al ejecutar el comando.\n🌱 *Error:* ${error.message || error}` }, { quoted: m });
  }
  level(m);
};
