import { makeWASocket, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import qrcode from 'qrcode';
import subBotManager from '../../nucleo/subbotManager.js';

const pendingSessions = new Map();
const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
const userDevicesCache  = new NodeCache({ stdTTL: 0, checkperiod: 0 });

const DIGITS = (s = "") => String(s).replace(/\D/g, "");

function normalizePhoneForPairing(input) {
  let s = DIGITS(input);
  if (!s) return "";
  if (s.startsWith("0")) s = s.replace(/^0+/, "");
  if (s.length === 10 && s.startsWith("3")) s = "57" + s;
  if (s.startsWith("52") && !s.startsWith("521") && s.length >= 12) s = "521" + s.slice(2);
  if (s.startsWith("54") && !s.startsWith("549") && s.length >= 11) s = "549" + s.slice(2);
  return s;
}

function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes > 0 ? minutes : '';
  seconds = seconds < 10 && minutes > 0 ? '0' + seconds : seconds;
  if (minutes) {
    return `${minutes} minuto${minutes > 1 ? 's' : ''}, ${seconds} segundo${seconds > 1 ? 's' : ''}`;
  } else {
    return `${seconds} segundo${seconds > 1 ? 's' : ''}`;
  }
}

const PERMANENT_ERRORS = new Set([401, 403, 405, 440]);

const cleanFolder = (folder) => {
  try { if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true }); } catch {}
};

export default {
  command: ['sub', 'vincular', 'conectar', 'code', 'qr', 'serbot--code', 'serbot-code', 'botcode'],
  category: 'subbots',
  run: async (client, m, args, usedPrefix, command) => {
    const isQR = /^(qr)$/i.test(command);
    const divider = `╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌`;
    const rtx = `💙 *S U B B O T   -   C O D E* 💙\n${divider}\n\n🎵 *Instrucciones para vincular:*\n\n🌿 *1.* Toca los 3 puntos en la esquina superior derecha de tu WhatsApp.\n🌿 *2.* Toca en *Dispositivos vinculados*.\n🌿 *3.* Toca en *Vincular un dispositivo*.\n🌿 *4.* Selecciona *Vincular con el número de teléfono*.\n🌿 *5.* Ingresa el código que aparece abajo.\n\n${divider}\n⚠️ *Nota:* Este código es de un solo uso.\n\n🎵 *Hatsune Miku* 💙 *Bot* 🎵`;
    const rtx2 = `💙 *S U B B O T   -   Q R* 💙\n${divider}\n\n🎵 *Instrucciones para vincular:*\n\n🌿 *1.* Toca los 3 puntos en la esquina superior derecha de tu WhatsApp.\n🌿 *2.* Toca en *Dispositivos vinculados*.\n🌿 *3.* Toca en *Vincular un dispositivo*.\n🌿 *4.* Escanea este código QR con tu cámara.\n\n${divider}\n⚠️ *Nota:* No uses tu cuenta personal principal.\n\n🎵 *Hatsune Miku* 💙 *Bot* 🎵`;
    const caption = isQR ? rtx2 : rtx;
    if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = {};
    const lastSubTime = global.db.data.users[m.sender].Subs || 0;
    const cooldown = 120000;
    
    if (new Date() - lastSubTime < cooldown) {
      const remaining = msToTime(cooldown - (new Date() - lastSubTime));
      return m.reply(`💙 *E S P E R A* 💙\n${divider}\n\n🎵 ¡Miku necesita un respiro!\n🌿 Espera *${remaining}* antes de intentar subir otro subbot al escenario.\n\n${divider}\n🎵 *Hatsune Miku* 💙 *Bot* 🎵`, m, global.miku);
    }

    const subsPath = './Sessions/subbots';
    const subsCount = fs.existsSync(subsPath)
      ? fs.readdirSync(subsPath).filter((dir) => {
          const credsPath = path.join(subsPath, dir, 'creds.json');
          return fs.existsSync(credsPath);
        }).length : 0;
    const maxSubs = 50;
    
    if (subsCount >= maxSubs) {
      return m.reply(`💙 *S I S T E M A   L L E N O* 💙\n${divider}\n\n🎵 ¡Oh no! Miku ya no tiene más espacio para nuevos subbots en este momento.\n🌿 El límite máximo del host ha sido alcanzado.\n\n${divider}\n🎵 *Hatsune Miku* 💙 *Bot* 🎵`, m, global.miku);
    }

    const rawPhone      = m.sender.split('@')[0].replace(/\D/g, '');
    const phoneNumber   = normalizePhoneForPairing(rawPhone);
    const sessionId     = rawPhone;
    const sessionFolder = `./Sessions/subbots/${sessionId}`;

    if (fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
      if (subBotManager.subbots?.has(sessionId)) {
        return m.reply(
          `💙 *S U B B O T   A C T I V O* 💙\n${divider}\n\n🎵 ¡Ya eres parte del escenario de Miku!\n\n🌿 *Número:* ${sessionId}\n💙 *Estado:* Conectado y listo\n\n${divider}\n⚠️ *Nota:* Para eliminarlo usa *${usedPrefix}deletebot*\n\n🎵 *Hatsune Miku* 💙 *Bot* 🎵`,
          m, global.miku
        );
      }
      try {
        await subBotManager.startSubBot(sessionId);
        return m.reply(`💙 *R E C O N E C T A N D O* 💙\n${divider}\n\n🎵 ¡Afinando los micrófonos!\n🌿 Reconectando sesión: ${sessionId}\n⏳ Espera unos segundos por favor.\n\n${divider}\n🎵 *Hatsune Miku* 💙 *Bot* 🎵`, m, global.miku);
      } catch {
        return m.reply(`💙 *D E S C O N E C T A D O* 💙\n${divider}\n\n🎵 La conexión se ha perdido.\n🌿 Usa *${usedPrefix}deletebot* para limpiar tu escenario e intentar de nuevo.\n\n${divider}\n🎵 *Hatsune Miku* 💙 *Bot* 🎵`, m, global.miku);
      }
    }

    if (pendingSessions.has(sessionId)) {
      return m.reply(`💙 *E N   E S P E R A* 💙\n${divider}\n\n🎵 ¡Miku ya está procesando una solicitud tuya!\n🌿 Termina la actual o usa *${usedPrefix}deletebot* para cancelarla.\n\n${divider}\n🎵 *Hatsune Miku* 💙 *Bot* 🎵`, m, global.miku);
    }

    cleanFolder(sessionFolder);
    fs.mkdirSync(sessionFolder, { recursive: true });

    await m.react('⏳');

    let done            = false;   
    let codeRequested   = false;   
    let reconnecting    = false; 
    let reconnectCount  = 0;
    const MAX_RECONNECT = 5;

    const finish = (success) => {
      if (done) return;
      done = true;
      pendingSessions.delete(sessionId);
      if (!success) cleanFolder(sessionFolder);
    };

    const silentClose = (s) => {
      try { s?.ev?.removeAllListeners(); } catch {}
      try { if (s?.ws?.readyState !== 3) s?.ws?.close(); } catch {}
    };

    const buildSocket = async () => {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      const { version }          = await fetchLatestBaileysVersion();
      const logger               = pino({ level: 'silent' });
      const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: isQR,
        browser: Browsers.macOS('Chrome'),
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        getMessage: async () => '',
        keepAliveIntervalMs: 30_000,
        connectTimeoutMs:    60_000,
        defaultQueryTimeoutMs: 60_000,
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
            if (done) return;
            const qrBuffer = await qrcode.toBuffer(qr);
            await client.sendMessage(m.chat, {
              image: qrBuffer,
              caption: caption,
              ...global.miku
            }, { quoted: m });
            return;
          }

          if (connection === 'open') {
            const cleanId  = currentSock.user?.id?.split(':')[0]?.split('@')[0] || sessionId;
            const userName = currentSock.user?.name || 'Usuario';

            finish(true);
            global.db.data.users[m.sender].Subs = new Date() * 1;

            setTimeout(async () => {
              try { await subBotManager.startSubBot(sessionId); }
              catch (e) { console.error(chalk.red(`Error iniciando subbot ${sessionId}:`), e.message); }
            }, 3000);

            await client.sendMessage(m.chat, {
              text: ` *C O N E X I Ó N   E X I T O S A* 💙\n${divider}\n\n🎵 ¡Miku Miku Ooeeoo!\nTu subbot se ha unido al escenario.\n\n👤 *Usuario:* ${userName}\n📱 *Número:* ${cleanId}\n\n🌿 Tu subbot está activándose, en unos segundos estará listo para cantar.\n\n${divider}\n⚠️ *Nota:* Para desvincular usa *${usedPrefix}deletebot*\n\n🎵 *Hatsune Miku* 💙 *Bot* 🎵`,
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
                text: `❌ *E R R O R   D E   C O N E X I Ó N* ❌\n${divider}\n\n🎵 Miku no pudo conectar tu subbot.\n🌿 *Código:* ${reason}\n\n💡 Intenta de nuevo usando: *${usedPrefix}sub*\n\n${divider}\n🎵 *Hatsune Miku*  *Bot* 🎵`,
                ...global.miku
              }).catch(() => {});
              return;
            }

            reconnecting    = true;
            reconnectCount += 1;
            const delay     = Math.min(2000 * reconnectCount, 10_000);

            silentClose(currentSock);

            setTimeout(async () => {
              if (done) return;
              reconnecting = false;

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
                reconnectCount = MAX_RECONNECT; 
              }
            }, delay);
          }
        });
      };

      attachEvents(sock);

      ;(async () => {
        if (isQR) return;
        try {
          await new Promise(r => setTimeout(r, 3000));
          if (done) return;

          const { state } = await useMultiFileAuthState(sessionFolder);
          if (!state.creds.registered) {
            
           
            await client.sendMessage(m.chat, {
              text: caption,
              ...global.miku
            }, { quoted: m });
            
            await new Promise(r => setTimeout(r, 1500)); 
            if (done) return;
            
            const code          = await sock.requestPairingCode(phoneNumber);
            const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;

            if (done) return;

            codeRequested = true; 

            await client.sendMessage(m.chat, {
              text: formattedCode
            });
          }

        } catch (err) {
          if (done) return;
          finish(false);
          silentClose(sock);
          await m.react('❌');
          await client.sendMessage(m.chat, {
            text: `❌ *E R R O R   D E   C Ó D I G O* ❌\n${divider}\n\n🎵 Miku tuvo un problema al generar tu código.\n🌿 *Error:* ${err.message}\n\n💡 Intenta de nuevo usando: *${usedPrefix}sub*\n\n${divider}\n🎵 *Hatsune Miku* 💙 *Bot* 🎵`,
            ...global.miku
          }).catch(() => {});
        }
      })();

      setTimeout(() => {
        if (done) return;
        finish(false);
        silentClose(sock);
        m.react('⏰');
        client.sendMessage(m.chat, {
          text: `⏰ *T I E M P O   A G O T A D O* ⏰\n${divider}\n\n🎵 ¡Te has demorado mucho!\n🌿 La solicitud de vinculación ha expirado.\n\n💡 Intenta de nuevo usando: *${usedPrefix}sub*\n\n${divider}\n🎵 *Hatsune Miku*  *Bot* 🎵`,
          ...global.miku
        }).catch(() => {});
      }, 120_000);

    } catch (err) {
      finish(false);
      await m.react('❌');
      m.reply(`❌ *E R R O R   I N T E R N O* ❌\n${divider}\n\n🎵 Ocurrió un error inesperado al iniciar tu subbot.\n🌿 *Detalle:* ${err.message}\n\n${divider}\n🎵 *Hatsune Miku* 💙 *Bot* 🎵`, m, global.miku);
    }
  }
};