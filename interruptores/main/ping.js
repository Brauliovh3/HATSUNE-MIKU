export default {
  command: ['ping', 'p'],
  category: 'info',
  run: async (client, m) => {
    const startNs = process.hrtime.bigint()
    const botId = (client.user?.id?.split(':')[0] || client.user?.lid || '') + '@s.whatsapp.net'
    const botName = global.db.data.settings[botId]?.namebot || 'Hatsune Miku'
    const messageTimestamp = Number(m.timestamp || 0)
    const inboundLatency = messageTimestamp > 0 ? Math.max(0, Date.now() - messageTimestamp) : null

    const sent = await client.sendMessage(
      m.chat,
      { text: `\`💙 Midiendo respuesta...\`\n> *${botName}*` },
      { quoted: m },
    )

    const firstReplyMs = Number(process.hrtime.bigint() - startNs) / 1e6
    const inboundText = inboundLatency === null ? 'No disponible' : `${inboundLatency}ms`

    await client.sendMessage(
      m.chat,
      {
        text: [
          '🌱 *Ping*',
          `> Entrada: 💙 ${inboundText}`,
          `> Primera respuesta: 💙 ${Math.round(firstReplyMs)}ms`,
          `> Bot: *${botName}*`,
        ].join('\n'),
        edit: sent.key,
      },
      { quoted: m },
    )
  },
};
