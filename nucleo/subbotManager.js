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


const reintentos = new Map();

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
    console.log(chalk.cyan(`💙 Sistema de subbots inicializado`));
  }

  async startSubBot(id) {
    
    const sessionId = String(id).replace(/\D/g, '') || id;
    const sessionFolder = `./Sessions/subbots/${sessionId}`;

    if (this.subbots.has(sessionId)) {
      console.log(chalk.gray(`💙 Subbot ${sessionId} ya existe, omitiendo...`));
      return;
    }

    if (this.startingSubbots.has(sessionId)) {
      console.log(chalk.gray(`💙 Subbot ${sessionId} ya está iniciando, omitiendo...`));
      return;
    }

    if (!fs.existsSync(sessionFolder) || !fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
      console.log(chalk.yellow(`💙 No se encontró sesión para ${sessionId}, omitiendo...`));
      return;
    }

    this.startingSubbots.add(sessionId);
    console.log(chalk.cyan(`💙 Iniciando subbot ${sessionId}...`));

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      const { version } = await fetchLatestBaileysVersion();

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
      sock._sessionId = sessionId; 
      sock.ev.on('creds.update', saveCreds);

      sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
          const decode = jidDecode(jid) || {};
          return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
        }
        return jid;
      };

      sock.ev.on('connection.update', async ({ connection, lastDisconnect, isNewLogin }) => {
        if (isNewLogin) sock.isInit = false;

        if (connection === 'open') {
          sock.uptime = Date.now();
          sock.isInit = true;
          sock.userId = cleanJid(sock.user?.id || '');
          const botDir = sock.userId + '@s.whatsapp.net';

         
          if (!global.db.data) global.db.data = {};
          if (!global.db.data.settings) global.db.data.settings = {};
          if (!global.db.data.settings[botDir]) global.db.data.settings[botDir] = {};
          global.db.data.settings[botDir].type = 'Sub';

         
          const alreadyInConns = global.conns.find(c => c._sessionId === sessionId || c.userId === sock.userId);
          if (!alreadyInConns) {
            global.conns.push(sock);
          } else {
            
            const idx = global.conns.findIndex(c => c._sessionId === sessionId || c.userId === sock.userId);
            if (idx !== -1) global.conns[idx] = sock;
          }

          
          reintentos.delete(sessionId);
          this.startingSubbots.delete(sessionId);

          
          this.subbots.set(sessionId, sock);

          console.log(chalk.green(`💙 Subbot conectado: ${sock.userId} (sesión: ${sessionId})`));
        }

        if (connection === 'close') {
          const reason = lastDisconnect?.error?.output?.statusCode
            ?? lastDisconnect?.error?.output?.payload?.statusCode
            ?? 0;

          console.log(chalk.yellow(`💙 Subbot ${sessionId} desconectado. Razón: ${reason}`));

         
          this.subbots.delete(sessionId);
          const connIdx = global.conns.findIndex(c => c._sessionId === sessionId);
          if (connIdx !== -1) global.conns.splice(connIdx, 1);

          
          if (this.startingSubbots.has(sessionId)) {
            console.log(chalk.gray(`💙 Subbot ${sessionId} ya está reiniciando, omitiendo reconexión duplicada`));
            return;
          }

          
          if ([401, 403].includes(reason)) {
            const intentos = reintentos.get(sessionId) || 0;
            if (intentos >= 3) {
              console.log(chalk.red(`💙 Subbot ${sessionId} falló 3 veces con error ${reason}. Eliminando sesión.`));
              try { fs.rmSync(sessionFolder, { recursive: true, force: true }); } catch {}
              reintentos.delete(sessionId);
              this.startingSubbots.delete(sessionId);
              return;
            }
            reintentos.set(sessionId, intentos + 1);
            console.log(chalk.yellow(`💙 Subbot ${sessionId} reintento ${intentos + 1}/3 por error ${reason}...`));
          }

          
          if (reason === DisconnectReason.loggedOut) {
            console.log(chalk.red(`💙 Subbot ${sessionId} cerró sesión. Eliminando.`));
            try { fs.rmSync(sessionFolder, { recursive: true, force: true }); } catch {}
            reintentos.delete(sessionId);
            this.startingSubbots.delete(sessionId);
            return;
          }

         
          const intentoActual = reintentos.get(sessionId) || 0;
          const delay = Math.min(5000 * (intentoActual + 1), 30000); 

          console.log(chalk.cyan(`💙 Reconectando ${sessionId} en ${delay / 1000}s... (intento ${intentoActual + 1})`));
          this.startingSubbots.add(sessionId);

          setTimeout(async () => {
            this.startingSubbots.delete(sessionId);
            await this.startSubBot(sessionId);
          }, delay);
        }
      });

      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const raw of messages) {
          if (!raw.message) continue;
          try {
            const m = await smsg(sock, raw);
            if (m && shouldProcessCommand(sock, m)) {
              main(sock, m, messages);
            }
          } catch (err) {
            console.error(`Error procesando mensaje en subbot ${sessionId}:`, err.message);
          }
        }
      });

      
      this.subbots.set(sessionId, sock);
      console.log(chalk.green(`💙 Subbot ${sessionId} iniciado, esperando conexión...`));

    } catch (err) {
      console.error(chalk.red(`Error iniciando subbot ${sessionId}:`), err.message);
      this.startingSubbots.delete(sessionId);
      this.subbots.delete(sessionId);

     
      const intentoActual = reintentos.get(sessionId) || 0;
      if (intentoActual < 5) {
        reintentos.set(sessionId, intentoActual + 1);
        const delay = Math.min(10000 * (intentoActual + 1), 60000);
        console.log(chalk.yellow(`💙 Reintentando arranque de ${sessionId} en ${delay / 1000}s...`));
        setTimeout(() => this.startSubBot(sessionId), delay);
      }
    }
  }

  async stopSubBot(sessionId) {
    const sock = this.subbots.get(sessionId);
    if (!sock) return;

    try {
      sock.ev.removeAllListeners();
      if (sock.ws) sock.ws.close();
      sock.isInit = false;
    } catch {}

    this.subbots.delete(sessionId);
    this.startingSubbots.delete(sessionId);
    reintentos.delete(sessionId);

   
    const idx = global.conns.findIndex(c => c._sessionId === sessionId);
    if (idx !== -1) global.conns.splice(idx, 1);

    console.log(chalk.yellow(`💙 Subbot ${sessionId} detenido`));
  }

  getStatus() {
    return {
      total: this.subbots.size,
      connected: global.conns?.length || 0,
      list: global.conns?.map(c => ({ id: c.userId || c._sessionId, connected: c.isInit })) || []
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