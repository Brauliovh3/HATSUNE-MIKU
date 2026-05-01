import {
  makeWASocket, useMultiFileAuthState, Browsers,
  fetchLatestBaileysVersion, makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import NodeCache    from 'node-cache';
import pino         from 'pino';
import fs           from 'fs';
import path         from 'path';
import chalk        from 'chalk';
import qrcode       from 'qrcode';
import subBotManager from '../../nucleo/subbotManager.js';
 
const pendingSessions = new Map();
const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
const userDevicesCache     = new NodeCache({ stdTTL: 0, checkperiod: 0 });
 
const DIGITS = (s = '') => String(s).replace(/\D/g, '');
 
function normalizePhoneForPairing(input) {
  let s = DIGITS(input);
  if (!s) return '';
  if (s.startsWith('0'))  s = s.replace(/^0+/, '');
  if (s.length === 10 && s.startsWith('3'))                          s = '57'  + s;
  if (s.startsWith('52') && !s.startsWith('521') && s.length >= 12) s = '521' + s.slice(2);
  if (s.startsWith('54') && !s.startsWith('549') && s.length >= 11) s = '549' + s.slice(2);
  return s;
}
 
function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  if (minutes) return `${minutes} minuto${minutes > 1 ? 's' : ''}, ${seconds} segundo${seconds > 1 ? 's' : ''}`;
  return `${seconds} segundo${seconds > 1 ? 's' : ''}`;
}
 
const PERMANENT_ERRORS = new Set([401, 403, 405, 440]);
const cleanFolder = (folder) => {
  try { if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true }); } catch {}
};
 
 
const LINE  = `❖──────────────────────────❖`;
const LINE2 = `❖━━━━━━━━━━━━━━━━━━━━━━━━━━❖`;
 
const MSG = {
  codeInstructions: (usedPrefix) =>
    `꩜ *𝗩𝗜𝗡𝗖𝗨𝗟𝗔𝗖𝗜Ó𝗡 𝗣𝗢𝗥 𝗖Ó𝗗𝗜𝗚𝗢* ꩜\n` +
    `${LINE}\n\n` +
    `╭─ 🎤 *Hatsune Miku* te guía:\n` +
    `│\n` +
    `│  *①* Abre WhatsApp en tu teléfono\n` +
    `│  *②* Toca ⠿ → *Dispositivos vinculados*\n` +
    `│  *③* Toca *Vincular un dispositivo*\n` +
    `│  *④* Elige *Vincular con número de teléfono*\n` +
    `│  *⑤* Ingresa el código que recibirás 👇\n` +
    `│\n` +
    `╰─ ⏳ Generando tu código...\n\n` +
    `${LINE}\n` +
    `> 💙 *Miku Bot* · Para eliminar: *${usedPrefix}deletebot*`,
 
  qrInstructions: (usedPrefix) =>
    `꩜ *𝗩𝗜𝗡𝗖𝗨𝗟𝗔𝗖𝗜Ó𝗡 𝗣𝗢𝗥 𝗤𝗥* ꩜\n` +
    `${LINE}\n\n` +
    `╭─ 🎤 *Hatsune Miku* te guía:\n` +
    `│\n` +
    `│  *①* Abre WhatsApp en tu teléfono\n` +
    `│  *②* Toca ⠿ → *Dispositivos vinculados*\n` +
    `│  *③* Toca *Vincular un dispositivo*\n` +
    `│  *④* Apunta la cámara al QR de abajo 👇\n` +
    `│\n` +
    `╰─ ⚠️ No uses tu número personal principal\n\n` +
    `${LINE}\n` +
    `> 💙 *Miku Bot* · Para eliminar: *${usedPrefix}deletebot*`,
 
 
  pairingCode: (formattedCode) =>
    `*${formattedCode}*`,
 
  success: (userName, cleanId, usedPrefix) =>
    `✦ *𝗖𝗢𝗡𝗘𝗫𝗜Ó𝗡 𝗘𝗫𝗜𝗧𝗢𝗦𝗔* ✦\n` +
    `${LINE2}\n\n` +
    `╭─ 🎵 *¡Miku Miku Ooeeoo!*\n` +
    `│   Tu subbot se unió al escenario\n` +
    `│\n` +
    `│  👤 *Usuario ›* ${userName}\n` +
    `│  📱 *Número ›* ${cleanId}\n` +
    `│  💚 *Estado  ›* Activando...\n` +
    `│\n` +
    `╰─ 🌿 Listo en unos segundos\n\n` +
    `${LINE2}\n` +
    `> 💙 *Miku Bot* · Para desvincular: *${usedPrefix}deletebot*`,
 
  alreadyActive: (sessionId, usedPrefix) =>
    `✦ *𝗦𝗨𝗕𝗕𝗢𝗧 𝗔𝗖𝗧𝗜𝗩𝗢* ✦\n` +
    `${LINE}\n\n` +
    `╭─ 🎵 ¡Ya eres parte del escenario!\n` +
    `│\n` +
    `│  📱 *Número ›* ${sessionId}\n` +
    `│  💙 *Estado  ›* Conectado ✓\n` +
    `│\n` +
    `╰─ 🌿 Todo en orden\n\n` +
    `${LINE}\n` +
    `> ⚠️ Para eliminar usa *${usedPrefix}deletebot*`,
 
  reconnecting: (sessionId) =>
    `꩜ *𝗥𝗘𝗖𝗢𝗡𝗘𝗖𝗧𝗔𝗡𝗗𝗢* ꩜\n` +
    `${LINE}\n\n` +
    `╭─ 🎙️ Afinando micrófonos...\n` +
    `│\n` +
    `│  🔄 *Sesión ›* ${sessionId}\n` +
    `│  ⏳ *Estado  ›* Reconectando\n` +
    `│\n` +
    `╰─ 🌿 Espera unos segundos\n\n` +
    `${LINE}\n` +
    `> 💙 *Miku Bot*`,
 
  disconnected: (usedPrefix) =>
    `꩜ *𝗗𝗘𝗦𝗖𝗢𝗡𝗘𝗖𝗧𝗔𝗗𝗢* ꩜\n` +
    `${LINE}\n\n` +
    `╭─ 🎙️ La conexión se perdió\n` +
    `│\n` +
    `╰─ 💡 Usa *${usedPrefix}deletebot* y vuelve a intentarlo\n\n` +
    `${LINE}\n` +
    `> 💙 *Miku Bot*`,
 
  pending: (usedPrefix) =>
    `꩜ *𝗦𝗢𝗟𝗜𝗖𝗜𝗧𝗨𝗗 𝗣𝗘𝗡𝗗𝗜𝗘𝗡𝗧𝗘* ꩜\n` +
    `${LINE}\n\n` +
    `╭─ 🎵 ¡Miku ya está procesando tu solicitud!\n` +
    `│\n` +
    `╰─ 💡 Usa *${usedPrefix}deletebot* para cancelarla\n\n` +
    `${LINE}\n` +
    `> 💙 *Miku Bot*`,
 
  cooldown: (remaining) =>
    `꩜ *𝗘𝗦𝗣𝗘𝗥𝗔* ꩜\n` +
    `${LINE}\n\n` +
    `╭─ 🎵 ¡Miku necesita un respiro!\n` +
    `│\n` +
    `│  ⏳ *Tiempo ›* ${remaining}\n` +
    `│\n` +
    `╰─ 🌿 Inténtalo de nuevo después\n\n` +
    `${LINE}\n` +
    `> 💙 *Miku Bot*`,
 
  full: () =>
    `꩜ *𝗦𝗜𝗦𝗧𝗘𝗠𝗔 𝗟𝗟𝗘𝗡𝗢* ꩜\n` +
    `${LINE}\n\n` +
    `╭─ 🎵 ¡Miku no tiene más espacio!\n` +
    `│\n` +
    `│  🚫 *Límite máximo alcanzado*\n` +
    `│\n` +
    `╰─ 🌿 Intenta más tarde\n\n` +
    `${LINE}\n` +
    `> 💙 *Miku Bot*`,
 
  timeout: (usedPrefix) =>
    `꩜ *𝗧𝗜𝗘𝗠𝗣𝗢 𝗔𝗚𝗢𝗧𝗔𝗗𝗢* ꩜\n` +
    `${LINE}\n\n` +
    `╭─ ⏰ ¡Te demoraste mucho!\n` +
    `│\n` +
    `│  🌿 La solicitud expiró\n` +
    `│\n` +
    `╰─ 💡 Intenta de nuevo: *${usedPrefix}sub*\n\n` +
    `${LINE}\n` +
    `> 💙 *Miku Bot*`,
 
  errorCode: (errMsg, usedPrefix) =>
    `✘ *𝗘𝗥𝗥𝗢𝗥 𝗗𝗘 𝗖Ó𝗗𝗜𝗚𝗢* ✘\n` +
    `${LINE}\n\n` +
    `╭─ 🎙️ Miku tuvo un problema\n` +
    `│\n` +
    `│  🌿 *Detalle ›* ${errMsg}\n` +
    `│\n` +
    `╰─ 💡 Intenta de nuevo: *${usedPrefix}sub*\n\n` +
    `${LINE}\n` +
    `> 💙 *Miku Bot*`,
 
  errorConnection: (reason, usedPrefix) =>
    `✘ *𝗘𝗥𝗥𝗢𝗥 𝗗𝗘 𝗖𝗢𝗡𝗘𝗫𝗜Ó𝗡* ✘\n` +
    `${LINE}\n\n` +
    `╭─ 🎙️ Miku no pudo conectar tu subbot\n` +
    `│\n` +
    `│  🌿 *Código ›* ${reason}\n` +
    `│\n` +
    `╰─ 💡 Intenta de nuevo: *${usedPrefix}sub*\n\n` +
    `${LINE}\n` +
    `> 💙 *Miku Bot*`,
 
  errorInternal: (errMsg) =>
    `✘ *𝗘𝗥𝗥𝗢𝗥 𝗜𝗡𝗧𝗘𝗥𝗡𝗢* ✘\n` +
    `${LINE}\n\n` +
    `╭─ 🎙️ Error inesperado\n` +
    `│\n` +
    `│  🌿 *Detalle ›* ${errMsg}\n` +
    `│\n` +
    `╰─ 💙 *Miku Bot*`,
};
 

 
export default {
  command: ['sub', 'vincular', 'conectar', 'code', 'qr', 'serbot--code', 'serbot-code', 'botcode'],
  category: 'subbots',
 
  run: async (client, m, args, usedPrefix, command) => {
    const isQR = /^(qr)$/i.test(command);
 
   
    if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = {};
    const lastSubTime = global.db.data.users[m.sender].Subs || 0;
    const cooldown    = 120_000;
    if (new Date() - lastSubTime < cooldown) {
      const remaining = msToTime(cooldown - (new Date() - lastSubTime));
      return m.reply(MSG.cooldown(remaining));
    }
 
   
    const subsPath  = './Sessions/subbots';
    const subsCount = fs.existsSync(subsPath)
      ? fs.readdirSync(subsPath).filter(dir =>
          fs.existsSync(path.join(subsPath, dir, 'creds.json'))
        ).length
      : 0;
    if (subsCount >= 50) return m.reply(MSG.full());
 
    
    const rawPhone      = m.sender.split('@')[0].replace(/\D/g, '');
    const phoneNumber   = normalizePhoneForPairing(rawPhone);
    const sessionId     = rawPhone;
    const sessionFolder = `./Sessions/subbots/${sessionId}`;
 
    
    if (fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
      if (subBotManager.subbots?.has(sessionId)) {
        return m.reply(MSG.alreadyActive(sessionId, usedPrefix));
      }
      try {
        await subBotManager.startSubBot(sessionId);
        return m.reply(MSG.reconnecting(sessionId));
      } catch {
        return m.reply(MSG.disconnected(usedPrefix));
      }
    }
 
    
    if (pendingSessions.has(sessionId)) return m.reply(MSG.pending(usedPrefix));
 
    cleanFolder(sessionFolder);
    fs.mkdirSync(sessionFolder, { recursive: true });
    await m.react('⏳');
 
    let done           = false;
    let reconnectCount = 0;
    const MAX_RECONNECT = 5;
 
    const finish = (success) => {
      if (done) return;
      done = true;
      pendingSessions.delete(sessionId);
      if (!success) cleanFolder(sessionFolder);
    };
 
    const silentClose = (s) => {
      try { s?.ev?.removeAllListeners(); }  catch {}
      try { if (s?.ws?.readyState !== 3) s?.ws?.close(); } catch {}
    };
 
   
    const buildSocket = async () => {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      const version = global.baileysVersion || (await fetchLatestBaileysVersion()).version;
      const logger  = pino({ level: 'silent' });
      const sock    = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,   
        browser: Browsers.macOS('Chrome'),
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        markOnlineOnConnect:        false,
        generateHighQualityLinkPreview: false,
        syncFullHistory:            false,
        getMessage:                 async () => '',
        keepAliveIntervalMs:        30_000,
        connectTimeoutMs:           60_000,
        defaultQueryTimeoutMs:      60_000,
      });
      sock.ev.on('creds.update', saveCreds);
      return sock;
    };
 
    try {
      let sock = await buildSocket();
      pendingSessions.set(sessionId, { sock, startTime: Date.now() });
 
      const attachEvents = (currentSock) => {
        currentSock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
          if (done) return;
 
         
          if (qr && isQR) {
            try {
              const qrBuffer = await qrcode.toBuffer(qr, { scale: 8 });
              await client.sendMessage(m.chat, {
                image:   qrBuffer,
                caption: MSG.qrInstructions(usedPrefix),
                ...global.miku
              }, { quoted: m });
            } catch {}
            return;
          }
 
          
          if (connection === 'open') {
            const cleanId  = currentSock.user?.id?.split(':')[0]?.split('@')[0] || sessionId;
            const userName = currentSock.user?.name || 'Usuario';
 
            finish(true);
            global.db.data.users[m.sender].Subs = Date.now();
 
            setTimeout(async () => {
              try { await subBotManager.startSubBot(sessionId); }
              catch (e) { console.error(chalk.red(`Error iniciando subbot ${sessionId}:`), e.message); }
            }, 3000);
 
            await client.sendMessage(m.chat, {
              text: MSG.success(userName, cleanId, usedPrefix),
              ...global.miku
            }, { quoted: m });
 
            await m.react('✅');
            return;
          }
 
          
          if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
                        ?? lastDisconnect?.error?.output?.payload?.statusCode
                        ?? 0;
 
            console.log(chalk.yellow(`💙 Socket pairing ${sessionId} cerrado. Razón: ${reason}`));
 
            if (PERMANENT_ERRORS.has(reason)) {
              finish(false);
              silentClose(currentSock);
              await m.react('❌');
              await client.sendMessage(m.chat, {
                text: MSG.errorConnection(reason, usedPrefix),
                ...global.miku
              }).catch(() => {});
              return;
            }
 
            reconnectCount++;
            if (reconnectCount > MAX_RECONNECT) {
              finish(false);
              silentClose(currentSock);
              await client.sendMessage(m.chat, {
                text: MSG.errorConnection(`max reintentos (${MAX_RECONNECT})`, usedPrefix),
                ...global.miku
              }).catch(() => {});
              return;
            }
 
            const delay = Math.min(2000 * reconnectCount, 10_000);
            silentClose(currentSock);
 
            setTimeout(async () => {
              if (done) return;
              if (!fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
                finish(false);
                return;
              }
              try {
                sock = await buildSocket();
                pendingSessions.set(sessionId, { sock, startTime: Date.now() });
                attachEvents(sock);
                console.log(chalk.cyan(`💙 Reconexión ${sessionId} (${reconnectCount}/${MAX_RECONNECT})`));
              } catch (err) {
                console.error(chalk.red(`💙 Error reconectando ${sessionId}:`), err.message);
                finish(false);
              }
            }, delay);
          }
        });
      };
 
      attachEvents(sock);
 
      
      if (!isQR) {
        ;(async () => {
          try {
            await new Promise(r => setTimeout(r, 3000));
            if (done) return;
 
            
            await client.sendMessage(m.chat, {
              text: MSG.codeInstructions(usedPrefix),
              ...global.miku
            }, { quoted: m });
 
            const { state } = await useMultiFileAuthState(sessionFolder);
            if (!state.creds.registered) {
              const code          = await sock.requestPairingCode(phoneNumber);
              const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
              if (done) return;
 
              
              await client.sendMessage(m.chat, {
                text: MSG.pairingCode(formattedCode),
                ...global.miku
              }, { quoted: m });
            }
          } catch (err) {
            if (done) return;
            finish(false);
            silentClose(sock);
            await m.react('❌');
            await client.sendMessage(m.chat, {
              text: MSG.errorCode(err.message, usedPrefix),
              ...global.miku
            }).catch(() => {});
          }
        })();
      }
 
     
      setTimeout(() => {
        if (done) return;
        finish(false);
        silentClose(sock);
        m.react('⏰');
        client.sendMessage(m.chat, {
          text: MSG.timeout(usedPrefix),
          ...global.miku
        }).catch(() => {});
      }, 120_000);
 
    } catch (err) {
      finish(false);
      await m.react('❌');
      m.reply(MSG.errorInternal(err.message));
    }
  },
};