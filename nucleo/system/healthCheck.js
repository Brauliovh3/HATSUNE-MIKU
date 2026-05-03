import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

class HealthCheck {
  constructor() {
    this.stats = {
      totalMessages: 0,
      totalCommands: 0,
      errors: 0,
      lastError: null,
      startTime: Date.now(),
      reconnections: 0
    };
    this.timeouts = new Map();
    this.intervals = new Map();
    this.lastPing = Date.now();
    this.isHealthy = true;
  }

  start() {
    
    this.schedule('gallery-cleanup', () => this.cleanGallerySessions(), 3 * 60 * 1000);
    
    this.schedule('stats-cleanup', () => this.cleanOldStats(), 15 * 60 * 1000);
    
    this.schedule('connection-check', () => this.checkConnection(), 2 * 60 * 1000);
    
    this.schedule('download-cleanup', () => this.cleanStuckDownloads(), 3 * 60 * 1000);
    
    this.schedule('baileys-cleanup', () => this.cleanBaileysStores(), 5 * 60 * 1000);
    
    this.schedule('db-cleanup', () => this.cleanDatabaseCache(), 10 * 60 * 1000);
    
    this.schedule('gc-cleanup', () => this.forceGC(), 5 * 60 * 1000);
    
    this.schedule('memory-check', () => this.checkMemory(), 20 * 1000);
    
    this.schedule('subbot-cleanup', () => this.cleanDisconnectedSubbots(), 60 * 1000);
    
    console.log(chalk.green('✅ Health Check iniciado (versión optimizada)'));
  }

  schedule(name, fn, interval) {
    if (this.intervals.has(name)) {
      clearInterval(this.intervals.get(name));
    }
    
    const timer = setInterval(async () => {
      try {
        await fn();
      } catch (err) {
        console.error(chalk.red(`[HealthCheck] Error en ${name}:`), err.message);
      }
    }, interval);
    
    this.intervals.set(name, timer);
    
    const result = fn();
    if (result && typeof result.catch === 'function') {
      result.catch(() => {});
    }
  }

  cleanGallerySessions() {
    if (!global.gallerySessions) return;
    
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, session] of global.gallerySessions) {
      
      if (session.lastAccess && (now - session.lastAccess) > 30 * 60 * 1000) {
        global.gallerySessions.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(chalk.yellow(`[HealthCheck] ${cleaned} sesiones de galería limpiadas`));
    }
  }

  cleanOldStats() {
    if (!global.db?.data?.users) return;
    
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let cleaned = 0;
    
    for (const userId in global.db.data.users) {
      const user = global.db.data.users[userId];
      if (user.stats) {
        for (const date in user.stats) {
          if (date < thirtyDaysAgo) {
            delete user.stats[date];
            cleaned++;
          }
        }
      }
    }
    
    if (cleaned > 0) {
      console.log(chalk.yellow(`[HealthCheck] ${cleaned} estadísticas antiguas limpiadas`));
    }
  }

  checkConnection() {
    const client = global.client;
    
    if (!client) {
      this.isHealthy = false;
      return;
    }
    
    
    if (client.ws?.readyState === 1) {
      this.isHealthy = true;
      this.lastPing = Date.now();
    } else {
      
      if (this.isHealthy) {
        console.log(chalk.yellow('[HealthCheck] WebSocket desconectado, esperando reconexión natural...'));
      }
      this.isHealthy = false;
    }
  }

  cleanStuckDownloads() {
    if (!global.activeYouTubeDownloads) return;
    
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, download] of global.activeYouTubeDownloads) {
     
      if ((now - download.startedAt) > 10 * 60 * 1000) {
        global.activeYouTubeDownloads.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(chalk.yellow(`[HealthCheck] ${cleaned} descargas atascadas limpiadas`));
    }
  }

  forceGC() {
    if (global.gc) {
      try {
        global.gc();
        console.log(chalk.green('[HealthCheck] Garbage Collection ejecutado'));
      } catch (err) {
        console.error(chalk.red('[HealthCheck] Error en GC:'), err.message);
      }
    }
  }

  checkMemory() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const rssMB = memUsage.rss / 1024 / 1024;
    const externalMB = memUsage.external / 1024 / 1024;

    global.memoryStats = {
      rss: rssMB.toFixed(2),
      heapUsed: heapUsedMB.toFixed(2),
      heapTotal: heapTotalMB.toFixed(2),
      external: externalMB.toFixed(2)
    };

    if (rssMB > 1400 || heapUsedMB > 700) {
      console.log(chalk.red(`[HealthCheck] Memoria CRÍTICA: RSS ${rssMB.toFixed(2)}MB, Heap ${heapUsedMB.toFixed(2)}MB, External ${externalMB.toFixed(2)}MB`));

      this.emergencyCleanup();

      if (rssMB > 1800) {
        console.log(chalk.red('[HealthCheck] Memoria insostenible, reinicio necesario'));
      }
    } else if (rssMB > 1000 || heapUsedMB > 500) {
      console.log(chalk.yellow(`[HealthCheck] Alta memoria: RSS ${rssMB.toFixed(2)}MB, Heap ${heapUsedMB.toFixed(2)}MB`));

      this.aggressiveCleanup();
    } else if (rssMB > 700 || heapUsedMB > 350) {
      this.standardCleanup();
    }
  }

  emergencyCleanup() {
    console.log(chalk.red('[HealthCheck] Ejecutando limpieza de EMERGENCIA...'));

    if (global.gallerySessions) {
      const count = global.gallerySessions.size;
      global.gallerySessions.clear();
      console.log(chalk.yellow(`[HealthCheck] ${count} sesiones de galería eliminadas`));
    }

    this.cleanStuckDownloads();
    this.cleanBaileysStores();
    this.cleanDatabaseCache();

    if (global.client?.chats && global.client.chats.size > 30) {
      const chats = global.client.chats;
      const now = Date.now();
      let deleted = 0;
      const entries = Array.from(chats.entries());
      for (let i = 0; i < entries.length && deleted < 100; i++) {
        const [jid, chat] = entries[i];
        const lastMsgTime = chat?.lastMessage?.messageTimestamp
          ? chat.lastMessage.messageTimestamp * 1000
          : 0;
        if (now - lastMsgTime > 24 * 60 * 60 * 1000) {
          chats.delete(jid);
          deleted++;
        }
      }
      if (deleted > 0) console.log(chalk.gray(`[HealthCheck] ${deleted} chats antiguos eliminados`));
    }

    if (global.activeYouTubeDownloads) {
      global.activeYouTubeDownloads.clear();
    }

    this.forceGC();
  }

  aggressiveCleanup() {
    if (global.gallerySessions && global.gallerySessions.size > 10) {
      this.cleanGallerySessions();
    }
    this.cleanStuckDownloads();
    this.cleanBaileysStores();
    this.forceGC();
  }

  standardCleanup() {
    if (global.gallerySessions && global.gallerySessions.size > 20) {
      this.cleanGallerySessions();
    }
    this.forceGC();
  }

  cleanBaileysStores() {
    const client = global.client;
    if (!client) return;

    let cleaned = 0;

    // Clean old chats - more aggressive
    try {
      if (client.chats && client.chats.size > 50) {
        const now = Date.now();
        let deleted = 0;
        for (const [jid, chat] of client.chats) {
          if (!chat || deleted >= 100) continue;
          const lastMsgTime = chat?.lastMessage?.messageTimestamp
            ? chat.lastMessage.messageTimestamp * 1000
            : 0;
        
          if (now - lastMsgTime > 6 * 60 * 60 * 1000) {
            client.chats.delete(jid);
            deleted++;
          }
        }
        cleaned += deleted;
      }
    } catch {}

   
    try {
      if (client.contacts && client.contacts.size > 300) {
        let deleted = 0;
        const entries = Array.from(client.contacts.entries());
       
        for (let i = 0; i < entries.length - 300 && deleted < 300; i++) {
          client.contacts.delete(entries[i][0]);
          deleted++;
        }
        cleaned += deleted;
      }
    } catch {}
    
    // Clean message cache if exists
    try {
      if (client.msgs && client.msgs.size > 100) {
        let deleted = 0;
        const entries = Array.from(client.msgs.entries());
        for (let i = 0; i < entries.length - 50 && deleted < 100; i++) {
          client.msgs.delete(entries[i][0]);
          deleted++;
        }
        cleaned += deleted;
      }
    } catch {}

    try {
      if (client.ev && typeof client.ev.flush === 'function') {
        client.ev.flush();
      }
    } catch {}

    if (cleaned > 0) {
      console.log(chalk.yellow(`[HealthCheck] ${cleaned} entradas de Baileys limpiadas`));
    }
  }

  cleanDisconnectedSubbots() {

    if (!global.conns) return;

    let cleaned = 0;
    const beforeCount = global.conns.length;
    for (let i = global.conns.length - 1; i >= 0; i--) {
      const conn = global.conns[i];
      const isInit = conn?.isInit;
      const hasWs = !!conn?.ws;
      const readyState = conn?.ws?.readyState;
      const shouldRemove = !conn || !isInit || !hasWs || readyState !== 1;
      console.log(`[HealthCheck] conn ${i}: isInit=${isInit} hasWs=${hasWs} readyState=${readyState} remove=${shouldRemove}`);
      if (shouldRemove) {
        global.conns.splice(i, 1);
        cleaned++;
      }
    }

    if (cleaned > 0 || beforeCount > 0) {
      console.log(chalk.yellow(`[HealthCheck] ${cleaned}/${beforeCount} subbots limpiados. Quedan: ${global.conns.length}`));
    }
  }

  cleanDatabaseCache() {
    if (!global.db?.data) return;

    let cleaned = 0;
    const now = Date.now();

    try {
      if (global.db.data.users) {
        const users = global.db.data.users;
        let inactiveCount = 0;
        for (const userId in users) {
          const user = users[userId];
          const lastActivity = user?.usedTime || user?.lastCmd || 0;
          if (now - lastActivity > 7 * 24 * 60 * 60 * 1000) {
            if (user.stats && Object.keys(user.stats).length > 7) {
              const sortedDates = Object.keys(user.stats).sort();
              const toKeep = sortedDates.slice(-7);
              for (const date of sortedDates) {
                if (!toKeep.includes(date)) {
                  delete user.stats[date];
                  cleaned++;
                }
              }
            }
            inactiveCount++;
          }
        }
      }
    } catch {}

    try {
      if (global.db.data.chats) {
        const chats = global.db.data.chats;
        for (const chatId in chats) {
          const chat = chats[chatId];
          if (chat?.users) {
            for (const userId in chat.users) {
              const user = chat.users[userId];
              if (user?.stats) {
                const dates = Object.keys(user.stats);
                if (dates.length > 14) {
                  const sortedDates = dates.sort();
                  const toKeep = sortedDates.slice(-14);
                  for (const date of sortedDates) {
                    if (!toKeep.includes(date)) {
                      delete user.stats[date];
                      cleaned++;
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch {}

    if (cleaned > 0) {
      console.log(chalk.yellow(`[HealthCheck] ${cleaned} estadísticas antiguas de DB limpiadas`));
    }
  }

  recordMessage() {
    this.stats.totalMessages++;
  }

  recordCommand() {
    this.stats.totalCommands++;
  }

  recordError(error) {
    this.stats.errors++;
    this.stats.lastError = {
      message: error?.message || 'Unknown error',
      stack: error?.stack?.split('\n')[0] || '',
      time: Date.now()
    };
  }

  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const memUsage = process.memoryUsage();
    
    return {
      ...this.stats,
      uptime: Math.floor(uptime / 1000),
      uptimeFormatted: this.formatUptime(uptime),
      isHealthy: this.isHealthy,
      lastPing: this.lastPing,
      memory: {
        rss: (memUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        external: (memUsage.external / 1024 / 1024).toFixed(2) + ' MB'
      }
    };
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  stop() {
    for (const [name, timer] of this.intervals) {
      clearInterval(timer);
    }
    this.intervals.clear();
    console.log(chalk.yellow('⚠️ Health Check detenido'));
  }
}

const healthCheck = new HealthCheck();

export default healthCheck;
export { HealthCheck };
