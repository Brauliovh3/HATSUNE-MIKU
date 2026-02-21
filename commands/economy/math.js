import fs from 'fs'

global.math = global.math || {}
const limits = { facil: 10, medio: 50, dificil: 90, imposible: 100, imposible2: 160 }
const generateRandomNumber = (max) => Math.floor(Math.random() * max) + 1
const getOperation = () => ['+', '-', '*', '/'][Math.floor(Math.random() * 4)]
const rewardRanges = { facil: [500, 1000], medio: [1000, 2000], dificil: [2000, 3500], imposible: [3500, 4800], imposible2: [5000, 6500] }

const generarProblema = (dificultad) => {
  const maxLimit = limits[dificultad] || 30
  const num1 = generateRandomNumber(maxLimit)
  const num2 = generateRandomNumber(maxLimit)
  const operador = getOperation()
  const resultado = eval(`${num1} ${operador} ${num2}`)
  const simbolo = operador === '*' ? '×' : operador === '/' ? '÷' : operador
  return { problema: `${num1} ${simbolo} ${num2}`, resultado }
}

export default {
  command: ['math', 'mates', 'resp'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const chatId = m.chat
    const db = global.db.data.chats[chatId]
    const user = global.db.data.users[m.sender]
    const juego = global.math[chatId]
    if (db.adminonly || !db.economy) return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    if (command === 'resp') {
      if (!juego?.juegoActivo) return
      const quotedId = m.quoted?.key?.id || m.quoted?.id || m.quoted?.stanzaId
      if (quotedId !== juego.problemMessageId) return
      const respuestaUsuario = parseFloat(args[0])
      if (isNaN(respuestaUsuario)) return client.reply(chatId, `💙 Debes escribir tu respuesta numérica. Ejemplo: *${usedPrefix}resp 42*`, m)
      const respuestaCorrecta = parseFloat(juego.respuesta)
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
      const primaryBotId = db.primaryBot
      if (!primaryBotId || primaryBotId === botId) {
        if (respuestaUsuario === respuestaCorrecta) {
          const [min, max] = rewardRanges[juego.dificultad] || [500, 1000]
          const coinsAleatorio = Math.floor(Math.random() * (max - min + 1)) + min
          user.coins += coinsAleatorio
          clearTimeout(juego.tiempoLimite)
          delete global.math[chatId]
          return client.reply(chatId, `💙 Respuesta correcta.\n> *Ganaste ›* ¥${coinsAleatorio.toLocaleString()}`, m)
        } else {
          juego.intentos += 1
          if (juego.intentos >= 3) {
            clearTimeout(juego.tiempoLimite)
            delete global.math[chatId]
            return client.reply(chatId, '💙 Te quedaste sin intentos. Suerte a la próxima.', m)
          } else {
            const intentosRestantes = 3 - juego.intentos
            return client.reply(chatId, `💙 Respuesta incorrecta, te quedan ${intentosRestantes} intentos.`, m)
          }
        }
      }
      return
    }
    if (["math", "mates"].includes(command)) {
      if (juego?.juegoActivo) return client.reply(chatId, '💙 Ya hay un juego activo. Espera a que termine.', m)
      const dificultad = args[0]?.toLowerCase()
      if (!limits[dificultad]) return client.reply(chatId, '💙 Especifica una dificultad válida: *facil, medio, dificil, imposible, imposible2*', m)
      const { problema, resultado } = generarProblema(dificultad)
      const problemMessage = await client.reply(chatId, `💙 Tienes 1 minuto para resolver:\n\n> ✩ *${problema}*\n\n_✐ Usa » *${usedPrefix}resp* para responder!_`, m)
      global.math[chatId] = {
        juegoActivo: true,
        problema,
        respuesta: resultado.toString(),
        intentos: 0,
        dificultad,
        timeout: Date.now() + 60000,
        problemMessageId: problemMessage.key?.id,
        tiempoLimite: setTimeout(() => {
          if (global.math[chatId]?.juegoActivo) {
            delete global.math[chatId]
            client.reply(chatId, '💙 Tiempo agotado. El juego ha terminado.', m)
          }
        }, 60000)
      }
    }
  }
}
