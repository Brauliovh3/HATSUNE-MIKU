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


const MSG = {
  codeInstructions: (usedPrefix) =>
    `🎤 *VINCULACIÓN POR CÓDIGO*\n\n` +
    `*①* Abre WhatsApp → ⠿ → *Dispositivos vinculados*\n` +
    `*②* Toca *Vincular un dispositivo*\n` +
    `*③* Elige *Vincular con número de teléfono*\n` +
    `*④* Ingresa el código que recibirás 👇\n\n` +
    `⏳ _Generando tu código..._\n\n` +
    `> 💙 *Miku Bot* · *${usedPrefix}deletebot* para eliminar`,

  qrInstructions: (usedPrefix) =>
    `📷 *VINCULACIÓN POR QR*\n\n` +
    `*①* Abre WhatsApp → ⠿ → *Dispositivos vinculados*\n` +
    `*②* Toca *Vincular un dispositivo*\n` +
    `*③* Apunta la cámara al QR de abajo 👇\n\n` +
    `⚠️ _No uses tu número personal principal_\n\n` +
    `> 💙 *Miku Bot* · *${usedPrefix}deletebot* para eliminar`,

  pairingCode: (formattedCode) =>
    `*${formattedCode}*`,

  success: (userName, cleanId, usedPrefix) =>
    `✅ *CONEXIÓN EXITOSA*\n\n` +
    `👤 *Usuario:* ${userName}\n` +
    `📱 *Número:* ${cleanId}\n` +
    `💚 *Estado:* Activando...\n\n` +
    `_Listo en unos segundos_ 🌿\n\n` +
    `> 💙 *Miku Bot* · *${usedPrefix}deletebot* para desvincular`,

  alreadyActive: (sessionId, usedPrefix) =>
    `💙 *SUBBOT ACTIVO*\n\n` +
    `📱 *Número:* ${sessionId}\n` +
    `✓ *Estado:* Conectado\n\n` +
    `> ⚠️ Para eliminar usa *${usedPrefix}deletebot*`,

  reconnecting: (sessionId) =>
    `🔄 *RECONECTANDO*\n\n` +
    `📱 *Sesión:* ${sessionId}\n` +
    `⏳ _Espera unos segundos..._\n\n` +
    `> 💙 *Miku Bot*`,

  disconnected: (usedPrefix) =>
    `⚠️ *DESCONECTADO*\n\n` +
    `La conexión se perdió.\n` +
    `Usa *${usedPrefix}deletebot* y vuelve a intentarlo.\n\n` +
    `> 💙 *Miku Bot*`,

  pending: (usedPrefix) =>
    `⏳ *SOLICITUD PENDIENTE*\n\n` +
    `Ya hay una solicitud en proceso.\n` +
    `Usa *${usedPrefix}deletebot* para cancelarla.\n\n` +
    `> 💙 *Miku Bot*`,

  cooldown: (remaining) =>
    `⏳ *ESPERA*\n\n` +
    `Tiempo restante: *${remaining}*\n\n` +
    `> 💙 *Miku Bot*`,

  full: () =>
    `🚫 *SISTEMA LLENO*\n\n` +
    `Se alcanzó el límite máximo de subbots.\n` +
    `Intenta más tarde.\n\n` +
    `> 💙 *Miku Bot*`,

  timeout: (usedPrefix) =>
    `⏰ *TIEMPO AGOTADO*\n\n` +
    `La solicitud expiró.\n` +
    `Intenta de nuevo con *${usedPrefix}sub*\n\n` +
    `> 💙 *Miku Bot*`,

  errorCode: (errMsg, usedPrefix) =>
    `❌ *ERROR DE CÓDIGO*\n\n` +
    `_${errMsg}_\n\n` +
    `Intenta de nuevo con *${usedPrefix}sub*\n\n` +
    `> 💙 *Miku Bot*`,

  errorConnection: (reason, usedPrefix) =>
    `❌ *ERROR DE CONEXIÓN*\n\n` +
    `Código: *${reason}*\n\n` +
    `Intenta de nuevo con *${usedPrefix}sub*\n\n` +
    `> 💙 *Miku Bot*`,

  errorInternal: (errMsg) =>
    `❌ *ERROR INTERNO*\n\n` +
    `_${errMsg}_\n\n` +
    `> 💙 *Miku Bot*`,
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