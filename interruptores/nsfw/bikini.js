import fetch from 'node-fetch'

const _0x3c4d = [68,69,80,79,79,76,45,107,101,121,54,48,48,49,53,48,57,49].map(c => String.fromCharCode(c)).join('');
const API_BASE = 'https://api.alyacore.xyz/nsfw/bikini'

async function getBikiniImage() {
  try {
    const response = await fetch(`${API_BASE}?cat=bikini&key=${_0x3c4d}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'image/*,text/plain'
      }
    })
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const contentType = response.headers.get('content-type') || ''
    
  
    if (contentType.includes('image')) {
      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length < 1000) throw new Error('Imagen vacía')
      return { type: 'buffer', data: buffer }
    }
    
 
    const text = await response.text()
    if (text.startsWith('http')) {
      return { type: 'url', data: text.trim() }
    }
    
    throw new Error('Formato de respuesta no válido')
  } catch (error) {
    console.error(`[AlyaBikini] Error:`, error.message)
    return null
  }
}

export default {
  command: ['bikini', 'nsfwbikini'],
  category: 'nsfw',
  nsfw: true,
  run: async (client, m, args, usedPrefix, command) => {
    try {
      await m.react('🔞')
      
      const image = await getBikiniImage()
      
      if (!image) {
        await m.react('❌')
        return m.reply(`❌ No se pudo obtener la imagen de *BIKINI*\n\nInténtalo de nuevo más tarde.`)
      }
      
      await client.sendMessage(m.chat, {
        image: image.type === 'buffer' ? image.data : { url: image.data },
        caption: `🔞 *BIKINI*\n\n💙 Solicitado por: @${m.sender.split('@')[0]}`,
        mentions: [m.sender]
      }, { quoted: m })
      
      await m.react('✅')
      
    } catch (error) {
      console.error('[AlyaBikini] Error:', error)
      await m.react('❌')
      m.reply(`❌ Error: ${error.message}`)
    }
  }
}
