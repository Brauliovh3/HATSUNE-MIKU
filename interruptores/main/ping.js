export default {
  command: ['ping', 'p'],
  category: 'info',
  run: async (client, m) => {
    const startNs = process.hrtime.bigint()
    const botId = (client.user?.id?.split(':')[0] || client.user?.lid || '') + '@s.whatsapp.net'
    const botName = global.db.data.settings[botId]?.namebot || 'Hatsune Miku'

    const sent = await client.sendMessage(
      m.chat,
      { text: `\`🎵 Calculando latencia...\`` },
      { quoted: m },
    )

    const pingMs = Math.round(Number(process.hrtime.bigint() - startNs) / 1e6)
    const divider = `╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌`

    await client.sendMessage(
      m.chat,
      {
        text: `🩵✦ *P O N G !* ✦🩵\n${divider}\n\n🎵 *Velocidad:* \`${pingMs} ms\`\n🌿 *Sistema:* ${botName}\n\n${divider}\n🎵 *Hatsune Miku* ✦ *Bot* 🎵`,
        edit: sent.key,
      }
    )
  },
};
