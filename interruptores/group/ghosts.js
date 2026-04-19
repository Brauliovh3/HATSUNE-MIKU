export default {
  command: ['fantasmas', 'ghosts', 'inactivos'],
  category: 'group',
  run: async (client, m, args, usedPrefix, command) => {
    if (!m.isGroup) return m.reply('💙 Este comando solo funciona en grupos.', m);

    const groupMetadata = await client.groupMetadata(m.chat);
    const participants = groupMetadata.participants;
    const inactiveDays = 30; 
    const now = Date.now();
    const inactiveThreshold = now - (inactiveDays * 24 * 60 * 60 * 1000);

    let inactiveUsers = [];

    for (const participant of participants) {
      const jid = participant.id;
      const userId = jid.split('@')[0];
      
      
      const userData = global.db.data.users[jid];
      
      if (userData) {
        const lastActivity = userData.lastMessage || userData.lastseen || 0;
        if (lastActivity < inactiveThreshold && !participant.admin) {
          const name = userData.name || participant.notify || `+${userId}`;
          inactiveUsers.push({
            name: name,
            number: userId,
            lastActivity: lastActivity,
            daysInactive: Math.floor((now - lastActivity) / (24 * 60 * 60 * 1000))
          });
        }
      }
    }

    if (inactiveUsers.length === 0) {
      return m.reply('💙 No hay usuarios inactivos en el grupo (más de 30 días sin actividad).', m);
    }

    
    inactiveUsers.sort((a, b) => b.daysInactive - a.daysInactive);

    let message = `╭━━━👻 FANTASMAS DEL GRUPO 👻━━━╮\n│\n`;
    message += `│ 💙 *${groupMetadata.subject}*\n`;
    message += `│ 📊 Total inactivos: *${inactiveUsers.length}*\n`;
    message += `│ ⏰ Umbral: *${inactiveDays} días* sin actividad\n`;
    message += `│\n`;
    message += `├━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n`;

    inactiveUsers.forEach((user, index) => {
      const num = (index + 1).toString().padStart(2, '0');
      message += `│ ${num}. 👤 ${user.name}\n`;
      message += `│    📱 +${user.number}\n`;
      message += `│    ⏳ ${user.daysInactive} días inactivo\n`;
      message += `│\n`;
    });

    message += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n`;
    message += `💙 Usa *${usedPrefix}kick* para eliminar usuarios inactivos.`;

    client.sendMessage(m.chat, { text: message }, { quoted: m });
  }
};
