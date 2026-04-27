import { Browsers, makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, jidDecode, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import NodeCache from 'node-cache';
import main from '../main.js';
import { smsg } from './message.js';

if (!global.conns) global.conns = [];
const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
const userDevicesCache  = new NodeCache({ stdTTL: 0, checkperiod: 0 });
const groupCache        = new NodeCache({ stdTTL: 3600, checkperiod: 300 });
const reintentos        = new Map();

const cleanJid = (jid = '') => jid.replace(/:\d+/, '').split('@')[0];

const normalizeJid = (jid) => {
  if (!jid) return '';
  return String(jid).split(':')[0].replace(/\D/g, '');
};

const shouldProcessCommand = (sock, m) => {
  if (!m.isGroup) return true;
  const chat = global.db?.data?.chats?.[m.chat] || {};
  const primaryBot = chat?.primaryBot;
  if (!primaryBot) return true;
  const botJid = (sock.user?.id?.split(':')[0] || '') + '@s.whatsapp.net';
  return normalizeJid(primaryBot) === normalizeJid(botJid);
};

const removeFromConns = (sessionId) => {
  for (let i = global.conns.length - 1; i >= 0; i--) {
    if (global.conns[i]?._sessionId === sessionId) {
      global.conns.splice(i, 1);
    }
  }
};

const upsertConn = (sock, sessionId) => {
  removeFromConns(sessionId);
  const userId = sock.userId;
  if (userId) {
    for (let i = global.conns.length - 1; i >= 0; i--) {
      if (global.conns[i]?.userId === userId) global.conns.splice(i, 1);
    }
  }
  global.conns.push(sock);
};


class SubBotManager {
  constructor() {
    this.subbots         = new Map();
    this.startingSubbots = new Set();
    this.initialized     = false;
  }

  async initializeAll() {
    if (this.initialized) {
      console.log(chalk.gray('💙 Subbots ya inicializados, omitiendo...'));
      return;
    }
    const subsPath = './Sessions/subbots';
    if (!fs.existsSync(subsPath)) {
      fs.mkdirSync(subsPath, { recursive: true });
      this.initialized = true;
      return;
    }
    const sessions = fs.readdirSync(subsPath).filter(dir =>
      fs.existsSync(path.join(subsPath, dir, 'creds.json'))
    );
    console.log(chalk.cyan(`💙 Iniciando ${sessions.length} subbots...`));
    for (const sessionId of sessions) {
      await this.startSubBot(sessionId);
      await this.delay(2000);
    }
    this.initialized = true;
    console.log(chalk.cyan('💙 Sistema de subbots inicializado'));
  }

  async startSubBot(id) {
    const sessionId     = String(id).trim();
    const sessionFolder = `./Sessions/subbots/${sessionId}`;

    if (this.subbots.has(sessionId)) {
      return;
    }
    if (this.startingSubbots.has(sessionId)) {
      return;
    }
    if (!fs.existsSync(sessionFolder) || !fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
      return;
    }

    const credsPath = path.join(sessionFolder, 'creds.json');
    const stats = fs.statSync(credsPath);
    const isNewSession = (Date.now() - stats.mtimeMs) < 300000; 
    const maxRetries = isNewSession ? 2 : 5;

    this.startingSubbots.add(sessionId);

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      const { version } = await fetchLatestBaileysVersion();

      const logger = pino({ level: 'silent' });

      const connectionOptions = {
        logger,
        printQRInTerminal: false,
        browser: Browsers.macOS('Chrome'),
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        getMessage: async () => '',
        msgRetryCounterCache,
        userDevicesCache,
        cachedGroupMetadata: async (jid) => groupCache.get(jid),
        version,
        keepAliveIntervalMs: 25000,
        maxIdleTimeMs: 40000,
        connectTimeoutMs: 30000,
        defaultQueryTimeoutMs: 30000,
      };

      let sock = makeWASocket(connectionOptions);
      sock.isInit     = false;
      sock._sessionId = sessionId;

      sock.ev.on('creds.update', saveCreds);

      sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
          const decode = jidDecode(jid) || {};
          return (decode.user && decode.server && `${decode.user}@${decode.server}`) || jid;
        }
        return jid;
      };

      const reconectar = async () => {
        const oldChats = sock.chats;
        try { sock.ws.close(); } catch {}
        sock.ev.removeAllListeners();

        sock = makeWASocket({ ...connectionOptions }, { chats: oldChats });
        sock.isInit     = false;
        sock._sessionId = sessionId;
        sock.ev.on('creds.update', saveCreds);
        sock.decodeJid = (jid) => {
          if (!jid) return jid;
          if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return (decode.user && decode.server && `${decode.user}@${decode.server}`) || jid;
          }
          return jid;
        };
        attachEvents(sock);
      };

      const attachEvents = (sock) => {

        sock.ev.on('connection.update', async ({ connection, lastDisconnect, isNewLogin }) => {
          if (isNewLogin) sock.isInit = false;

          if (connection === 'open') {
            sock.uptime  = Date.now();
            sock.isInit  = true;
            sock.userId  = cleanJid(sock.user?.id || '');
            const botDir = sock.userId + '@s.whatsapp.net';

            if (!global.db.data)                       global.db.data          = {};
            if (!global.db.data.settings)              global.db.data.settings = {};
            if (!global.db.data.settings[botDir])      global.db.data.settings[botDir] = {};
            global.db.data.settings[botDir].type = 'Sub';

            upsertConn(sock, sessionId);
            reintentos.delete(sessionId);
            this.startingSubbots.delete(sessionId);
            this.subbots.set(sessionId, sock);

            console.log(chalk.green(`💙 Subbot conectado: ${sock.userId} (sesión: ${sessionId})`));
          }

          if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
              ?? lastDisconnect?.error?.output?.payload?.statusCode
              ?? 0;


            this.subbots.delete(sessionId);
            removeFromConns(sessionId);

            if (reason === 401 || reason === 405) {
              const intento = reintentos.get(sessionId) || 0;
              const credsPath = path.join(sessionFolder, 'creds.json');
              const stats = fs.existsSync(credsPath) ? fs.statSync(credsPath) : null;
              const isNewSession = stats ? (Date.now() - stats.mtimeMs) < 300000 : false;
              const maxRetries = isNewSession ? 2 : 5;

              if (intento >= maxRetries) {
                console.log(chalk.red(`\n┌──────────────────────────────────┐\n│ Sub-Bot (${sessionId}) cerrado. Credenciales no válidas después de ${intento} intentos (${reason}). Eliminando sesión.\n└──────────────────────────────────┘`));
                try { fs.rmSync(sessionFolder, { recursive: true, force: true }); } catch {}
                reintentos.delete(sessionId);
                this.startingSubbots.delete(sessionId);
                return;
              }
              console.log(chalk.yellow(`\n┌──────────────────────────────────┐\n│ Sub-Bot (${sessionId}) credenciales inválidas (${reason}). Reintentando (${intento + 1}/${maxRetries})...\n└──────────────────────────────────┘`));
              reintentos.set(sessionId, intento + 1);
              this.startingSubbots.add(sessionId);
              const delayMs = 5000 * (intento + 1);
              setTimeout(async () => {
                this.startingSubbots.delete(sessionId);
                if (fs.existsSync(sessionFolder) && fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
                  await this.startSubBot(sessionId);
                }
              }, delayMs);
              return;
            }

            if (reason === 403 || reason === DisconnectReason.loggedOut) {
              console.log(chalk.red(`\n┌──────────────────────────────────┐\n│ Sub-Bot (${sessionId}) cerrado o cuenta suspendida (${reason}). Eliminando.\n└──────────────────────────────────┘`));
              try { fs.rmSync(sessionFolder, { recursive: true, force: true }); } catch {}
              reintentos.delete(sessionId);
              this.startingSubbots.delete(sessionId);
              return;
            }

            if (reason === 440) {
              console.log(chalk.bold.magentaBright(`\n┌──────────────────────────────────┐\n│ Sub-Bot (${sessionId}) reemplazado por otra sesión activa.\n└──────────────────────────────────┘`));
              reintentos.delete(sessionId);
              this.startingSubbots.delete(sessionId);
              return;
            }

            if (!fs.existsSync(sessionFolder) || !fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
              reintentos.delete(sessionId);
              this.startingSubbots.delete(sessionId);
              return;
            }

            if ([428, 408, 500, 515].includes(reason)) {
              const etiqueta = {
                428: 'cierre inesperado',
                408: 'pérdida de conexión',
                500: 'conexión perdida',
                515: 'reinicio requerido',
              }[reason];

              console.log(chalk.bold.magentaBright(`\n┌──────────────────────────────────┐\n│ Sub-Bot (${sessionId}) ${etiqueta}. Razón: ${reason}. Reconectando...\n└──────────────────────────────────┘`));

              if (this.startingSubbots.has(sessionId)) return;
              this.startingSubbots.add(sessionId);

              try {
                await reconectar();
              } catch (err) {
                console.error(chalk.red(`💙 Error reconectando ${sessionId}:`), err.message);
                this.startingSubbots.delete(sessionId);
              }
              return;
            }

            if (this.startingSubbots.has(sessionId)) {
              return;
            }

            const intento = reintentos.get(sessionId) || 0;
            const delayMs = Math.min(3000 * (intento + 1), 15000);
            reintentos.set(sessionId, intento + 1);
            this.startingSubbots.add(sessionId);

            setTimeout(async () => {
              if (!fs.existsSync(sessionFolder) || !fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
                this.startingSubbots.delete(sessionId);
                reintentos.delete(sessionId);
                return;
              }
              this.startingSubbots.delete(sessionId);
              await this.startSubBot(sessionId);
            }, delayMs);
          }
        });

        const healthInterval = setInterval(() => {
          if (!sock.user) {
            clearInterval(healthInterval);
            try { sock.ws.close(); } catch {}
            sock.ev.removeAllListeners();
            removeFromConns(sessionId);
            this.subbots.delete(sessionId);
          }
        }, 30000);

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
          if (type !== 'notify') return;
          for (const raw of messages) {
            if (!raw.message) continue;
            try {
              const m = await smsg(sock, raw);
              if (m && shouldProcessCommand(sock, m)) main(sock, m, messages);
            } catch (err) {
              console.error(`Error en subbot ${sessionId}:`, err.message);
            }
          }
        });
      };

      attachEvents(sock);

      this.subbots.set(sessionId, sock);

    } catch (err) {
      console.error(chalk.red(`Error iniciando subbot ${sessionId}:`), err.message);
      this.startingSubbots.delete(sessionId);
      this.subbots.delete(sessionId);

      if (fs.existsSync(sessionFolder) && fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
        const intento = reintentos.get(sessionId) || 0;
        if (intento < 5) {
          reintentos.set(sessionId, intento + 1);
          const delayMs = Math.min(10000 * (intento + 1), 60000);
          setTimeout(() => this.startSubBot(sessionId), delayMs);
        }
      }
    }
  }

  async stopSubBot(sessionId) {
    const sock = this.subbots.get(sessionId);
    if (sock) {
      try { sock.ev.removeAllListeners(); } catch {}
      try { if (sock.ws) sock.ws.close(); } catch {}
      sock.isInit = false;
    }
    this.subbots.delete(sessionId);
    this.startingSubbots.delete(sessionId);
    reintentos.delete(sessionId);
    removeFromConns(sessionId);
    console.log(chalk.yellow(`💙 Subbot ${sessionId} detenido`));
  }

  getStatus() {
    for (let i = global.conns.length - 1; i >= 0; i--) {
      const c = global.conns[i];
      if (!c || !c._sessionId) { global.conns.splice(i, 1); continue; }
      if (!this.subbots.has(c._sessionId)) global.conns.splice(i, 1);
    }
    return {
      total:     this.subbots.size,
      connected: global.conns.length,
      list:      global.conns.map(c => ({ id: c.userId || c._sessionId, connected: !!c.isInit }))
    };
  }

  delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  startHealthCheck() {
    setInterval(async () => {
      const subsPath = './Sessions/subbots';
      if (!fs.existsSync(subsPath)) return;
      
      const sessions = fs.readdirSync(subsPath).filter(dir =>
        fs.existsSync(path.join(subsPath, dir, 'creds.json'))
      );
      
      for (const sessionId of sessions) {
        const sock = this.subbots.get(sessionId);
        
        if (!sock || !sock.isInit) {
          if (!this.startingSubbots.has(sessionId)) {
            await this.startSubBot(sessionId);
          }
        }
      }
    }, 60000);
  }
}

const subBotManager = new SubBotManager();
export default subBotManager;
export { SubBotManager };
