import { makeWASocket, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import subBotManager from '../../nucleo/subbotManager.js';

const pendingSessions = new Map();

const PERMANENT_ERRORS = new Set([401, 403, 405, 440]);

const cleanFolder = (folder) => {
  try { if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true }); } catch {}
};

export default {
  command: ['sub', 'vincular', 'conectar', 'code', 'serbot--code', 'serbot-code', 'botcode'],
  category: 'subbots',
  run: async (client, m, args, usedPrefix, command) => {
    const phoneNumber   = m.sender.split('@')[0].replace(/\D/g, '');
    const sessionId     = phoneNumber;
    const sessionFolder = `./Sessions/subbots/${sessionId}`;

    if (fs.existsSync(path.join(sessionFolder, 'creds.json'))) {
      if (subBotManager.subbots?.has(sessionId)) {
        return m.reply(
          `💙 *Ya tienes un subbot activo*\n\n` +
          `📱 Número: ${sessionId}\n✅ Estado: Conectado\n\n` +
          `⚠️ Para eliminar usa: ${usedPrefix}deletebot`
        );
      }
      try {
        await subBotManager.startSubBot(sessionId);
        return m.reply(`💙 Reconectando tu subbot...\n📱 ${sessionId}\n⏳ Espera unos segundos.`);
      } catch {
        return m.reply(`💙 Sesión desconectada.\n⚠️ Usa ${usedPrefix}deletebot para limpiar e intentar de nuevo.`);
      }
    }

    if (pendingSessions.has(sessionId)) {
      return m.reply(`⏳ Ya hay una vinculación en curso.\nEspera o usa ${usedPrefix}deletebot para cancelar.`);
    }

    cleanFolder(sessionFolder);
    fs.mkdirSync(sessionFolder, { recursive: true });

    await m.react('⏳');

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
      const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Safari'),
        auth: state,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
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


      ;(async () => {
        try {
          await waitForWS();
          if (done) return;

          await new Promise(r => setTimeout(r, 1500));
          if (done) return;

          const code          = await sock.requestPairingCode(phoneNumber);
          const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;

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

        } catch (err) {
          if (done) return;
          console.error('Error generando código:', err.message);
          finish(false);
          silentClose(sock);
          await m.react('❌');
          await client.sendMessage(m.chat, {
            text:
              `╭━━━━━━━━━━━━━━━━━╮\n` +
              `│  💙 *HATSUNE MIKU*  │\n` +
              `╰━━━━━━━━━━━━━━━━━╯\n\n` +
              `❌ *Error al generar código*\n\n` +
              `${err.message}\n\n` +
              `💡 Intenta de nuevo con: *${usedPrefix}sub*`
          }).catch(() => {});
        }
      })();


      setTimeout(() => {
        if (done) return;
        finish(false);
        silentClose(sock);
        m.react('⏰');
        client.sendMessage(m.chat, {
          text:
            `╭━━━━━━━━━━━━━━━━━╮\n` +
            `│  💙 *HATSUNE MIKU*  │\n` +
            `╰━━━━━━━━━━━━━━━━━╯\n\n` +
            `⏰ *Tiempo agotado*\n\n` +
            `La vinculación expiró.\n` +
            `💡 Intenta de nuevo con: *${usedPrefix}sub*`
        }).catch(() => {});
      }, 120_000);

    } catch (err) {
      finish(false);
      await m.react('❌');
      console.error('Error en comando sub:', err.message);
      m.reply(`❌ Error iniciando vinculación\n\n${err.message}`);
    }
  }
};