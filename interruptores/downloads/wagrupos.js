import { getBuffer } from '../../nucleo/message.js'


const MIKU = {
  divider: '╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌',
  footer:  '\n╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌\n🎵 *Hatsune Miku* ✦ *Bot* 🎵',
  thumb:   'https://iili.io/qp681b1.jpg',
}


const APIS = [
  {
    name: 'WhatsApp Group Links',
    fetch: async (query, limit) => {
    
      const url = `https://whatsapp-group-links.p.rapidapi.com/groups?search=${encodeURIComponent(query)}&limit=${limit}`
      const res = await fetch(url, {
        headers: {
          'x-rapidapi-host': 'whatsapp-group-links.p.rapidapi.com',
        
          'x-rapidapi-key': global.APIs?.rapidapi?.key || ''
        },
        signal: AbortSignal.timeout(8000)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return parseRapidAPI(json)
    }
  },
  {
    name: 'Stellar API',
    fetch: async (query, limit) => {
      const base = global.APIs?.stellar?.url || 'https://api.stellarapi.io'
      const key  = global.APIs?.stellar?.key || ''
      const url  = `${base}/search/wagroups?query=${encodeURIComponent(query)}&limit=${limit}&key=${key}`
      const res  = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return parseStellar(json)
    }
  },
  {
    name: 'Axi API',
    fetch: async (query, limit) => {
      const base = global.APIs?.axi?.url || 'https://api.axioma.workers.dev'
      const url  = `${base}/api/grupos?search=${encodeURIComponent(query)}&limit=${limit}`
      const res  = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return parseGeneric(json)
    }
  }
]


function parseRapidAPI(json) {
  const items = json?.data || json?.groups || json?.results || []
  return items.filter(v => v.link || v.url || v.invite).map(v => ({
    name:        v.name || v.title || 'Sin nombre',
    link:        v.link || v.url || v.invite,
    country:     v.country || v.region || 'No especificado',
    category:    v.category || v.type || '',
    description: v.description || v.desc || 'Sin descripción',
  }))
}

function parseStellar(json) {
  const items = json?.results || json?.data || []
  return items.filter(v => v.link || v.url).map(v => ({
    name:        v.name || v.title || 'Sin nombre',
    link:        v.link || v.url,
    country:     v.country || 'No especificado',
    category:    v.category || '',
    description: v.description || 'Sin descripción',
  }))
}

function parseGeneric(json) {
  const items = json?.data || json?.results || json?.grupos || []
  return items.filter(v => v.link || v.url || v.invite_link).map(v => ({
    name:        v.name || v.title || 'Sin nombre',
    link:        v.link || v.url || v.invite_link,
    country:     v.country || 'No especificado',
    category:    v.category || '',
    description: v.description || 'Sin descripción',
  }))
}


async function fetchGrupos(query, limit) {
  const errors = []

  for (const api of APIS) {
    try {
      const grupos = await api.fetch(query, limit)
      if (grupos?.length) {
        return { grupos, source: api.name }
      }
    } catch (e) {
      errors.push(`${api.name}: ${e.message}`)
      console.warn(`[wagrupos] API fallida → ${api.name}:`, e.message)
    }
  }

  throw new Error(`Todas las APIs fallaron:\n${errors.join('\n')}`)
}

export default {
  command: ['wpgrupos', 'gruposwa', 'wagrupos'],
  category: 'internet',
  run: async (client, m, args, usedPrefix, command) => {

    if (!args?.length || !args[0]) {
      return m.reply(
        `🎵✦ *WA GRUPOS SEARCH* ✦🎵\n${MIKU.divider}\n\n` +
        `🩵 Por favor, ingresa una *categoría*.\n\n` +
        `🎵 *Uso:*\n` +
        `\`${usedPrefix + command} amistad\`\n` +
        `\`${usedPrefix + command} gaming 15\`\n\n` +
        `🌿 El número al final define el límite (máx. 20)` +
        MIKU.footer
      )
    }

    await m.react('⏳')

    try {
      const lastArg  = args[args.length - 1]
      const hasLimit = !isNaN(lastArg) && lastArg.trim() !== ''
      const limite   = hasLimit ? Math.min(Math.max(parseInt(lastArg, 10), 1), 20) : 10
      const categoria = hasLimit
        ? args.slice(0, -1).join(' ').toLowerCase().trim()
        : args.join(' ').toLowerCase().trim()

      if (!categoria) {
        await m.react('❌')
        return m.reply(
          `🩵✦ *CATEGORÍA INVÁLIDA* ✦🩵\n${MIKU.divider}\n\n` +
          `🎵 Escribe una categoría válida.\n` +
          `🌿 Ejemplo: \`${usedPrefix + command} deportes\`` +
          MIKU.footer
        )
      }

      
      let grupos, source
      try {
        ({ grupos, source } = await fetchGrupos(categoria, limite))
      } catch (apiError) {
        console.error('[wagrupos] Sin APIs disponibles:', apiError.message)
        await m.react('❌')
        return m.reply(
          `🩵✦ *SIN CONEXIÓN* ✦🩵\n${MIKU.divider}\n\n` +
          `🎵 Los servidores de grupos no están disponibles ahora mismo.\n` +
          `🌿 Inténtalo de nuevo en unos minutos.` +
          MIKU.footer
        )
      }

      if (!grupos.length) {
        await m.react('❌')
        return m.reply(
          `🩵✦ *SIN RESULTADOS* ✦🩵\n${MIKU.divider}\n\n` +
          `🎵 No se encontraron grupos para: *${categoria}*\n` +
          `🌿 Prueba con otra palabra clave.` +
          MIKU.footer
        )
      }

     
      let thumbnail = null
      try { thumbnail = await getBuffer(MIKU.thumb) } catch (_) {}

      
      const icons = ['🩵', '🌿', '🎵', '✦', '🌐']

      let teks  = `🎵✦ *WA GRUPOS SEARCH* ✦🎵\n${MIKU.divider}\n\n`
      teks += `🩵 *Categoría ›* ${categoria}\n`
      teks += `🌿 *Encontrados ›* ${grupos.length}\n`
      teks += `🎵 *Fuente ›* ${source}\n\n`
      teks += `${MIKU.divider}\n\n`

      teks += grupos.map((v, i) => {
        const ico = icons[i % icons.length]
        return (
          `${ico} *${i + 1}. ${v.name}*\n` +
          `> 🩵 *País ›* ${v.country}\n` +
          `> 🌿 *Categoría ›* ${v.category || categoria}\n` +
          `> 🎵 *Info ›* ${v.description}\n` +
          `> ✦ *Link ›* ${v.link}`
        )
      }).join('\n\n╌\n\n')

      teks += MIKU.footer

      await client.sendMessage(
        m.chat,
        {
          text: teks,
          contextInfo: {
            externalAdReply: {
              title:                 '🎵 WA Grupos Search',
              body:                  `✦ ${grupos.length} grupos encontrados`,
              mediaType:             1,
              renderLargerThumbnail: true,
              showAdAttribution:     false,
              thumbnail,
              sourceUrl:             ''
            }
          }
        },
        { quoted: m }
      )

      await m.react('✅')

    } catch (e) {
      await m.react('❌')
      console.error('[wagrupos] Error inesperado:', e)
      return m.reply(
        `💔 *ERROR* ✦🩵\n${MIKU.divider}\n\n` +
        `🎵 Error al ejecutar *${usedPrefix + command}*\n` +
        `🌿 *Detalle:* ${e.message}\n\n` +
        `✦ Inténtalo de nuevo o contacta soporte.` +
        MIKU.footer
      )
    }
  }
}