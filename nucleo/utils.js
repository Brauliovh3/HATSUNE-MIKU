const groupMetadataCache = new Map()
const lidCache = new Map()
const pendingMetadataRequests = new Map() // Caché de promesas para evitar consultas simultáneas
const metadataTTL = 300000 // Aumentado a 5 minutos para evitar consultas repetitivas de red

function getCachedMetadata(groupChatId) {
  const cached = groupMetadataCache.get(groupChatId)
  if (!cached || Date.now() - cached.timestamp > metadataTTL) return null
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

  if (!metadata) {
    if (pendingMetadataRequests.has(groupChatId)) {
      metadata = await pendingMetadataRequests.get(groupChatId)
    } else {
      const request = client.groupMetadata(groupChatId).catch(() => null)
      pendingMetadataRequests.set(groupChatId, request)
      metadata = await request
      pendingMetadataRequests.delete(groupChatId)
      if (metadata) groupMetadataCache.set(groupChatId, { metadata, timestamp: Date.now() })
      else return lidCache.set(input, input), input
    }
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