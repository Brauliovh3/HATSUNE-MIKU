import fetch from 'node-fetch'
import { promises as fs } from 'fs'

const FILE_PATH = './lib/characters.json'
const rollLocks = new Map()

function cleanOldLocks() {
  const now = Date.now()
  for (const [userId, lockTime] of rollLocks.entries()) {
    if (now - lockTime > 30000) {
      rollLocks.delete(userId)
    }
  }
}

async function loadCharacters() {
  try {
    await fs.access(FILE_PATH)
  } catch {
    await fs.writeFile(FILE_PATH, '{}')
  }
  const raw = await fs.readFile(FILE_PATH, 'utf-8')
  return JSON.parse(raw)
}
function flattenCharacters(db) {
  return Object.values(db).flatMap(s => Array.isArray(s.characters) ? s.characters : [])
}
function getSeriesNameByCharacter(db, id) {
  return Object.entries(db).find(([, serie]) => Array.isArray(serie.characters) && serie.characters.some(c => String(c.id) === String(id)))?.[1]?.name || 'Desconocido'
}
function formatTag(tag) {
  return String(tag).trim().toLowerCase().replace(/\s+/g, '_')
}

async function buscarImagenDelirius(tag) {
const query = formatTag(tag)
const urls = [`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${query}`, `https://danbooru.donmai.us/posts.json?tags=${query}`, `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${query}&api_key=f965be362e70972902e69652a472b8b2df2c5d876cee2dc9aebc7d5935d128db98e9f30ea4f1a7d497e762f8a82f132da65bc4e56b6add0f6283eb9b16974a1a&user_id=1862243`]
for (const url of urls) {
try {
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}})
const type = res.headers.get('content-type') || ''
if (!res.ok || !type.includes('json')) continue
const json = await res.json()
const data = Array.isArray(json) ? json : json?.post || json?.data || []
const valid = data.map(i => i?.file_url || i?.large_file_url || i?.image || i?.media_asset?.variants?.[0]?.url).filter(u => typeof u === 'string' && /\.(jpe?g|png)$/.test(u))
if (valid.length) return valid
} catch {}
}
return []
}

export default {
  command: ['rollwaifu', 'rw', 'roll'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    const userId = m.sender
    const chatId = m.chat    
    cleanOldLocks()   
    if (rollLocks.has(userId)) {
      const lockTime = rollLocks.get(userId)
      const now = Date.now()      
      if (now - lockTime < 15000) {
        return
      }
      rollLocks.delete(userId)
    }    
    const chats = global.db.data.chats
    const chat = chats[chatId]    
    if (chat.adminonly || !chat.gacha) {
      return m.reply(`💙 Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}gacha on*`)
    }        
    if (!chat.users) chat.users = {}
    if (!chat.users[userId]) chat.users[userId] = {}
    if (!chat.characters) chat.characters = {}
    chat.rolls ||= {}        
    const me = chat.users[userId]
    const now = Date.now()
    const cooldown = 15 * 60 * 1000    
    if (me.lastRoll && now < me.lastRoll) {
      const r = Math.ceil((me.lastRoll - now) / 1000)
      const min = Math.floor(r / 60)
      const sec = r % 60
      let timeText = ''
      if (min > 0) timeText += `${min} minuto${min !== 1 ? 's' : ''} `
      if (sec > 0 || timeText === '') timeText += `${sec} segundo${sec !== 1 ? 's' : ''}`
      return m.reply(`💙 Debes esperar *${timeText.trim()}* para usar *${usedPrefix + 'rw'}* de nuevo.`)
    }    
    rollLocks.set(userId, now)    
    try {
      const db = await loadCharacters()
      const all = flattenCharacters(db)
      const selected = all[Math.floor(Math.random() * all.length)]
      const id = String(selected.id)
      const source = getSeriesNameByCharacter(db, selected.id)
      const baseTag = formatTag(selected.tags?.[0] || '')
      const mediaList = await buscarImagenDelirius(baseTag)
      const media = mediaList[Math.floor(Math.random() * mediaList.length)]
      if (!media) {
        rollLocks.delete(userId)
        return m.reply(`💙 No se encontró imágenes para el personaje *${selected.name}*.`)
      }
      if (!chat.characters[selected.id]) chat.characters[selected.id] = {}
      const record = chat.characters[selected.id]
      const globalRec = global.db.data.characters?.[selected.id] || {}
      record.name = String(selected.name || 'Sin nombre')
      record.value = typeof globalRec.value === 'number' ? globalRec.value : Number(selected.value) || 100
      record.votes = Number(record.votes || globalRec.votes || 0)
      record.reservedBy = userId
      record.reservedUntil = now + 20000
      record.expiresAt = now + 60000
      const owner = typeof record?.user === 'string' && record.user.length ? (global.db.data.users?.[record.user]?.name || record.user.split('@')[0]).trim() : 'desconocido'
      const msg = `💙 Nombre » *${record.name}*
⚥ Género » *${selected.gender || 'Desconocido'}*
✰ Valor » *${record.value.toLocaleString()}*
♡ Estado » *${record.user ? `Reclamado por ${owner}` : 'Libre'}*
❖ Fuente » *${source}*`
      const sent = await client.sendMessage(chatId, { image: { url: media }, caption: msg }, { quoted: m })
      chat.rolls[sent.key.id] = { id, name: record.name, expiresAt: record.expiresAt, reservedBy: userId, reservedUntil: record.reservedUntil }            
      me.lastRoll = now + cooldown      
    } catch (e) {
      await m.reply(`❌ Ocurrió un error inesperado al ejecutar el comando *${usedPrefix + command}*. Por favor, intenta nuevamente o contacta al soporte si el problema persiste.\n> [Error: *${e.message}*]`)
    } finally {
      rollLocks.delete(userId)
    }
  },
}
