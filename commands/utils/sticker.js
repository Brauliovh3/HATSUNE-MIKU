import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import fetch from 'node-fetch'
import exif from '../../lib/exif.js'

export default {
  command: ['sticker', 's'],
  category: 'utils',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      ensureTmp()

      if (args[0] === '-list') {
        const helpText = `ꕥ Lista de Formas y Efectos Disponibles para *imagen*:

✦ *Formas:*
- -c : Crea un sticker circular
- -t : Crea un sticker triangular
- -s : Crea un sticker con forma de estrella
- -r : Crea un sticker con esquinas redondeadas
- -h : Crea un sticker hexagonal
- -d : Crea un sticker con forma de diamante
- -f : Crea un sticker con un marco
- -b : Crea un sticker con un borde
- -w : Crea un sticker con forma de onda
- -m : Crea un sticker espejado
- -o : Crea un sticker octogonal
- -y : Crea un sticker pentagonal
- -e : Crea un sticker elíptico
- -z : Crea un sticker en forma de cruz
- -v : Crea un sticker con forma de corazón
- -x : Crea un sticker expandido (cover)
- -i : Crea un sticker expandido (contain)

✧ *Efectos:*
- -blur : Aplica un efecto de desenfoque
- -sepia : Aplica un efecto sepia
- -sharpen : Aplica un efecto de nitidez
- -brighten : Aumenta el brillo
- -darken : Disminuye el brillo
- -invert : Invierte los colores
- -grayscale : Aplica escala de grises
- -rotate90 : Rota la imagen 90 grados
- -rotate180 : Rota la imagen 180 grados
- -flip : Invierte la imagen horizontalmente
- -flop : Invierte la imagen verticalmente
- -normalice : Normaliza la imagen
- -negate : Negatiza la imagen
- -tint : Aplica un tinte de color a la imagen (rojo por defecto)

> Ejemplo: *${usedPrefix + command} -c -blur Pack • Autor*`
        return client.reply(m.chat, helpText, m)
      }

      const quoted = m.quoted ? m.quoted : m
      const mime = (quoted.msg || quoted).mimetype || ''

      const user = global.db?.data?.users?.[m.sender] || {}
      const name = user.name || ''
      const texto1 = user.metadatos || "ʏᴜᴋɪ 🧠 Wᴀʙᴏᴛ'ꜱ"
      const texto2 = user.metadatos2 || `@${name}`

      const { urlArg, picked, marca } = parseArgs(args)

      const pack = marca[0] || texto1
      const author = marca.length > 1 ? marca[1] : texto2

      const sendWebpWithExif = async (webpBuffer) => {
        const media = { mimetype: 'webp', data: webpBuffer }
        const metadata = { packname: pack, author, categories: [''] }
        const stickerPath = await writeExif(media, metadata)
        await client.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m })
        fs.unlinkSync(stickerPath)
      }

      const makeStickerFromImageFile = async (inFile) => {
        const outWebp = tmp(`sticker-${Date.now()}.webp`)
        const vf = buildVF(picked)

        await runFfmpeg([
          '-y',
          '-i', inFile,
          '-vf', vf,
          '-an',
          '-fps_mode', 'passthrough',
          '-loop', '0',
          '-c:v', 'libwebp',
          '-preset', 'picture',
          '-compression_level', '6',
          '-q:v', '70',
          outWebp
        ])

        const data = fs.readFileSync(outWebp)
        fs.unlinkSync(outWebp)
        await sendWebpWithExif(data)
      }

      const makeStickerFromVideoFile = async (inFile) => {
        await client.sendVideoAsSticker(m.chat, inFile, m, { packname: pack, author })
      }

      const handleWebpBuffer = async (buffer) => {
        const animated = isAnimatedWebpBuffer(buffer)
        if (animated) {
          if (picked.length) {
            return client.reply(m.chat, '《✧》 No puedo aplicar formas/efectos a stickers WEBP animados con ffmpeg en este método. Envíalo como imagen o usa /s sin flags.', m)
          }
          return sendWebpWithExif(buffer)
        }
        const inFile = tmp(`in-${Date.now()}.webp`)
        fs.writeFileSync(inFile, buffer)
        await makeStickerFromImageFile(inFile)
        fs.unlinkSync(inFile)
      }

      if (/webp/i.test(mime)) {
        const buffer = await quoted.download()
        await handleWebpBuffer(buffer)
        return
      }

      if (/image/i.test(mime)) {
        const buffer = await quoted.download()
        const inFile = tmp(`in-${Date.now()}${extFromMime(mime, '.img')}`)
        fs.writeFileSync(inFile, buffer)
        await makeStickerFromImageFile(inFile)
        fs.unlinkSync(inFile)
        return
      }

      if (/video/i.test(mime)) {
        if ((quoted.msg || quoted).seconds > 20) return m.reply('《✧》 El video no puede ser muy largo')
        const buffer = await quoted.download()
        const inFile = tmp(`vid-${Date.now()}.mp4`)
        fs.writeFileSync(inFile, buffer)
        await makeStickerFromVideoFile(inFile)
        fs.unlinkSync(inFile)
        return
      }

      if (urlArg) {
        const url = urlArg
        if (!url.match(/\.(jpe?g|png|gif|webp|mp4|mov|avi|mkv|webm)(\?.*)?$/i)) {
          return client.reply(m.chat, '《✧》 La URL debe ser de una imagen (jpg, png, gif, webp) o video (mp4, mov, avi, mkv, webm)', m)
        }

        const res = await fetch(url)
        if (!res.ok) return client.reply(m.chat, '《✧》 No pude descargar ese archivo desde la URL.', m)
        const buffer = Buffer.from(await res.arrayBuffer())

        if (url.match(/\.webp(\?.*)?$/i)) {
          await handleWebpBuffer(buffer)
          return
        }

        if (url.match(/\.(jpe?g|png|gif)(\?.*)?$/i)) {
          const inFile = tmp(`url-${Date.now()}.img`)
          fs.writeFileSync(inFile, buffer)
          await makeStickerFromImageFile(inFile)
          fs.unlinkSync(inFile)
          return
        }

        if (url.match(/\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i)) {
          const inFile = tmp(`urlvid-${Date.now()}.mp4`)
          fs.writeFileSync(inFile, buffer)
          await makeStickerFromVideoFile(inFile)
          fs.unlinkSync(inFile)
          return
        }
      }

      return client.reply(
        m.chat,
        `《✧》 Por favor, envía una imagen, video, sticker o URL para hacer un sticker.\n> Usa *${usedPrefix + command} -list* para ver formas y efectos`,
        m
      )
    } catch (e) {
      return m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  }
}

const { writeExif } = exif

const tmp = (name) => path.join('./tmp', name)

const ensureTmp = () => {
  if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true })
}

const isUrl = (text) => /https?:\/\/[^\s]+/i.test(text)

const runFfmpeg = (args) =>
  new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => (err += d.toString()))
    p.on('close', (code) => {
      if (code === 0) return resolve(true)
      reject(new Error(err || `ffmpeg exited with code ${code}`))
    })
  })

const isAnimatedWebpBuffer = (buf) => {
  if (!Buffer.isBuffer(buf) || buf.length < 32) return false
  const anim = Buffer.from('ANIM')
  const anmf = Buffer.from('ANMF')
  return buf.indexOf(anim) !== -1 || buf.indexOf(anmf) !== -1
}

const parseArgs = (args) => {
  let urlArg = null
  const rest = []
  for (const a of args) {
    if (!urlArg && isUrl(a)) urlArg = a
    else rest.push(a)
  }

  const shapeArgs = {
    '-c': 'circle',
    '-t': 'triangle',
    '-s': 'star',
    '-r': 'roundrect',
    '-h': 'hexagon',
    '-d': 'diamond',
    '-f': 'frame',
    '-b': 'border',
    '-w': 'wave',
    '-m': 'mirror',
    '-o': 'octagon',
    '-y': 'pentagon',
    '-e': 'ellipse',
    '-z': 'cross',
    '-v': 'heart',
    '-x': 'cover',
    '-i': 'contain'
  }

  const effectArgs = {
    '-blur': 'blur',
    '-sepia': 'sepia',
    '-sharpen': 'sharpen',
    '-brighten': 'brighten',
    '-darken': 'darken',
    '-invert': 'invert',
    '-grayscale': 'grayscale',
    '-rotate90': 'rotate90',
    '-rotate180': 'rotate180',
    '-flip': 'flip',
    '-flop': 'flop',
    '-normalice': 'normalise',
    '-negate': 'negate',
    '-tint': 'tint'
  }

  const picked = []
  for (const a of rest) {
    if (shapeArgs[a]) picked.push({ type: 'shape', value: shapeArgs[a] })
    else if (effectArgs[a]) picked.push({ type: 'effect', value: effectArgs[a] })
  }

  const filteredText = rest.join(' ').replace(/-\w+/g, '').trim()
  const marca = filteredText.split(/[\u2022|]/).map((s) => s.trim()).filter(Boolean)

  return { urlArg, picked, marca }
}

const buildVF = (picked) => {
  const W = 512
  const H = 512

  const shape = picked.find((x) => x.type === 'shape')?.value || null
  const effects = picked.filter((x) => x.type === 'effect').map((x) => x.value)

  const vf = []

  const useCover = shape === 'cover'
  const useContain = shape === 'contain' || !useCover

  if (useCover) {
    vf.push(`scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`)
  } else if (useContain) {
    vf.push(`scale=${W}:${H}:force_original_aspect_ratio=decrease`)
    vf.push(`pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`)
  }

  vf.push('format=rgba')

  for (const e of effects) {
    if (e === 'blur') vf.push('gblur=sigma=6:steps=2')
    else if (e === 'sepia') vf.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131')
    else if (e === 'sharpen') vf.push('unsharp=5:5:1.2:5:5:0.0')
    else if (e === 'brighten') vf.push('eq=brightness=0.08')
    else if (e === 'darken') vf.push('eq=brightness=-0.10')
    else if (e === 'invert') vf.push('negate')
    else if (e === 'grayscale') vf.push('hue=s=0')
    else if (e === 'rotate90') vf.push('transpose=1')
    else if (e === 'rotate180') vf.push('rotate=PI')
    else if (e === 'flip') vf.push('hflip')
    else if (e === 'flop') vf.push('vflip')
    else if (e === 'normalise') vf.push('normalize')
    else if (e === 'negate') vf.push('negate')
    else if (e === 'tint') vf.push('colorchannelmixer=1:0:0:0:0:0.85:0:0:0:0:0.85')
  }

  if (shape === 'mirror') vf.push('hflip')

  const hasBorder = shape === 'border'
  const hasFrame = shape === 'frame'
  if (hasBorder) vf.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=white@0.90:t=14`)
  if (hasFrame) vf.push(`drawbox=x=18:y=18:w=${W - 36}:h=${H - 36}:color=white@0.55:t=10`)

  const cx = `${W}/2`
  const cy = `${H}/2`
  const minwh = `min(${W},${H})`
  const r = `(${minwh}/2)`

  const clamp255 = (expr) => `if(${expr},255,0)`

  const alphaExpr = (() => {
    if (!shape || shape === 'cover' || shape === 'contain' || shape === 'mirror' || shape === 'border' || shape === 'frame') return null

    if (shape === 'circle') return clamp255(`lte((X-${cx})*(X-${cx})+(Y-${cy})*(Y-${cy}),(${r}-6)*(${r}-6))`)
    if (shape === 'ellipse') {
      const rx = `(${W}*0.46)`
      const ry = `(${H}*0.40)`
      return clamp255(`lte(((X-${cx})*(X-${cx}))/((${rx})*(${rx}))+((Y-${cy})*(Y-${cy}))/((${ry})*(${ry})),1)`)
    }
    if (shape === 'diamond') return clamp255(`lte(abs(X-${cx})+abs(Y-${cy}),(${r}-6))`)
    if (shape === 'triangle') {
      const topY = `${H}*0.08`
      const botY = `${H}*0.94`
      return clamp255(`gte(Y,${topY})*lte(Y,${botY})*lte(abs(X-${cx}), ((${botY}-Y)*0.58))`)
    }
    if (shape === 'roundrect') {
      const pad = 28
      const cr = 64
      const x0 = pad
      const y0 = pad
      const x1 = W - pad
      const y1 = H - pad
      const inCore = `(X>=${x0}+${cr})*(X<=${x1}-${cr})*(Y>=${y0})*(Y<=${y1})+(X>=${x0})*(X<=${x1})*(Y>=${y0}+${cr})*(Y<=${y1}-${cr})`
      const c1 = `lte((X-(${x0}+${cr}))*(X-(${x0}+${cr}))+(Y-(${y0}+${cr}))*(Y-(${y0}+${cr})),(${cr})*(${cr}))`
      const c2 = `lte((X-(${x1}-${cr}))*(X-(${x1}-${cr}))+(Y-(${y0}+${cr}))*(Y-(${y0}+${cr})),(${cr})*(${cr}))`
      const c3 = `lte((X-(${x0}+${cr}))*(X-(${x0}+${cr}))+(Y-(${y1}-${cr}))*(Y-(${y1}-${cr})),(${cr})*(${cr}))`
      const c4 = `lte((X-(${x1}-${cr}))*(X-(${x1}-${cr}))+(Y-(${y1}-${cr}))*(Y-(${y1}-${cr})),(${cr})*(${cr}))`
      return clamp255(`gt(${inCore}+${c1}+${c2}+${c3}+${c4},0)`)
    }
    if (shape === 'cross') {
      const w = `${W}*0.28`
      const h = `${H}*0.28`
      const v = `(abs(X-${cx})<=${w}/2)*(abs(Y-${cy})<=${H}*0.46)`
      const hbar = `(abs(Y-${cy})<=${h}/2)*(abs(X-${cx})<=${W}*0.46)`
      return clamp255(`gt(${v}+${hbar},0)`)
    }
    if (shape === 'heart') {
      const xn = `(X-${cx})/(${W}*0.33)`
      const yn = `(Y-${cy})/(${H}*0.33)`
      return clamp255(`lte(pow(${xn}*${xn}+${yn}*${yn}-1,3)-(${xn}*${xn})*pow(${yn},3),0)`)
    }
    if (shape === 'star') {
      const dx = `(X-${cx})`
      const dy = `(Y-${cy})`
      const theta = `atan2(${dy},${dx})`
      const rad = `hypot(${dx},${dy})`
      const base = `(${W}*0.20)`
      const amp = `(${W}*0.10)`
      const limit = `(${base}+${amp}*cos(5*${theta}))`
      return clamp255(`lte(${rad},${limit}*2.0)`)
    }
    if (shape === 'wave') {
      const amp = `${H}*0.06`
      const mid = `${H}*0.50`
      const yline = `(${mid}+${amp}*sin(X*0.06))`
      return clamp255(`lte(abs(Y-${yline}),${H}*0.40)`)
    }
    if (shape === 'hexagon' || shape === 'pentagon' || shape === 'octagon') {
      const n = shape === 'pentagon' ? 5 : shape === 'octagon' ? 8 : 6
      const dx = `(X-${cx})`
      const dy = `(Y-${cy})`
      const theta = `atan2(${dy},${dx})`
      const rad = `hypot(${dx},${dy})`
      const k = `cos(PI/${n})/cos(mod(${theta},2*PI/${n})-PI/${n})`
      const limit = `(${W}*0.40)*${k}`
      return clamp255(`lte(${rad},${limit})`)
    }

    return null
  })()

  if (alphaExpr) vf.push(`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaExpr}'`)

  vf.push('format=yuva420p')
  return vf.join(',')
}

const extFromMime = (mime, fallback = '.bin') => {
  if (/png/i.test(mime)) return '.png'
  if (/jpe?g/i.test(mime)) return '.jpg'
  if (/webp/i.test(mime)) return '.webp'
  if (/gif/i.test(mime)) return '.gif'
  if (/mp4|mkv|webm|mov|avi/i.test(mime)) return '.mp4'
  return fallback
}