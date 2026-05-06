import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { spawn } from 'child_process'
import { CHANNEL_AUDIO_DIR, STORAGE_LIMITS, ensureDir, readableBytes } from '../../nucleo/system/storage.js'

function trimCaption(text = '', max = 1000) {
  const t = String(text || '').trim()
  return t.length > max ? `${t.slice(0, max - 3)}...` : t
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const channelAudioDir = CHANNEL_AUDIO_DIR
const sentPostIds = new Map()

function ensureChannelAudioDir() {
  ensureDir(channelAudioDir)
}

function scheduleDelete(filePath, ms = 120000) {
  if (!filePath) return
  setTimeout(() => {
    try { fs.unlinkSync(filePath) } catch {}
  }, ms)
}

function alreadySentPostOnce(postId = '') {
  const id = String(postId || '').trim()
  if (!id) return false
  const now = Date.now()
  const ttlMs = 120000
  for (const [k, t] of sentPostIds.entries()) {
    if (now - t > ttlMs) sentPostIds.delete(k)
  }
  if (sentPostIds.has(id)) return true
  sentPostIds.set(id, now)
  return false
}

async function bufferToTempFile(buffer, ext) {
  ensureChannelAudioDir()
  const tmpPath = path.join(channelAudioDir, `miku-tmp-${randomUUID()}${ext}`)
  await fs.promises.writeFile(tmpPath, buffer)
  scheduleDelete(tmpPath, 120000)
  return tmpPath
}

async function sendToChannel(client, channelId, payload) {
  let firstError = null
  const isAudioPayload = Boolean(payload?.audio)
  const hasMedia = Boolean(payload?.image || payload?.video || payload?.document)
  if (!isAudioPayload && !hasMedia && typeof client.newsletterMsg === 'function') {
    try {
      return await client.newsletterMsg(channelId, payload)
    } catch (e) {
      firstError = e
    }
  }
  try {
    return await client.sendMessage(channelId, payload)
  } catch (e2) {
    throw new Error(e2?.message || firstError?.message || 'No se pudo enviar al canal')
  }
}

async function sendToChannelRetry(client, channelId, payload) {
  try {
    return await sendToChannel(client, channelId, payload)
  } catch {
    await delay(600)
    return await sendToChannel(client, channelId, payload)
  }
}

async function sendAudioToChannel(client, channelId, voicePath) {
  const voiceBuffer = await fs.promises.readFile(voicePath)
  const isOgg = voiceBuffer.subarray(0, 4).toString() === 'OggS'
  const searchZone = voiceBuffer.subarray(0, Math.min(512, voiceBuffer.length)).toString('latin1')
  const hasOpusHead = searchZone.includes('OpusHead')

  if (!isOgg || !hasOpusHead) {
    throw new Error('audio de voz invalido tras conversion')
  }

  await delay(450)
  
  return await client.sendMessage(channelId, {
    audio: voiceBuffer,
    mimetype: 'audio/ogg; codecs=opus',
    ptt: true,
    fileName: 'voice.ogg',
  })
}


async function downloadSourceBuffer(client, source) {
  let buffer = null
  const tryDownload = async (input) => {
    try {
      const b = await client.downloadMediaMessage(input)
      if (Buffer.isBuffer(b) && b.length > 0) return b
    } catch {}
    return null
  }

  try {
    if (typeof source?.download === 'function') {
      const b = await source.download()
      if (Buffer.isBuffer(b) && b.length > 0) buffer = b
    }
  } catch {}

  if (!buffer) buffer = await tryDownload(source)
  if (!buffer && source?.msg) buffer = await tryDownload({ msg: source.msg, type: source.type })
  if (!buffer && source?.message) buffer = await tryDownload({ msg: source.message, type: source.type })

  if (!buffer || buffer.length < 16) {
    throw new Error('No se pudo descargar la media origen o el buffer está vacío')
  }
  return buffer
}

function extFromMime(mime = '') {
  const m = String(mime || '').toLowerCase().split(';')[0].trim()
  if (m.includes('jpeg')) return '.jpg'
  if (m.includes('png')) return '.png'
  if (m.includes('webp')) return '.webp'
  if (m.includes('gif')) return '.gif'
  if (m.includes('mp4')) return '.mp4'
  if (m.includes('quicktime')) return '.mov'
  if (m.includes('webm')) return '.webm'
  if (m.includes('mpeg')) return '.mp3'
  if (m.includes('ogg')) return '.ogg'
  if (m.includes('aac')) return '.aac'
  if (m.includes('m4a')) return '.m4a'
  if (m.includes('wav')) return '.wav'
  return '.bin'
}

function sniffBufferKind(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return { kind: 'unknown', mime: '' }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return { kind: 'image', mime: 'image/jpeg' }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
    return { kind: 'image', mime: 'image/png' }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38)
    return { kind: 'image', mime: 'image/gif' }
  if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP')
    return { kind: 'image', mime: 'image/webp' }
  if (buffer.slice(0, 4).toString() === 'OggS')
    return { kind: 'audio', mime: 'audio/ogg; codecs=opus' }
  if (buffer.slice(0, 3).toString() === 'ID3' || buffer[0] === 0xff)
    return { kind: 'audio', mime: 'audio/mpeg' }
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3)
    return { kind: 'video', mime: 'video/webm' }
  const box = buffer.slice(4, 8).toString()
  const brand = buffer.slice(8, 12).toString().toLowerCase()
  if (box === 'ftyp') {
    if (brand.includes('m4a')) return { kind: 'audio', mime: 'audio/mp4' }
    if (brand.includes('qt')) return { kind: 'video', mime: 'video/quicktime' }
    return { kind: 'video', mime: 'video/mp4' }
  }
  return { kind: 'unknown', mime: '' }
}

function detectMediaKind(source, mime = '', buffer) {
  const normalizedMime = String(mime || '').toLowerCase().split(';')[0].trim()
  if (normalizedMime.startsWith('image/')) return { kind: 'image', mime: normalizedMime }
  if (normalizedMime.startsWith('video/')) return { kind: 'video', mime: normalizedMime }
  if (normalizedMime.startsWith('audio/')) return { kind: 'audio', mime: normalizedMime }
  if (normalizedMime.startsWith('application/')) return { kind: 'document', mime: normalizedMime }

  const guessed = sniffBufferKind(buffer)
  if (guessed.kind !== 'unknown') return guessed

  const hints = [
    source?.mtype,
    source?.type,
    source?.mediaType,
    source?.msg?.mimetype,
    ...Object.keys(source?.message || {}),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (/(^|\W)image(\W|$)/.test(hints)) return { kind: 'image', mime: 'image/jpeg' }
  if (/(^|\W)video(\W|$)/.test(hints)) return { kind: 'video', mime: 'video/mp4' }
  if (/(^|\W)audio(\W|$)/.test(hints)) return { kind: 'audio', mime: 'audio/mpeg' }
  if (/(^|\W)document(\W|$)/.test(hints)) return { kind: 'document', mime: 'application/octet-stream' }

  return { kind: 'document', mime: 'application/octet-stream' }
}

async function convertToVoiceOpus(inputBuffer, inputMime = 'audio/mpeg') {
  ensureChannelAudioDir()
  if (inputBuffer.length > STORAGE_LIMITS.maxDownloadBytes) {
    throw new Error(`Audio demasiado grande (${readableBytes(inputBuffer.length)}). Límite: ${readableBytes(STORAGE_LIMITS.maxDownloadBytes)}`)
  }
  const id = randomUUID()
  const inFile = path.join(channelAudioDir, `miku-canal-in-${id}${extFromMime(inputMime)}`)
  const outFile = path.join(channelAudioDir, `miku-canal-out-${id}.ogg`)

  await fs.promises.writeFile(inFile, inputBuffer)

  try {
    await new Promise((resolve, reject) => {
      const args = [
        '-y', '-i', inFile,
        '-map', '0:a:0',
        '-vn',
        '-c:a', 'libopus',
        '-ar', '48000',
        '-ac', '1',
        '-b:a', '64k',
        '-vbr', 'on',
        '-application', 'voip',
        '-compression_level', '10',
        '-avoid_negative_ts', 'make_zero',
        '-fflags', '+genpts',
        '-f', 'ogg',
        outFile,
      ]
      const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
      let err = ''
      const timeoutMs = Math.min(10 * 60 * 1000, Math.max(120000, Math.ceil(inputBuffer.length / (256 * 1024)) * 1000))
      const timer = setTimeout(() => { try { p.kill('SIGKILL') } catch {} reject(new Error('ffmpeg timeout')) }, timeoutMs)
      p.stderr.on('data', (d) => { err += d.toString() })
      p.on('error', (e) => { clearTimeout(timer); reject(e) })
      p.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0) resolve(true)
        else reject(new Error(err || `ffmpeg failed (${code})`))
      })
    })

    const out = await fs.promises.readFile(outFile)
    if (!out || out.length < 512) throw new Error('audio convertido invalido')
    if (out.subarray(0, 4).toString() !== 'OggS') throw new Error('audio convertido sin cabecera OGG')
    if (!out.subarray(0, Math.min(512, out.length)).toString('latin1').includes('OpusHead')) throw new Error('audio convertido sin cabecera Opus')
    scheduleDelete(inFile, 120000)
    scheduleDelete(outFile, 10 * 60 * 1000)
    return { inFile, outFile }
  } catch (e) {
    try { fs.unlinkSync(inFile) } catch {}
    try { fs.unlinkSync(outFile) } catch {}
    throw e
  }
}

export default {
  command: ['canalpost', 'postcanal', 'canalmsg'],
  category: 'owner',
  isOwner: true,
  run: async (client, m, args, usedPrefix, command) => {
    const botJid = (client.user?.id?.split(':')[0] || client.user?.lid) + '@s.whatsapp.net'
    const settings = global.db.data.settings[botJid] || {}
    const channelId = settings.id || '120363315369913363@newsletter'
    const channelName = settings.nameid || '💙HATSUNE MIKU CHANNEL💙'

    try {
      const quoted = m.quoted || null
      const source = quoted?.isMedia ? quoted : (m.isMedia ? m : null)
      const mime = source?.msg?.mimetype || source?.mimetype || source?.mediaType || ''
      let text = args.join(' ').trim()

      if (!channelId?.endsWith('@newsletter')) {
        return client.reply(m.chat, `Canal no configurado correctamente.\nUsa: ${usedPrefix}setchannel <enlace_o_id_del_canal>`, m, global.miku)
      }

      if (!source && !text) {
        return client.reply(m.chat, `Uso:\n${usedPrefix}${command} [texto]\n${usedPrefix}${command} [texto] (respondiendo o adjuntando imagen/video/audio/documento)`, m, global.miku)
      }

      await m.react('📤')
      const defaultCaption = trimCaption(text || `${channelName}\n${new Date().toLocaleString('es-MX')}`)

      if (source) {
        const postId = source?.key?.id || m?.key?.id || ''
        if (alreadySentPostOnce(postId)) {
          await m.react('✅')
          return client.reply(m.chat, `Enviado al canal:\n${channelName}`, m, global.miku)
        }

        const buffer = await downloadSourceBuffer(client, source)
        const detected = detectMediaKind(source, mime, buffer)

        if (detected.kind === 'image') {
          await sendToChannelRetry(client, channelId, {
            image: buffer,
            mimetype: detected.mime || 'image/jpeg',
            caption: defaultCaption,
          })

        } else if (detected.kind === 'video') {
          await sendToChannelRetry(client, channelId, {
            video: buffer,
            mimetype: detected.mime || 'video/mp4',
            caption: defaultCaption,
          })

        } else if (detected.kind === 'audio') {
          const files = await convertToVoiceOpus(buffer, mime || detected.mime || 'audio/mpeg')
          await sendAudioToChannel(client, channelId, files.outFile)

        } else {
          const fileName = source?.msg?.fileName || `archivo${extFromMime(detected.mime || mime)}`
          await sendToChannelRetry(client, channelId, {
            document: buffer,
            mimetype: detected.mime || mime || 'application/octet-stream',
            fileName,
            caption: defaultCaption,
          })
        }

      } else {
        if (!text && quoted?.text) text = quoted.text.trim()
        if (!text) return client.reply(m.chat, 'No hay texto para publicar.', m, global.miku)
        await sendToChannelRetry(client, channelId, { text })
      }

      await m.react('✅')
      return client.reply(m.chat, `Enviado al canal:\n${channelName}`, m, global.miku)

    } catch (error) {
      await m.react('❌')
      const msg = String(error?.message || error)
      return client.reply(m.chat, `Error al publicar en canal.\n${msg}\n\nVerifica:\n- Permiso de publicacion del bot\n- Que ffmpeg este disponible\n- Que la media sea permitida por WhatsApp Channels`, m, global.miku)
    }
  },
}
