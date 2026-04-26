import { makeWASocket, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import subBotManager from '../../nucleo/subbotManager.js';

const pendingSessions = new Map();

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
    const privatChat    = phoneNumber + '@s.whatsapp.net';

   
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
        `📲 Te enviaré el código en tu *chat privado*\n` +
        `✨ Solo tú podrás verlo`
    }, { quoted: m });

    let sock = null;
    let done = false;

    const finish = (success) => {
      if (done) return;
      done = true;
      pendingSessions.delete(sessionId);
      if (!success) cleanFolder(sessionFolder);
      try { sock?.ev?.removeAllListeners(); } catch {}
      try { if (sock?.ws?.readyState !== 3) sock?.ws?.close(); } catch {}
    };

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      const { version }          = await fetchLatestBaileysVersion();

      sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Safari'),
        auth: state,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        getMessage: async () => '',
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
      });

      pendingSessions.set(sessionId, { sock, startTime: Date.now() });
      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
          const cleanId  = sock.user?.id?.split(':')[0]?.split('@')[0] || sessionId;
          const userName = sock.user?.name || 'Usuario';
          console.log(chalk.green(`💙 Subbot vinculado: ${cleanId}`));

          finish(true);

          setTimeout(async () => {
            try { await subBotManager.startSubBot(sessionId); }
            catch (e) { console.error(chalk.red(`Error iniciando subbot ${sessionId}:`), e.message); }
          }, 3000);

          
          await client.sendMessage(privatChat, {
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
          });

          
          await m.react('✅');
        }

        if (connection === 'close') {
          if (done) return;
          const reason = lastDisconnect?.error?.output?.statusCode ?? 0;
          console.log(chalk.red(`💙 Socket pairing ${sessionId} cerrado. Razón: ${reason}`));
          finish(false);
          await m.react('❌');
          await client.sendMessage(privatChat, {
            text:
              `╭━━━━━━━━━━━━━━━━━╮\n` +
              `│  💙 *HATSUNE MIKU*  │\n` +
              `╰━━━━━━━━━━━━━━━━━╯\n\n` +
              `❌ *Vinculación fallida*\n\n` +
              `⚠️ Código: ${reason}\n\n` +
              `💡 Intenta de nuevo con:\n*${usedPrefix}sub*`
          }).catch(() => {});
        }
      });

      
      const waitForWS = () => new Promise((resolve, reject) => {
        let tries = 0;
        const check = setInterval(() => {
          tries++;
          if (done)                       { clearInterval(check); return reject(new Error('Cancelado')); }
          if (sock?.ws?.readyState === 1) { clearInterval(check); return resolve(); }
          if (tries > 30)                 { clearInterval(check); return reject(new Error('WS no abrió')); }
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

          if (done) return;

         
          await client.sendMessage(privatChat, {
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
          });

          
          await client.sendMessage(privatChat, {
            text: `*${formattedCode}*`
          });

        } catch (err) {
          if (done) return;
          console.error('Error generando código:', err.message);
          finish(false);
          await m.react('❌');
          await client.sendMessage(privatChat, {
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
        m.react('⏰');
        client.sendMessage(privatChat, {
          text:
            `╭━━━━━━━━━━━━━━━━━╮\n` +
            `│  💙 *HATSUNE MIKU*  │\n` +
            `╰━━━━━━━━━━━━━━━━━╯\n\n` +
            `⏰ *Tiempo agotado*\n\n` +
            `La vinculación expiró.\n` +
            `💡 Intenta de nuevo con: *${usedPrefix}sub*`
        }).catch(() => {});
      }, 120000);

    } catch (err) {
      finish(false);
      await m.react('❌');
      console.error('Error en comando sub:', err.message);
      m.reply(`❌ Error iniciando vinculación\n\n${err.message}`);
    }
  }
};