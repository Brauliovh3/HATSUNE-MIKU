import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'
import crypto from 'crypto'
import fetch from 'node-fetch'

const FISHING_RODS = {
  basic: { name: 'Caña Básica', bonus: 0, price: 0 },
  improved: { name: 'Caña Mejorada', bonus: 5, price: 50000 },
  pro: { name: 'Caña Profesional', bonus: 12, price: 150000 },
  legendary: { name: 'Caña Legendaria', bonus: 25, price: 500000 }
}

const FISH_ZONES = {
  1: {
    name: 'Mar de Oriente', chance: 55, minReward: 1000, maxReward: 5000, emoji: '🌊',
    fishes: [
      { name: 'Sardina Común', image: 'https://file.garden/ae-9DPf0ekWVe7ex/sardina-comun.png' },
      { name: 'Pez Gato', image: 'https://file.garden/ae-9DPf0ekWVe7ex/pez-gato.png' }
    ]
  },
  2: {
    name: 'Mar de Cristal', chance: 25, minReward: 8000, maxReward: 20000, emoji: '❄️',
    fishes: [
      { name: 'Raya Luminosa', image: 'https://file.garden/ae-9DPf0ekWVe7ex/pez-raya.png' },
      { name: 'Pez Espada de Cristal', image: 'https://file.garden/ae-9DPf0ekWVe7ex/pez-espada.png' }
    ]
  },
  3: {
    name: 'Abismo Profundo', chance: 12, minReward: 30000, maxReward: 80000, emoji: '🕳️',
    fishes: [
      { name: 'Anguila Ciega', image: 'https://file.garden/ae-9DPf0ekWVe7ex/anguila-ciega.png' },
      { name: 'Kraken Bebé', image: 'https://file.garden/ae-9DPf0ekWVe7ex/kraken-bebe.png' }
    ]
  },
  4: {
    name: 'Mar de las Sombras', chance: 6, minReward: 100000, maxReward: 250000, emoji: '🌑', audioUrl: 'https://file.garden/ae-9DPf0ekWVe7ex/victory2.mp3',
    fishes: [
      { name: 'Tiburón Espectral', image: 'https://file.garden/ae-9DPf0ekWVe7ex/tiburon-espectro.png' },
      { name: 'Leviatán Oscuro', image: 'https://file.garden/ae-9DPf0ekWVe7ex/leviatan-bebe.png' }
    ]
  },
  5: {
    name: 'Mar del Infierno', chance: 2, minReward: 300000, maxReward: 800000, emoji: '🌋', audioUrl: 'https://file.garden/ae-9DPf0ekWVe7ex/victory1.mp3',
    fishes: [
      { name: 'LEVIATAN', image: 'https://file.garden/ae-9DPf0ekWVe7ex/leviatan.png' },
      { name: 'CUCHUTLUU', image: 'https://file.garden/ae-9DPf0ekWVe7ex/cuchutluu.png' }
    ]
  }
}

export default {
  command: ['pescar', 'fish', 'canas', 'fishingrod'],
  category: 'rpg',
  run: async (client, m, args, usedPrefix, command) => {
    const chat = global.db.data.chats[m.chat]
    const user = chat.users[m.sender]
    const botId = client.user.id.split(':')[0] + '@s.whatsapp.net'
    const currency = global.db.data.settings[botId].currency
    
    if (chat.adminonly || !chat.economy) {
      return m.reply(`💙 Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
    }

    if (command === 'canas' || command === 'fishingrod') {
      return showFishingRods(client, m, usedPrefix, currency)
    }

    user.lastfish ||= 0
    user.fishingRod ||= 'basic'
    
    const remainingTime = user.lastfish - Date.now()
    if (remainingTime > 0) {
      return m.reply(`💙 Debes esperar *${msToTime(remainingTime)}* antes de volver a pescar.`)
    }

    const rod = FISHING_RODS[user.fishingRod] || FISHING_RODS.basic
    let bonus = rod.bonus
    
    if (user.fishingBait) bonus += user.fishingBait
    if (user.fishingNet) bonus += 15
    if (user.fishingRing) bonus += 20
    
    const rand = Math.random() * 100
    let zoneLevel = 1
    
    const lvl5Chance = FISH_ZONES[5].chance + (bonus * 0.15)
    const lvl4Chance = FISH_ZONES[4].chance + (bonus * 0.25)
    const lvl3Chance = FISH_ZONES[3].chance + (bonus * 0.4)
    const lvl2Chance = FISH_ZONES[2].chance + bonus
    
    if (rand < lvl5Chance) {
      zoneLevel = 5
    } else if (rand < lvl5Chance + lvl4Chance) {
      zoneLevel = 4
    } else if (rand < lvl5Chance + lvl4Chance + lvl3Chance) {
      zoneLevel = 3
    } else if (rand < lvl5Chance + lvl4Chance + lvl3Chance + lvl2Chance) {
      zoneLevel = 2
    } else {
      zoneLevel = 1
    }

    const zoneData = FISH_ZONES[zoneLevel]
    const reward = Math.floor(Math.random() * (zoneData.maxReward - zoneData.minReward + 1)) + zoneData.minReward
    
    const fish = pickRandom(zoneData.fishes)

    user.coins ||= 0
    user.coins += reward
    
    user.fishCollection ||= {}
    user.fishCollection[fish.name] = (user.fishCollection[fish.name] || 0) + 1
    
    const caption = `💙 *PESCADO!* 💙

${zoneData.emoji} *ZONA:* ${zoneData.name} (Nivel ${zoneLevel})
🐠 *Pez:* ${fish.name}
💰 *Recompensa:* 🌱${reward.toLocaleString()} ${currency}
🎣 *Caña:* ${rod.name}

💡 *Mejora tu equipo:* ${usedPrefix}pescaderia`

    if (fish.image && fish.image.startsWith('http')) {
      await client.sendMessage(m.chat, { image: { url: fish.image }, caption }, { quoted: m })
    } else {
      await client.sendMessage(m.chat, { text: caption }, { quoted: m })
    }

    if (zoneLevel >= 4) {
      const userName = global.db.data.users[m.sender]?.name || m.sender.split('@')[0]
      const canalId = global.db.data.settings[botId]?.id
      const canalName = global.db.data.settings[botId]?.nameid || 'Canal'
      if (canalId) {
        const broadcastCaption = `🌊 ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ 🌊\n ✨ *¡NUEVA CRIATURA MÍTICA PESCADA!* ✨\n🌊 ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ 🌊\n\n👤 *Pescador:* \`${userName}\`\n🐠 *Captura:* *${fish.name}*\n🌊 *Zona:* ${zoneData.emoji} ${zoneData.name}\n� *Valor:* 🌱 *${reward.toLocaleString()} ${currency}*\n\n> _¡Una hazaña que será recordada por generaciones!_ 🎣🏆`

        const msgObj = { 
          caption: broadcastCaption, 
          contextInfo: { 
            isForwarded: true, 
            forwardingScore: 999, 
            forwardedNewsletterMessageInfo: { newsletterJid: canalId, serverMessageId: '', newsletterName: canalName } 
          } 
        }
        if (fish.image && fish.image.startsWith('http')) {
          msgObj.image = { url: fish.image }
        }
        await client.sendMessage(canalId, msgObj)

        if (zoneData.audioUrl && zoneData.audioUrl.startsWith('http')) {
          await sendChannelAudio(client, canalId, canalName, zoneData.audioUrl)
        }
      }
    }

    user.lastfish = Date.now() + 3 * 60 * 60 * 1000
  },
}

async function showFishingRods(client, m, usedPrefix, currency) {
  let text = `🎣 *CAÑAS DE PESCAR*\n\n`
  
  for (const [key, rod] of Object.entries(FISHING_RODS)) {
    const status = rod.price === 0 ? '✅ Gratis' : `💰 ${rod.price.toLocaleString()} ${currency}`
    text += `${rod.name}:\n`
    text += `   Bonus: +${rod.bonus}% rareza\n`
    text += `   Estado: ${status}\n\n`
  }
  
  text += `💡 *Comprar caña:* ${usedPrefix}comprar [nombre]\n`
  text += `Ejemplo: ${usedPrefix}comprar caña mejorada`
  
  await client.sendMessage(m.chat, { text }, { quoted: m })
}

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const min = minutes < 10 ? '0' + minutes : minutes
  const sec = seconds < 10 ? '0' + seconds : seconds
  return min === '00' ? `${sec} segundo${sec > 1 ? 's' : ''}` : `${min} minuto${min > 1 ? 's' : ''}, ${sec} segundo${sec > 1 ? 's' : ''}`
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

async function sendChannelAudio(client, canalId, canalName, audioUrl) {
  try {
    const res = await fetch(audioUrl)
    const buffer = await res.buffer()
    
    const id = crypto.randomBytes(6).toString('hex')
    const inFile = path.join(os.tmpdir(), `miku-legend-${id}.mp3`)
    const outFile = path.join(os.tmpdir(), `miku-legend-${id}.ogg`)
    
    await fs.promises.writeFile(inFile, buffer)
    
    await new Promise((resolve, reject) => {
      const args = [
        '-y', '-i', inFile,
        '-vn', '-c:a', 'libopus',
        '-b:a', '64k', '-vbr', 'on',
        '-compression_level', '10',
        outFile
      ]
      const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
      let err = ''
      const timer = setTimeout(() => {
        try { p.kill('SIGKILL') } catch {}
        reject(new Error('ffmpeg timeout'))
      }, 15000)
      p.stderr.on('data', d => err += d.toString())
      p.on('error', e => { clearTimeout(timer); reject(e) })
      p.on('close', code => {
        clearTimeout(timer)
        if (code === 0) resolve(true)
        else reject(new Error(err || `ffmpeg failed (${code})`))
      })
    })
    
    const opusBuffer = await fs.promises.readFile(outFile)
    
    await client.sendMessage(canalId, {
      audio: opusBuffer,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true,
      contextInfo: {
        forwardedNewsletterMessageInfo: {
          newsletterJid: canalId,
          serverMessageId: '',
          newsletterName: canalName
        }
      }
    })
    
    try { fs.unlinkSync(inFile) } catch {}
    try { fs.unlinkSync(outFile) } catch {}
  } catch (e) {
    console.log('Error enviando audio legendario:', e)
  }
}