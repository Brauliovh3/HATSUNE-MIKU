import fetch from 'node-fetch';
import { getDevice } from '@whiskeysockets/baileys';
import fs from 'fs';
import axios from 'axios';
import moment from 'moment-timezone';
import { bodyMenu, menuObject } from '../../nucleo/commands.js';

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
      const alias = {
        anime: ['anime', 'reacciones'],
        downloads: ['downloads', 'descargas'],
        economia: ['economia', 'economy', 'eco'],
        gacha: ['gacha', 'rpg'],
        grupo: ['grupo', 'group'],
        nsfw: ['nsfw', '+18'],
        owner: ['owner', 'dueño', 'creador'],
        profile: ['profile', 'perfil'],
        sockets: ['sockets', 'bots', 'config'],
        stickers: ['stickers', 'sticker'],
        utils: ['utils', 'utilidades', 'herramientas']
      };
      
      const categoryImages = {
        anime: 'https://i.imgur.com/anime-banner.jpg',
        downloads: 'https://i.imgur.com/downloads-banner.jpg',
        economia: 'https://i.imgur.com/economy-banner.jpg',
        gacha: 'https://i.imgur.com/gacha-banner.jpg',
        grupo: 'https://i.imgur.com/group-banner.jpg',
        nsfw: 'https://i.imgur.com/nsfw-banner.jpg',
        owner: 'https://i.imgur.com/owner-banner.jpg',
        profile: 'https://i.imgur.com/profile-banner.jpg',
        sockets: 'https://i.imgur.com/sockets-banner.jpg',
        stickers: 'https://i.imgur.com/stickers-banner.jpg',
        utils: 'https://i.imgur.com/utils-banner.jpg'
      };
      const input = normalize(args[0] || '');
      const cat = Object.keys(alias).find(k => alias[k].map(normalize).includes(input));
      const category = `${cat ? ` para \`${cat}\`` : '. *(˶ᵔ ᵕ ᵔ˶)*'}`
      if (args[0] && !cat) {      
        return m.reply(`💙 La categoria *${args[0]}* no existe, las categorias disponibles son: *${Object.keys(alias).join(', ')}*.\n> Para ver la lista completa escribe *${usedPrefix}menu*\n> Para ver los comandos de una categoría escribe *${usedPrefix}menu [categoría]*\n> Ejemplo: *${usedPrefix}menu anime*`);
      }
      const sections = menuObject;
      const content = cat ? String(sections[cat] || '') : Object.values(sections).map(s => String(s || '')).join('\n\n');
      let menu = bodyMenu ? String(bodyMenu || '') + '\n\n' + content : content;
      
      
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
      
      const messageContent = cat ? menu : `╭━━━💙 MENU PRINCIPAL 💙━━━╮\n│\n│ 💙 Selecciona una categoría:\n│\n╰━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
      const categoryBanner = cat ? (categoryImages[cat] || banner) : banner;
      
      if (cat) {
        
        await client.sendMessage(m.chat, categoryBanner.includes('.mp4') || categoryBanner.includes('.webm') ? {
          video: { url: categoryBanner },
          gifPlayback: true,
          caption: messageContent,
          contextInfo: {
            mentionedJid: [m.sender],
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: canalId,
              serverMessageId: '',
              newsletterName: canalName
            }
          }
        } : {
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
      } else {
        
        await client.sendMessage(m.chat, banner.includes('.mp4') || banner.includes('.webm') ? {
          video: { url: banner },
          gifPlayback: true,
          caption: messageContent,
          footer: '💙 Hatsune Miku Bot',
          buttons: buttons,
          headerType: 4,
          contextInfo: {
            mentionedJid: [m.sender],
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: canalId,
              serverMessageId: '',
              newsletterName: canalName
            }
          }
        } : {
          text: messageContent,
          footer: '💙 Hatsune Miku Bot',
          buttons: buttons,
          headerType: 1,
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
              thumbnailUrl: banner,
              mediaType: 1,
              previewType: 0,
              renderLargerThumbnail: true
            }
          }
        }, { quoted: m });
      }
    } catch (e) {
      await m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  }
;

export default {
  command: ['menu'],
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

export const menuHandler = {
  command: ['menuhandler'],
  category: 'main',
  register: false,
  run: async (client, m, args, usedPrefix, command) => {
    let buttonId = m.body || m.text || null;
    if (m.message?.buttonsResponseMessage) {
      buttonId = m.message.buttonsResponseMessage.selectedButtonId;
    }
    if (m.message?.templateButtonReplyMessage) {
      buttonId = m.message.templateButtonReplyMessage.selectedId;
    }
    if (!buttonId || !buttonId.startsWith('menu_')) return false;
    
    const category = buttonId.replace('menu_', '');
    const alias = {
      anime: ['anime', 'reacciones'],
      downloads: ['downloads', 'descargas'],
      economia: ['economia', 'economy', 'eco'],
      gacha: ['gacha', 'rpg'],
      grupo: ['grupo', 'group'],
      nsfw: ['nsfw', '+18'],
      owner: ['owner', 'dueño', 'creador'],
      profile: ['profile', 'perfil'],
      sockets: ['sockets', 'bots', 'config'],
      stickers: ['stickers', 'sticker'],
      utils: ['utils', 'utilidades', 'herramientas']
    };
    
    if (category === 'all') {
      return await menuRun(client, m, [], usedPrefix, 'menucompleto');
    }
    
    if (alias[category]) {
      return await menuRun(client, m, [category], usedPrefix, 'menu');
    }
    
    return false;
  }
};

function formatearMs(ms) {
  const segundos = Math.floor(ms / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  return [dias && `${dias}d`, `${horas % 24}h`, `${minutos % 60}m`, `${segundos % 60}s`].filter(Boolean).join(" ");
}
