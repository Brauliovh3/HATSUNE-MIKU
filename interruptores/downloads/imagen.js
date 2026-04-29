import axios from 'axios'

export default {
  command: ['imagen', 'img', 'image'],
  category: 'search',
  run: async (client, m, args, usedPrefix, command) => {
    const text = args.join(' ').trim()
    if (!text) {
      return client.reply(m.chat, `💙 Por favor, ingresa un término de búsqueda.`, m, global.miku)
    }

    const bannedWords = [
      '+18',
      '18+',
      'contenido adulto',
      'contenido expli­cito',
      'contenido sexual',
      'actriz porno',
      'actor porno',
      'estrella porno',
      'pornstar',
      'video xxx',
      'xxx',
      'x x x',
      'pornhub',
      'xvideos',
      'xnxx',
      'redtube',
      'brazzers',
      'onlyfans',
      'cam4',
      'chaturbate',
      'myfreecams',
      'bongacams',
      'livejasmin',
      'spankbang',
      'tnaflix',
      'hclips',
      'fapello',
      'mia khalifa',
      'lana rhoades',
      'riley reid',
      'abella danger',
      'brandi love',
      'eva elfie',
      'nicole aniston',
      'janice griffith',
      'alexis texas',
      'lela star',
      'gianna michaels',
      'adriana chechik',
      'asa akira',
      'mandy muse',
      'kendra lust',
      'jordi el nio polla',
      'johnny sins',
      'danny d',
      'manuel ferrara',
      'mark rockwell',
      'porno',
      'porn',
      'sexo',
      'sex',
      'desnudo',
      'desnuda',
      'erÃ³tico',
      'erotico',
      'erotika',
      'tetas',
      'pechos',
      'boobs',
      'boob',
      'nalgas',
      'culo',
      'culos',
      'qlos',
      'trasero',
      'pene',
      'verga',
      'vergota',
      'pito',
      'chocha',
      'vagina',
      'vaginas',
      'coÃ±o',
      'concha',
      'genital',
      'genitales',
      'masturbar',
      'masturbaciÃ³n',
      'masturbacion',
      'gemidos',
      'gemir',
      'orgÃ­a',
      'orgy',
      'trÃ­o',
      'trio',
      'gangbang',
      'creampie',
      'facial',
      'cum',
      'milf',
      'teen',
      'incesto',
      'incest',
      'violación',
      'violacion',
      'rape',
      'bdsm',
      'hentai',
      'tentacle',
      'tentaculos',
      'fetish',
      'fetiche',
      'sado',
      'sadomaso',
      'camgirl',
      'camsex',
      'camshow',
      'playboy',
      'playgirl',
      'playmate',
      'striptease',
      'striptis',
      'slut',
      'puta',
      'putas',
      'perra',
      'perras',
      'whore',
      'fuck',
      'fucking',
      'fucked',
      'cock',
      'dick',
      'pussy',
      'ass',
      'shemale',
      'trans',
      'transgénero',
      'transgenero',
      'lesbian',
      'lesbiana',
      'gay',
      'lgbt',
      'explicit',
      'hardcore',
      'softcore',
      'nudista',
      'nudismo',
      'nudity',
      'deepthroat',
      'dp',
      'double penetration',
      'analplay',
      'analplug',
      'rimjob',
      'spank',
      'spanking',
      'lick',
      'licking',
      '69',
      'doggystyle',
      'reverse cowgirl',
      'cowgirl',
      'blowjob',
      'bj',
      'handjob',
      'hj',
      'p0rn',
      's3x',
      'v@gina',
      'c0ck',
      'd1ck',
      'fuk',
      'fuking',
      'fak',
      'boobz',
      'pusy',
      'azz',
      'cumshot',
      'sexcam',
      'livecam',
      'webcam',
      'sexchat',
      'sexshow',
      'sexvideo',
      'sexvid',
      'sexpics',
      'sexphoto',
      'seximage',
      'sexgif',
      'pornpic',
      'pornimage',
      'pornvid',
      'pornvideo',
      'only fan',
      'only-fans',
      'only_fans',
      'onlyfans.com',
      'mia khalifha',
      'mia khalifah',
      'mia khalifaa',
      'mia khalif4',
      'mia khal1fa',
      'mia khalifa +18',
      'mia khalifa xxx',
      'mia khalifa desnuda',
      'mia khalifa porno',
    ]

    const lowerText = text.toLowerCase()
    const nsfwEnabled = global.db.data.chats[m.chat]?.nsfw === true
    if (!nsfwEnabled && bannedWords.some((word) => lowerText.includes(word))) {
      return m.reply('💙 Este comando no permite búsquedas de contenido +18 o NSFW.', m, global.miku)
    }

    const buildCaption = (r, query, idx, total) => {
      const title = r?.title ? String(r.title).trim() : ''
      const source = r?.domain ? String(r.domain).trim() : ''
      const resolution = r?.resolution ? String(r.resolution).trim() : ''

      const lines = []
      lines.push('╭─💙 HATSUNE MIKU • IMAGE SEARCH')
      lines.push(`│ 🖼️ Imagen: ${idx}/${total}`)
      if (title) lines.push(`│ 🏷️ Título: ${title}`)
      if (source) lines.push(`│ 🌐 Fuente: ${source}`)
      if (resolution) lines.push(`│ 📐 Resolución: ${resolution}`)
      lines.push(`│ 🔎 Búsqueda: ${query}`)
      lines.push('╰──────────────💙')
      return lines.join('\n')
    }

    try {
      const results = await getImageSearchResults(text)
      const checked = []
      for (const r of results) {
        if (r.url && r.url.startsWith('http') && /\.(jpe?g|png|gif|webp)$/i.test(r.url)) {
          if (await isImageUrl(r.url)) {
            checked.push(r)
          }
        }
      }

      if (checked.length < 2) {
        return client.reply(m.chat, `💙 Se requieren al menos 2 imágenes válidas para mostrar un álbum.`, m, global.miku)
      }

      const max = Math.min(checked.length, 10)
      const medias = checked.slice(0, max).map((r, i) => ({
        type: 'image',
        data: { url: r.url },
        caption: buildCaption(r, text, i + 1, max),
      }))

      await client.sendAlbumMessage(m.chat, medias, { quoted: m })
    } catch (e) {
      await m.reply(
        `💙 An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`,
      )
    }
  },
}

async function getImageSearchResults(query) {
  const endpoints = [
    {
      url: `${global.APIs.stellar.url}/search/googleimagen?query=${encodeURIComponent(query)}&key=${global.APIs.stellar.key}`,
      extractor: (res) =>
        res.data?.map((d) => ({
          url: d.url,
          title: d.title || null,
          domain: d.domain || null,
          resolution: d.width && d.height ? `${d.width}x${d.height}` : null,
        })) || [],
    },
    {
      url: `${global.APIs.siputzx.url}/api/images?query=${encodeURIComponent(query)}`,
      extractor: (res) =>
        res.data?.map((d) => ({
          url: d.url,
          title: null,
          domain: null,
          resolution: d.width && d.height ? `${d.width}x${d.height}` : null,
        })) || [],
    },
    {
      url: `${global.APIs.delirius.url}/search/gimage?query=${encodeURIComponent(query)}`,
      extractor: (res) =>
        res.data?.map((d) => ({
          url: d.url,
          title: d.origin?.title || null,
          domain: d.origin?.website?.domain || null,
          resolution: d.width && d.height ? `${d.width}x${d.height}` : null,
        })) || [],
    },
    {
      url: `${global.APIs.apifaa.url}/faa/google-image?query=${encodeURIComponent(query)}`,
      extractor: (res) =>
        res.result?.map((u) => ({
          url: u,
          title: null,
          domain: null,
          resolution: null,
        })) || [],
    },
  ]

  for (const { url, extractor } of endpoints) {
    try {
      const res = await axios.get(url, { timeout: 10000 })
      const results = extractor(res.data)
      if (results?.length) return results
    } catch {}
  }
  return []
}

async function isImageUrl(url) {
  try {
    const res = await axios.head(url, { timeout: 1000 })
    return res.headers['content-type']?.startsWith('image/')
  } catch {
    return false
  }
}
