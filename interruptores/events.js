import fetch from 'node-fetch'
let WAMessageStubType = (await import('@whiskeysockets/baileys')).default
import chalk from 'chalk'

const normalizeJidDigits = (jid = '') => String(jid).split(':')[0].replace(/\D/g, '');
const getBotJid = (client) => (client.user?.id?.split(':')[0] || client.user?.lid || '') + '@s.whatsapp.net';

const isPrimaryHandler = (client, chat) => {
  const assignedBot = chat?.primaryBot;
  if (!assignedBot) return true;
  const assignedBotClean = normalizeJidDigits(assignedBot);
  const currentBotClean = normalizeJidDigits(getBotJid(client));
  const isPrimaryConnected = global.conns?.some(c => {
    const connId = c.user?.id || c.userId;
    return normalizeJidDigits(connId) === assignedBotClean && c.isInit;
  });
  if (!isPrimaryConnected) return true;
  return assignedBotClean === currentBotClean;
};

const _welcomeQueue = []
let _welcomeRunning = false

async function drainWelcomeQueue() {
  if (_welcomeRunning) return
  _welcomeRunning = true
  while (_welcomeQueue.length > 0) {
    const task = _welcomeQueue.shift()
    try { await task() } catch {}
    await new Promise(r => setTimeout(r, 100))
  }
  _welcomeRunning = false
}

function queueWelcome(task) {
  _welcomeQueue.push(task)
  drainWelcomeQueue()
}

async function safeSend(client, jid, content, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await client.sendMessage(jid, content)
    } catch (err) {
      const msg = String(err?.message || '')
      if (msg.includes('rate-overlimit') || msg.includes('rate') || err?.data === 429) {
        if (i < retries) {
          const delay = Math.min(1500 * (i + 1), 5000)
          await new Promise(r => setTimeout(r, delay))
          continue
        }
      }
      return null
    }
  }
  return null
}

export default async (client, m) => {
  if (client._mikuEventsAttached) return
  client._mikuEventsAttached = true

  client.ev.on('group-participants.update', async (anu) => {
    try {
      if (!anu || !anu.id || !anu.participants || !Array.isArray(anu.participants)) {
        return;
      }

      if (client.ws?.socket?.readyState !== 1) {
        return;
      }

      const chat = global?.db?.data?.chats?.[anu.id] || {}
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const isSelf = global.db.data.settings[botId]?.self ?? false
      if (isSelf) return

      const action = anu.action
      const isRemove = action === 'remove' || action === 'leave'
      const hasKickAuthor = Boolean(anu.author)
      const shouldWelcome = action === 'add' && chat?.welcome
      const shouldGoodbye = isRemove && chat?.goodbye
      const shouldKickAlert = isRemove && hasKickAuthor && chat?.alerts
      const shouldAdminAlert = (action === 'promote' || action === 'demote') && chat?.alerts

      if (!shouldWelcome && !shouldGoodbye && !shouldKickAlert && !shouldAdminAlert) return
      if (!isPrimaryHandler(client, chat)) return

      let metadata = {};
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        metadata = await Promise.race([
          client.groupMetadata(anu.id),
          timeoutPromise
        ]);
      } catch (err) {
        metadata = { subject: 'Grupo', participants: [] };
      }

      const memberCount = metadata.participants?.length || 0;

      const botSettings = global.db.data.settings[botId] || {};
      const groupAdmins = metadata?.participants.filter(p => (p.admin === 'admin' || p.admin === 'superadmin')) || []

      for (const jid of anu.participants) {
        let validJid = jid;
        
        if (typeof jid === 'object' && jid !== null) {
          validJid = jid.phoneNumber || jid.id || jid;
        }
        
        if (typeof validJid === 'number') {
          validJid = `${validJid}@s.whatsapp.net`;
        }
        
        if (typeof validJid === 'string' && !validJid.includes('@')) {
          validJid = `${validJid}@s.whatsapp.net`;
        }
        
        if (!validJid || typeof validJid !== 'string' || !validJid.includes('@')) {
          continue;
        }
        
        const phone = validJid.split('@')[0];

        
        const contextInfo = {
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: botSettings.id || '120363315369913363@newsletter',
            serverMessageId: '0',
            newsletterName: botSettings.nameid || '💙 HATSUNE MIKU CHANNEL💙'
          },
          mentionedJid: [validJid]
        };
        
        if (shouldWelcome) {
          const customMessage = chat?.sWelcome ? chat.sWelcome.replace(/{usuario}/g, `@${phone}`).replace(/{grupo}/g, metadata.subject).replace(/{desc}/g, metadata?.desc || 'Sin descripción') : '';

          queueWelcome(async () => {
            try {
              const caption = customMessage || `╭━━━🌸━━━💙━━━🌸━━━╮
┃  🎵 *¡ Bienvenid${phone.endsWith('a') ? 'a' : 'o'} al grupo !* 🎵
╰━━━🌸━━━💙━━━🌸━━━╯
│
├◦ 🌸 *Usuario* ⟶ @${phone}
├◦ 💙 *Grupo* ⟶ ${metadata.subject || 'Grupo'}
├◦ 🌱 *Miembros* ⟶ Ahora somos ${memberCount}
│
├━━━━━━━━━━━━━━━━━━╮
│ 🌱 Usa */menu* para ver comandos.
│ 💙 ¡Que disfrutes tu estancia! ✨
╰━━━🌸━━━💙━━━🌸━━━╯`;
              await safeSend(client, anu.id, { image: { url: 'https://i.pinimg.com/736x/2d/f3/3d/2df33d05677675f88fcd6bc16444ad2b.jpg' }, caption, contextInfo })
            } catch {}
          })
        }
        
        if (isRemove && (shouldGoodbye || shouldKickAlert)) {
          const kicker = anu.author;
          const isKick = kicker && kicker !== validJid;

          const kickedParticipant = metadata?.participants?.find(p => p.id === validJid || p.phoneNumber === validJid || p.jid === validJid);
          const kickedName = kickedParticipant?.notify || kickedParticipant?.name || phone;

          const kickerParticipant = isKick ? metadata?.participants?.find(p => p.id === kicker || p.phoneNumber === kicker || p.jid === kicker) : null;
          const kickerPhone = kickerParticipant?.phoneNumber || kickerParticipant?.id?.split('@')[0] || (isKick ? kicker.split('@')[0] : '');
          const kickerName = kickerParticipant?.notify || kickerParticipant?.name || kickerPhone;

          const customMessage = chat?.sGoodbye ? chat.sGoodbye.replace(/{usuario}/g, `@${phone}`).replace(/{grupo}/g, metadata.subject).replace(/{desc}/g, metadata?.desc || 'Sin descripción') : '';
          const goodbyeImage = 'https://i.pinimg.com/736x/4a/f2/fa/4af2fad2fa327fca8a1c20c9ab4baadc.jpg';

          queueWelcome(async () => {
            try {
              if (isKick && shouldKickAlert) {
                const kickImage = 'https://i.pinimg.com/736x/4a/f2/fa/4af2fad2fa327fca8a1c20c9ab4baadc.jpg';
                const kickCaption = `╭━━━🌸━━━💙━━━🌸━━━╮
┃  ⚠️ *¡ Usuario Expulsado !* ⚠️
╰━━━🌸━━━💙━━━🌸━━━╯
│
├◦ 👤 *Expulsado* ⟶ @${phone}
├◦ 🚫 *Expulsado por* ⟶ @${kickerPhone}
├◦ 💙 *Grupo* ⟶ ${metadata.subject || 'Grupo'}
├◦ 🌱 *Miembros* ⟶ Ahora somos ${memberCount}
│
├━━━━━━━━━━━━━━━━━━╮
│ 🌸 El admin ha decidido
│ 💙 remover al usuario.
╰━━━🌸━━━💙━━━🌸━━━╯`;
                const kickContextInfo = {
                  isForwarded: true,
                  forwardedNewsletterMessageInfo: {
                    newsletterJid: botSettings.id || '120363315369913363@newsletter',
                    serverMessageId: '0',
                    newsletterName: botSettings.nameid || '💙 HATSUNE MIKU CHANNEL💙'
                  },
                  mentionedJid: [validJid, kicker, ...groupAdmins.map(v => v.id)]
                };
                await safeSend(client, anu.id, { image: { url: kickImage }, caption: kickCaption, contextInfo: kickContextInfo })
              } else if (!isKick && shouldGoodbye) {
                const caption = customMessage || `╭━━━🌸━━━💙━━━🌸━━━╮
┃  🎵 *¡ Hasta pronto !* 🎵
╰━━━🌸━━━💙━━━🌸━━━╯
│
├◦ 🌸 *Usuario* ⟶ @${phone}
├◦ 💙 *Grupo* ⟶ ${metadata.subject || 'Grupo'}
├◦ 🌱 *Miembros* ⟶ Ahora somos ${memberCount}
│
├━━━━━━━━━━━━━━━━━━╮
│ 🌸 Fue un placer tenerte aquí.
│ 💙 ¡Esperamos verte de nuevo! ✨
╰━━━🌸━━━💙━━━🌸━━━╯`;
                await safeSend(client, anu.id, { image: { url: goodbyeImage }, caption, contextInfo })
              }
            } catch {}
          })
        }
        if (action === 'promote' && shouldAdminAlert) {
          const usuario = anu.author
          await safeSend(client, anu.id, { text: `💙 *@${phone}* ha sido promovido a Administrador por *@${usuario.split('@')[0]}.*`, mentions: [validJid, usuario, ...groupAdmins.map(v => v.id)], ...global.miku })
        }
        if (action === 'demote' && shouldAdminAlert) {
          const usuario = anu.author
          await safeSend(client, anu.id, { text: `💙 *@${phone}* ha sido degradado de Administrador por *@${usuario.split('@')[0]}.*`, mentions: [validJid, usuario, ...groupAdmins.map(v => v.id)], ...global.miku })
        }
      }
    } catch {}
  })
  client.ev.on('messages.upsert', async ({ messages }) => {
  const m = messages[0]
  if (!m.messageStubType) return
  const id = m.key.remoteJid
  const chat = global.db.data.chats[id]
  if (!chat?.alerts || !isPrimaryHandler(client, chat)) return
  const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
  const isSelf = global.db.data.settings[botId]?.self ?? false
  if (isSelf) return
  const actor = m.key?.participant || m.participant || m.key?.remoteJid
  const phone = actor.split('@')[0]
  const groupMetadata = await client.groupMetadata(id).catch(() => null)
  const groupAdmins = groupMetadata?.participants.filter(p => (p.admin === 'admin' || p.admin === 'superadmin')) || []
  const participant = groupMetadata?.participants.find(p => p.id === actor)
  const userName = participant?.notify || participant?.name || phone

  const botSettings = global.db.data.settings[botId] || {};
  const contextInfo = {
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: botSettings.id || '120363315369913363@newsletter',
      serverMessageId: '0',
      newsletterName: botSettings.nameid || '💙 HATSUNE MIKU CHANNEL💙'
    },
    mentionedJid: [actor, ...groupAdmins.map(v => v.id)]
  }

  if (m.messageStubType == 21) {
    await safeSend(client, id, { text: `💙 *@${phone}* cambió el nombre del grupo a *${m.messageStubParameters[0]}*`, contextInfo })
  }
  if (m.messageStubType == 22) {
    await safeSend(client, id, { text: `💙 *@${phone}* cambió el icono del grupo.`, contextInfo })
  }
  if (m.messageStubType == 23) {
    await safeSend(client, id, { text: `💙 *@${phone}* restableció el enlace del grupo.`, contextInfo })
  }
  if (m.messageStubType == 24) {
    await safeSend(client, id, { text: `💙 *@${phone}* cambió la descripción del grupo.`, contextInfo })
  }
  if (m.messageStubType == 25) {
    await safeSend(client, id, { text: `💙 *@${phone}* cambió los ajustes del grupo para permitir que ${m.messageStubParameters[0] == 'on' ? 'solo admins' : 'todos'} puedan configurar el grupo.`, contextInfo })
  }
  if (m.messageStubType == 26) {
    await safeSend(client, id, { text: `💙 *@${phone}* cambió los ajustes del grupo para permitir que ${m.messageStubParameters[0] === 'on' ? 'solo los administradores puedan enviar mensajes al grupo.' : 'todos los miembros puedan enviar mensajes al grupo.'}`, contextInfo })
  }
  /* Desactivado temporalmente - causa conflictos con eventos de kick
  const botNumber = client.decodeJid(client.user?.id)
  if (m.messageStubType == 27 && actor !== botNumber) {
    await safeSend(client, id, { text: `💙 *@${phone}* cerró el grupo.`, contextInfo })
  }
  if (m.messageStubType == 28 && actor !== botNumber) {
    await safeSend(client, id, { text: `💙 *@${phone}* abrió el grupo.`, contextInfo })
  }
  */
})
}
