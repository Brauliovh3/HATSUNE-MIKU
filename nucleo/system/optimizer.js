import os from 'os';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import NodeCache from 'node-cache';
import chalk from 'chalk';

const execAsync = promisify(exec);

class SystemOptimizer {
  constructor() {
    this.stats = {
      cleanups: 0,
      memoryFreed: 0,
      sessionsCleaned: 0,
      prekeysRotated: 0,
      lastCleanup: null
    };
    
    this.limits = {
      memoryThreshold: 85,
      diskThreshold: 90,
      sessionMaxAge: 24 * 60 * 60 * 1000,
      prekeyBatchSize: 50,
      tmpMaxAge: 30 * 60 * 1000,
      tmpMaxSize: 10 * 1024 * 1024
    };
    
    this.timers = new Map();
    this.active = false;
    this.sessionRegistry = new Map();
    this.prekeyRegistry = new Map();
    
    this.cache = new NodeCache({ 
      stdTTL: 300, 
      checkperiod: 60,
      useClones: false 
    });
  }

  start() {
    if (this.active) return;
    this.active = true;
    
    console.log(chalk.cyanBright('[ 🔧 Optimizador ] Sistema de optimización iniciado'));
    
    this.schedule('memory-check', () => this.checkMemory(), 30000);
    this.schedule('tmp-cleanup', () => this.cleanTempFiles(), 5 * 60000);
    this.schedule('session-cleanup', () => this.cleanSessions(), 10 * 60000);
    this.schedule('prekey-rotation', () => this.rotatePrekeys(), 15 * 60000);
    this.schedule('aggressive-cleanup', () => this.aggressiveCleanup(), 30 * 60000);
    this.schedule('stats-report', () => this.printStats(), 60 * 60000);
    
    this.checkMemory();
    this.cleanTempFiles();
    this.cleanSessions();
  }

  stop() {
    this.active = false;
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    console.log(chalk.yellow('[ 🔧 Optimizador ] Sistema detenido'));
  }

  schedule(name, fn, interval) {
    if (this.timers.has(name)) {
      clearInterval(this.timers.get(name));
    }
    fn();
    const timer = setInterval(() => {
      if (this.active) fn().catch(() => {});
    }, interval);
    this.timers.set(name, timer);
  }

  async checkMemory() {
    try {
      const memUsage = process.memoryUsage();
      const systemMem = os.totalmem();
      const freeMem = os.freemem();
      const usedPercent = ((systemMem - freeMem) / systemMem) * 100;
      
      global.memoryStats = {
        rss: (memUsage.rss / 1024 / 1024).toFixed(2),
        heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
        external: (memUsage.external / 1024 / 1024).toFixed(2),
        systemUsed: usedPercent.toFixed(1)
      };
      
      if (usedPercent > this.limits.memoryThreshold) {
        console.log(chalk.yellow(`[ 🔧 Optimizador ] Memoria alta: ${usedPercent.toFixed(1)}%`));
        await this.aggressiveCleanup();
        
        if (global.gc) {
          global.gc();
          console.log(chalk.gray('[ 🔧 Optimizador ] Garbage collector ejecutado'));
        }
      }
      
      if (memUsage.rss > 512 * 1024 * 1024) {
        this.optimizeCache();
      }
    } catch {}
  }

  async cleanTempFiles() {
    let cleaned = 0;
    let freed = 0;
    
    const tmpDirs = [
      './tmp',
      './temp',
      os.tmpdir(),
      path.join(process.cwd(), 'Sessions', 'temp')
    ];
    
    for (const dir of tmpDirs) {
      try {
        if (!fs.existsSync(dir)) continue;
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          try {
            const stat = fs.statSync(fullPath);
            const age = Date.now() - stat.mtimeMs;
            const size = stat.size;
            
            const shouldDelete = 
              age > this.limits.tmpMaxAge ||
              size > this.limits.tmpMaxSize ||
              entry.name.endsWith('.tmp') ||
              entry.name.startsWith('tmp-');
            
            if (shouldDelete) {
              if (stat.isDirectory()) {
                fs.rmSync(fullPath, { recursive: true, force: true });
              } else {
                fs.unlinkSync(fullPath);
              }
              cleaned++;
              freed += size;
            }
          } catch {}
        }
      } catch {}
    }
    
    this.cache.flushStats();
    
    if (cleaned > 0) {
      this.stats.cleanups++;
      this.stats.memoryFreed += freed;
      console.log(chalk.gray(`[ 🔧 Optimizador ] Temp limpio: ${cleaned} archivos (${(freed/1024/1024).toFixed(2)} MB)`));
    }
  }

  async cleanSessions() {
    const sessionDirs = [
      './Sessions/Owner',
      './Sessions/Subs'
    ];
    
    let cleaned = 0;
    
    for (const dir of sessionDirs) {
      try {
        if (!fs.existsSync(dir)) continue;
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          
          const sessionPath = path.join(dir, entry.name);
          const credsPath = path.join(sessionPath, 'creds.json');
          
          try {
            if (!fs.existsSync(credsPath)) {
              fs.rmSync(sessionPath, { recursive: true, force: true });
              cleaned++;
              continue;
            }
            
            const stat = fs.statSync(credsPath);
            const age = Date.now() - stat.mtimeMs;
            
            if (age > this.limits.sessionMaxAge) {
              const sessionId = entry.name;
              const conn = global.conns?.find(c => c.userId === sessionId);
              
              if (!conn || !conn.ws || conn.ws.readyState !== 1) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                cleaned++;
                
                const idx = global.conns?.findIndex(c => c.userId === sessionId);
                if (idx > -1) global.conns.splice(idx, 1);
              }
            }
            
            await this.cleanSessionFiles(sessionPath);
            
          } catch {}
        }
      } catch {}
    }
    
    if (cleaned > 0) {
      this.stats.sessionsCleaned += cleaned;
      console.log(chalk.gray(`[ 🔧 Optimizador ] Sesiones limpias: ${cleaned}`));
    }
  }

  async cleanSessionFiles(sessionPath) {
    const filesToClean = [
      'app-state-sync-key',
      'sender-key',
      'session-'
    ];
    
    try {
      const files = fs.readdirSync(sessionPath);
      let cleaned = 0;
      
      for (const file of files) {
        const filePath = path.join(sessionPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) continue;
        
        const shouldClean = filesToClean.some(prefix => file.includes(prefix));
        const isOld = (Date.now() - stat.mtimeMs) > 7 * 24 * 60 * 60 * 1000;
        
        if (shouldClean && isOld && !file.includes('creds')) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }
      
      return cleaned;
    } catch {
      return 0;
    }
  }

  async rotatePrekeys() {
    const sessionDirs = [
      './Sessions/Owner',
      './Sessions/Subs'
    ];
    
    let rotated = 0;
    
    for (const dir of sessionDirs) {
      try {
        if (!fs.existsSync(dir)) continue;
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          
          const sessionPath = path.join(dir, entry.name);
          const prekeyPath = path.join(sessionPath, 'pre-key.json');
          
          try {
            if (fs.existsSync(prekeyPath)) {
              const stat = fs.statSync(prekeyPath);
              
              if ((Date.now() - stat.mtimeMs) > 24 * 60 * 60 * 1000) {
                const prekeys = JSON.parse(fs.readFileSync(prekeyPath, 'utf8'));
                
                if (prekeys && prekeys.length > this.limits.prekeyBatchSize) {
                  const trimmed = prekeys.slice(-this.limits.prekeyBatchSize);
                  fs.writeFileSync(prekeyPath, JSON.stringify(trimmed));
                  rotated++;
                }
              }
            }
          } catch {}
        }
      } catch {}
    }
    
    if (rotated > 0) {
      this.stats.prekeysRotated += rotated;
      console.log(chalk.gray(`[ 🔧 Optimizador ] Prekeys rotadas: ${rotated}`));
    }
  }

  async aggressiveCleanup() {
    console.log(chalk.cyan('[ 🔧 Optimizador ] Limpieza agresiva iniciada'));
    
    await this.cleanTempFiles();
    
    try {
      if (global.client?.ev?.flush) {
        global.client.ev.flush();
      }
    } catch {}
    
    try {
      for (const conn of global.conns || []) {
        if (conn?.ev?.flush) {
          conn.ev.flush();
        }
      }
    } catch {}
    
    this.cache.flushAll();
    
    try {
      const { stdout } = await execAsync('npm cache verify 2>nul || true');
    } catch {}
    
    this.stats.lastCleanup = Date.now();
    console.log(chalk.green('[ 🔧 Optimizador ] Limpieza agresiva completada'));
  }

  optimizeCache() {
    const keys = this.cache.keys();
    if (keys.length > 1000) {
      const toDelete = keys.slice(0, keys.length - 500);
      this.cache.del(toDelete);
      console.log(chalk.gray(`[ 🔧 Optimizador ] Cache optimizada: ${toDelete.length} entradas eliminadas`));
    }
  }

  registerSession(sessionId, type, metadata = {}) {
    this.sessionRegistry.set(sessionId, {
      type,
      created: Date.now(),
      lastActivity: Date.now(),
      metadata
    });
  }

  unregisterSession(sessionId) {
    this.sessionRegistry.delete(sessionId);
  }

  updateSessionActivity(sessionId) {
    const session = this.sessionRegistry.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  getInactiveSessions(threshold = 30 * 60000) {
    const inactive = [];
    const now = Date.now();
    
    for (const [id, session] of this.sessionRegistry) {
      if ((now - session.lastActivity) > threshold) {
        inactive.push(id);
      }
    }
    
    return inactive;
  }

  printStats() {
    const mem = global.memoryStats || {};
    console.log(chalk.blueBright('\n[ 📊 Stats Optimizador ]'));
    console.log(chalk.white(`  Limpiezas: ${this.stats.cleanups}`));
    console.log(chalk.white(`  Memoria liberada: ${(this.stats.memoryFreed / 1024 / 1024).toFixed(2)} MB`));
    console.log(chalk.white(`  Sesiones limpiadas: ${this.stats.sessionsCleaned}`));
    console.log(chalk.white(`  Prekeys rotadas: ${this.stats.prekeysRotated}`));
    console.log(chalk.white(`  Memoria actual: RSS ${mem.rss || 'N/A'} MB`));
    console.log(chalk.white(`  Sesiones activas: ${this.sessionRegistry.size}`));
    console.log(chalk.white(`  Conexiones: ${global.conns?.length || 0}\n`));
  }

  getStats() {
    return {
      ...this.stats,
      activeSessions: this.sessionRegistry.size,
      connections: global.conns?.length || 0,
      memory: global.memoryStats || {}
    };
  }
}

const optimizer = new SystemOptimizer();

export default optimizer;
export { SystemOptimizer };
