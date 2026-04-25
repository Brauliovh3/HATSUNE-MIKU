import { Browsers, makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, jidDecode } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import NodeCache from 'node-cache';
import main from '../main.js';
import { smsg } from './message.js';

if (!global.conns) global.conns = [];
const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
const userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
const groupCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });
let reintentos = {};
const cleanJid = (jid = '') => jid.replace(/:\d+/, '').split('@')[0];

const normalizeJid = (jid) => {
  if (!jid) return '';
  const clean = String(jid).split(':')[0].replace(/\D/g, '');
  return clean;
};

const shouldProcessCommand = (sock, m) => {
  if (!m.isGroup) return true;
  
  const chat = global.db?.data?.chats?.[m.chat] || {};
  const primaryBot = chat?.primaryBot;
  
  if (!primaryBot) return true;
  
  const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net' || '';
  const primaryDigits = normalizeJid(primaryBot);
  const currentDigits = normalizeJid(botJid);
  
  return primaryDigits === currentDigits;
};

class SubBotManager {
  constructor() {
    this.subbots = new Map();
    this.startingSubbots = new Set();
    this.initialized = false;
  }

  async initializeAll() {
    if (this.initialized) {
      console.log(chalk.gray(`💙 Sistema de subbots ya inicializado, omitiendo...`));
      return;
    }

    const subsPath = './Sessions/subbots';
    if (!fs.existsSync(subsPath)) {
      fs.mkdirSync(subsPath, { recursive: true });
      this.initialized = true;
      return;
    }

    const sessions = fs.readdirSync(subsPath).filter(dir => {
      return fs.existsSync(path.join(subsPath, dir, 'creds.json'));
    });

    console.log(chalk.cyan(`💙 Iniciando ${sessions.length} subbots...`));

    for (const sessionId of sessions) {
      await this.startSubBot(sessionId);
      await this.delay(5000);
    }

    this.initialized = true;
    console.log(chalk.cyan(`💙  Sistema de subbots inicializado`));
  }

  async startSubBot(id) {
    if (this.subbots.has(id)) {
      console.log(chalk.gray(`💙 Subbot ${id} ya existe en subbots, omitiendo...`));
      return;
    }

    if (this.startingSubbots.has(id)) {
      console.log(chalk.gray(`💙 Subbot ${id} ya está iniciando, omitiendo...`));
      return;
    }

    this.startingSubbots.add(id);
    console.log(chalk.cyan(`💙 Iniciando subbot ${id}...`));

    const sessionFolder = `./Sessions/subbots/${id}`;
    
    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      const { version } = await fetchLatestBaileysVersion();

      console.info = () => {};
      
      const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS('Chrome'),
        auth: state,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        getMessage: async () => '',
        msgRetryCounterCache,
        userDevicesCache,
        cachedGroupMetadata: async (jid) => groupCache.get(jid),
        version,
        keepAliveIntervalMs: 60000,
        maxIdleTimeMs: 120000,
      });

      sock.isInit = false;
      sock.ev.on('creds.update', saveCreds);

      sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
          let decode = jidDecode(jid) || {};
          return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
        } else return jid;
      };

      sock.ev.on('connection.update', async ({ connection, lastDisconnect, isNewLogin, qr }) => {
        if (isNewLogin) sock.isInit = false;
        
        if (connection === 'open') {
          sock.uptime = Date.now();
          sock.isInit = true;
          sock.userId = cleanJid(sock.user?.id?.split('@')[0]);
          const botDir = sock.userId + '@s.whatsapp.net';
          
          if (!global.db.data) global.db.data = {};
          if (!global.db.data.settings) global.db.data.settings = {};
          if (!global.db.data.settings[botDir]) {
            global.db.data.settings[botDir] = {};
          }
          global.db.data.settings[botDir].type = 'Sub';
          
          if (!global.conns.find((c) => c.userId === sock.userId)) {
            global.conns.push(sock);
          }

          delete reintentos[sock.userId || id];
          this.startingSubbots.delete(id);
          console.log(chalk.green(`💙 Subbot conectado: ${sock.userId}`));
        }

        if (connection === 'close') {
          const botId = sock.userId || id;
          const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.reason || 0;
          
          if (this.startingSubbots.has(botId)) {
            console.log(chalk.gray(`💙 Subbot ${botId} ya está iniciando en reconexión, omitiendo...`));
            return;
          }

          const intentos = reintentos[botId] || 0;
          reintentos[botId] = intentos + 1;
          
          if ([401, 403].includes(reason)) {
            if (intentos < 3) {
              console.log(chalk.yellow(`💙 Subbot ${botId} desconectado (código ${reason}) intento ${intentos}/3 → Reintentando...`));
              this.startingSubbots.add(botId);
              setTimeout(() => {
                this.subbots.delete(botId);
                this.startSubBot(botId);
              }, 5000);
            } else {
              console.log(chalk.red(`💙 Subbot ${botId} falló tras 3 intentos. Eliminando sesión.`));
              try {
                fs.rmSync(sessionFolder, { recursive: true, force: true });
              } catch (e) {
                console.error(`Error eliminando sesión:`, e);
              }
              delete reintentos[botId];
              this.startingSubbots.delete(botId);
              this.subbots.delete(botId);
            }
            return;
          }

          if ([DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.timedOut, DisconnectReason.connectionReplaced].includes(reason)) {
            this.startingSubbots.add(botId);
            setTimeout(() => {
              this.subbots.delete(botId);
              this.startSubBot(botId);
            }, 5000);
            return;
          }
          
          this.startingSubbots.add(botId);
          setTimeout(() => {
            this.subbots.delete(botId);
            this.startSubBot(botId);
          }, 5000);
        }
      });

      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const raw of messages) {
          if (!raw.message) continue;
          try {
            const m = await smsg(sock, raw);
            if (m) {
              if (shouldProcessCommand(sock, m)) {
                main(sock, m, messages);
              }
            }
          } catch (err) {
            console.error(`Error procesando mensaje:`, err.message);
          }
        }
      });

      this.subbots.set(id, sock);
      console.log(chalk.green(`💙 Subbot ${id} iniciado`));

    } catch (err) {
      console.error(chalk.red(`Error iniciando subbot ${id}:`), err.message);
      this.startingSubbots.delete(id);
    }
  }

  async stopSubBot(sessionId) {
    const sock = this.subbots.get(sessionId);
    if (!sock) return;

    try {
      sock.ev.removeAllListeners();
      if (sock.ws) {
        sock.ws.close();
      }
      sock.isConnected = false;
    } catch {}

    this.subbots.delete(sessionId);
    this.startingSubbots.delete(sessionId);
    console.log(chalk.yellow(`💙 Subbot ${sessionId} detenido`));
  }

  getStatus() {
    return {
      total: this.subbots.size,
      connected: global.conns?.length || 0,
      list: global.conns?.map(c => ({ id: c.userId, connected: c.isInit })) || []
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  startHealthCheck() {
    console.log(chalk.gray(`💙 Health check deshabilitado para evitar reconexiones múltiples`));
  }
}

const subBotManager = new SubBotManager();

export default subBotManager;
export { SubBotManager };
