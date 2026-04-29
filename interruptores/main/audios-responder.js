import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { getBotJid } from '../../nucleo/bot-helper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const audiosPath = path.join(__dirname, '../../assets/audios')

const audioMap = {
  'noche de paz': 'Noche.mp3',
  'buenos dias': 'Buenos-dias-2.mp3',
  'audio hentai': 'hentai.mp3',
  'fiesta del admin': 'Fiesta1.mp3',
  'fiesta del admin 2': 'fiesta.mp3',
  'viernes': 'viernes.mp3',
  'me olvidé': 'flash.mp3',
  'me olvide': 'flash.mp3',
  'baneado': 'baneado.mp3',
  'feliz navidad': 'navidad.m4a',
  'a nadie le importa': 'insultar.mp3',
  'sexo': 'gemi2.mp3',
  'vete a la vrg': 'vete a la verga.mp3',
  'ara ara': 'Ara.mp3',
  'hola': 'Hola.mp3',
  'un pato': 'pato.mp3',
  'nyanpasu': 'Nico Nico.mp3',
  'te amo': 'Te-amo.mp3',
  'yamete': 'Yamete-kudasai.mp3',
  'te diagnostico con gay': 'DiagnosticadoConGay.mp3',
  'quien es tu sempai botsito 7w7': 'sempai.mp3',
  'bañate': 'Banate.mp3',
  'vivan los novios': 'vivan.mp3',
  'marica quien': 'maau1.mp3',
  'es puto': 'Es putoo.mp3',
  'la biblia': 'ora.mp3',
  'onichan': 'Onichan.mp3',
  'bot puto': 'bot.mp3',
  'feliz cumpleaños': 'Feliz cumple.mp3',
  'pasa pack bot': 'toma.mp3',
  'atencion grupo': 'asen.mp3',
  'homero chino': 'Homero chino.mp3',
  'oh me vengo': 'vengo.mp3',
  'murio el grupo': 'Murio.m4a',
  'siuuu': 'siu.mp3',
  'rawr': 'rawr.mp3',
  'uwu': 'UwU.mp3',
  ':c': 'Tu.mp3',
  'a': 'a.mp3',
  'hey': 'jai.mp3',
  'enojado': 'insultar.mp3',
  'enojada': 'insultar.mp3',
  'chao': 'A bueno adios master.mp3',
  'hentai': 'hentai.mp3',
  'triste': 'violin.mp3',
  'estoy triste': 'violin.mp3',
  'me pican los cocos': 'me-pican-los-cocos.mp3',
  'contexto': 'contexto.mp3',
  'me voy': 'A bueno adios master.mp3',
  'tengo los calzones del admin': 'admin-calzones.mp3',
  'entrada épica': 'entrada-epica-al-chat.mp3',
  'esto va ser épico papus': 'esto va a hacer epico papus.mp3',
  'ingresa épicamente': 'entrada-epica-al-chat.mp3',
  'bv': 'otaku.mp3',
  'yoshi': 'yoshi-cancion.mp3',
  'no digas eso papu': 'no-digas-eso-papu.mp3',
  'ma ma masivo': 'masivo-cancion.mp3',
  'masivo': 'masivo-cancion.mp3',
  'basado': 'basado.mp3',
  'basada': 'basado.mp3',
  'fino señores': 'fino-senores.mp3',
  'verdad que te engañe': 'verdad-que-te-engane.mp3',
  'sus': 'sus.mp3',
  'ohayo': 'ohayo.mp3',
  'la voz de hombre': 'la-voz-de-hombre.mp3',
  'pero esto': 'pero-esto-ya-es-otro-nivel.mp3',
  'bien pensado woody': 'bien-pensado-woody.mp3',
  'jesucristo': 'jesucristo.mp3',
  'wtf': 'wtf.mp3',
  'una pregunta': 'una-pregunta.mp3',
  'que sucede': 'suspenso.mp3',
  'hablame': 'hablar primos.mp3',
  'pikachu': 'pikachu.mp3',
  'niconico': 'niconico.mp3',
  'yokese': 'yokese.mp3',
  'omaiga': 'omaiga.mp3',
  'nadie te preguntó': 'nadie te pregunto.mp3',
  'bueno si': 'bueno si.mp3',
  'usted está detenido': 'usted esta detenido.mp3',
  'no me hables': 'no me hables.mp3',
  'no chu': 'no chu.mp3',
  'nochupala': 'nochupala.mp3',
  'el pepe': 'el pepe.mp3',
  'pokémon': 'pokemon.mp3',
  'no me hagas usar esto': 'no me hagas usar esto.mp3',
  'esto va para ti': 'esto va para ti.mp3',
  'abduzcan': 'abduzcan.mp3',
  'joder': 'joder.mp3',
  'hablar primos': 'hablar primos.mp3',
  'mmm': 'mmm.mp3',
  'orale': 'orale.mp3',
  'me anda buscando anonymous': 'Me anda buscando anonymous.mp3',
  'blackpink in your area': 'Blackpink in your area.mp3',
  'cambiate a movistar': 'Cambiate a Movistar.mp3',
  'momento equisde': 'Momento equisde.mp3',
  'momento xd': 'Momento equisde.mp3',
  'todo bien': 'Todo bien.mp3',
  '🧐': 'Todo bien.mp3',
  'te gusta el pepino': 'Te gusta el Pepino.mp3',
  '🥒': 'Te gusta el Pepino.mp3',
  'el tóxico': 'El Toxico.mp3',
  'moshi moshi': 'moshi moshi.mp3',
  'calla fan de bts': 'Calla Fan de BTS.mp3',
  'que tal grupo': 'Que tal Grupo.mp3',
  'muchachos': 'Muchachos.mp3',
  'está zzzz': 'Esta Zzzz.mp3',
  'goku pervertido': 'gemi2.mp3',
  'potaxio': 'Potaxio.mp3',
  '🥑': 'Potaxio.mp3',
  'nico nico': 'Nico Nico.mp3',
  'el rap de fernanfloo': 'el rap de fernanfloo.mp3',
  'tal vez': 'Tal vez.mp3',
  'corte corte': 'Corte Corte.mp3',
  'buenas noches': 'Buenas noches.mp3',
  'porque ta tite': 'Porque ta tite.mp3',
  'eres fuerte': 'Eres Fuerte.mp3',
  'bueno master': 'A bueno adios master.mp3',
  '🫂': 'A bueno adios master.mp3',
  'no rompas más': 'No Rompas Mas.mp3',
  '💔': 'No Rompas Mas.mp3',
  'traiganle una falda': 'Traigan le una falda.mp3',
  'se están riendo de mí': 'Se estan riendo de mi.mp3',
  'su nivel de pendejo': 'Su nivel de pendejo.mp3',
  'bienvenido': 'Bienvenido.mp3',
  'bienvenida': 'Bienvenido.mp3',
  '🥳': 'Bienvenido.mp3',
  '🤗': 'Bienvenido.mp3',
  '👋': 'Bienvenido.mp3',
  'elmo sabe donde vives': 'Elmo sabe donde vives.mp3',
  'tunometecabrasaramambiche': 'tunometecabrasaramambiche.mp3',
  'y este quien es': 'Y este quien es.mp3',
  'motivación': 'Motivacion.mp3',
  'en caso de una investigación': 'En caso de una investigación.mp3',
  'buen día grupo': 'Buen día grupo.mp3',
  '🙌': 'Buen día grupo.mp3',
  'las reglas del grupo': 'Las reglas del grupo.mp3',
  'hatsune miku': 'hatsune-miku.mp3',
  'miku': 'hatsune-miku.mp3'
}

function normalize(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const existingAudioFiles = new Set(
  Object.values(audioMap).filter(file => fs.existsSync(path.join(audiosPath, file)))
);

const filteredAudioMap = Object.fromEntries(
  Object.entries(audioMap).filter(([, value]) => existingAudioFiles.has(value))
);

const normalizedAudioMap = Object.fromEntries(
  Object.entries(filteredAudioMap).map(([key, value]) => [normalize(key), value]),
)

const audioQueue = []
let audioProcessing = false
const AUDIO_DELAY = 500 
const opusCache = new Map() 

async function processAudioQueue() {
  if (audioProcessing || audioQueue.length === 0) return
  audioProcessing = true
  
  while (audioQueue.length > 0) {
    const task = audioQueue.shift()
    try {
      await task()
    } catch (e) {
      console.error('Error en cola de audios:', e.message)
    }
    if (audioQueue.length > 0) {
      await new Promise(r => setTimeout(r, AUDIO_DELAY))
    }
  }
  
  audioProcessing = false
}

async function toOpusVoiceNote(inputBuffer, inputExt = '.mp3') {
  const id = crypto.randomBytes(6).toString('hex')
  const inFile = path.join(os.tmpdir(), `miku-in-${id}${inputExt}`)
  const outFile = path.join(os.tmpdir(), `miku-out-${id}.ogg`)
  await fs.promises.writeFile(inFile, inputBuffer)
  try {
    await new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-i', inFile,
        '-vn',
        '-c:a', 'libopus',
        '-b:a', '64k',
        '-vbr', 'on',
        '-compression_level', '10',
        outFile,
      ]
      const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
      let err = ''
      const timer = setTimeout(() => {
        try { p.kill('SIGKILL') } catch {}
        reject(new Error('ffmpeg timeout'))
      }, 20000)
      p.stderr.on('data', (d) => { err += d.toString() })
      p.on('error', (e) => {
        clearTimeout(timer)
        reject(e)
      })
      p.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0) resolve(true)
        else reject(new Error(err || `ffmpeg failed (${code})`))
      })
    })
    return await fs.promises.readFile(outFile)
  } finally {
    try { await fs.promises.unlink(inFile) } catch {}
    try { await fs.promises.unlink(outFile) } catch {}
  }
}

export async function all(m, { client }) {
  if (!m.text || m.isBaileys || m.fromMe) return

  const chat = global.db.data.chats[m.chat] || {}
  if (chat.isBanned) return
  const botJid = getBotJid(client) || ((client.user?.id?.split(':')[0] || client.user?.lid) + '@s.whatsapp.net')
  const botSettings = (global.db.data.settings && global.db.data.settings[botJid]) || {}
  const primaryBotId = chat?.primaryBot
  const normalizeJid = (jid) => {
    if (!jid) return ''
    const clean = String(jid).split(':')[0].replace(/\D/g, '')
    return clean + '@s.whatsapp.net'
  }
  const isPrimary = !primaryBotId || normalizeJid(primaryBotId) === normalizeJid(botJid)
  if (!isPrimary) return
  const activePrefixes =
    botSettings.prefix === true
      ? []
      : Array.isArray(botSettings.prefix)
        ? botSettings.prefix
        : typeof botSettings.prefix === 'string'
          ? [botSettings.prefix]
          : ['/', '!', '.', '#']
  
  
  if (!m.isGroup || !chat.audios) return

  const rawText = String(m.text || '').trim()
  if (!rawText) return
  if (activePrefixes.some((p) => rawText.startsWith(p))) return
  const firstToken = rawText.split(/\s+/)[0]
  const stripped = firstToken.replace(/^[./!#]+/, '').toLowerCase()
  if (global.comandos && global.comandos.has(stripped)) return

  const normalizedText = normalize(rawText)
  const audioName = normalizedAudioMap[normalizedText]

  if (audioName) {
    const audioFile = path.join(audiosPath, audioName)
    audioQueue.push(async () => {
      try {
        let voiceBuffer = opusCache.get(audioFile)
        if (!voiceBuffer) {
          const buffer = await fs.promises.readFile(audioFile)
          if (!buffer || buffer.length < 32) return
          const inputExt = path.extname(audioFile).toLowerCase() || '.mp3'
          try {
            voiceBuffer = await toOpusVoiceNote(buffer, inputExt)
            opusCache.set(audioFile, voiceBuffer)
          } catch {
            voiceBuffer = buffer
            opusCache.set(audioFile, voiceBuffer)
          }
        }

        await client.sendMessage(m.chat, {
          audio: voiceBuffer,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true
        }, { quoted: m })
      } catch (e) {
        if (!e.message.includes('rate-overlimit')) {
          console.error('❌ Error enviando audio:', e.message)
        }
      }
    })
    processAudioQueue()
  }
}

export default {
  all
}
