import fetch from 'node-fetch'

async function getWaifuImage(type) {
  const baseUrl = type === 'nsfw' 
    ? 'https://api.alyacore.xyz/nsfw/image'
    : 'https://api.alyacore.xyz/sfw/image'
    
  const res = await fetch(`${baseUrl}?cat=waifu`, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'image/*,text/plain'
    },
    redirect: 'follow'
  })
  
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  
  const contentType = res.headers.get('content-type') || ''
  
  
  if (contentType.includes('image')) {
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1000) throw new Error('Imagen vacía')
    return { type: 'buffer', data: buffer }
  }
  
  
  const text = await res.text()
  if (text.startsWith('http')) {
    return { type: 'url', data: text.trim() }
  }
  
  throw new Error('Formato de respuesta no válido')
}

export default {
  command: ['waifu'],
  category: 'anime',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      await m.react('🕒')
      
      const isNSFW = global.db?.data?.chats?.[m.chat]?.nsfw || false
      const image = await getWaifuImage(isNSFW ? 'nsfw' : 'sfw')
      
      const caption = isNSFW 
        ? `🔞 *WAIFU NSFW*\n\n💙 Solicitado por: @${m.sender.split('@')[0]}`
        : `💙 Aquí tienes tu *WAIFU* 💙^•ﻌ•^💙`
      
      await client.sendMessage(m.chat, {
        image: image.type === 'buffer' ? image.data : { url: image.data },
        caption: caption,
        mentions: [m.sender]
      }, { quoted: m })
      
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      await m.reply(`💙 Error al obtener waifu: *${e.message}*`)
    }
  },
}