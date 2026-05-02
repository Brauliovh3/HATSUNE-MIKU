import fetch from 'node-fetch'

const _0x3c4d = [68,69,80,79,79,76,45,107,101,121,54,48,48,49,53,48,57,49].map(c => String.fromCharCode(c)).join('');
const API_URL = `https://api.alyacore.xyz/nsfw/waifu?key=${encodeURIComponent(_0x3c4d)}`

function isValidUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

async function getCalataImage() {
  const res = await fetch(API_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'image/*,application/json,text/plain;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const contentType = String(res.headers.get('content-type') || '').toLowerCase()

  if (contentType.startsWith('image/')) {
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1024) throw new Error('La API devolvio una imagen vacia')
    return { type: 'buffer', data: buffer }
  }

  if (contentType.includes('application/json') || contentType.includes('text/json')) {
    const json = await res.json()
    if (json?.status === false) {
      throw new Error(json?.message || 'AlyaCore devolvio un error')
    }
    const imageUrl =
      json?.data?.url ||
      json?.data?.image ||
      json?.data?.media ||
      json?.data?.result ||
      json?.result?.url ||
      json?.result?.image ||
      json?.result?.media ||
      json?.url ||
      json?.image

    if (isValidUrl(imageUrl)) {
      return { type: 'url', data: imageUrl }
    }
  }

  const text = (await res.text()).trim()
  if (isValidUrl(text)) {
    return { type: 'url', data: text }
  }

  throw new Error('La API no devolvio una imagen valida')
}

export default {
  command: ['waifu', 'calata', 'waifunsfw'],
  category: 'nsfw',
  nsfw: true,
  run: async (client, m, args, usedPrefix) => {
    try {
      
      await m.react('🕒')
      const image = await getCalataImage()
      await client.sendMessage(
        m.chat,
        {
          image: image.type === 'buffer' ? image.data : { url: image.data },
          caption: `� *WAIFU NSFW*\n\n💙 Solicitado por: @${m.sender.split('@')[0]}`,
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
