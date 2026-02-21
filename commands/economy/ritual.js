export default {
  command: ['ritual', 'invoke', 'invocar'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix) => {
    const botId = client?.user?.id.split(':')[0] + '@s.whatsapp.net'
    const botSettings = global.db.data.settings[botId]
    const monedas = botSettings?.currency || 'Coins'
    const chat = global.db.data.chats[m.chat]
    if (chat.adminonly || !chat.economy) return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    const user = chat.users[m.sender]
    const remaining = user.lastinvoke - Date.now()
    if (remaining > 0) {
      return m.reply(`💙 Debes esperar *${msToTime(remaining)}* para invocar otro ritual.`)
    }
    user.lastinvoke = Date.now() + 12 * 60 * 1000
    const roll = Math.random()
    let reward = 0
    let narration = ''
    let bonusMsg = ''
    if (roll < 0.05) {
      reward = Math.floor(Math.random() * (13000 - 11000 + 1)) + 11000
      narration = pickRandom(legendaryInvocations)
      bonusMsg = '\n💙 Recompensa LEGENDARIA obtenida!'
    } else {
      reward = Math.floor(Math.random() * (11000 - 8000 + 1)) + 8000
      narration = pickRandom(normalInvocations)
      if (Math.random() < 0.15) {
        const bonus = Math.floor(Math.random() * (4500 - 2500 + 1)) + 2500
        reward += bonus
        bonusMsg = `\n💙 ¡Energía extra! Ganaste *${bonus.toLocaleString()}* ${monedas} adicionales`
      }
    }
    user.coins += reward
    let msg = `💙 ${narration}\nGanaste *${reward.toLocaleString()} ${monedas}*`
    if (bonusMsg) msg += `\n${bonusMsg}`
    await client.reply(m.chat, msg, m)
  },
};

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  minutes = minutes < 10 ? '0' + minutes : minutes
  seconds = seconds < 10 ? '0' + seconds : seconds
  if (minutes === '00') return `${seconds} segundo${seconds > 1 ? 's' : ''}`
  return `${minutes} minuto${minutes > 1 ? 's' : ''}, ${seconds} segundo${seconds > 1 ? 's' : ''}`
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

const normalInvocations = [
  'Tu ritual abre un portal y caen riquezas ardientes del vacío',
  'Las velas se consumen y revelan un cofre lleno de monedas antiguas',
  'El círculo de invocación brilla y aparecen gemas relucientes',
  'Un espíritu menor te entrega un saco de oro como ofrenda',
  'Los cánticos atraen un espectro que deja riquezas a tus pies',
  'La luna ilumina tu altar y revela un tesoro escondido',
  'Un demonio amistoso surge y te paga por tu invocación',
  'El humo del incienso se transforma en monedas brillantes',
  'Los símbolos arcanos vibran y materializan riquezas inesperadas',
  'Un guardián espiritual aparece y te recompensa por tu fe'
]

const legendaryInvocations = [
  '¡Has invocado un espíritu ancestral que te entrega un tesoro legendario!',
  'Un dragón cósmico emerge del ritual y te concede riquezas infinitas',
  'Los dioses antiguos responden y derraman oro celestial sobre ti',
  'Un ángel guardián desciende y coloca un cofre sagrado en tus manos',
  'El portal dimensional se abre y un tesoro prohibido cae ante ti',
  'La tierra tiembla y un espíritu titánico te entrega riquezas ocultas',
  'Un fénix resucitado deja joyas ardientes como recompensa',
  'Los astros se alinean y un tesoro cósmico aparece en tu altar'
]