let handler = async (client, m) => {
  if (!m.isGroup) {
    return m.reply('💙 Este comando solo funciona en grupos.');
  }

  const groupMetadata = await client.groupMetadata(m.chat).catch(() => null);
  if (!groupMetadata) {
    return m.reply('💙 No se pudo obtener la información del grupo.');
  }

  const groupAdmins = groupMetadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
  const groupOwner = groupMetadata.participants.find(p => p.admin === 'superadmin');

  if (groupAdmins.length === 0) {
    return m.reply('💙 Este grupo no tiene administradores.');
  }

  let message = `👑 *LISTA DE ADMINISTRADORES* 👑\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `📛 *Grupo:* ${groupMetadata.subject}\n`;
  message += `👥 *Miembros:* ${groupMetadata.participants.length}\n`;
  message += `👑 *Admins:* ${groupAdmins.length}\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;

  if (groupOwner) {
    const ownerNumber = groupOwner.id.split('@')[0];
    const ownerName = groupOwner.notify || groupOwner.name || ownerNumber;
    message += `👑 *OWNER/CREADOR*\n`;
    message += `👤 @${ownerNumber}\n`;
    message += `📛 ${ownerName}\n\n`;
  }

  message += `⭐ *ADMINISTRADORES*\n`;
  groupAdmins.forEach((admin, index) => {
    const adminNumber = admin.id.split('@')[0];
    const adminName = admin.notify || admin.name || adminNumber;
    const role = admin.admin === 'superadmin' ? '👑 Owner' : '⭐ Admin';
    const num = (index + 1).toString().padStart(2, '0');
    message += `${num}. ${role}\n`;
    message += `   👤 @${adminNumber}\n`;
    message += `   📛 ${adminName}\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `💙 *Hatsune Miku Bot*\n`;
  message += `━━━━━━━━━━━━━━━━━━`;

  const mentions = groupAdmins.map(a => a.id);
  if (groupOwner) mentions.push(groupOwner.id);

  await client.sendFile(
    m.chat,
    'https://images.alphacoders.com/131/thumb-1920-1314831.jpg',
    'admins.jpg',
    message,
    m,
    false,
    { mentions }
  );
};

export default {
  command: ['admins', 'adminlist', 'listadmin'],
  category: 'grupo',
  run: handler
};
