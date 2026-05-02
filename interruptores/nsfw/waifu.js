import fetch from 'node-fetch'

const _0x3c4d = [68,69,80,79,79,76,45,107,101,121,54,48,48,49,53,48,57,49].map(c => String.fromCharCode(c)).join('');
const API_URL = `https://api.alyacore.xyz/nsfw/waifu?key=${encodeURIComponent(_0x3c4d)}`

async function getCalataImage() {
  const res = await fetch(API_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'image/*'
    },
    redirect: 'follow',
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length < 1024) throw new Error('La API devolvio una imagen vacia')
  return buffer
}

export default {
  command: ['waifunsfw', 'calata'],
  category: 'nsfw',
  nsfw: true,
  run: async (client, m, args, usedPrefix) => {
    try {
      
      await m.react('🕒')
      const image = await getCalataImage()
      await client.sendMessage(
        m.chat,
        {
          image: image,
          caption: `💙 *WAIFU NSFW*\n\n💙 Solicitado por: @${m.sender.split('@')[0]}`,
          mentions: [m.sender],
        },
        { quoted: m }
      )
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      await m.reply(
        `> Ocurrió un error al ejecutar el comando *${usedPrefix}calata*.\n> [Error: *${e.message}*]`,
        m,
        global.miku
      )
    }
  },
}
