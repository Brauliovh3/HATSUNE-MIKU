import { Browsers, makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, jidDecode } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import NodeCache from 'node-cache';
import main from '../main.js';
import { smsg } from './message.js';

class SubBotManager {
  constructor() {
    this.subbots = new Map();
    this.msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
    this.userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
    this.groupCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });
    this.maxRetries = 3;
    this.baseDelay = 5000;
    this.maxDelay = 60000;
    this.startingSubbots = new Set();
  }

  async initializeAll() {
    const subsPath = './Sessions/subbots';
    if (!fs.existsSync(subsPath)) {
      fs.mkdirSync(subsPath, { recursive: true });
      return;
    }

    const sessions = fs.readdirSync(subsPath).filter(dir => {
      return fs.existsSync(path.join(subsPath, dir, 'creds.json'));
    });

    console.log(chalk.cyan(`💙 Iniciando ${sessions.length} subbots...`));

    for (const sessionId of sessions) {
      await this.startSubBot(sessionId);
      await this.delay(3000);
    }
  }

  async startSubBot(sessionId) {
    if (this.subbots.has(sessionId)) {
      return;
    }

    if (this.startingSubbots.has(sessionId)) {
      return;
    }

    this.startingSubbots.add(sessionId);

    const sessionFolder = `./Sessions/subbots/${sessionId}`;
    
    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Safari'),
        auth: state,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        getMessage: async () => '',
        msgRetryCounterCache: this.msgRetryCounterCache,
        userDevicesCache: this.userDevicesCache,
        cachedGroupMetadata: async (jid) => this.groupCache.get(jid),
        keepAliveIntervalMs: 30000,
        maxIdleTimeMs: 300000,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        emitOwnEvents: true,
        fireInitQueries: true,
      });

      sock.userId = sessionId;
      sock.retryCount = 0;
      sock.lastConnected = null;
      sock.isConnected = false;

      this.setupEventHandlers(sock, sessionId, sessionFolder, state, saveCreds);
      
      this.subbots.set(sessionId, sock);
      console.log(chalk.green(`💙 Subbot ${sessionId} iniciado`));

    } catch (err) {
      console.error(chalk.red(`💙 Error iniciando subbot ${sessionId}:`), err.message);
      this.scheduleReconnect(sessionId);
    } finally {
      this.startingSubbots.delete(sessionId);
    }
  }

  setupEventHandlers(sock, sessionId, sessionFolder, state, saveCreds) {
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, isNewLogin } = update;

      if (connection === 'open') {
        sock.isConnected = true;
        sock.retryCount = 0;
        sock.lastConnected = Date.now();
        
        const cleanId = sock.user?.id?.split(':')[0] || sessionId;
        sock.userId = cleanId;
        
        console.log(chalk.green(`💙 Subbot conectado: ${cleanId}`));
        
        this.updateSubBotSettings(cleanId, 'Sub');
        
        if (global.db.data) {
          if (!global.db.data.subbots) global.db.data.subbots = {};
          global.db.data.subbots[cleanId] = {
            status: 'connected',
            connectedAt: new Date().toISOString(),
            lastPing: Date.now()
          };
        }
      }

      if (connection === 'close') {
        sock.isConnected = false;
        const reason = lastDisconnect?.error?.output?.statusCode || 0;
        
        const shouldReconnect = this.shouldReconnect(reason, sock.retryCount);
        
        if (shouldReconnect) {
          sock.retryCount++;
          const delay = Math.min(
            this.baseDelay * Math.pow(1.5, sock.retryCount),
            this.maxDelay
          );
          
          setTimeout(() => {
            this.reconnectSubBot(sessionId);
          }, delay);
        } else {
          this.subbots.delete(sessionId);
          console.log(chalk.red(`💙 Eliminando sesión problemática: ${sessionId}`));
          this.deleteSession(sessionFolder);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      
      for (const raw of messages) {
        if (!raw.message) continue;
        
        try {
          const m = await smsg(sock, raw);
          if (m) {
            main(sock, m, messages);
          }
        } catch (err) {
          console.error(`💙 Error procesando mensaje en ${sessionId}:`, err.message);
        }
      }
    });

    sock.ev.on('groups.upsert', async (groups) => {
      for (const group of groups) {
        this.groupCache.set(group.id, group);
      }
    });

    sock.ev.on('group-participants.update', async (update) => {
      const metadata = await sock.groupMetadata(update.id).catch(() => null);
      if (metadata) {
        this.groupCache.set(update.id, metadata);
      }
    });
  }

  shouldReconnect(reason, retryCount) {
    if (retryCount >= this.maxRetries) return false;
    
    const fatalCodes = [401, 403, 500];
    if (fatalCodes.includes(reason) && retryCount > 3) return false;
    
    return true;
  }

  async reconnectSubBot(sessionId) {
    const existing = this.subbots.get(sessionId);
    
    if (existing) {
      try {
        existing.ev.removeAllListeners();
        if (existing.ws) {
          existing.ws.close();
        }
      } catch {}
      
      this.subbots.delete(sessionId);
    }

    await this.delay(2000);
    await this.startSubBot(sessionId);
  }

  scheduleReconnect(sessionId) {
    setTimeout(() => {
      this.reconnectSubBot(sessionId);
    }, this.baseDelay);
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
    console.log(chalk.yellow(`💙 Subbot ${sessionId} detenido`));
  }

  deleteSession(sessionFolder) {
    try {
      if (fs.existsSync(sessionFolder)) {
        fs.rmSync(sessionFolder, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`💙 Error eliminando sesión:`, err.message);
    }
  }

  updateSubBotSettings(botId, type) {
    if (!global.db.data) return;
    if (!global.db.data.settings) global.db.data.settings = {};
    
    const botJid = botId.includes('@') ? botId : botId + '@s.whatsapp.net';
    if (!global.db.data.settings[botJid]) {
      global.db.data.settings[botJid] = {};
    }
    global.db.data.settings[botJid].type = type;
  }

  getStatus() {
    const status = {
      total: this.subbots.size,
      connected: 0,
      disconnected: 0,
      list: []
    };

    for (const [id, sock] of this.subbots) {
      const isConnected = sock.isConnected;
      if (isConnected) status.connected++;
      else status.disconnected++;
      
      status.list.push({
        id,
        connected: isConnected,
        userId: sock.userId,
        lastConnected: sock.lastConnected,
        retryCount: sock.retryCount
      });
    }

    return status;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  startHealthCheck() {
    setInterval(() => {
      for (const [id, sock] of this.subbots) {
        if (!sock.isConnected && sock.retryCount < this.maxRetries) {
          this.reconnectSubBot(id);
        }
      }
    }, 60000);
  }
}

const subBotManager = new SubBotManager();

export default subBotManager;
export { SubBotManager };
