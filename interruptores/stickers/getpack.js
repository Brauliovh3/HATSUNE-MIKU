import fs from 'fs';

export default {
  command: ['getpack', 'gpack'],
  category: 'stickers',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      if (!args.length) {
        return m.reply('💙 Especifica el nombre del paquete de stickers.', m, global.miku)
      }
      const packName = args.join(' ').trim().toLowerCase()
      const db = global.db.data
      if (!db.stickerspack) db.stickerspack = {}

      let pack = null
      let packOwner = m.sender

      const myPacks = db.stickerspack[m.sender]?.packs || []
      pack = myPacks.find(p => p.name.toLowerCase() === packName)

      if (!pack) {
        for (const [userId, userData] of Object.entries(db.stickerspack)) {
          const userPacks = userData.packs || []
          const publicPack = userPacks.find(p => p.name.toLowerCase() === packName && p.spackpublic === 1)
          if (publicPack) {
            pack = publicPack
            packOwner = userId
            break
          }
        }
      }

      if (!pack) {
        return m.reply('💙 No se encontró un paquete con ese nombre.', m, global.miku)
      }
      if (!Array.isArray(pack.stickers) || pack.stickers.length < 4) {
        return m.reply(`💙 El paquete \`${pack.name}\` no tiene suficientes stickers.`, m, global.miku)
      }
      const validStickers = pack.stickers.map(s => {
        try {
          return Buffer.from(s, 'base64')
        } catch {
          return null
        }
      }).filter(s => s && Buffer.isBuffer(s) && s.length > 0)

      if (validStickers.length < 4) {
        return m.reply('💙 Algunos stickers están corruptos.', m, global.miku)
      }

      const MAX_STICKERS = 50
      const selected = validStickers.slice(0, MAX_STICKERS)
      const cover = selected[0]

      const packOwnerUser = db.users[packOwner] || {}
      const userId = packOwnerUser
      const name = userId?.name || packOwner.split('@')[0]
      const ownerMeta1 = packOwnerUser?.metadatos ? String(packOwnerUser.metadatos).trim() : ''
      const ownerMeta2 = packOwnerUser?.metadatos2 ? String(packOwnerUser.metadatos2).trim() : ''
      const stickerPackname = ownerMeta1 ? ownerMeta1 : pack.name
      const stickerAuthor = ownerMeta1 ? (ownerMeta2 ? ownerMeta2 : '') : pack.desc

      const webp = await import('node-webpmux')
      const stickerResults = await Promise.all(selected.map(async (buffer) => {
        try {
          const img = new webp.default.Image()
          await img.load(buffer)
          const json = { 'sticker-pack-id': 'https://github.com/Brauliovh3/HATSUNE-MIKU', 'sticker-pack-name': stickerPackname, 'sticker-pack-publisher': stickerAuthor, emojis: ['🎭'] }
          const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
          const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8')
          const exif = Buffer.concat([exifAttr, jsonBuff])
          exif.writeUIntLE(jsonBuff.length, 14, 4)
          img.exif = exif
          const tmpOut = `./tmp/pack-sticker-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
          await img.save(tmpOut)
          const stickerBuf = fs.readFileSync(tmpOut)
          fs.unlinkSync(tmpOut)
          return { sticker: stickerBuf, isAnimated: false, isLottie: false, emojis: ['🎭'] }
        } catch {
          return { sticker: buffer, isAnimated: false, isLottie: false, emojis: ['🎭'] }
        }
      }))

      await client.sendMessage(m.chat, { stickerPack: { name: pack.name, publisher: `${pack.author} (${name})`, description: pack.desc, cover, stickers: stickerResults }, ...global.miku }, { quoted: m })
      await m.react('✔️')
    } catch (e) {
      await m.react('✖️')
      m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  }
}
