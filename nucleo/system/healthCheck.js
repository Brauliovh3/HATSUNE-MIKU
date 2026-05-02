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
    
    this.schedule('gallery-cleanup', () => this.cleanGallerySessions(), 5 * 60 * 1000);
    
   
    this.schedule('stats-cleanup', () => this.cleanOldStats(), 30 * 60 * 1000);
    
   
    this.schedule('connection-check', () => this.checkConnection(), 30 * 1000);
    
   
    this.schedule('download-cleanup', () => this.cleanStuckDownloads(), 5 * 60 * 1000);
    
    
    this.schedule('gc-cleanup', () => this.forceGC(), 10 * 60 * 1000);
    
    
    this.schedule('memory-check', () => this.checkMemory(), 60 * 1000);
    
    console.log(chalk.green('✅ Health Check iniciado'));
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
    
  
    fn().catch(() => {});
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
      console.log(chalk.red('[HealthCheck] Cliente no disponible'));
      this.isHealthy = false;
      return;
    }
    
    
    if (client.ws?.readyState !== 1) { 
      console.log(chalk.red('[HealthCheck] WebSocket no está conectado'));
      this.isHealthy = false;
      this.stats.reconnections++;
      
     
      if (client.ev?.emit) {
        try {
          client.ev.emit('connection.update', { 
            connection: 'close',
            lastDisconnect: { error: new Error('HealthCheck forced reconnect') }
          });
        } catch (err) {
          console.error(chalk.red('[HealthCheck] Error forzando reconexión:'), err.message);
        }
      }
    } else {
      this.isHealthy = true;
      this.lastPing = Date.now();
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
    const rssMB = memUsage.rss / 1024 / 1024;
    
    
    if (rssMB > 1024 || heapUsedMB > 512) {
      console.log(chalk.yellow(`[HealthCheck] Alta memoria detectada: RSS ${rssMB.toFixed(2)}MB, Heap ${heapUsedMB.toFixed(2)}MB`));
      
      
      if (global.gallerySessions) this.cleanGallerySessions();
      this.cleanStuckDownloads();
      this.forceGC();
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
