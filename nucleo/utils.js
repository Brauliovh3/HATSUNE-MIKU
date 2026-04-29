const groupMetadataCache = new Map()
const lidCache = new Map()
const pendingMetadataRequests = new Map()
const metadataTTL = 300000 

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

export async function resolveLidToRealJid(lid, client, groupChatId) {
  const input = lid?.toString().trim()
  if (!input || !groupChatId?.endsWith('@g.us')) return input

  if (input.endsWith('@s.whatsapp.net')) return input

  if (lidCache.has(input)) return lidCache.get(input)

  const lidBase = input.split('@')[0]
  let metadata = getCachedMetadata(groupChatId)

  if (metadata === undefined) {
    if (pendingMetadataRequests.has(groupChatId)) {
      metadata = await pendingMetadataRequests.get(groupChatId)
    } else {
      
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 5000))
      const request = Promise.race([client.groupMetadata(groupChatId).catch(() => null), timeout])
      pendingMetadataRequests.set(groupChatId, request)
      metadata = await request
      pendingMetadataRequests.delete(groupChatId)
      groupMetadataCache.set(groupChatId, { metadata, timestamp: Date.now() })
    }
  }

  if (!metadata) {
    lidCache.set(input, input)
    return input
  }

  for (const p of metadata.participants || []) {
    const idBase = p?.id?.split('@')[0]?.trim()
    const phoneRaw = p?.phoneNumber
    const phone = normalizeToJid(phoneRaw)
    if (!idBase || !phone) continue
    if (idBase === lidBase) return lidCache.set(input, phone), phone
  }

  return lidCache.set(input, input), input
}