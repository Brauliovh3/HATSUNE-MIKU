import fetch from 'node-fetch'

const ALYA_GAME_API = 'https://api.alyacore.xyz/dl/gameh'
const ALYA_KEY = [68,69,80,79,79,76,45,107,101,121,54,48,48,49,53,48,57,49].map(c => String.fromCharCode(c)).join('')


const VERIFIED_GAMES = [
  'Sugar Service', 'Dimension 69', 'Goddesses Whim', 'AIRevolution', 'Out of Touch!',
  'REC', 'Acolyte Trainer', 'Griffith\'s Paizuri Simulator', 'Wolf Complex', 'Isekai Brothel',
  'Five Nights at FuzzBoob\'s', 'Strange Laundry', 'Girl Galley Grand Line',
  'Horny Union', 'Adventurer Trainer', 'New at the Gym',
  'MILF\'s Plaza', 'Corrupted Kingdoms', 'Hero\'s Harem Guild',
  'School Game', 'Confined with Goddesses', 'Janitor of Love', 'Nicole\'s Risky Job',
  'Barely Working', 'Love:99', 'BJ Quest', 'Huge-Tits Senpai',
  'Waifu\'s Mission', 'Truth or Drink', 'PIXEL CALL GIRLS',
  'HaremCraft', 'AFGirlfriend', 'Lewd Falls', 'Cummy Friends',
  'Fremy\'s Nightclub', 'Life in Woodchester',
  'Indecent Wife Hana', 'Waifu\'s Mission', 'LEWD INVASION',
  'STRIP Battle Action Cards', 'Third Crisis',
  'James Cabello Animations', 'TwistedWorld Remake', 'OH MY WAIFU', 'Dandy Boy Adventures',
  'Coco Nutshake', 'Tentacle Locker', 'PocketSweeties',
  'Night Shift at Fazclaire\'s', 'Innocent Witches',
  'Price of Desire', 'You Let The Next Hero In', 'Bao vs The World'
];


const SEARCH_TERMS = {
  'miku': ['miku', 'brazilian', 'fangame'],
  'goddess': ['goddess', 'goddesses', 'whim'],
  'harem': ['harem', 'hero', 'guild'],
  'pokemon': ['monster', 'trainer', 'lewd virus'],
  'fnaf': ['five nights', 'fuzzboob', 'fazclaire', 'frenni'],
  'witch': ['witch', 'potion', 'brewing'],
  'school': ['school', 'academy', 'lust', 'student'],
  'wife': ['wife', 'ntr', 'netorase'],
  'milk': ['milk', 'ranch', 'farm'],
  'space': ['space', 'rescue', 'code pink'],
  'strip': ['strip', 'poker', 'battle', 'cards'],
  'wolf': ['wolf', 'complex', 'sandbox'],
  'isekai': ['isekai', 'brothel', 'dating'],
  'coill': ['coill', 'city', 'discontinued'],
  'nekopara': ['maid', 'rental', 'service'],
  'ddlc': ['ddlc', 'doki', 'berries'],
  'hypno': ['hypno', 'hypnosis', 'magic', 'book'],
  'pocket': ['pocket', 'sweeties', 'smartphone'],
  'innocent': ['innocent', 'witches', 'harry']
};

const showGameList = async (client, m, args, usedPrefix) => {
  const page = parseInt(args[0]) || 1;
  const perPage = 12;
  const totalPages = Math.ceil(VERIFIED_GAMES.length / perPage);
  
  if (page > totalPages || page < 1) {
    return m.reply(`💙 Página inválida. Hay ${totalPages} páginas.`);
  }
  
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const pageGames = VERIFIED_GAMES.slice(start, end);
  
  const gameList = pageGames.map((g, i) => `${start + i + 1}. ${g}`).join('\n');
  
  return m.reply(`🔞 *JUEGOS H+18 ANDROID* 🤖

${gameList}

💙 ${VERIFIED_GAMES.length} juegos | 📄 ${page}/${totalPages}
➡️ Siguiente: *${usedPrefix}listah ${page+1 <= totalPages ? page+1 : 1}*
⬇️ Descargar: *${usedPrefix}gameh nombre*`);
};

export default {
  command: ['gameh', 'hgame', 'listah', 'hlist', 'hgames', 'itch', 'nsfwgame'],
  category: 'nsfw',
  nsfw: true,
  run: async (client, m, args, usedPrefix, command) => {
    if (['listah', 'hlist', 'hgames'].includes(command)) {
      return showGameList(client, m, args, usedPrefix);
    }
    if (!args || !args.length) {
      return m.reply(`💙 *BUSCADOR DE JUEGOS H+18*\n\nIngresa el nombre del juego.\nEjemplo: *${usedPrefix}${command} miku*\n\n🔞 *Contenido NSFW* - Solo adultos`)
    }
    
    await m.react('🔞')
    
    const query = args.join(' ').trim().toLowerCase()
    
    
    const isVerified = VERIFIED_GAMES.some(game => 
      game.toLowerCase().includes(query) || query.includes(game.toLowerCase().split(' ')[0])
    ) || Object.entries(SEARCH_TERMS).some(([key, terms]) => 
      (query.includes(key) || terms.some(t => query.includes(t)))
    );
    
    if (!isVerified) {
      await m.react('❌')
      return m.reply(`💙 *Juego no encontrado en colección verificada*\n\n🔞 Este juego no está en nuestra colección H+18 verificada con APK Android.\n\n📋 Usa *${usedPrefix}hgamelist* para ver los juegos disponibles.`, global.miku)
    }
    
    try {
      const gameData = await searchGame(query)
      if (!gameData) {
        await m.react('❌')
        return m.reply('💙 No se encontró el juego en la API.', global.miku)
      }
      
     
      const hasAndroid = gameData.downloads.some(d => d.platforms?.android);
      if (!hasAndroid) {
        await m.react('📵')
        return m.reply('💙 Este juego *no tiene versión Android APK* disponible.\n\n🎮 Solo está disponible para PC/Windows.', global.miku)
      }

      const { title, author, thumb, downloads } = gameData
      const androidDownload = downloads.find(d => d.platforms?.android) || downloads[0]
      
      if (!androidDownload) {
        await m.react('❌')
        return m.reply('💙 No se encontró versión Android APK para este juego.', global.miku)
      }

      const { filename, size, version, dl } = androidDownload
      
      const caption = `🔞 *JUEGO H+18* 🔞

💙 *Título:* ${title}
👤 *Autor:* ${author}
📦 *Archivo:* ${filename}
📏 *Tamaño:* ${size}
🔖 *Versión:* ${version || 'N/A'}
🤖 *Plataforma:* Android APK
☁️ *Fuente:* Itch.io

💙 *HATSUNE MIKU BOT* 💙

⚠️ *Descarga iniciada...*`

      await client.sendMessage(m.chat, { 
        image: { url: thumb }, 
        caption 
      }, { quoted: m })

      const sizeBytes = parseSize(size)
      if (sizeBytes > 300 * 1024 * 1024) {
        await m.react('⚠️')
        return m.reply(`💙 El archivo es muy grande (${size}).\n\n🌱 Descárgalo directamente:\n${dl}`, global.miku)
      }

      await client.sendMessage(m.chat, { 
        document: { url: dl }, 
        mimetype: 'application/vnd.android.package-archive', 
        fileName: filename,
        caption: `🔞 *${title}*\n💙 Descarga completada` 
      }, { quoted: m })
      
      await m.react('✅')
      
    } catch (e) {
      await m.react('❌')
      await m.reply(`💙🌱 *ERROR* 🌱💙\n\n${e.message}`, global.miku)
    }
  },
}

async function searchGame(query) {
  try {
    const url = `${ALYA_GAME_API}?query=${encodeURIComponent(query)}&key=${encodeURIComponent(ALYA_KEY)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    })
    
    if (!res.ok) return null
    
    const json = await res.json()
    
    if (!json?.status || !json?.data) return null
    
    const { title, author, thumb, downloads } = json.data
    
    if (!downloads || !downloads.length) return null
    
    return {
      title: title || 'Sin título',
      author: author || 'Desconocido',
      thumb: thumb || '',
      downloads: downloads.map(d => ({
        filename: d.filename || 'game.apk',
        size: d.size || 'Desconocido',
        version: d.version || '',
        platforms: d.platforms || {},
        dl: d.dl || ''
      }))
    }
  } catch (e) {
    console.error('Error searchGame:', e)
    return null
  }
}

function parseSize(sizeStr) {
  if (!sizeStr) return 0
  const parts = sizeStr.trim().toUpperCase().split(' ')
  const value = parseFloat(parts[0])
  const unit = parts[1] || 'B'
  switch (unit) {
    case 'KB': return value * 1024
    case 'MB': return value * 1024 * 1024
    case 'GB': return value * 1024 * 1024 * 1024
    default: return value
  }
}
