import { Browsers, makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, jidDecode, } from '@whiskeysockets/baileys';
import qrcode from "qrcode"
import NodeCache from 'node-cache';
import main from '../main.js'
import events from '../interruptores/events.js'
import pino from 'pino';
import fs from 'fs';
import chalk from 'chalk';
import { smsg } from './message.js';
import moment from 'moment-timezone';

if (!global.conns) global.conns = []
const MAX_SUBBOTS = 70
const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
const userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
const groupCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });
let reintentos = {}
const cleanJid = (jid = '') => jid.replace(/:\d+/, '').split('@')[0]

export async function startSubBot(m, client, caption = '', isCode = true, phone = '', chatId = '', commandFlags = {}, isCommand = false) {
  const id = phone || (m?.sender || '').split('@')[0]
  const sessionFolder = `./Sessions/Subs/${id}`
  const senderId = m?.sender

  if (global.conns.length >= MAX_SUBBOTS) {
    console.log(chalk.red(`[ 💙 ] Límite de ${MAX_SUBBOTS} SUB-BOTs alcanzado. No se puede iniciar: ${id}`))
    if (m && m.reply) {
      await m.reply(`❌ Límite de ${MAX_SUBBOTS} SUB-BOTs alcanzado. Elimina algunos antes de agregar más.`)
    }
    return null
  }

  if (!fs.existsSync(sessionFolder) && isCommand) {
    fs.mkdirSync(sessionFolder, { recursive: true })
  }

  if (!fs.existsSync(sessionFolder)) {
    return null
  }

  if (isCommand) {
    delete reintentos[id]
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder)
  const { version } = await fetchLatestBaileysVersion()

console.info = () => {} 
const sock = makeWASocket({
  logger: pino({ level: 'silent' }),
  printQRInTerminal: false,
  browser: Browsers.macOS('Chrome'),
  auth: state,
  markOnlineOnConnect: false,
  generateHighQualityLinkPreview: true,
  syncFullHistory: false,
  getMessage: async () => '',
  msgRetryCounterCache,
  userDevicesCache,
  cachedGroupMetadata: async (jid) => groupCache.get(jid),
  version,
  keepAliveIntervalMs: 25000,
  maxIdleTimeMs: 300000,
})

  sock.isInit = false
  sock.ev.on('creds.update', saveCreds)

  if (isCode && caption && client && chatId && commandFlags[senderId]) {
    setTimeout(async () => {
      try {
        if (!sock.authState.creds.registered) {
          console.log(chalk.gray(`[ 💙 ] Solicitando código de vinculación para: ${phone}`))
          let codeGen = await sock.requestPairingCode(phone);
          codeGen = codeGen?.match(/.{1,4}/g)?.join("-") || codeGen;
          const msg = await m.reply(caption)
          const msgCode = await m.reply(codeGen);
          delete commandFlags[senderId];
          setTimeout(async () => {
          try {
          await client.sendMessage(chatId, { delete: msg.key });
          await client.sendMessage(chatId, { delete: msgCode.key });
          } catch {}
          }, 60000);
        } else {
          console.log(chalk.gray(`[ 💙 ] Sesión ya registrada para: ${phone}`))
        }
      } catch (err) {
        console.error("[ Código Error]", err);
        if (m && m.reply) {
          await m.reply(`❌ Error al obtener código de vinculación: ${err.message}`)
        }
      }
    }, 3000);
  }

  sock.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {}
      return (decode.user && decode.server && decode.user + '@' + decode.server) || jid
    } else return jid
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, isNewLogin, qr }) => {
    try {
      if (isNewLogin) sock.isInit = false
      
      if (qr && !isCode && client && chatId && commandFlags[senderId]) {
        try {
          const msgQR = await client.sendMessage(m.chat, { image: await qrcode.toBuffer(qr, { scale: 8 }), caption }, { quoted: m})
          delete commandFlags[senderId]
          setTimeout(async () => {
            try {
              await client.sendMessage(chatId, { delete: msgQR.key })
            } catch {}
          }, 60000)
        } catch {}
      }
      if (connection === 'open') {
        sock.uptime = Date.now();
        sock.isInit = true
        sock.userId = cleanJid(sock.user?.id?.split('@')[0])
        const botDir = sock.userId + '@s.whatsapp.net'
        if (!global.db.data.settings[botDir]) {
          global.db.data.settings[botDir] = {}
        }
        global.db.data.settings[botDir].type = 'Sub'
        if (!global.conns.find((c) => c.userId === sock.userId)) {
          global.conns.push(sock)
        }

        delete reintentos[sock.userId || id]
        
        await joinChannels(sock)
        console.log(chalk.gray(`[ 💙 ]  SUB-BOT conectado: ${sock.userId}`))
      }

      if (connection === 'close') {
        const botId = sock.userId || id
        const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.reason || 0
        
        if (global.conns.find((c) => c.userId === botId)) {
          return
        }

        const intentos = reintentos[botId] || 0
        reintentos[botId] = intentos + 1

        if ([401, 403].includes(reason)) {
          if (intentos < 3) {
            const delayMs = Math.min(10000 * (intentos + 1), 30000)
            console.log(chalk.gray(`[ 💙 ]  SUB-BOT ${botId} Conexión cerrada (código ${reason}) intento ${intentos + 1}/3 → Reintentando en ${delayMs/1000}s...`))
            setTimeout(() => {
              startSubBot(m, client, caption, isCode, phone, chatId, {}, isCommand)
            }, delayMs)
          } else {
            console.log(chalk.gray(`[ 💙 ]  SUB-BOT ${botId} Falló tras 3 intentos. Eliminando sesión y matando proceso.`))
            try {
              fs.rmSync(sessionFolder, { recursive: true, force: true })
            } catch (e) {
              console.error(`[ 💙 ] No se pudo eliminar la carpeta ${sessionFolder}:`, e)
            }
            delete reintentos[botId]
            const connIndex = global.conns.findIndex((c) => c.userId === botId)
            if (connIndex !== -1) {
              global.conns.splice(connIndex, 1)
            }
            try {
              sock.end()
            } catch {}
          }
          return
        }

        if ([DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.timedOut, DisconnectReason.connectionReplaced].includes(reason)) {
          if (intentos < 3) {
            const delayMs = Math.min(5000 * (intentos + 1), 15000)
            console.log(chalk.gray(`[ 💙 ]  SUB-BOT ${botId} Desconexión temporal (código ${reason}) intento ${intentos + 1}/3 → Reintentando en ${delayMs/1000}s...`))
            setTimeout(() => {
              startSubBot(m, client, caption, isCode, phone, chatId, {}, isCommand)
            }, delayMs)
          } else {
            console.log(chalk.gray(`[ 💙 ]  SUB-BOT ${botId} Falló tras 3 intentos. Eliminando sesión y matando proceso.`))
            try {
              fs.rmSync(sessionFolder, { recursive: true, force: true })
            } catch (e) {
              console.error(`[ 💙 ] No se pudo eliminar la carpeta ${sessionFolder}:`, e)
            }
            delete reintentos[botId]
            const connIndex = global.conns.findIndex((c) => c.userId === botId)
            if (connIndex !== -1) {
              global.conns.splice(connIndex, 1)
            }
            try {
              sock.end()
            } catch {}
          }
          return
        }
        console.log(chalk.gray(`[ 💙 ]  SUB-BOT ${botId} Reintentando conexión en 10s...`))
        setTimeout(() => {
          startSubBot(m, client, caption, isCode, phone, chatId, {}, isCommand)
        }, 10000)
      }
    } catch {}
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (let raw of messages) {
      if (!raw.message) continue
      let msg = await smsg(sock, raw)
      try {
        main(sock, msg, messages)
      } catch {}
    }
  })
 
  try {
  await events(sock, m)
  } catch {}
  return sock
}

async function joinChannels(client) {
  for (const value of Object.values(global.miku || {})) {
    if (typeof value === 'string' && value.endsWith('@newsletter')) {
      if (client?.newsletterFollow) {
        await client.newsletterFollow(value).catch(() => {})
      }
    }
  }
}