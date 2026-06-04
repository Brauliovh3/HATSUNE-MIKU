import fetch from 'node-fetch'

const _0x3c4d = [].map(c => String.fromCharCode(c)).join('');
const API_BASE = 'https://api.alyacore.xyz/nsfw/image'

async function getWaifuImage() {
  const res = await fetch(`${API_BASE}?cat=waifu&key=${_0x3c4d}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'image/*,text/plain'
    },
    redirect: 'follow',
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  
  const contentType = res.headers.get('content-type') || ''
  
  
  if (contentType.includes('image')) {
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1024) throw new Error('La API devolvio una imagen vacia')
    return { type: 'buffer', data: buffer }
  }
  

  const text = await res.text()
  if (text.startsWith('http')) {
    return { type: 'url', data: text.trim() }
  }
  
  throw new Error('Formato de respuesta no válido')
}

export default {
  command: ['waifunsfw', 'calata'],
  category: 'nsfw',
  nsfw: true,
  run: async (client, m, args, usedPrefix) => {
    try {
      
      await m.react('🕒')
      const image = await getWaifuImage()
      await client.sendMessage(
        m.chat,
        {
          image: image.type === 'buffer' ? image.data : { url: image.data },
          caption: `🔞 *WAIFU NSFW* (AlyaCore)\n\n💙 Solicitado por: @${m.sender.split('@')[0]}`,
          mentions: [m.sender],
        },
        { quoted: m }
      )
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      await m.reply(
        `> Error en *${usedPrefix}waifunsfw*: *${e.message}*`,
        m,
        global.miku
      )
    }
  },
}
