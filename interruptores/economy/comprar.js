import { buyFishingItem } from './pescaderia.js'

const SHOP_ITEMS = {
  'caña basica': { name: 'Caña Básica', price: 0, type: 'rod', bonus: 0 },
  'caña mejorada': { name: 'Caña Mejorada', price: 50000, type: 'rod', bonus: 5 },
  'caña profesional': { name: 'Caña Profesional', price: 150000, type: 'rod', bonus: 12 },
  'caña legendaria': { name: 'Caña Legendaria', price: 500000, type: 'rod', bonus: 25 },
  'cebos': { name: 'Cebos', price: 10000, type: 'bait', bonus: 10 },
  'red': { name: 'Red de Pesca', price: 25000, type: 'net', bonus: 15 },
  'anillo': { name: 'Anillo de Suerte', price: 100000, type: 'accessory', bonus: 20 }
}

export default {
  command: ['comprar', 'buy'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    const user = chat.users[m.sender]
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const currency = global.db.data.settings[botId].currency
    const itemName = args.join(' ').toLowerCase()
    
    if (chat.adminonly || !chat.economy) {
      return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    }
    
    if (!itemName) {
      return m.reply(`💙 *USO:* ${usedPrefix}comprar [artículo]\n\n💡 *Artículos de pesca:*\n• caña mejorada - 50,000\n• caña profesional - 150,000\n• caña legendaria - 500,000\n• cebos - 10,000\n• red - 25,000\n• anillo - 100,000\n\n🎣 Ver tienda completa: ${usedPrefix}pescaderia`)
    }
    
    const fishItemKeys = ['caña', 'cebos', 'red', 'anillo']
    if (fishItemKeys.some(k => itemName.includes(k))) {
      return buyFishingItem(client, m, itemName, usedPrefix)
    }
    
    user.coins ||= 0
    
    const shopItem = Object.entries(SHOP_ITEMS).find(([k]) => 
      itemName.includes(k) || k.includes(itemName)
    )
    
    if (!shopItem) {
      return m.reply(`💙 Artículo no encontrado.\n\n🎣 *Artículos de pesca:* ${usedPrefix}pescaderia`)
    }
    
    const [key, item] = shopItem
    
    if (user.coins < item.price) {
      return m.reply(`💙 No tienes suficientes monedas.\n\nNecesitas: 🌱${item.price.toLocaleString()}\nTu saldo: 🌱${user.coins.toLocaleString()}`)
    }
    
    user.coins -= item.price
    
    await m.reply(`💙 *COMPRA REALIZADA!* 💙

✨ *Artículo:* ${item.name}
💰 *Precio:* 🌱${item.price.toLocaleString()}
🎁 *Bonus:* +${item.bonus}%`)
  },
}
