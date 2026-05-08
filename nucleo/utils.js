const groupMetadataCache = new Map()
const lidCache           = new Map()
const pendingMetadataRequests = new Map()
const metadataTTL = Number(process.env.MIKU_GROUP_METADATA_TTL_MS || 10 * 60 * 1000)
const metadataTimeoutMs = Number(process.env.MIKU_GROUP_METADATA_TIMEOUT_MS || 1500)
const MAX_CACHE_SIZE = 500   



function getCachedMetadata(groupChatId) {
  const cached = groupMetadataCache.get(groupChatId)
  if (!cached || Date.now() - cached.timestamp > metadataTTL) return undefined
  return cached.metadata
}

function normalizeToJid(phone) {
  if (!phone) return null
  const base = typeof phone === 'number' ? phone.toString() : phone.replace(/\D/g, '')
  return base ? `${base}@s.whatsapp.net` : null
}



/**

 * @param {object} client   
 * @param {string} jid      
 * @returns {object|null}   
 */
export async function getGroupMetadata(client, jid) {
  if (!jid?.endsWith('@g.us')) return null

  const cached = getCachedMetadata(jid)
  if (cached !== undefined) return cached

  
  if (pendingMetadataRequests.has(jid)) {
    return pendingMetadataRequests.get(jid)
  }

  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), metadataTimeoutMs))
  const request = Promise.race([
    client.groupMetadata(jid).catch(() => null),
    timeout,
  ])
  pendingMetadataRequests.set(jid, request)

  const metadata = await request
  pendingMetadataRequests.delete(jid)
  if (metadata) {
    groupMetadataCache.set(jid, { metadata, timestamp: Date.now() })
  }

  return metadata
}


export function invalidateGroupCache(jid) {
  groupMetadataCache.delete(jid)
}


export function pruneGroupCache() {
  const now = Date.now()
  let deleted = 0
  for (const [jid, entry] of groupMetadataCache) {
    if (now - entry.timestamp > metadataTTL) {
      groupMetadataCache.delete(jid)
      deleted++
    }
  }

  if (groupMetadataCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(groupMetadataCache.entries())
    const toDelete = entries.length - MAX_CACHE_SIZE
    for (let i = 0; i < toDelete; i++) {
      groupMetadataCache.delete(entries[i][0])
    }
  }

  if (lidCache.size > 1000) lidCache.clear()
}


export async function resolveLidToRealJid(lid, client, groupChatId) {
  const input = lid?.toString().trim()
  if (!input || !groupChatId?.endsWith('@g.us')) return input

  if (input.endsWith('@s.whatsapp.net')) return input

  if (lidCache.has(input)) return lidCache.get(input)

  const lidBase = input.split('@')[0]
  const metadata = await getGroupMetadata(client, groupChatId)

  if (!metadata) {
    lidCache.set(input, input)
    return input
  }

  for (const p of metadata.participants || []) {
    const idBase  = p?.id?.split('@')[0]?.trim()
    const phone   = normalizeToJid(p?.phoneNumber)
    if (!idBase || !phone) continue
    if (idBase === lidBase) {
      lidCache.set(input, phone)
      return phone
    }
  }

  lidCache.set(input, input)
  return input
}
