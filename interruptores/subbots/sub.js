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
    const rtx = '💙 *HATSUNE MIKU* 💙\n\n`💌` Vincula tu *cuenta* usando el *codigo.*\n\n> 💮 Sigue las *instrucciones*\n\n*›* Click en los *3 puntos*\n*›* Toque *dispositivos vinculados*\n*›* Vincular *nuevo dispositivo*\n*›* Selecciona *Vincular con el número de teléfono*\n\n💙 *`Importante`*\n> 📛 Este *Código* solo funciona en el *número que lo solicito*';
    const rtx2 = '💙 *HATSUNE MIKU* 💙\n\n`💌` Vincula tu *cuenta* usando *codigo qr.*\n\n> 💮 Sigue las *instrucciones*\n\n*›* Click en los *3 puntos*\n*›* Toque *dispositivos vinculados*\n*›* Vincular *nuevo dispositivo*\n*›* Escanea el código *QR.*\n\n> 💙 Recuerda que no es recomendable usar tu cuenta principal para registrar un socket.';
    const caption = isQR ? rtx2 : rtx;
    if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = {};
    const lastSubTime = global.db.data.users[m.sender].Subs || 0;
    const cooldown = 120000;
    
    if (new Date() - lastSubTime < cooldown) {
      const remaining = msToTime(cooldown - (new Date() - lastSubTime));
      return m.reply(`💙 Debes esperar *${remaining}* para volver a intentar vincular un subbot.`, m, global.miku);
    }

    const subsPath = './Sessions/subbots';
    const subsCount = fs.existsSync(subsPath)
      ? fs.readdirSync(subsPath).filter((dir) => {
          const credsPath = path.join(subsPath, dir, 'creds.json');
          return fs.existsSync(credsPath);
        }).length : 0;
    const maxSubs = 50;
    
    if (subsCount >= maxSubs) {
      return m.reply('💙 No se han encontrado espacios disponibles para registrar un subbot.', m, global.miku);
    }

    const rawPhone      = m.sender.split('@')[0].replace(/\D/g, '');
    const phoneNumber   = normalizePhoneForPairing(rawPhone);
    const sessionId     = rawPhone;
    const sessionFolder = `./Sessions/subbots/${sessionId}`;
<<<<<<< HEAD
=======
    const privatChat    = rawPhone + '@s.whatsapp.net';
>>>>>>> 8891118920c9db2f2a76d9d33896359c2957bfb6

    if (fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
      if (subBotManager.subbots?.has(sessionId)) {
        return m.reply(
          `💙 *Ya tienes un subbot activo*\n\n` +
          `📱 Número: ${sessionId}\n✅ Estado: Conectado\n\n` +
          `⚠️ Para eliminar usa: ${usedPrefix}deletebot`,
          m, global.miku
        );
      }
      try {
        await subBotManager.startSubBot(sessionId);
        return m.reply(`💙 Reconectando tu subbot...\n📱 ${sessionId}\n⏳ Espera unos segundos.`, m, global.miku);
      } catch {
        return m.reply(`💙 Sesión desconectada.\n⚠️ Usa ${usedPrefix}deletebot para limpiar e intentar de nuevo.`, m, global.miku);
      }
    }

    if (pendingSessions.has(sessionId)) {
      return m.reply(`⏳ Ya hay una vinculación en curso.\nEspera o usa ${usedPrefix}deletebot para cancelar.`, m, global.miku);
    }

    cleanFolder(sessionFolder);
    fs.mkdirSync(sessionFolder, { recursive: true });

    await m.react('⏳');

<<<<<<< HEAD
    await client.sendMessage(m.chat, {
      text:
        `╭━━━━━━━━━━━━━━━━━╮\n` +
        `│  💙 *HATSUNE MIKU*  │\n` +
        `╰━━━━━━━━━━━━━━━━━╯\n\n` +
        `🔐 Iniciando vinculación...\n\n` +
        `⏳ Generando código...`
    }, { quoted: m });


    let done            = false;   
    let codeRequested   = false;   
    let reconnecting    = false; 
    let reconnectCount  = 0;
    const MAX_RECONNECT = 5;
=======
    let sock = null;
    let done = false;
>>>>>>> 8891118920c9db2f2a76d9d33896359c2957bfb6

    const finish = (success) => {
      if (done) return;
      done = true;
      pendingSessions.delete(sessionId);
      if (!success) cleanFolder(sessionFolder);
    };

<<<<<<< HEAD

    const silentClose = (s) => {
      try { s?.ev?.removeAllListeners(); } catch {}
      try { if (s?.ws?.readyState !== 3) s?.ws?.close(); } catch {}
    };


    const buildSocket = async () => {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      const { version }          = await fetchLatestBaileysVersion();
      const sock = makeWASocket({
=======
    const closeSocket = () => {
      try { sock?.ev?.removeAllListeners(); } catch {}
      try { if (sock?.ws?.readyState !== 3) sock?.ws?.close(); } catch {}
    };

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      const { version }          = await fetchLatestBaileysVersion();
      const logger               = pino({ level: 'silent' });

      sock = makeWASocket({
>>>>>>> 8891118920c9db2f2a76d9d33896359c2957bfb6
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
<<<<<<< HEAD
        keepAliveIntervalMs: 30_000,
        connectTimeoutMs:    60_000,
        defaultQueryTimeoutMs: 60_000,
=======
        keepAliveIntervalMs: 45000,
        maxIdleTimeMs: 60000,
>>>>>>> 8891118920c9db2f2a76d9d33896359c2957bfb6
      });
      sock.ev.on('creds.update', saveCreds);
      return sock;
    };

<<<<<<< HEAD
    try {
      let sock = await buildSocket();
      pendingSessions.set(sessionId, { sock, startTime: Date.now() });


      const attachEvents = (currentSock) => {

        currentSock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
          if (done) return;


          if (connection === 'open') {
            const cleanId  = currentSock.user?.id?.split(':')[0]?.split('@')[0] || sessionId;
            const userName = currentSock.user?.name || 'Usuario';
            console.log(chalk.green(`💙 Subbot vinculado: ${cleanId}`));

            finish(true);

            setTimeout(async () => {
              try { await subBotManager.startSubBot(sessionId); }
              catch (e) { console.error(chalk.red(`Error iniciando subbot ${sessionId}:`), e.message); }
            }, 3000);

            await client.sendMessage(m.chat, {
              text:
                `╭━━━━━━━━━━━━━━━━━╮\n` +
                `│  💙 *HATSUNE MIKU*  │\n` +
                `╰━━━━━━━━━━━━━━━━━╯\n\n` +
                `✅ *¡Vinculación exitosa!*\n\n` +
                `👤 ${userName}\n` +
                `📱 ${cleanId}\n\n` +
                `🤖 Tu subbot está activándose...\n` +
                `⏳ En unos segundos estará listo\n\n` +
                `⚠️ Para desvincular: *${usedPrefix}deletebot*`
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
              console.log(chalk.red(`💙 Error permanente (${reason}) en pairing ${sessionId}. Cancelando.`));
              finish(false);
              silentClose(currentSock);
              await m.react('❌');
              await client.sendMessage(m.chat, {
                text:
                  `╭━━━━━━━━━━━━━━━━━╮\n` +
                  `│  💙 *HATSUNE MIKU*  │\n` +
                  `╰━━━━━━━━━━━━━━━━━╯\n\n` +
                  `❌ *Vinculación fallida*\n\n` +
                  `⚠️ Código: ${reason}\n\n` +
                  `💡 Intenta de nuevo con:\n*${usedPrefix}sub*`
              }).catch(() => {});
              return;
            }


            if (!codeRequested) {
              console.log(chalk.red(`💙 Pairing ${sessionId} cerrado antes de pedir código (${reason}). Cancelando.`));
              finish(false);
              silentClose(currentSock);
              await m.react('❌');
              await client.sendMessage(m.chat, {
                text:
                  `╭━━━━━━━━━━━━━━━━━╮\n` +
                  `│  💙 *HATSUNE MIKU*  │\n` +
                  `╰━━━━━━━━━━━━━━━━━╯\n\n` +
                  `❌ *Error al conectar*\n\n` +
                  `⚠️ Código: ${reason}\n\n` +
                  `💡 Intenta de nuevo con:\n*${usedPrefix}sub*`
              }).catch(() => {});
              return;
            }


            if (reconnecting || reconnectCount >= MAX_RECONNECT) {
              if (reconnectCount >= MAX_RECONNECT) {
                console.log(chalk.red(`💙 Máximo de reconexiones alcanzado para ${sessionId}. Cancelando.`));
                finish(false);
                silentClose(currentSock);
                await m.react('❌');
                await client.sendMessage(m.chat, {
                  text:
                    `╭━━━━━━━━━━━━━━━━━╮\n` +
                    `│  💙 *HATSUNE MIKU*  │\n` +
                    `╰━━━━━━━━━━━━━━━━━╯\n\n` +
                    `❌ *Vinculación fallida*\n\n` +
                    `No se pudo establecer conexión tras ${MAX_RECONNECT} intentos.\n\n` +
                    `💡 Intenta de nuevo con:\n*${usedPrefix}sub*`
                }).catch(() => {});
              }
              return;
            }

            reconnecting    = true;
            reconnectCount += 1;
            const delay     = Math.min(2000 * reconnectCount, 10_000);

            console.log(chalk.cyan(
              `💙 Reconexión de pairing ${sessionId} (intento ${reconnectCount}/${MAX_RECONNECT}) en ${delay / 1000}s...`
            ));

            silentClose(currentSock);

            setTimeout(async () => {
              if (done) return;
              reconnecting = false;


              if (!fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
                console.log(chalk.gray(`💙 Carpeta ${sessionId} eliminada durante espera, cancelando.`));
                finish(false);
                return;
              }

              try {

                sock = await buildSocket();
                pendingSessions.set(sessionId, { sock, startTime: Date.now() });
                attachEvents(sock);
                console.log(chalk.cyan(`💙 Socket pairing ${sessionId} reconectado.`));
              } catch (err) {
                console.error(chalk.red(`💙 Error en reconexión ${sessionId}:`), err.message);
                reconnectCount = MAX_RECONNECT; 
              }
            }, delay);
          }
        });
      };

      attachEvents(sock);


      const waitForWS = () => new Promise((resolve, reject) => {
        let tries = 0;
        const check = setInterval(() => {
          tries++;
          if (done)                       { clearInterval(check); return reject(new Error('Cancelado')); }
          if (sock?.ws?.readyState === 1) { clearInterval(check); return resolve(); }
          if (tries > 60)                 { clearInterval(check); return reject(new Error('WS no abrió')); }
        }, 500);
      });


=======
      sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
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
          const cleanId  = sock.user?.id?.split(':')[0]?.split('@')[0] || sessionId;
          const userName = sock.user?.name || 'Usuario';
          console.log(chalk.green(`Subbot vinculado: ${cleanId}`));

          finish(true);
          global.db.data.users[m.sender].Subs = new Date() * 1;

          await client.sendMessage(m.chat, {
            text: `💙 *HATSUNE MIKU* 💙\n\n✅ ¡Vinculación exitosa!\n\n👤 ${userName}\n📱 ${cleanId}\n\n🤖 Tu subbot está activándose...\n⏳ En unos segundos estará listo\n\n⚠️ Para desvincular: *${usedPrefix}deletebot*`,
            ...global.miku
          }, { quoted: m });

          await m.react('✅');

          closeSocket();

          setTimeout(async () => {
            try { await subBotManager.startSubBot(sessionId); }
            catch (e) { console.error(chalk.red(`Error iniciando subbot ${sessionId}:`), e.message); }
          }, 10000);
        }

        if (connection === 'close') {
          if (done) return;
          const reason = lastDisconnect?.error?.output?.statusCode ?? 0;
          console.log(chalk.red(`Socket pairing ${sessionId} cerrado. Razón: ${reason}`));
          finish(false);
          await m.react('❌');
          await client.sendMessage(m.chat, {
            text: `💙 *HATSUNE MIKU* 💙\n\n❌ Vinculación fallida\n\n⚠️ Código: ${reason}\n\n💡 Intenta de nuevo con: *${usedPrefix}sub*`,
            ...global.miku
          }).catch(() => {});
        }
      });

>>>>>>> 8891118920c9db2f2a76d9d33896359c2957bfb6
      ;(async () => {
        if (isQR) return;
        try {
          await new Promise(r => setTimeout(r, 3000));
          if (done) return;

          if (!state.creds.registered) {
            const code          = await sock.requestPairingCode(phoneNumber);
            const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;

            if (done) return;

<<<<<<< HEAD
          codeRequested = true; 
          if (done) return;

          await client.sendMessage(m.chat, {
            text:
              `╭━━━━━━━━━━━━━━━━━╮\n` +
              `│  💙 *HATSUNE MIKU*  │\n` +
              `╰━━━━━━━━━━━━━━━━━╯\n\n` +
              `🔐 *Pasos para vincular:*\n\n` +
              `1️⃣ WhatsApp → *3 puntos* (⋮)\n` +
              `2️⃣ *Dispositivos vinculados*\n` +
              `3️⃣ *Vincular un dispositivo*\n` +
              `4️⃣ *Vincular con número*\n` +
              `5️⃣ Ingresa el código de abajo\n\n` +
              `⚠️ Expira en *60 segundos*`
          }, { quoted: m });

          await client.sendMessage(m.chat, { text: `*${formattedCode}*` });
=======
            await client.sendMessage(m.chat, {
              text: caption,
              ...global.miku
            }, { quoted: m });

            await client.sendMessage(m.chat, {
              text: `💙 *${formattedCode}*`,
              ...global.miku
            });
          }
>>>>>>> 8891118920c9db2f2a76d9d33896359c2957bfb6

        } catch (err) {
          if (done) return;
          console.error('Error generando código:', err.message);
          finish(false);
          silentClose(sock);
          await m.react('❌');
          await client.sendMessage(m.chat, {
            text: `💙 *HATSUNE MIKU* 💙\n\n❌ Error al generar código\n\n${err.message}\n\n💡 Intenta de nuevo con: *${usedPrefix}sub*`,
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
          text: `💙 *HATSUNE MIKU* 💙\n\n⏰ Tiempo agotado\n\nLa vinculación expiró.\n💡 Intenta de nuevo con: *${usedPrefix}sub*`,
          ...global.miku
        }).catch(() => {});
      }, 120_000);

    } catch (err) {
      finish(false);
      await m.react('❌');
      console.error('Error en comando sub:', err.message);
      m.reply(`💙 *HATSUNE MIKU* 💙\n\n❌ Error iniciando vinculación\n\n${err.message}`, m, global.miku);
    }
  }
};