const FISH_SHOP_ITEMS = {
  'caña basica': { name: 'Caña Básica', price: 0, type: 'rod', bonus: 0, emoji: '🎣' },
  'caña mejorada': { name: 'Caña Mejorada', price: 50000, type: 'rod', bonus: 5, emoji: '🎣' },
  'caña profesional': { name: 'Caña Profesional', price: 150000, type: 'rod', bonus: 12, emoji: '🎣' },
  'caña legendaria': { name: 'Caña Legendaria', price: 500000, type: 'rod', bonus: 25, emoji: '🎣' },
  'cebos': { name: 'Cebos (+10% épico)', price: 10000, type: 'bait', bonus: 10, emoji: '🪤' },
  'red': { name: 'Red de Pesca', price: 25000, type: 'net', bonus: 15, emoji: '🕸️' },
  'anillo': { name: 'Anillo de Suerte', price: 100000, type: 'accessory', bonus: 20, emoji: '💍' }
}

export default {
  command: ['pescaderia', 'tienda pesca', 'fishshop'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    const user = chat.users[m.sender]
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const currency = global.db.data.settings[botId].currency
    
    if (chat.adminonly || !chat.economy) {
      return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    }

    user.coins ||= 0
    
    let text = `🐟 *PESCADERÍA* 🐟\n\n`
    text += `💰 *Tu saldo:* 🌱${user.coins.toLocaleString()} ${currency}\n\n`
    text += `*CAÑAS DE PESCAR:*\n`
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`
    text += `🎣 •Caña Básica• - 0 (Ya tienes)\n`
    text += `🎣 •Caña Mejorada• - 🌱50,000\n`
    text += `🎣 •Caña Profesional• - 🌱150,000\n`
    text += `🎣 •Caña Legendaria• - 🌱500,000\n\n`
    text += `*ARTÍCULOS ESPECIALES:*\n`
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`
    text += `🪤 •Cebos• - 🌱10,000 (+10% épico)\n`
    text += `🕸️ •Red de Pesca• - 🌱25,000 (+15% rareza)\n`
    text += `💍 •Anillo de Suerte• - 🌱100,000 (+20% ultra)\n\n`
    text += `💡 *Comprar:* ${usedPrefix}comprar [nombre]\n`
    text += `Ejemplo: ${usedPrefix}comprar caña mejorada`
    
    await client.sendMessage(m.chat, { text }, { quoted: m })
  },
}

export async function buyFishingItem(client, m, itemName, usedPrefix) {
  const chat = global.db.data.chats[m.chat]
  const user = chat.users[m.sender]
  const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
  const currency = global.db.data.settings[botId].currency
  
  user.coins ||= 0
  
  const itemKey = Object.keys(FISH_SHOP_ITEMS).find(k => 
    itemName.toLowerCase().includes(k) || k.includes(itemName.toLowerCase())
  )
  
  if (!itemKey) {
    return m.reply(`💙 Artículo no encontrado en la pescadería.\n\nUsa *${usedPrefix}pescaderia* para ver los artículos disponibles.`)
  }
  
  const item = FISH_SHOP_ITEMS[itemKey]
  
  if (user.coins < item.price) {
    return m.reply(`💙 No tienes suficientes monedas.\n\nNecesitas: 🌱${item.price.toLocaleString()}\nTu saldo: 🌱${user.coins.toLocaleString()}`)
  }
  
  if (item.type === 'rod') {
    user.fishingRod = itemKey.replace('caña ', '').replace('caña', 'basic')
    if (user.fishingRod === 'basic') user.fishingRod = 'basic'
    if (itemKey.includes('mejorada')) user.fishingRod = 'improved'
    if (itemKey.includes('profesional')) user.fishingRod = 'pro'
    if (itemKey.includes('legendaria')) user.fishingRod = 'legendary'
  }
  
  if (item.type === 'bait') {
    user.fishingBait = (user.fishingBait || 0) + 10
  }
  
  if (item.type === 'net') {
    user.fishingNet = true
  }
  
  if (item.type === 'accessory') {
    user.fishingRing = true
  }
  
  user.coins -= item.price
  
  await m.reply(`💙 *COMPRA REALIZADA!* 💙

${item.emoji} *Artículo:* ${item.name}
💰 *Precio:* 🌱${item.price.toLocaleString()}
✨ *Bonus:* +${item.bonus}% rareza

¡Tu equipo de pesca ha mejorado!`)
}
