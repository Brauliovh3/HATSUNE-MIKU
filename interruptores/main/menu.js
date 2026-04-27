import fetch from 'node-fetch';
import { getDevice, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import fs from 'fs';
import axios from 'axios';
import moment from 'moment-timezone';
import { bodyMenu, menuObject } from '../../nucleo/commands.js';
import { categoryImages, categoryAliases, mainMenuImage } from '../../nucleo/menuConfig.js';

import { exec } from 'child_process';
import { promisify } from 'util';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
const execAsync = promisify(exec);


const ptvCache = new Map();

async function toVideoNote(url) {
  if (ptvCache.has(url)) return ptvCache.get(url);

  const tmpIn = `/tmp/ptv_in_${Date.now()}.mp4`;
  const tmpOut = `/tmp/ptv_out_${Date.now()}.mp4`;
  try {
    const res = await fetch(url);
    await pipeline(res.body, createWriteStream(tmpIn));
    await execAsync(
      `ffmpeg -y -threads 1 -i ${tmpIn} -t 60 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=480:480" -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k -movflags +faststart ${tmpOut}`
    );
    const buf = fs.readFileSync(tmpOut);
    ptvCache.set(url, buf);
    return buf;
  } finally {
    if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
  }
}


toVideoNote(mainMenuImage).catch(() => {});

function normalize(text = '') {
  text = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  return text.endsWith('s') ? text.slice(0, -1) : text;
}

const menuRun = async (client, m, args, usedPrefix, command) => {
  try {
      const now = new Date();
      const colombianTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
      const tiempo = colombianTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/,/g, '');
      const tempo = moment.tz('America/Caracas').format('hh:mm A');
      const botId = client?.user?.id.split(':')[0] + '@s.whatsapp.net';
      const botSettings = global.db.data.settings[botId] || {};
      const botname = botSettings.botname || '';
      const namebot = botSettings.namebot || '';
      const banner = botSettings.banner || '';
      const owner = botSettings.owner || '';
      const canalId = botSettings.id || '';
      const canalName = botSettings.nameid || '';
      const prefix = botSettings.prefix;
      const link = botSettings.link || links.api.channel;
      const isOficialBot = botId === global.client.user.id.split(':')[0] + '@s.whatsapp.net';
      const botType = isOficialBot ? 'Principal/Owner' : 'Sub Bot';
      const users = Object.keys(global.db.data.users).length;
      const device = getDevice(m.key.id);
      const sender = global.db.data.users[m.sender].name;
      const time = client.uptime ? formatearMs(Date.now() - client.uptime) : "Desconocido";
      const input = normalize(args[0] || '');
      let cat = Object.keys(categoryAliases).find(k => categoryAliases[k].map(normalize).includes(input));
      
      
      if (!cat && args[0] && categoryAliases[args[0]]) {
        cat = args[0];
      }
      
      const category = `${cat ? ` para \`${cat}\`` : '. *(˶ᵔ ᵕ ᵔ˶)*'}`;
      if (args[0] && !cat) {      
        return m.reply(`💙 La categoria *${args[0]}* no existe, las categorias disponibles son: *${Object.keys(categoryAliases).join(', ')}*.\n> Para ver la lista completa escribe *${usedPrefix}menu*\n> Para ver los comandos de una categoría escribe *${usedPrefix}menu [categoría]*\n> Ejemplo: *${usedPrefix}menu anime*`);
      }
      const sections = menuObject;
      const content = cat ? String(sections[cat] || '') : Object.values(sections).map(s => String(s || '')).join('\n\n');
      let menu = cat ? content : (bodyMenu ? String(bodyMenu || '') + '\n\n' + content : content);
      
      const categoryButtons = Object.keys(sections).map(key => ({
        buttonId: `menu_${key}`,
        buttonText: { displayText: key.toUpperCase() },
        type: 1
      }));
      
      const buttons = [
        ...categoryButtons,
        { buttonId: 'menu_all', buttonText: { displayText: '📋 COMPLETO' }, type: 1 }
      ];
      const replacements = {
        $owner: owner ? (!isNaN(owner.replace(/@s\.whatsapp\.net$/, '')) ? global.db.data.users[owner]?.name || owner.split('@')[0] : owner) : 'Oculto por privacidad',
        $botType: botType,
        $device: device,
        $tiempo: tiempo,
        $tempo: tempo,
        $users: users.toLocaleString(),
        $link: link,
        $cat: category,
        $sender: sender,
        $botname: botname,
        $namebot: namebot,
        $prefix: usedPrefix,
        $uptime: time
      };
      for (const [key, value] of Object.entries(replacements)) {
        menu = menu.replace(new RegExp(`\\${key}`, 'g'), value);
      }
      
      const messageContent = cat ? menu : `╭━💙 MENU PRINCIPAL 💙━╮\n│\n│ 💙 *${botname}*\n│\n│ 👤 *Usuarios:* ${users.toLocaleString()}\n│ ⏱️ *Uptime:* ${time}\n│ 📱 *Tipo:* ${botType}\n│\n│ 💙 Selecciona una categoría:\n│\n╰━━━━━━━━━━━━━━━━━╯`;
      const categoryBanner = cat ? (categoryImages[cat] || banner) : mainMenuImage;
      
      if (cat) {
        
        if (categoryBanner.includes('.mp4') || categoryBanner.includes('.webm')) {
          const ptvBuffer = await toVideoNote(categoryBanner);
          const ptvMsg = await client.sendMessage(m.chat, {
            video: ptvBuffer,
            ptv: true,
            mimetype: 'video/mp4'
          }, { quoted: m });

          await client.sendMessage(m.chat, {
            text: messageContent,
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: canalId,
                serverMessageId: '',
                newsletterName: canalName
              }
            }
          }, { quoted: ptvMsg });
        } else {
          await client.sendMessage(m.chat, {
            text: messageContent,
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: canalId,
                serverMessageId: '',
                newsletterName: canalName
              },
              externalAdReply: {
                title: botname,
                body: `${namebot}, © 🄿🄾🅆🄴🅁🄴🄳 (ㅎㅊDEPOOLㅊㅎ) `,
                showAdAttribution: false,
                thumbnailUrl: categoryBanner,
                mediaType: 1,
                previewType: 0,
                renderLargerThumbnail: true
              }
            }
          }, { quoted: m });
        }
      } else {
        
        const ptvBuffer = await toVideoNote(mainMenuImage);

       
        const uploaded = await client.uploadPreKeys();
        const videoMsg = await client.sendMessage(m.chat, {
          video: ptvBuffer,
          ptv: true,
          mimetype: 'video/mp4'
        }, { upload: client.waUploadToServer });

        const videoProto = proto.Message.VideoMessage.create({
          ...videoMsg?.message?.videoMessage,
          ptvBit: true,
        });

        const fakeMsg = generateWAMessageFromContent(m.chat, {
          buttonsMessage: proto.Message.ButtonsMessage.create({
            contentText: messageContent,
            footerText: '💙 Hatsune Miku Bot',
            buttons: buttons.map(b => proto.Message.ButtonsMessage.Button.create({
              buttonId: b.buttonId,
              buttonText: proto.Message.ButtonsMessage.Button.ButtonText.create({
                displayText: b.buttonText.displayText
              }),
              type: proto.Message.ButtonsMessage.Button.Type.RESPONSE
            })),
            headerType: proto.Message.ButtonsMessage.HeaderType.VIDEO,
            videoMessage: videoProto,
            contextInfo: proto.ContextInfo.create({
              mentionedJid: [m.sender],
              isForwarded: true,
              forwardedNewsletterMessageInfo: proto.ContextInfo.ForwardedNewsletterMessageInfo.create({
                newsletterJid: canalId,
                serverMessageId: 0,
                newsletterName: canalName
              })
            })
          })
        }, { userJid: client.user.id });

        await client.relayMessage(m.chat, fakeMsg.message, { messageId: fakeMsg.key.id });
      }
    } catch (e) {
      await m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  }
;

export default {
  command: ['menu','help','ayuda'],
  category: 'main',
  register: true,
  run: menuRun
};

export const menucompleto = {
  command: ['menucompleto', 'allmenu'],
  category: 'main',
  register: true,
  run: menuRun
};

export async function processMenuButton(conn, m) {
  let buttonId = m.body || m.text || null;
  
  if (m.message?.buttonsResponseMessage) {
    buttonId = m.message.buttonsResponseMessage.selectedButtonId;
  }
  if (m.message?.templateButtonReplyMessage) {
    buttonId = m.message.templateButtonReplyMessage.selectedId;
  }
  if (m.message?.interactiveResponseMessage) {
    try {
      const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
      if (paramsJson) {
        const params = JSON.parse(paramsJson);
        buttonId = params.id;
      }
    } catch (e) {}
  }
  
  if (!buttonId || !buttonId.startsWith('menu_')) return false;
  
  const category = buttonId.replace('menu_', '');
  const usedPrefix = global.prefix || '.';
  
  if (category === 'all') {
    return await menuRun(conn, m, [], usedPrefix, 'menucompleto');
  }
  
  if (categoryAliases[category]) {
    const alias = categoryAliases[category][0]; 
    return await menuRun(conn, m, [alias], usedPrefix, 'menu');
  }
  
  return false;
}

function formatearMs(ms) {
  const segundos = Math.floor(ms / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  return [dias && `${dias}d`, `${horas % 24}h`, `${minutos % 60}m`, `${segundos % 60}s`].filter(Boolean).join(" ");
}