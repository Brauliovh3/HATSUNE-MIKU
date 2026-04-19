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
    for (const mem of participants) {
      const jid = typeof mem.id === 'string' && mem.id.includes(':') ? mem.id.split(':')[0] + '@s.whatsapp.net' : mem.id;
      const phone = jid.split('@')[0];
      const userData = global.db.data.users[jid];
      const name = userData ? userData.name : (mem.notify || `@${phone}`);
      teks += `│ 💙 ${name}\n`
    }
    teks += `╰────────────────╯`
    return client.reply(m.chat, teks, m, global.miku, { mentions: [m.sender, ...participants.map(p => p.id)] })
  }
}