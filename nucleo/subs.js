import { Browsers, makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason, jidDecode, } from '@whiskeysockets/baileys';
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
const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
const userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
const groupCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });
let reintentos = {}
let sesionesEliminadas = new Set()
let reconectando = new Set()
const cleanJid = (jid = '') => jid.replace(/:\d+/, '').split('@')[0]

export async function startSubBot(m, client, caption = '', isCode = false, phone = '', chatId = '', commandFlags = {}, isCommand = false) {
  const id = phone || (m?.sender || '').split('@')[0]
  const sessionFolder = `./Sessions/Subs/${id}`
  const senderId = m?.sender

  if (sesionesEliminadas.has(id) && !isCommand) {
    return null
  }

  if (!fs.existsSync(sessionFolder) && isCommand) {
    fs.mkdirSync(sessionFolder, { recursive: true })
  }

  if (!fs.existsSync(sessionFolder)) {
    return null
  }

  if (isCommand) {
    sesionesEliminadas.delete(id)
    delete reintentos[id]
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder)
  const version = global.baileysVersion || await fetchLatestBaileysVersion().then(v => v.version)

console.info = () => {} 
const sock = makeWASocket({
  logger: pino({ level: 'silent' }),
  printQRInTerminal: false,
  browser: Browsers.macOS('Chrome'),
  auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
  markOnlineOnConnect: false,
  generateHighQualityLinkPreview: true,
  syncFullHistory: false,
  getMessage: async () => '',
  msgRetryCounterCache,
  userDevicesCache,
  cachedGroupMetadata: async (jid) => groupCache.get(jid),
  version,
  keepAliveIntervalMs: 45000,
  maxIdleTimeMs: 60000,
})

  sock.isInit = false
  sock.ev.on('creds.update', saveCreds)

  if (isCode && caption && client && chatId && commandFlags[senderId]) {
    try {
      await m.reply(caption)
      m.react('⏳')
      
      const generateCode = async () => {
        try {
          let codeGen = await sock.requestPairingCode(phone);
          codeGen = codeGen?.match(/.{1,4}/g)?.join("-") || codeGen;
          const msgCode = await m.reply(codeGen);
          m.react('✅')
          delete commandFlags[senderId];
          setTimeout(async () => {
            try {
              await client.sendMessage(chatId, { delete: msgCode.key });
            } catch {}
          }, 60000);
        } catch (err) {
          console.error('Error generando código:', err);
          m.react('❌');
          await m.reply('❌ Error al generar código. La conexión no está lista. Intenta de nuevo.');
          delete commandFlags[senderId];
        }
      };
      
      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open' && commandFlags[senderId]) {
          await generateCode();
        }
      });
      
      setTimeout(async () => {
        if (commandFlags[senderId]) {
          await generateCode();
        }
      }, 3000);
    } catch {}
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
      if (qr && isCode && phone && client && chatId && commandFlags[senderId]) {
        try {
          let codeGen = await sock.requestPairingCode(phone);
          codeGen = codeGen?.match(/.{1,4}/g)?.join("-") || codeGen;
          const msgCode = await m.reply(codeGen);
          delete commandFlags[senderId];
          setTimeout(async () => {
            try {
              await client.sendMessage(chatId, { delete: msgCode.key });
            } catch {}
          }, 60000);
        } catch (err) {
          console.error('Error generando código QR:', err);
        }
      }
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
      }

      if (connection === 'close') {
        const botId = sock.userId || id
        const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.reason || 0

        if (global.conns.find((c) => c.userId === botId)) {
          return
        }

        if (reconectando.has(botId)) {
          return
        }

        const intentos = reintentos[botId] || 0
        reintentos[botId] = intentos + 1

        if ([401, 403].includes(reason)) {
          if (intentos < 5) {
            reconectando.add(botId)
            setTimeout(() => {
              reconectando.delete(botId)
              startSubBot(m, client, caption, isCode, phone, chatId, {}, isCommand)
            }, 3000)
          } else {
            reconectando.delete(botId)
            try {
              fs.rmSync(sessionFolder, { recursive: true, force: true })
              sesionesEliminadas.add(botId)
            } catch {}
            delete reintentos[botId]
            const connIndex = global.conns.findIndex((c) => c.userId === botId)
            if (connIndex !== -1) {
              global.conns.splice(connIndex, 1)
            }
            return
          }
          return
        }

        if ([DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.timedOut, DisconnectReason.connectionReplaced].includes(reason)) {
          if (intentos < 5) {
            reconectando.add(botId)
            setTimeout(() => {
              reconectando.delete(botId)
              startSubBot(m, client, caption, isCode, phone, chatId, {}, isCommand)
            }, 3000)
          } else {
            reconectando.delete(botId)
            try {
              fs.rmSync(sessionFolder, { recursive: true, force: true })
              sesionesEliminadas.add(botId)
            } catch {}
            delete reintentos[botId]
            const connIndex = global.conns.findIndex((c) => c.userId === botId)
            if (connIndex !== -1) {
              global.conns.splice(connIndex, 1)
            }
            return
          }
          return
        }
        reconectando.add(botId)
        setTimeout(() => {
          reconectando.delete(botId)
          startSubBot(m, client, caption, isCode, phone, chatId, {}, isCommand)
        }, 3000)
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
for (const value of Object.values(global.miku)) {
if (typeof value === 'string' && value.endsWith('@newsletter')) {
await client.newsletterFollow(value).catch(() => {})
}}}