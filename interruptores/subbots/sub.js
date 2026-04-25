import { makeWASocket, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import subBotManager from '../../nucleo/subbotManager.js';

const pendingSessions = new Map();

export default {
  command: ['sub', 'vincular', 'conectar', 'code', 'serbot--code', 'serbot-code', 'botcode'],
  category: 'subbots',
  run: async (client, m, args, usedPrefix, command) => {
    const userId = m.sender;
    const phoneNumber = userId.split('@')[0];
    const sessionId = phoneNumber;
    const sessionFolder = `./Sessions/subbots/${sessionId}`;

    if (fs.existsSync(sessionFolder)) {
      const isActive = subBotManager.subbots?.has(sessionId);
      if (isActive) {
        return m.reply(`💙 *Ya tienes un subbot activo*\n\n` +
          `📱 Número: ${sessionId}\n` +
          `✅ Estado: Conectado\n\n` +
          `💡 Si quieres reiniciarlo usa:\n` +
          `${usedPrefix}restartsub ${sessionId}\n\n` +
          `⚠️ Para eliminar tu sesión usa:\n` +
          `${usedPrefix}deletebot`);
      } else {
        return m.reply(`💙 *Sesión existente encontrada*\n\n` +
          `📱 Número: ${sessionId}\n` +
          `💤 Estado: Desconectado\n\n` +
          `💡 Para activar tu subbot usa:\n` +
          `${usedPrefix}connect ${sessionId}\n\n` +
          `⚠️ Para eliminar tu sesión usa:\n` +
          `${usedPrefix}deletebot`);
      }
    }

    fs.mkdirSync(sessionFolder, { recursive: true });

    await m.react('⏳');

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Safari'),
        auth: state,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        getMessage: async () => '',
        keepAliveIntervalMs: 30000,
        maxIdleTimeMs: 300000,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        fireInitQueries: true,
      });

      pendingSessions.set(sessionId, {
        sock,
        phoneNumber,
        saveCreds,
        m,
        client,
        startTime: Date.now()
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        const pending = pendingSessions.get(sessionId);
        
        if (!pending) return;

        if (connection === 'open') {
          pendingSessions.delete(sessionId);
          
          const cleanId = sock.user?.id?.split(':')[0] || sessionId;
          const userName = sock.user?.name || 'Usuario';
          
          console.log(chalk.green(`💙 Nuevo subbot vinculado: ${cleanId}`));

          await client.sendMessage(m.chat, {
            text: `✅ *¡VINCULACIÓN EXITOSA!* ✅\n\n` +
              `💙 ¡Bienvenido, ${userName}!\n\n` +
              `📱 *Tu número:* ${cleanId}\n` +
              `🤖 *Tu subbot está ahora activo*\n\n` +
              `💡 *Comandos disponibles:*\n` +
              `• Escribe en cualquier chat donde esté tu subbot\n` +
              `• Usa los comandos normalmente\n\n` +
              `⚠️ *Para desvincular:*\n` +
              `Escribe ${usedPrefix}deletebot en este chat\n\n` +
              `🌸 *Hatsune Miku Bot - Siempre contigo*`
          }, { quoted: m });

          await subBotManager.startSubBot(sessionId);

          setTimeout(() => {
            try {
              if (sock.ws && sock.ws.readyState !== 3) {
                sock.ws.close();
              }
            } catch {}
          }, 10000);
        }

        if (connection === 'close') {
          const reason = lastDisconnect?.error?.output?.statusCode || 0;
          
          if (reason === 401 || reason === 403) {
            pendingSessions.delete(sessionId);
            try {
              if (fs.existsSync(sessionFolder)) {
                fs.rmSync(sessionFolder, { recursive: true, force: true });
              }
            } catch {}
          }
        }
      });

      setTimeout(async () => {
        try {
          const pending = pendingSessions.get(sessionId);
          if (!pending) return;
          
          if (!state.creds.registered) {
            const code = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
            const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
            
            const instructions = `💙 *VINCULA TU WHATSAPP* 💙\n\n` +
              `*Sigue estos pasos:*\n\n` +
              `1️⃣ Abre *WhatsApp* en tu teléfono\n` +
              `2️⃣ Toca los *3 puntos* (⋮) arriba a la derecha\n` +
              `3️⃣ Selecciona *"Dispositivos vinculados"*\n` +
              `4️⃣ Toca *"Vincular un dispositivo"*\n` +
              `5️⃣ Selecciona *"Vincular con número de teléfono"*\n` +
              `6️⃣ Ingresa el *código de 8 dígitos* que te enviaré a continuación\n\n` +
              `⚠️ *Importante:*\n` +
              `• El código expira en *60 segundos*\n` +
              `• Solo funciona en *este número* (${phoneNumber})\n` +
              `• No compartas el código con nadie\n\n` +
              `🌸 *Esperando código...*`;

            await client.sendMessage(m.chat, { text: instructions }, { quoted: m });

            await new Promise(resolve => setTimeout(resolve, 1500));

            await client.sendMessage(m.chat, {
              text: formattedCode
            }, { quoted: m });

            pending.codeSent = true;
            pending.code = formattedCode;
          }
        } catch (err) {
          console.error('Error generando código:', err);
          pendingSessions.delete(sessionId);
          await m.reply(`❌ *Error al generar código*\n\n${err.message}`);
          try {
            if (fs.existsSync(sessionFolder)) {
              fs.rmSync(sessionFolder, { recursive: true, force: true });
            }
          } catch {}
        }
      }, 4000);

      setTimeout(() => {
        const pending = pendingSessions.get(sessionId);
        if (pending && !pending.codeSent) {
          pendingSessions.delete(sessionId);
          m.reply(`⏰ *Tiempo de espera agotado*\n\n` +
            `El proceso de vinculación expiró.\n` +
            `Intenta nuevamente con: ${usedPrefix}sub`);
          try {
            if (fs.existsSync(sessionFolder)) {
              fs.rmSync(sessionFolder, { recursive: true, force: true });
            }
          } catch {}
        }
      }, 120000);

    } catch (err) {
      pendingSessions.delete(sessionId);
      console.error('Error en sub:', err);
      m.reply(`❌ *Error iniciando vinculación*\n\n${err.message}`);
      try {
        if (fs.existsSync(sessionFolder)) {
          fs.rmSync(sessionFolder, { recursive: true, force: true });
        }
      } catch {}
    }
  }
};
