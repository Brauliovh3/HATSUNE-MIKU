import fs from 'fs';
import { tmpdir } from 'os';
import Crypto from 'crypto';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import * as cheerio from 'cheerio';

async function webp2mp4(source) {
  let form = new FormData();
  let isUrl = typeof source === 'string' && /https?:\/\//.test(source);
  form.append('new-image-url', isUrl ? source : '');
  form.append('new-image', source, 'image.webp');  
  let res = await fetch('https://ezgif.com/webp-to-mp4', { method: 'POST', body: form });  
  let html = await res.text();
  const $ = cheerio.load(html);
  let form2 = new FormData();
  let obj = {};  
  $('form input[name]').each((i, input) => {
    const name = $(input).attr('name');
    const value = $(input).val();
    obj[name] = value;
    form2.append(name, value);
  });
  let res2 = await fetch('https://ezgif.com/webp-to-mp4/' + obj.file, { method: 'POST', body: form2 });  
  let html2 = await res2.text();
  const $2 = cheerio.load(html2);
  const videoUrl = new URL($2('div#output > p.outfile > video > source').attr('src'), res2.url).toString();  
  let videoRes = await fetch(videoUrl);
  let videoBuffer = Buffer.from(await videoRes.arrayBuffer());
  return videoBuffer;
}

async function webp2png(source) {
  let form = new FormData();
  let isUrl = typeof source === 'string' && /https?:\/\//.test(source);
  form.append('new-image-url', isUrl ? source : '');
  form.append('new-image', source, 'image.webp');  
  let res = await fetch('https://ezgif.com/webp-to-png', { method: 'POST', body: form });  
  let html = await res.text();
  const $ = cheerio.load(html);
  let form2 = new FormData();
  let obj = {};  
  $('form input[name]').each((i, input) => {
    const name = $(input).attr('name');
    const value = $(input).val();
    obj[name] = value;
    form2.append(name, value);
  });
  let res2 = await fetch('https://ezgif.com/webp-to-png/' + obj.file, { method: 'POST', body: form2 });  
  let html2 = await res2.text();
  const $2 = cheerio.load(html2);
  const imgUrl = new URL($2('div#output > p.outfile > img').attr('src'), res2.url).toString();  
  let imgRes = await fetch(imgUrl);
  let imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  return imgBuffer;
}

export default {
  command: ['toimg', 'toimage'],
  category: 'tools',
  run: async (client, m, args, usedPrefix, command, text) => {
    if (!m.quoted) {
      return client.reply(m.chat, `💙 Debes citar un sticker para convertir.`, m);
    }    
    await m.react('🕒');    
    try {
      const quoted = m.quoted;
      const buffer = await quoted.download();      
      if (!buffer) {
        await m.react('✖️');
        return client.reply(m.chat, `💙 No se pudo descargar el sticker.`, m);
      }      
      const isAnimated = quoted.msg && quoted.msg.isAnimated;      
      if (isAnimated) {
        const mp4Buffer = await webp2mp4(buffer);
        await client.sendMessage(m.chat, { video: mp4Buffer, caption: '💙 *Aquí tienes ฅ^•ﻌ•^ฅ*', gifPlayback: true }, { quoted: m });
      } else {
        const pngBuffer = await webp2png(buffer);
        await client.sendMessage(m.chat, { image: pngBuffer, caption: '💙 *Aquí tienes ฅ^•ﻌ•^ฅ*' }, { quoted: m });
      }      
      await m.react('✔️');
    } catch (error) {
      await m.react('✖️');
      client.reply(m.chat, `💙 Error al convertir el sticker.\n${error.message}`, m);
    }
  }
};