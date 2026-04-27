import { makeWASocket, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
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

const cleanFolder = (folder) => {
  try { if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true }); } catch {}
};

export default {
  command: ['sub', 'vincular', 'conectar', 'code', 'serbot--code', 'serbot-code', 'botcode'],
  category: 'subbots',
  run: async (client, m, args, usedPrefix, command) => {
    const rawPhone      = m.sender.split('@')[0].replace(/\D/g, '');
    const phoneNumber   = normalizePhoneForPairing(rawPhone);
    const sessionId     = rawPhone;
    const sessionFolder = `./Sessions/subbots/${sessionId}`;
    const privatChat    = rawPhone + '@s.whatsapp.net';

   
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
      text: `Iniciando vinculación...`
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
        browser: Browsers.macOS('Chrome'),
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        getMessage: async () => '',
        msgRetryCounterCache,
        userDevicesCache,
        keepAliveIntervalMs: 45000,
        maxIdleTimeMs: 60000,
      });

      pendingSessions.set(sessionId, { sock, startTime: Date.now() });
      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
          const cleanId  = sock.user?.id?.split(':')[0]?.split('@')[0] || sessionId;
          const userName = sock.user?.name || 'Usuario';
          console.log(chalk.green(`Subbot vinculado: ${cleanId}`));

          finish(true);

          setTimeout(async () => {
            try { await subBotManager.startSubBot(sessionId); }
            catch (e) { console.error(chalk.red(`Error iniciando subbot ${sessionId}:`), e.message); }
          }, 3000);

          
          await client.sendMessage(m.chat, {
            text: `¡Vinculación exitosa!\n\n${userName}\n${cleanId}\n\nTu subbot está activándose...\nEn unos segundos estará listo\n\nPara desvincular: *${usedPrefix}deletebot*`
          }, { quoted: m });

          
          await m.react('✅');
        }

        if (connection === 'close') {
          if (done) return;
          const reason = lastDisconnect?.error?.output?.statusCode ?? 0;
          console.log(chalk.red(`Socket pairing ${sessionId} cerrado. Razón: ${reason}`));
          finish(false);
          await m.react('❌');
          await client.sendMessage(m.chat, {
            text: `Vinculación fallida\n\nCódigo: ${reason}\n\nIntenta de nuevo con: *${usedPrefix}sub*`
          }).catch(() => {});
        }
      });

      
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

          if (done) return;

         
          await client.sendMessage(m.chat, {
            text: `╭━━━━━━━━━━━━━━━━━╮\n│  💙 *HATSUNE MIKU*  │\n╰━━━━━━━━━━━━━━━━━╯\n\nPasos para vincular:\n\n1️⃣ WhatsApp → 3 puntos (⋮)\n2️⃣ Dispositivos vinculados\n3️⃣ Vincular un dispositivo\n4️⃣ Vincular con número\n5️⃣ Ingresa el código de abajo\n\nExpira en 60 segundos`
          }, { quoted: m });

          
          await client.sendMessage(m.chat, {
            text: `*${formattedCode}*`
          });

        } catch (err) {
          if (done) return;
          console.error('Error generando código:', err.message);
          finish(false);
          await m.react('❌');
          await client.sendMessage(m.chat, {
            text: `Error al generar código\n\n${err.message}\n\nIntenta de nuevo con: *${usedPrefix}sub*`
          }).catch(() => {});
        }
      })();

      
      setTimeout(() => {
        if (done) return;
        finish(false);
        m.react('⏰');
        client.sendMessage(m.chat, {
          text: `Tiempo agotado\n\nLa vinculación expiró.\nIntenta de nuevo con: *${usedPrefix}sub*`
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