import fetch from 'node-fetch'

const API_BASE = 'https://api.alyacore.xyz/nsfw'

async function getPussyImage() {
  try {
    const response = await fetch(`${API_BASE}/pussy`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json,image/*'
      }
    })
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const contentType = response.headers.get('content-type') || ''
    
    if (contentType.includes('image')) {
      const buffer = Buffer.from(await response.arrayBuffer())
      return { type: 'buffer', data: buffer }
    }
    
    const json = await response.json()
    const url = json?.url || json?.image || json?.data?.url || json?.data?.image
    
    if (url && url.startsWith('http')) {
      return { type: 'url', data: url }
    }
    
    throw new Error('No se pudo obtener la imagen')
  } catch (error) {
    console.error(`[AlyaPussy] Error:`, error.message)
    return null
  }
}

export default {
  command: ['pussy', 'coño', 'vagina'],
  category: 'nsfw',
  nsfw: true,
  run: async (client, m, args, usedPrefix, command) => {
    try {
      await m.react('🔞')
      
      const image = await getPussyImage()
      
      if (!image) {
        await m.react('❌')
        return m.reply(`❌ No se pudo obtener la imagen de *PUSSY*\n\nInténtalo de nuevo más tarde.`)
      }
      
      await client.sendMessage(m.chat, {
        image: image.type === 'buffer' ? image.data : { url: image.data },
        caption: `🔞 *PUSSY*\n\n💙 Solicitado por: @${m.sender.split('@')[0]}`,
        mentions: [m.sender]
      }, { quoted: m })
      
      await m.react('✅')
      
    } catch (error) {
      console.error('[AlyaPussy] Error:', error)
      await m.react('❌')
      m.reply(`❌ Error: ${error.message}`)
    }
  }
}
