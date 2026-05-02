import fetch from 'node-fetch'

const API_BASE = 'https://api.alyacore.xyz/nsfw'

async function getNekoNsfwImage() {
  try {
    const response = await fetch(`${API_BASE}/neko`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'image/*'
      }
    })
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length < 1000) throw new Error('Imagen vacía')
    
    return buffer
  } catch (error) {
    console.error(`[AlyaNekoNSFW] Error:`, error.message)
    return null
  }
}

export default {
  command: ['nekonsfw', 'nsfwneko', 'lewdneko'],
  category: 'nsfw',
  nsfw: true,
  run: async (client, m, args, usedPrefix, command) => {
    try {
      await m.react('🔞')
      
      const image = await getNekoNsfwImage()
      
      if (!image) {
        await m.react('❌')
        return m.reply(`❌ No se pudo obtener la imagen de *NEKO NSFW*\n\nInténtalo de nuevo más tarde.`)
      }
      
      await client.sendMessage(m.chat, {
        image: image,
        caption: `🔞 *NEKO NSFW*\n\n💙 Solicitado por: @${m.sender.split('@')[0]}`,
        mentions: [m.sender]
      }, { quoted: m })
      
      await m.react('✅')
      
    } catch (error) {
      console.error('[AlyaNekoNSFW] Error:', error)
      await m.react('❌')
      m.reply(`❌ Error: ${error.message}`)
    }
  }
}
