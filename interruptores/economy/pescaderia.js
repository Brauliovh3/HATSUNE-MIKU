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
    
    const shopImage = 'https://files.catbox.moe/ir0e22.png'
    
    if (chat.adminonly || !chat.economy) {
      return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    }

    user.coins ||= 0
    
    const buttons = [
      ['🎣 CAÑAS', 'shop_canas'],
      ['🪤 ARTÍCULOS', 'shop_items'],
      ['🎒 MI EQUIPO', 'shop_miEquipo'],
      ['🔙 VOLVER', 'shop_main']
    ]
    
    const rodName = { basic: 'Básica', improved: 'Mejorada', pro: 'Profesional', legendary: 'Legendaria' }[user.fishingRod] || 'Básica'
    
    let equipText = `\n🎣 *Caña:* ${rodName}`
    if (user.fishingBait) equipText += `\n🪤 *Cebos:* ${user.fishingBait} (+${FISH_SHOP_ITEMS.cebos.bonus}% épico)`
    if (user.fishingNet) equipText += `\n🕸️ *Red:* ✅`
    if (user.fishingRing) equipText += `\n💍 *Anillo:* ✅`
    
    const text = `🐟 *PESCADERÍA* 🐟\n\n💰 *Tu saldo:* 🌱${user.coins.toLocaleString()} ${currency}${equipText}\n\n🎯 *Selecciona una categoría:*`
    
    await client.sendButton(
      m.chat,
      text,
      '🛒 Tienda de Pesca - Hatsune Miku Bot',
      shopImage,
      buttons,
      null,
      null,
      m
    )
  },
}

export async function processFishingShopButton(conn, m) {
  const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net'
  const currency = global.db.data.settings[botId]?.currency || 'MONEDA'
  
  let buttonId = m.body || m.text || null
  if (m.message?.buttonsResponseMessage?.selectedButtonId) {
    buttonId = m.message.buttonsResponseMessage.selectedButtonId
  }
  if (m.message?.templateButtonReplyMessage?.selectedId) {
    buttonId = m.message.templateButtonReplyMessage.selectedId
  }
  if (m.message?.interactiveResponseMessage) {
    try {
      const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson
      if (paramsJson) {
        const params = JSON.parse(paramsJson)
        if (params?.id) buttonId = params.id
      }
    } catch (e) {}
  }
  
  console.log('[PESCADERIA] buttonId:', buttonId)
  
  if (!buttonId || (!buttonId.startsWith('shop_') && !buttonId.startsWith('buy_'))) {
    console.log('[PESCADERIA] No procesar, buttonId:', buttonId)
    return false
  }
  
  const chat = global.db.data.chats[m.chat]
  if (!chat || !chat.users || !chat.users[m.sender]) {
    return conn.sendMessage(m.chat, { text: 'Error: usuario no encontrado. Usa .pescaderia primero.' }, { quoted: m })
  }
  const user = chat.users[m.sender]
  user.coins ||= 0
  
  if (buttonId === 'shop_canas') {
    const rodName = { basic: 'Básica', improved: 'Mejorada', pro: 'Profesional', legendary: 'Legendaria' }[user.fishingRod] || 'Básica'
    const currentRod = user.fishingRod || 'basic'
    
    const buttons = [
      ['🎣 Caña Mejorada - 50,000', 'buy_improved'],
      ['🎣 Caña Profesional - 150,000', 'buy_pro'],
      ['🎣 Caña Legendaria - 500,000', 'buy_legendary'],
      ['🔙 Volver', 'shop_main']
    ]
    
    await conn.sendButton(
      m.chat,
      `🎣 *CAÑAS DE PESCAR*\n\n💰 Saldo: 🌱${user.coins.toLocaleString()} ${currency}\n🎯 Actual: ${rodName}`,
      '🛒 Tienda de Pesca - Hatsune Miku Bot',
      null,
      buttons,
      null,
      null,
      m
    )
    return true
  }
  
  if (buttonId === 'shop_items') {
    const buttons = [
      ['🪤 Cebos - 10,000', 'buy_cebos'],
      ['🕸️ Red de Pesca - 25,000', 'buy_red'],
      ['💍 Anillo de Suerte - 100,000', 'buy_anillo'],
      ['🔙 Volver', 'shop_main']
    ]
    
    await conn.sendButton(
      m.chat,
      `🪤 *ARTÍCULOS ESPECIALES*\n\n💰 Saldo: 🌱${user.coins.toLocaleString()} ${currency}`,
      '🛒 Tienda de Pesca - Hatsune Miku Bot',
      null,
      buttons,
      null,
      null,
      m
    )
    return true
  }
  
  if (buttonId === 'shop_miEquipo') {
    const rodName = { basic: 'Caña Básica', improved: 'Caña Mejorada', pro: 'Caña Profesional', legendary: 'Caña Legendaria' }[user.fishingRod] || 'Caña Básica'
    
    let text = `🎒 *TU EQUIPO DE PESCA*\n\n`
    text += `🎣 *Caña:* ${rodName}\n`
    text += `🪤 *Cebos:* ${user.fishingBait || 0}\n`
    text += `🕸️ *Red:* ${user.fishingNet ? '✅ Comprada' : '❌ No disponible'}\n`
    text += `💍 *Anillo:* ${user.fishingRing ? '✅ Comprado' : '❌ No disponible'}\n\n`
    text += `💰 *Saldo:* 🌱${user.coins.toLocaleString()} ${currency}`
    
    const buttons = [['🔙 Volver', 'shop_main']]
    
    await conn.sendButton(
      m.chat,
      text,
      '🛒 Tienda de Pesca - Hatsune Miku Bot',
      null,
      buttons,
      null,
      null,
      m
    )
    return true
  }
  
  if (buttonId === 'shop_main') {
    const { default: shopCmd } = await import('./pescaderia.js')
    return await shopCmd.run(conn, m, [], global.prefix || '.', 'pescaderia')
  }
  
  if (buttonId.startsWith('buy_')) {
    const itemKey = buttonId.replace('buy_', '')
    const itemMap = {
      'improved': 'caña mejorada',
      'pro': 'caña profesional',
      'legendary': 'caña legendaria',
      'cebos': 'cebos',
      'red': 'red',
      'anillo': 'anillo'
    }
    const itemName = itemMap[itemKey] || itemKey
    return buyFishingItem(conn, m, itemName, global.prefix || '.')
  }
  
  return false
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
