import axios from 'axios';
import fetch from 'node-fetch';

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 404) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default {
  command: ['nsfwloli', 'nsfwfoot', 'nsfwass', 'nsfwbdsm', 'nsfwcum', 'nsfwero', 'nsfwfemdom', 'nsfwglass', 'nsfworgy', 'yuri', 'yuri2', 'yaoi', 'yaoi2', 'panties', 'tetas', 'booty', 'ecchi', 'furro', 'hentai', 'trapito', 'imagenlesbians', 'pene', 'porno', 'randomxxx', 'pechos'],
  category: 'nsfw',
  run: async (client, m, args, usedPrefix, command) => {
    if (!global.db.data.chats[m.chat].nsfw) return m.reply(`💙 El contenido *NSFW* está desactivado en este grupo.\n\nUn *administrador* puede activarlo con el comando:\n» *${usedPrefix}nsfw on*`);

    try {
      if (command == 'nsfwloli') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwloli.json`)).data;
          const haha = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: haha}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'nsfwfoot') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwfoot.json`)).data;
          const haha = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: haha}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'nsfwass') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwass.json`)).data;
          const haha = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: haha}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'nsfwbdsm') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwbdsm.json`)).data;
          const haha = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: haha}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'nsfwcum') {
        const res = `https://api-fgmods.ddns.net/api/nsfw/cum?apikey=fg-dylux`;
        client.sendMessage(m.chat, {image: {url: res}, caption: `_${command}_`.trim()}, {quoted: m});
      }

      if (command == 'nsfwero') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwero.json`)).data;
          const haha = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: haha}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'nsfwfemdom') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwfemdom.json`)).data;
          const haha = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: haha}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'nsfwglass') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwglass.json`)).data;
          const haha = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: haha}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'hentai') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/hentai.json`)).data;
          const haha = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: haha}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          const res = await fetch(`https://api.waifu.pics/nsfw/waifu`);
          const json = await res.json();
          const url = json.url;
          client.sendMessage(m.chat, {image: {url: url}, caption: `_${command}_`.trim()}, {quoted: m});
        }
      }

      if (command == 'nsfworgy') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfworgy.json`)).data;
          const haha = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: haha}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'tetas') {
        try {
          const resError = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/tetas.json`)).data;
          let res = await (await fetch(`https://api-fgmods.ddns.net/api/nsfw/boobs?apikey=fg-dylux`)).json();
          res = res.url || res;
          if (res == '' || !res || res == null) res = await resError[Math.floor(resError.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: res}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'booty') {
        try {
          const resError = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/booty.json`)).data;
          let res = await (await fetch(`https://api-fgmods.ddns.net/api/nsfw/ass?apikey=fg-dylux`)).json();
          res = res.url || res;
          if (res == '' || !res || res == null) res = await resError[Math.floor(resError.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: res}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'ecchi') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/ecchi.json`)).data;
          const url = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: url}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'furro') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/furro.json`)).data;
          const url = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: url}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'trapito') {
        const res = await fetch(`https://api.waifu.pics/nsfw/trap`);
        const json = await res.json();
        const url = json.url;
        client.sendMessage(m.chat, {image: {url: url}, caption: `_${command}_`.trim()}, {quoted: m});
      }

      if (command == 'imagenlesbians') {
        try {
          const resError = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/imagenlesbians.json`)).data;
          let res = await (await fetch(`https://api-fgmods.ddns.net/api/nsfw/lesbian?apikey=fg-dylux`)).json();
          res = res.url || res;
          if (res == '' || !res || res == null) res = await resError[Math.floor(resError.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: res}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'panties') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/panties.json`)).data;
          const url = await res[Math.floor(res.length * Math.random())];
          await client.sendMessage(m.chat, {image: {url: url}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch (imgError) {
          m.reply(`💙 Error al cargar la imagen. La URL puede haber expirado.`);
        }
      }

      if (command == 'pene') {
        const res = `https://api-fgmods.ddns.net/api/adult/pene?apikey=fg-dylux`;
        client.sendMessage(m.chat, {image: {url: res}, caption: `_${command}_`.trim()}, {quoted: m});
      }

      if (command == 'porno') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/porno.json`)).data;
          const url = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: url}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'randomxxx') {
        try {
          const rawjsonn = ['https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/tetas.json', 'https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/booty.json', 'https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/imagenlesbians.json', 'https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/panties.json', 'https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/porno.json'];
          const rawjson = await rawjsonn[Math.floor(rawjsonn.length * Math.random())];
          const res = (await axios.get(rawjson)).data;
          const url = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: url}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'pechos') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/pechos.json`)).data;
          const url = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: url}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'yaoi') {
        try {
          const res = await fetch(`https://nekobot.xyz/api/image?type=yaoi`);
          const json = await res.json();
          const url = json.message;
          client.sendMessage(m.chat, {image: {url: url}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'yaoi2') {
        try {
          const res = await fetch(`https://purrbot.site/api/img/nsfw/yaoi/gif`);
          const json = await res.json();
          const url = json.link;
          client.sendMessage(m.chat, {image: {url: url}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'yuri') {
        try {
          const res = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/yuri.json`)).data;
          const url = await res[Math.floor(res.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: url}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }

      if (command == 'yuri2') {
        try {
          const resError = (await axios.get(`https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/yuri.json`)).data;
          const res = await fetch(`https://purrbot.site/api/img/nsfw/yuri/gif`);
          const json = await res.json();
          let url = json.link;
          if (url == '' || !url || url == null) url = await resError[Math.floor(resError.length * Math.random())];
          client.sendMessage(m.chat, {image: {url: url}, caption: `_${command}_`.trim()}, {quoted: m});
        } catch {
          m.reply('💙 Error al cargar la imagen. El servicio no está disponible.');
        }
      }
    } catch (e) {
      m.reply(`💙 Error al obtener la imagen. Intenta nuevamente.`);
    }
  }
};
