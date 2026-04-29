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

const FISH_RARITY = {
  common: { chance: 65, minReward: 1000, maxReward: 5000, emoji: '🐟', color: '#8B8B8B', image: 'https://file.garden/ae-9DPf0ekWVe7ex/pez-comun.png' },
  epic: { chance: 25, minReward: 8000, maxReward: 20000, emoji: '🌟', color: '#9B59B6', image: 'https://file.garden/ae-9DPf0ekWVe7ex/pez-epica.png' },
  ultra: { chance: 8, minReward: 30000, maxReward: 80000, emoji: '💎', color: '#F1C40F', image: 'https://file.garden/ae-9DPf0ekWVe7ex/pez-ultra.png' },
  legend: { chance: 2, minReward: 150000, maxReward: 300000, emoji: '👑', color: '#E74C3C', image: 'https://file.garden/ae-9DPf0ekWVe7ex/pez-legend.png' }
}

const COMMON_FISH = ['Salmón', 'Trucha', 'Pez Payaso', 'Carpa', 'Atún', 'Caballa', 'Sardina', 'Merluza', 'Lubina', 'Mero']
const EPIC_FISH = ['Tiburón Dorado', 'Pez Ángel Real', 'Pez Disco Brillante', 'Manta Raya', 'Anguila Luminosa', 'Pez Koi Imperial']
const ULTRA_FISH = ['Pez Dragón', 'Leviatán Marino', 'Fénix Acuático', 'Kraken Bebé', 'Sirena Menor', 'Coloso Abisal']
const LEGEND_FISH = ['Pez Legendario Ancestral', 'Guardián del Océano', 'Rey del Mar', 'Dragón Primordial', 'Leviatán Dorado', 'Fénix Marino Legendario']

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
    let rarity
    
    const legendChance = FISH_RARITY.legend.chance + (bonus * 0.2)
    const ultraChance = FISH_RARITY.ultra.chance + (bonus * 0.5)
    const epicChance = FISH_RARITY.epic.chance + bonus
    
    if (rand < legendChance) {
      rarity = 'legend'
    } else if (rand < legendChance + ultraChance) {
      rarity = 'ultra'
    } else if (rand < legendChance + ultraChance + epicChance) {
      rarity = 'epic'
    } else {
      rarity = 'common'
    }

    const fishData = FISH_RARITY[rarity]
    const reward = Math.floor(Math.random() * (fishData.maxReward - fishData.minReward + 1)) + fishData.minReward
    
    let fishName
    if (rarity === 'common') fishName = pickRandom(COMMON_FISH)
    else if (rarity === 'epic') fishName = pickRandom(EPIC_FISH)
    else if (rarity === 'ultra') fishName = pickRandom(ULTRA_FISH)
    else fishName = pickRandom(LEGEND_FISH)

    user.coins ||= 0
    user.coins += reward
    
    user.fishCollection ||= {}
    user.fishCollection[fishName] = (user.fishCollection[fishName] || 0) + 1
    
    const rarityLabel = rarity === 'common' ? 'COMÚN' : rarity === 'epic' ? 'ÉPICO' : rarity === 'ultra' ? 'ULTRA' : 'LEGENDARIO'
    
    const caption = `💙 *PESCADO!* 💙

${fishData.emoji} *RAREZA:* ${rarityLabel}
🐠 *Pez:* ${fishName}
💰 *Recompensa:* 🌱${reward.toLocaleString()} ${currency}
🎣 *Caña:* ${rod.name}

💡 *Mejora tu equipo:* ${usedPrefix}pescaderia`

    if (fishData.image) {
      await client.sendMessage(m.chat, { image: { url: fishData.image }, caption }, { quoted: m })
    } else {
      await client.sendMessage(m.chat, { text: caption }, { quoted: m })
    }

    if (rarity === 'legend') {
      const userName = global.db.data.users[m.sender]?.name || m.sender.split('@')[0]
      const canalId = global.db.data.settings[botId].id
      const canalName = global.db.data.settings[botId].nameid || 'Canal'
      if (canalId) {
        const legendCaption = `🌊 ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ 🌊\n ✨ *¡NUEVA LEYENDA EN LOS MARES!* ✨\n🌊 ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ 🌊\n\n👤 *Pescador:* \`${userName}\`\n🐠 *Captura:* *${fishName}*\n💎 *Rareza:* 👑 LEGENDARIA\n💰 *Valor:* 🌱 *${reward.toLocaleString()} ${currency}*\n\n> _¡Una hazaña que será recordada por generaciones!_ 🎣🏆`

        await client.sendMessage(canalId, {
          image: { url: fishData.image }, 
          caption: legendCaption,
          contextInfo: {
            isForwarded: true,
            forwardingScore: 999,
            forwardedNewsletterMessageInfo: {
              newsletterJid: canalId,
              serverMessageId: '',
              newsletterName: canalName
            }
          }
        })

        await sendLegendaryAudio(client, canalId, canalName)
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

async function sendLegendaryAudio(client, canalId, canalName) {
  try {
    const res = await fetch('https://file.garden/ae-9DPf0ekWVe7ex/legend.mp3')
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