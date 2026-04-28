import axios from 'axios'
import * as cheerio from 'cheerio'
import { getBuffer } from '../../nucleo/message.js'

const MIKU = {
  divider: '╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌',
  footer:  '\n╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌\n🎵 *Hatsune Miku* ✦ *Bot* 🎵',
  thumb:   'https://iili.io/qp681b1.jpg',
}


async function fetchGruposSinApi(query, limit) {
  try {
    const searchUrl = `https://www.bing.com/search?q=site:chat.whatsapp.com+${encodeURIComponent(query)}`
    const { data } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    })

    const $ = cheerio.load(data)
    const grupos = []

    $('.b_algo').each((i, el) => {
      let title = $(el).find('h2').text().trim()
      title = title.replace(/WhatsApp Group Invite|Invitación a grupo de WhatsApp|WhatsApp Group/gi, '').trim() || 'Grupo sin nombre'
      
      const snippet = $(el).find('.b_caption p').text().trim() || $(el).text()
      const htmlBlock = $(el).html()
      const linkMatch = htmlBlock.match(/chat\.whatsapp\.com\/[a-zA-Z0-9]{15,30}/)
      
      if (linkMatch && grupos.length < limit) {
        const link = `https://${linkMatch[0]}`
        if (!grupos.some(g => g.link === link)) {
          grupos.push({
            name: title,
            link: link,
            country: 'Global',
            category: query,
            description: snippet.length > 70 ? snippet.substring(0, 70) + '...' : snippet || 'Sin descripción'
          })
        }
      }
    })

    if (grupos.length > 0) {
      return { grupos, source: 'Scraper Nativo (Bing)' }
    } else {
      throw new Error('No se encontraron enlaces válidos (Posible bloqueo de IP por el buscador).')
    }

  } catch (error) {
    throw new Error(`Búsqueda fallida: ${error.message}`)
  }
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
        ({ grupos, source } = await fetchGruposSinApi(categoria, limite))
      } catch (apiError) {
        console.error('[wagrupos] Error en el scraper:', apiError.message)
        await m.react('❌')
        return m.reply(
          `🩵✦ *SIN RESULTADOS* ✦🩵\n${MIKU.divider}\n\n` +
          `🎵 No se encontraron grupos públicos para esa categoría ahora mismo.\n` +
          `🌿 Inténtalo de nuevo con otra palabra clave.` +
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
          `> 🌿 *Categoría ›* ${v.category}\n` +
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