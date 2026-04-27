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

const cleanFolder = (folder) => {
  try { if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true }); } catch {}
};

export default {
  command: ['sub', 'vincular', 'conectar', 'code', 'qr', 'serbot--code', 'serbot-code', 'botcode'],
  category: 'subbots',
  run: async (client, m, args, usedPrefix, command) => {
    const isQR = /^(qr)$/i.test(command);
    const rtx = '💙 *HATSUNE MIKU* 💙\n\n`💌` Vincula tu *cuenta* usando el *codigo.*\n\n> ✥ Sigue las *instrucciones*\n\n*›* Click en los *3 puntos*\n*›* Toque *dispositivos vinculados*\n*›* Vincular *nuevo dispositivo*\n*›* Selecciona *Vincular con el número de teléfono*\n\nꕤ *`Importante`*\n> ₊·( 🜸 ) ➭ Este *Código* solo funciona en el *número que lo solicito*';
    const rtx2 = '💙 *HATSUNE MIKU* 💙\n\n`💌` Vincula tu *cuenta* usando *codigo qr.*\n\n> ✥ Sigue las *instrucciones*\n\n*›* Click en los *3 puntos*\n*›* Toque *dispositivos vinculados*\n*›* Vincular *nuevo dispositivo*\n*›* Escanea el código *QR.*\n\n> ₊·( 🜸 ) ➭ Recuerda que no es recomendable usar tu cuenta principal para registrar un socket.';
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
    const privatChat    = rawPhone + '@s.whatsapp.net';

   
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
        printQRInTerminal: isQR,
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

          setTimeout(async () => {
            try { await subBotManager.startSubBot(sessionId); }
            catch (e) { console.error(chalk.red(`Error iniciando subbot ${sessionId}:`), e.message); }
          }, 3000);

          
          await client.sendMessage(m.chat, {
            text: `💙 *HATSUNE MIKU* 💙\n\n✅ ¡Vinculación exitosa!\n\n👤 ${userName}\n📱 ${cleanId}\n\n🤖 Tu subbot está activándose...\n⏳ En unos segundos estará listo\n\n⚠️ Para desvincular: *${usedPrefix}deletebot*`,
            ...global.miku
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
            text: `💙 *HATSUNE MIKU* 💙\n\n❌ Vinculación fallida\n\n⚠️ Código: ${reason}\n\n💡 Intenta de nuevo con: *${usedPrefix}sub*`,
            ...global.miku
          }).catch(() => {});
        }
      });

      ;(async () => {
        if (isQR) return;
        try {
          await new Promise(r => setTimeout(r, 1000));
          if (done) return;

          const code          = await sock.requestPairingCode(phoneNumber);
          const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;

          if (done) return;

          await client.sendMessage(m.chat, {
            text: caption,
            ...global.miku
          }, { quoted: m });

          await client.sendMessage(m.chat, {
            text: `💙 *${formattedCode}*`,
            ...global.miku
          });

        } catch (err) {
          if (done) return;
          console.error('Error generando código:', err.message);
          finish(false);
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
        m.react('⏰');
        client.sendMessage(m.chat, {
          text: `💙 *HATSUNE MIKU* 💙\n\n⏰ Tiempo agotado\n\nLa vinculación expiró.\n💡 Intenta de nuevo con: *${usedPrefix}sub*`,
          ...global.miku
        }).catch(() => {});
      }, 120000);

    } catch (err) {
      finish(false);
      await m.react('❌');
      console.error('Error en comando sub:', err.message);
      m.reply(`💙 *HATSUNE MIKU* 💙\n\n❌ Error iniciando vinculación\n\n${err.message}`, m, global.miku);
    }
  }
};