import fetch from "node-fetch"

export default {
  command: ['ppcp', 'ppcouple'],
  category: 'anime',
  run: async (client, m, args, usedPrefix, command, text) => {
    try {
      await m.react('🕒')
      if (!global.ppcpData) {
        global.ppcpData = await (await fetch('https://raw.githubusercontent.com/ShirokamiRyzen/WAbot-DB/main/fitur_db/ppcp.json')).json()
      }
      let cita = global.ppcpData[Math.floor(Math.random() * global.ppcpData.length)]
      await client.sendFile(m.chat, cita.cowo, '', '*Masculino* ♂', m)
      await client.sendFile(m.chat, cita.cewe, '', '*Femenina* ♀', m)
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      await m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  },
}