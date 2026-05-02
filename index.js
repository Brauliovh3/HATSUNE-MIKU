import "./settings.js"
import main          from './main.js'
import events        from './interruptores/events.js'
import {
  Browsers, makeWASocket, makeCacheableSignalKeyStore,
  useMultiFileAuthState, fetchLatestBaileysVersion,
  jidDecode, DisconnectReason,
} from "@whiskeysockets/baileys"
import cfonts        from 'cfonts'
import pino          from "pino"
import qrcode        from "qrcode-terminal"
import chalk         from "chalk"
import fs            from "fs"
import path          from "path"
import readlineSync  from "readline-sync"
import { smsg }      from "./nucleo/message.js"
import db            from "./nucleo/system/database.js"
import optimizer     from './nucleo/system/optimizer.js'
import subBotManager from './nucleo/subbotManager.js'
import healthCheck   from './nucleo/system/healthCheck.js'
import { pruneGroupCache } from './nucleo/utils.js'   
import { exec }      from "child_process"

const log = {
  info:    (msg) => console.log(chalk.bgBlue.white.bold('INFO'),    chalk.white(msg)),
  success: (msg) => console.log(chalk.bgGreen.white.bold('SUCCESS'), chalk.greenBright(msg)),
  warn:    (msg) => console.log(chalk.bgYellowBright.blueBright.bold('WARNING'), chalk.yellow(msg)),
  warning: (msg) => console.log(chalk.bgYellowBright.red.bold('WARNING'), chalk.yellow(msg)),
  error:   (msg) => console.log(chalk.bgRed.white.bold('ERROR'),    chalk.redBright(msg)),
}

const methodCodeQR = process.argv.includes("--qr")
const methodCode   = process.argv.includes("code")
const DIGITS       = (s = "") => String(s).replace(/\D/g, "")

function normalizePhoneForPairing(input) {
  let s = DIGITS(input)
  if (!s) return ""
  if (s.startsWith("0")) s = s.replace(/^0+/, "")
  if (s.length === 10 && s.startsWith("3")) s = "57" + s
  if (s.startsWith("52") && !s.startsWith("521") && s.length >= 12) s = "521" + s.slice(2)
  if (s.startsWith("54") && !s.startsWith("549") && s.length >= 11) s = "549" + s.slice(2)
  return s
}

let phoneNumber = global.botNumber || ""
let phoneInput  = ""


const { say } = cfonts
console.log(chalk.magentaBright('\n💙 Iniciando 01'))
say('Hatsune\nMiku',        { align: 'center', gradient: ['red', 'blue'] })
say('Made by (ㅎㅊDEPOOLㅊㅎ)', { font: 'console', align: 'center', gradient: ['blue', 'magenta'] })

if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true })


let isCleaning = false
const yield_ = () => new Promise(r => setImmediate(r))  

async function cleanCache() {
  if (isCleaning) return
  isCleaning = true
  try {
    const tmpFolders = ['./tmp', './tmp-descargas', './channel-audios']
    let cleanedTmp = 0
    for (const tmpFolder of tmpFolders) {
      if (!fs.existsSync(tmpFolder)) continue
      const files = await fs.promises.readdir(tmpFolder)
      for (let i = 0; i < files.length; i++) {
        if (i % 10 === 0) await yield_()   
        try {
          const filePath = path.join(tmpFolder, files[i])
          const stat     = await fs.promises.stat(filePath)
          if (stat.size > 10 * 1024 * 1024 || Date.now() - stat.mtimeMs > 10 * 60 * 1000) {
            await fs.promises.unlink(filePath)
            cleanedTmp++
          }
        } catch {}
      }
    }
    if (cleanedTmp > 0) log.info(`Cache temporal: ${cleanedTmp} archivos basura eliminados`)

    const sessionsFolder = './Sessions'
    if (fs.existsSync(sessionsFolder)) {
      let cleanedSessions = 0
      let yieldCounter    = 0
      const cleanSessionsRecursive = async (dir) => {
        const files = await fs.promises.readdir(dir)
        for (const file of files) {
          yieldCounter++
          if (yieldCounter % 10 === 0) await yield_()   
          const filePath = path.join(dir, file)
          const stat     = await fs.promises.stat(filePath)
          if (stat.isDirectory()) {
            await cleanSessionsRecursive(filePath)
          } else if (
            file !== 'creds.json' &&
            (file.startsWith('pre-key-') || file.startsWith('sender-key-') || file.startsWith('session-') || file.startsWith('app-state-')) &&
            (Date.now() - stat.mtimeMs > 2 * 60 * 60 * 1000)
          ) {
            try { await fs.promises.unlink(filePath); cleanedSessions++ } catch {}
          }
        }
      }
      await cleanSessionsRecursive(sessionsFolder)
      if (cleanedSessions > 0) log.warn(`Optimización: ${cleanedSessions} llaves antiguas eliminadas`)
    }

    pruneGroupCache()

  } catch (e) {
    console.error(chalk.red('Error en cleanCache: '), e)
  } finally {
    isCleaning = false
  }
}


let opcion
if (methodCodeQR) {
  opcion = "1"
} else if (methodCode) {
  opcion = "2"
} else if (!fs.existsSync("./Sessions/Owner/creds.json")) {
  opcion = readlineSync.question(
    chalk.bold.white("\nSeleccione una opción:\n") +
    chalk.blueBright("1. Con código QR\n") +
    chalk.cyan("2. Con código de texto de 8 dígitos\n--> ")
  )
  while (!/^[1-2]$/.test(opcion)) {
    console.log(chalk.bold.redBright("No se permiten numeros que no sean 1 o 2, tampoco letras o símbolos especiales."))
    opcion = readlineSync.question("--> ")
  }
  if (opcion === "2") {
    console.log(chalk.bold.redBright(
      `\nPor favor, Ingrese el número de WhatsApp.\n${chalk.bold.yellowBright("Ejemplo: +57301******")}\n${chalk.bold.magentaBright('---> ')}`
    ))
    phoneInput  = readlineSync.question("")
    phoneNumber = normalizePhoneForPairing(phoneInput)
  }
}


let reconexion = 0
const intentos = 15


const _sendQueue = []
let _processing = false


let _msgSlots = 0
let _prioritySlots = 0
const _MSG_LIMIT = 6
const _PRIORITY_LIMIT = 2

const _acquireSlot = async (isPriority = false) => {
  if (isPriority) {
    while (_prioritySlots >= _PRIORITY_LIMIT) {
      await new Promise(r => setTimeout(r, 30))
    }
    _prioritySlots++
    _msgSlots++
    return 'priority'
  }
  while (_msgSlots >= _MSG_LIMIT) {
    await new Promise(r => setTimeout(r, 50))
  }
  _msgSlots++
  return 'normal'
}

const _releaseSlot = (type = 'normal') => {
  _msgSlots = Math.max(0, _msgSlots - 1)
  if (type === 'priority') {
    _prioritySlots = Math.max(0, _prioritySlots - 1)
  }
}

export { _acquireSlot, _releaseSlot }

async function processQueue() {
  if (_processing) return
  _processing = true

  while (_sendQueue.length) {
    const { fn, resolve, reject } = _sendQueue.shift()
    try {
      resolve(await fn())
    } catch (e) {
      reject(e)
    }

    await Promise.resolve()
    processQueue()
  }

  _processing = false
}

function enqueueMsg(fn) {
  return new Promise((resolve, reject) => {
    _sendQueue.push({ fn, resolve, reject })
    processQueue()
  })
}


async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)

  if (!global.baileysVersion) {
    const { version } = await fetchLatestBaileysVersion()
    global.baileysVersion = version
  }
  const version = global.baileysVersion

  const logger = pino({ level: "silent" })
  console.info  = () => {}
  console.debug = () => {}

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal:          false,
    browser:                    Browsers.macOS('Chrome'),
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, logger),
    },
    markOnlineOnConnect:        false,
    generateHighQualityLinkPreview: false,
    syncFullHistory:            false,
    getMessage:                 async () => "",
    keepAliveIntervalMs:        60_000,
    maxIdleTimeMs:              120_000,
  })

  global.client = sock
  sock.isInit   = false
  sock.ev.on("creds.update", saveCreds)

  
  const _origSendMessage = sock.sendMessage.bind(sock)
  sock.sendMessage = (jid, content, options) =>
    enqueueMsg(() => _origSendMessage(jid, content, options))
  

  if (opcion === "2" && !fs.existsSync("./Sessions/Owner/creds.json")) {
    setTimeout(async () => {
      try {
        if (!state.creds.registered) {
          const pairing  = await global.client.requestPairingCode(phoneNumber)
          const codeBot  = pairing?.match(/.{1,4}/g)?.join("-") || pairing
          console.log(chalk.bold.white(chalk.bgMagenta("Código de emparejamiento:")), chalk.bold.white(codeBot))
        }
      } catch (err) {
        console.log(chalk.red("Error al generar código:"), err)
      }
    }, 3000)
  }

  sock.sendText = (jid, text, quoted = "", options) =>
    sock.sendMessage(jid, { text, ...options }, { quoted })

  sock.ev.on("connection.update", async (update) => {
    const { qr, connection, lastDisconnect, isNewLogin, receivedPendingNotifications } = update

    if (qr && (opcion === '1' || methodCodeQR)) {
      console.log(chalk.green.bold("💙 Escanea este código QR"))
      qrcode.generate(qr, { small: true })
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode || 0
      if (reason === DisconnectReason.loggedOut) {
        log.warning("Escanee nuevamente y ejecute...")
        exec("rm -rf ./Sessions/Owner/*")
        process.exit(1)
      } else if (reason === DisconnectReason.forbidden) {
        log.error("Error de conexión, escanee nuevamente...")
        exec("rm -rf ./Sessions/Owner/*")
        process.exit(1)
      } else if (reason === DisconnectReason.multideviceMismatch) {
        log.warning("Inicia nuevamente")
        exec("rm -rf ./Sessions/Owner/*")
        process.exit(0)
      } else if (reason === DisconnectReason.connectionReplaced) {
        log.warning("Primero cierre la sesión actual...")
        return
      } else {
        reconexion++
        if (reconexion > intentos) {
          log.error(`Demasiados reintentos (${intentos}). Reinicia el proceso manualmente.`)
          process.exit(1)
        }
        const delay = Math.min(3000 * reconexion, 30_000)
        if      (reason === DisconnectReason.connectionLost)   log.warning("Se perdió la conexión al servidor, intentando reconectar...")
        else if (reason === DisconnectReason.connectionClosed) log.warning("Conexión cerrada, intentando reconectarse...")
        else if (reason === DisconnectReason.restartRequired)  log.warning("Es necesario reiniciar...")
        else if (reason === DisconnectReason.timedOut)         log.warning("Tiempo de conexión agotado, reconectando...")
        else if (reason === DisconnectReason.badSession)       log.warning("Eliminar sesión y escanear nuevamente...")
        else                                                   log.warning(`Desconexión (${reason}), reconectando...`)
        setTimeout(startBot, delay)
      }
    }

    if (connection === "open") {
      reconexion = 0
      const userName = sock.user.name || "Desconocido"
      console.log(chalk.green.bold(`💙 Conectado a: ${userName}`))

     
      if (!healthCheck._started) {
        healthCheck._started = true
        healthCheck.start()
      }

      if (!optimizer.active) {
        optimizer.start()
        optimizer.registerSession('owner', 'Owner', { userName })
      }

      setTimeout(async () => {
        try {
          if (!subBotManager.initialized) {
            await subBotManager.initializeAll()
            subBotManager.startHealthCheck()
            console.log(chalk.cyan('💙 Sistema de subbots inicializado'))
          }
        } catch (err) {
          console.error(chalk.red('💙 Error inicializando subbots:'), err.message)
        }
      }, 10_000)
    }

    if (isNewLogin) log.info("Nuevo dispositivo detectado")
    if (receivedPendingNotifications === true) {
      log.warn("Por favor espere aproximadamente 1 minuto...")
      sock.ev.flush()
    }
  })

 
  sock.ev.on('messages.upsert', async (chatUpdate) => {
    if (chatUpdate.type !== 'notify') return
    for (const kay of chatUpdate.messages) {
      if (!kay?.message)                                  continue
      if (kay.key?.remoteJid === 'status@broadcast')      continue

      const sender = kay.key?.participant || kay.key?.remoteJid
      const senderNum = sender?.split('@')[0]?.replace(/\D/g, '')
      const isOwner = global.owner?.some(o => senderNum?.includes(String(o)))

      const slotType = await _acquireSlot(isOwner)
      healthCheck.recordMessage()
      
      ;(async () => {
        try {
          kay.message = Object.keys(kay.message)[0] === 'ephemeralMessage'
            ? kay.message.ephemeralMessage.message
            : kay.message
          const m = await smsg(sock, kay)
          if (m) {
            await main(sock, m, chatUpdate)
            healthCheck.recordCommand()
          }
        } catch (err) {
          healthCheck.recordError(err)
          const errorMsg = err?.message || 'Unknown error'
          if (!errorMsg.includes('rate-overlimit') && 
              !errorMsg.includes('timed out') && 
              !errorMsg.includes('Connection Closed') &&
              !errorMsg.includes('connection lost') &&
              !errorMsg.includes('rate_overlimit') &&
              !errorMsg.includes('429') &&
              !errorMsg.includes('Internal Server Error')) {
            console.log(chalk.red('[ERROR msg]'), errorMsg.slice(0, 100))
          }
        } finally {
          _releaseSlot(slotType)
        }
      })()
    }
  })

  try {
    await events(sock, null)
  } catch (err) {
    console.log(chalk.gray(`[ BOT ] → ${err}`))
  }

  sock.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {}
      return (decode.user && decode.server && `${decode.user}@${decode.server}`) || jid
    }
    return jid
  }
}


setInterval(cleanCache, 10 * 60 * 1000)
cleanCache()
setTimeout(cleanCache, 2 * 60 * 1000)


;(async () => {
  global.loadDatabase()
  console.log(chalk.gray('💙 Base de datos cargada correctamente.'))
  await startBot()
})()


process.on('uncaughtException', (err) => {
  const msg = err?.message || ''
  if (
    msg.includes('rate-overlimit') || msg.includes('timed out')     ||
    msg.includes('Connection Closed') || msg.includes('429')        ||
    msg.includes('Internal Server Error')
  ) return
  console.error(chalk.red('[uncaughtException]'), msg.slice(0, 120))
})

process.on('unhandledRejection', (reason) => {
  const msg      = String(reason?.message || reason || '')
  const lowerMsg = msg.toLowerCase()
  if (
    lowerMsg.includes('rate-overlimit')     || lowerMsg.includes('timed out')               ||
    lowerMsg.includes('timeout')            || lowerMsg.includes('connection closed')        ||
    lowerMsg.includes('connection lost')    || lowerMsg.includes('etimeout')                 ||
    lowerMsg.includes('enoent')             || lowerMsg.includes('no such file or directory') ||
    lowerMsg.includes('404')               || lowerMsg.includes('request failed')            ||
    lowerMsg.includes('no sessions')       || lowerMsg.includes('unsupported state')         ||
    lowerMsg.includes('bad mac')           || lowerMsg.includes('enospc')                    ||
    lowerMsg.includes('enotfound')         || lowerMsg.includes('eai_again')                 ||
    lowerMsg.includes('fetch failed')      || lowerMsg.includes('not-acceptable')            ||
    lowerMsg.includes('conflict')          || lowerMsg.includes('internal server error')     ||
    lowerMsg.includes('429')
  ) return
  console.error(chalk.red('[unhandledRejection]'), msg.slice(0, 120))
})