import axios from 'axios';
import fs from 'fs';

export default {
  command: ['qc'],
  category: 'stickers',
  run: async (client, m, args, usedPrefix, command, text) => {
    try {
      let textFinal = args.join(' ') || m.quoted?.text;
      if (!textFinal) {
        return client.reply(m.chat, `💙 Ingresa un texto para crear el sticker.`, m, global.miku);
      }
      let target = m.quoted ? m.quoted.sender : m.sender;
      const pp = await client.profilePictureUrl(target).catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png');
      const db = global.db.data
      const userGlobal = db.users[target] || {}
      const nombre = userGlobal?.name || target.split('@')[0];
      if (textFinal.length > 30) {
        await m.react('✖️');
        return client.reply(m.chat, `💙 El texto no puede tener más de 30 caracteres.`, m, global.miku);
      }
      await m.react('🕒');
      const quoteObj = { type: 'quote', format: 'png', backgroundColor: '#000000', width: 384, height: 512, scale: 1, messages: [{ entities: [], avatar: true, from: { id: 1, name: nombre, photo: { url: pp } }, text: textFinal, replyMessage: {} }] };
      const json = await axios.post('https://bot.lyo.su/quote/generate', quoteObj, { headers: { 'Content-Type': 'application/json' } });
      const buffer = Buffer.from(json.data.result.image, 'base64');
      const user = db.users[m.sender] || {}
      const name = user.name || m.sender.split('@')[0];
      const meta1 = user.metadatos ? String(user.metadatos).trim() : '';
      const meta2 = user.metadatos2 ? String(user.metadatos2).trim() : '';
      let texto1 = meta1 ? meta1 : '💙 HATSUNE MIKU';
      let texto2 = meta1 ? (meta2 ? meta2 : '') : `@${name}`;
      const tmpFile = `./tmp/qc-${Date.now()}.webp`;
      fs.writeFileSync(tmpFile, buffer);
      const stats = fs.statSync(tmpFile);
      if (stats.size > 1000000) {
        fs.unlinkSync(tmpFile);
        await m.react('✖️');
        return m.reply(`💙 El sticker generado es demasiado grande (${Math.round(stats.size/1024)}KB). Intenta con un texto más corto.`);
      }
      try {
        await client.sendImageAsSticker(m.chat, tmpFile, m, { packname: texto1, author: texto2 });
        await m.react('✔️');
      } catch (stickerError) {
        if (stickerError.message?.includes('overlimit') || stickerError.message?.includes('too large')) {
          await m.react('✖️');
          m.reply(`💙 El sticker excede el límite de tamaño de WhatsApp. Intenta con un texto más corto.`);
        } else {
          throw stickerError;
        }
      }
      fs.unlinkSync(tmpFile);
    } catch (e) {
      await m.react('✖️');
      return m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`);
    }
  }
};
