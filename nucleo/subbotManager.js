import {
  Browsers, makeWASocket, useMultiFileAuthState,
  fetchLatestBaileysVersion, DisconnectReason,
  jidDecode, makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys'
import pino       from 'pino'
import fs         from 'fs'
import path       from 'path'
import chalk      from 'chalk'
import NodeCache  from 'node-cache'
import main       from '../main.js'
import { smsg }   from './message.js'
import optimizer  from './system/optimizer.js'
import events     from '../interruptores/events.js'
import { _maybeYield } from '../index.js'

if (!global.conns) global.conns = []


const msgRetryCounterCache = new NodeCache({ stdTTL: 3600, checkperiod: 300, useClones: false })
const userDevicesCache     = new NodeCache({ stdTTL: 3600, checkperiod: 300, useClones: false })
const groupCache           = new NodeCache({ stdTTL: 3600, checkperiod: 300 })

const subbotRateLimiter = new Map()
const MAX_MSG_PER_MINUTE = 20
const CONCURRENT_LIMIT = 5
const activeSubbotMessages = new Map()

const reintentos = new Map()


let _cachedBaileysVersion = null
async function getBaileysVersion() {
 
  if (global.baileysVersion) {
    _cachedBaileysVersion = global.baileysVersion
    return _cachedBaileysVersion
  }
  
  if (_cachedBaileysVersion) return _cachedBaileysVersion
  
  const { version } = await fetchLatestBaileysVersion()
  _cachedBaileysVersion = version
  global.baileysVersion = version
  setTimeout(() => { _cachedBaileysVersion = null }, 6 * 60 * 60 * 1000)
  return version
}


const cleanJid     = (jid = '') => jid.replace(/:\d+/, '').split('@')[0]
const normalizeJid = (jid = '') => String(jid).split(':')[0].replace(/\D/g, '')

const shouldProcessRaw = (sock, raw) => {
  const chatJid = raw.key?.remoteJid
  if (!chatJid?.endsWith('@g.us')) return true

  const db = global.db?.data
  if (!db) return true

  db.chats ??= {}
  const chat = db.chats[chatJid] ??= {}
  chat.users ??= {}
  chat.mutedUsers ??= {}
  chat.isBanned ??= false
  chat.economy ??= true
  chat.adminonly ??= false
  chat.antilinks ??= true

  const primaryBotId = chat.primaryBot
  const currentBotId = sock.user?.id

  if (primaryBotId) return normalizeJid(primaryBotId) === normalizeJid(currentBotId)

  chat.primaryBot = currentBotId
  return true
}

const removeFromConns = (sessionId) => {
  for (let i = global.conns.length - 1; i >= 0; i--) {
    if (global.conns[i]?._sessionId === sessionId) global.conns.splice(i, 1)
  }
}

const upsertConn = (sock, sessionId) => {
  removeFromConns(sessionId)
  const userId = sock.userId
  if (userId) {
    for (let i = global.conns.length - 1; i >= 0; i--) {
      if (global.conns[i]?.userId === userId) global.conns.splice(i, 1)
    }
  }
  global.conns.push(sock)
}


async function runWithLimit(tasks, limit = 3) {
  const pool = []
  for (const task of tasks) {
    const p = task().finally(() => pool.splice(pool.indexOf(p), 1))
    pool.push(p)
    if (pool.length >= limit) await Promise.race(pool)
  }
  await Promise.all(pool)
}


class SubBotManager {
  constructor() {
    this.subbots         = new Map()
    this.startingSubbots = new Set()
    this.initialized     = false
    this._healthDebounce = new Map()  
  }

  
  async initializeAll() {
    if (this.initialized) {
      console.log(chalk.gray('💙 Subbots ya inicializados, omitiendo...'))
      return
    }

    const subsPath = './Sessions/subbots'
    if (!fs.existsSync(subsPath)) {
      fs.mkdirSync(subsPath, { recursive: true })
      this.initialized = true
      return
    }

    const sessions = fs.readdirSync(subsPath).filter(dir =>
      fs.existsSync(path.join(subsPath, dir, 'creds.json'))
    )

    if (sessions.length === 0) {
      this.initialized = true
      return
    }

    console.log(chalk.cyan(`💙 Iniciando ${sessions.length} subbots (concurrencia: 3)...`))

    
    const tasks = sessions.map(sessionId => () => this.startSubBot(sessionId))
    await runWithLimit(tasks, 3)

    this.initialized = true
    console.log(chalk.cyan('💙 Sistema de subbots inicializado'))
  }

  
  async startSubBot(id) {
    const sessionId     = String(id).trim()
    const sessionFolder = `./Sessions/subbots/${sessionId}`

    if (this.subbots.has(sessionId))         return
    if (this.startingSubbots.has(sessionId)) return
    if (!fs.existsSync(sessionFolder) || !fs.existsSync(path.join(sessionFolder, 'creds.json'))) return

    const credsPath    = path.join(sessionFolder, 'creds.json')
    const stats        = fs.statSync(credsPath)
    const isNewSession = (Date.now() - stats.mtimeMs) < 300000

    this.startingSubbots.add(sessionId)

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder)
      
      const version              = await getBaileysVersion()
      const logger               = pino({ level: 'silent' })

      const connectionOptions = {
        logger,
        version,
        printQRInTerminal: false,
        browser: Browsers.macOS('Chrome'),
        auth: {
          creds: state.creds,
          keys:  makeCacheableSignalKeyStore(state.keys, logger),
        },
        markOnlineOnConnect:      false,
        generateHighQualityLinkPreview: false,
        syncFullHistory:          false,
        getMessage:               async () => '',
        msgRetryCounterCache,
        userDevicesCache,
        keepAliveIntervalMs:      30_000,
        maxIdleTimeMs:            60_000,
        connectTimeoutMs:         60_000,
        defaultQueryTimeoutMs:    60_000,
      }

      let sock         = makeWASocket(connectionOptions)
      sock.isInit      = false
      sock._sessionId  = sessionId

      sock.ev.on('creds.update', saveCreds)

      sock.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
          const decode = jidDecode(jid) || {}
          return (decode.user && decode.server && `${decode.user}@${decode.server}`) || jid
        }
        return jid
      }

      const reconectar = async () => {
        const oldChats = sock.chats
        try { sock.ws.close() } catch {}
        sock.ev.removeAllListeners()

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout reconnecting')), 60_000)

          sock = makeWASocket({ ...connectionOptions }, { chats: oldChats })
          sock.isInit     = false
          sock._sessionId = sessionId
          sock.ev.on('creds.update', saveCreds)

          if (!optimizer.active) optimizer.start()
          optimizer.registerSession(sessionId, 'Sub', { userId: sock.userId })

          sock.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
              const decode = jidDecode(jid) || {}
              return (decode.user && decode.server && `${decode.user}@${decode.server}`) || jid
            }
            return jid
          }

          const onOpen = ({ connection }) => {
            if (connection !== 'open') return
            clearTimeout(timeout)
            sock.ev.off('connection.update', onOpen)
            resolve()
          }
          sock.ev.on('connection.update', onOpen)
          attachEvents(sock)
        })
      }

      const attachEvents = (sock) => {
        
        sock.ev.on('connection.update', async ({ connection, lastDisconnect, isNewLogin }) => {
          if (isNewLogin) sock.isInit = false

          if (connection === 'open') {
            sock.uptime = Date.now()
            sock.isInit = true
            sock.userId = cleanJid(sock.user?.id || '')
            const botDir = sock.userId + '@s.whatsapp.net'

            if (!global.db.data)                          global.db.data             = {}
            if (!global.db.data.settings)                 global.db.data.settings    = {}
            if (!global.db.data.settings[botDir])         global.db.data.settings[botDir] = {}
            global.db.data.settings[botDir].type = 'Sub'

            upsertConn(sock, sessionId)
            reintentos.delete(sessionId)
            this.startingSubbots.delete(sessionId)
            this.subbots.set(sessionId, sock)

            if (!optimizer.active) optimizer.start()
            optimizer.registerSession(sessionId, 'Sub', { userId: sock.userId })

            try { await events(sock, null) } catch (e) {}

            console.log(chalk.green(`💙 Subbot conectado: ${sock.userId} (sesión: ${sessionId})`))
            return
          }

          if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
              ?? lastDisconnect?.error?.output?.payload?.statusCode
              ?? 0

            this.subbots.delete(sessionId)
            removeFromConns(sessionId)
            optimizer.unregisterSession(sessionId)

            
            if ([428, 408, 500, 503, 515, DisconnectReason.restartRequired].includes(reason)) {
              const label = { 428: 'cierre inesperado', 408: 'pérdida de conexión', 500: 'conexión perdida', 503: 'servicio no disponible', 515: 'reinicio requerido' }[reason] || 'reinicio requerido'
              console.log(chalk.magentaBright(`💙 Sub-Bot (${sessionId}) ${label} (${reason}). Reconectando...`))

              if (this.startingSubbots.has(sessionId)) return
              this.startingSubbots.add(sessionId)
              try {
                await reconectar()
              } catch (err) {
                console.error(chalk.red(`💙 Error reconectando ${sessionId}:`), err.message)
                this.startingSubbots.delete(sessionId)
              }
              setTimeout(() => this.startingSubbots.delete(sessionId), 5000)
              return
            }

           
            if (reason === DisconnectReason.loggedOut || reason === 401) {
              console.log(chalk.red(`💙 Sub-Bot (${sessionId}) desconectado (sesión cerrada). Eliminando.`))
              fs.promises.rm(sessionFolder, { recursive: true, force: true }).catch(() => {})
              reintentos.delete(sessionId)
              this.startingSubbots.delete(sessionId)
              return
            }
            if (reason === 403) {
              console.log(chalk.red(`💙 Sub-Bot (${sessionId}) suspendido (${reason}). Eliminando.`))
              fs.promises.rm(sessionFolder, { recursive: true, force: true }).catch(() => {})
              reintentos.delete(sessionId)
              this.startingSubbots.delete(sessionId)
              return
            }
            if (reason === 440) {
              console.log(chalk.magentaBright(`💙 Sub-Bot (${sessionId}) reemplazado por otra sesión.`))
              reintentos.delete(sessionId)
              this.startingSubbots.delete(sessionId)
              return
            }

            
            if (!fs.existsSync(sessionFolder) || !fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
              reintentos.delete(sessionId)
              this.startingSubbots.delete(sessionId)
              return
            }

            if (this.startingSubbots.has(sessionId)) return

            
            const intento  = reintentos.get(sessionId) || 0
            const delayMs  = Math.min(3000 * (intento + 1), 15_000)
            reintentos.set(sessionId, intento + 1)
            this.startingSubbots.add(sessionId)

            setTimeout(async () => {
              try {
                if (!fs.existsSync(sessionFolder) || !fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
                  this.startingSubbots.delete(sessionId)
                  reintentos.delete(sessionId)
                  return
                }
                this.startingSubbots.delete(sessionId)
                await this.startSubBot(sessionId)
              } catch (e) {
                console.error(chalk.red(`💙 Error reconexión general ${sessionId}:`), e.message)
                this.startingSubbots.delete(sessionId)
              }
            }, delayMs)
          }
        })

        
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
          if (type !== 'notify') return

          const activeCount = activeSubbotMessages.get(sessionId) || 0
          if (activeCount >= CONCURRENT_LIMIT) {
            return
          }

          for (const raw of messages) {
            if (!raw.message) continue
            if (!shouldProcessRaw(sock, raw)) continue

            const sender = raw.key?.remoteJid || raw.key?.participant || 'unknown'
            const now = Date.now()
            const userKey = `${sessionId}_${sender}`
            const userRate = subbotRateLimiter.get(userKey) || { count: 0, resetTime: now + 60000 }

            if (now > userRate.resetTime) {
              userRate.count = 0
              userRate.resetTime = now + 60000
            }

            userRate.count++
            subbotRateLimiter.set(userKey, userRate)

            if (userRate.count > MAX_MSG_PER_MINUTE) {
              continue
            }

            _maybeYield()
            activeSubbotMessages.set(sessionId, activeCount + 1)

            ;(async () => {
              try {
                const m = await smsg(sock, raw)
                if (m) {
                  await Promise.race([
                    main(sock, m, messages),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Command timeout')), 30000))
                  ])
                }
              } catch (err) {
                if (!err.message?.includes('timeout')) {
                  console.error(`Error en subbot ${sessionId}:`, err.message)
                }
              } finally {
                const current = activeSubbotMessages.get(sessionId) || 0
                activeSubbotMessages.set(sessionId, Math.max(0, current - 1))
              }
            })()
          }

          if (subbotRateLimiter.size > 2000) {
            const now = Date.now()
            for (const [key, data] of subbotRateLimiter) {
              if (now > data.resetTime) {
                subbotRateLimiter.delete(key)
              }
            }
          }
        })
      }

      attachEvents(sock)
      
      this.subbots.set(sessionId, sock)

    } catch (err) {
      console.error(chalk.red(`Error iniciando subbot ${sessionId}:`), err.message)
      this.startingSubbots.delete(sessionId)
      this.subbots.delete(sessionId)

      if (fs.existsSync(sessionFolder) && fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
        const intento = reintentos.get(sessionId) || 0
        if (intento < 5) {
          reintentos.set(sessionId, intento + 1)
          const delayMs = Math.min(10_000 * (intento + 1), 60_000)
          setTimeout(() => this.startSubBot(sessionId), delayMs)
        }
      }
    }
  }

  
  async stopSubBot(sessionId) {
    const sock = this.subbots.get(sessionId)
    if (sock) {
      try { sock.ev.removeAllListeners() } catch {}
      try { if (sock.ws) sock.ws.close()  } catch {}
      sock.isInit = false
    }
    this.subbots.delete(sessionId)
    this.startingSubbots.delete(sessionId)
    reintentos.delete(sessionId)
    removeFromConns(sessionId)
    optimizer.unregisterSession(sessionId)
    console.log(chalk.yellow(`💙 Subbot ${sessionId} detenido`))
  }

  
  getStatus() {
    for (let i = global.conns.length - 1; i >= 0; i--) {
      const c = global.conns[i]
      if (!c || !c._sessionId)            { global.conns.splice(i, 1); continue }
      if (!this.subbots.has(c._sessionId))  global.conns.splice(i, 1)
    }
    return {
      total:     this.subbots.size,
      connected: global.conns.length,
      list:      global.conns.map(c => ({ id: c.userId || c._sessionId, connected: !!c.isInit })),
    }
  }

  delay(ms) { return new Promise(r => setTimeout(r, ms)) }

  pruneSubbotChats() {
    const now = Date.now()
    const MAX_CHATS = 100
    const CHAT_AGE = 24 * 60 * 60 * 1000

    for (const [sessionId, sock] of this.subbots) {
      if (!sock?.chats) continue

      const chats = sock.chats
      let deleted = 0

      for (const [jid, chat] of chats) {
        const lastMsgTime = chat?.lastMessage?.messageTimestamp
          ? chat.lastMessage.messageTimestamp * 1000
          : 0

        if (now - lastMsgTime > CHAT_AGE) {
          chats.delete(jid)
          deleted++
        }
      }

      if (chats.size > MAX_CHATS) {
        const sorted = Array.from(chats.entries())
          .sort((a, b) => {
            const tA = a[1]?.lastMessage?.messageTimestamp || 0
            const tB = b[1]?.lastMessage?.messageTimestamp || 0
            return tB - tA
          })
        const toDelete = chats.size - MAX_CHATS
        for (let i = sorted.length - 1; i >= sorted.length - toDelete; i--) {
          chats.delete(sorted[i][0])
          deleted++
        }
      }

      if (deleted > 0) {
        console.log(chalk.gray(`💙 Subbot ${sessionId}: ${deleted} chats limpiados`))
      }
    }
  }

  startHealthCheck() {
    setInterval(async () => {
      const subsPath = './Sessions/subbots'
      if (!fs.existsSync(subsPath)) return

      const sessions = fs.readdirSync(subsPath).filter(dir =>
        fs.existsSync(path.join(subsPath, dir, 'creds.json'))
      )

      for (const sessionId of sessions) {
        const sock = this.subbots.get(sessionId)
        if (!sock || !sock.isInit) {
          if (this.startingSubbots.has(sessionId)) continue
          
          if (this._healthDebounce.has(sessionId)) continue
          const handle = setTimeout(async () => {
            this._healthDebounce.delete(sessionId)
            if (!this.subbots.get(sessionId)?.isInit && !this.startingSubbots.has(sessionId)) {
              await this.startSubBot(sessionId)
            }
          }, 2000)
          this._healthDebounce.set(sessionId, handle)
        }
      }

      this.pruneSubbotChats()
    }, 60_000)
  }
}

const subBotManager = new SubBotManager()
export default subBotManager
export { SubBotManager }