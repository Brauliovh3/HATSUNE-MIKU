export default {
  command: ['todos', 'invocar', 'tagall'],
  category: 'grupo',
  isAdmin: true,
  run: async (client, m, args) => {
    const groupInfo = await client.groupMetadata(m.chat)
    const participants = groupInfo.participants
    const pesan = args.join(' ')
    let teks = `💙 *HATSUNE MIKU CALL* 💙\n\n${pesan || '¡Mencionando a todos!'}\n\n💙 *Miembros:* ${participants.length}\n💙 *Solicitado por:* @${m.sender.split('@')[0]}\n\n` +
      `╭───『 *LISTA* 』───╮\n`
    const mentions = []
    
    for (const mem of participants) {
      const rawJid = mem.jid || mem.id || mem.lid || mem.phoneNumber
      if (!rawJid) continue
      
      const decodedJid = client.decodeJid ? client.decodeJid(rawJid) : rawJid
      
     
      let realJid = decodedJid
      if (decodedJid.includes('@lid')) {
        const lidKey = Object.keys(global.db.data.users).find(key => key.includes(decodedJid.split('@')[0]))
        if (lidKey) realJid = lidKey
      }
      
      const phone = realJid.split('@')[0]
      
      
      let name = null
      
      
      const userData = global.db.data.users[realJid] || global.db.data.users[decodedJid]
      if (userData?.name) name = userData.name
      
      
      if (!name && mem.notify) name = mem.notify
      
     
      if (!name && client.getName) {
        try {
          const contactName = await client.getName(realJid)
          if (contactName && !contactName.includes('+')) name = contactName
        } catch {}
      }
      
     
      if (!name) name = phone
      
      
      if (name.includes(':') || name.includes('@lid') || name.includes('@s.whatsapp')) {
        name = phone
      }
      
      teks += `│ 💙 ${name}\n`
      mentions.push(decodedJid)
    }
    
    teks += `╰────────────────╯`
    return client.reply(m.chat, teks, m, global.miku, { mentions: [m.sender, ...mentions] })
  }
}