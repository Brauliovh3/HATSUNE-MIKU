const groupMetadataCache = new Map()  
const lidCache           = new Map()   
const pendingMetadataRequests = new Map() 
const metadataTTL = 5 * 60 * 1000   



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
 * 
 * 
 * 
 *
 * @param {object} client   instancia de Baileys
 * @param {string} jid      JID del grupo  (@g.us)
 * @returns {object|null}   groupMetadata o null
 */
export async function getGroupMetadata(client, jid) {
  if (!jid?.endsWith('@g.us')) return null

  const cached = getCachedMetadata(jid)
  if (cached !== undefined) return cached

  
  if (pendingMetadataRequests.has(jid)) {
    return pendingMetadataRequests.get(jid)
  }

  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 5000))
  const request = Promise.race([
    client.groupMetadata(jid).catch(() => null),
    timeout,
  ])
  pendingMetadataRequests.set(jid, request)

  const metadata = await request
  pendingMetadataRequests.delete(jid)
  groupMetadataCache.set(jid, { metadata, timestamp: Date.now() })

  return metadata
}


export function invalidateGroupCache(jid) {
  groupMetadataCache.delete(jid)
}


export function pruneGroupCache() {
  const now = Date.now()
  for (const [jid, entry] of groupMetadataCache) {
    if (now - entry.timestamp > metadataTTL) groupMetadataCache.delete(jid)
  }
 
  if (lidCache.size > 2000) lidCache.clear()
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