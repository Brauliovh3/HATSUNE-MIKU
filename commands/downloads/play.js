import yts from 'yt-search'
import fetch from 'node-fetch'
import { getBuffer } from '../../lib/message.js'

const isYTUrl = (url) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url)
async function getVideoInfo(query, videoMatch) {
  const search = await yts(query)
  if (!search.all.length) return null
  const videoInfo = videoMatch ? search.videos.find(v => v.videoId === videoMatch[1]) || search.all[0] : search.all[0]
  return videoInfo || null
}

import fetch from "node-fetch";
import yts from 'yt-search';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadFile(url, filename) {
  const tempDir = path.join(__dirname, '../tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempFilePath = path.join(tempDir, filename);
  
  try {
    console.log(`🚀 Descargando: ${filename}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
      },
      timeout: 25000 
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const fileStream = fs.createWriteStream(tempFilePath);
    response.body.pipe(fileStream);
    
    return new Promise((resolve, reject) => {
      fileStream.on('finish', () => {
        console.log(`✅ Descarga completada`);
        resolve(tempFilePath);
      });
      fileStream.on('error', reject);
    });
  } catch (error) {
    console.error(`❌ Error en descarga:`, error.message);
    throw error;
  }
}

function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🧹 Archivo eliminado: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error eliminando archivo:`, error.message);
  }
}

function extractYouTubeId(url) {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9\-\_]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9\-\_]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9\-\_]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function formatViews(views) {
  if (views === undefined || views === null) {
    return "No disponible";
  }

  try {
    const numViews = parseInt(views);
    if (numViews >= 1_000_000_000) {
      return `${(numViews / 1_000_000_000).toFixed(1)}B`;
    } else if (numViews >= 1_000_000) {
      return `${(numViews / 1_000_000).toFixed(1)}M`;
    } else if (numViews >= 1_000) {
      return `${(numViews / 1_000).toFixed(1)}k`;
    }
    return numViews.toLocaleString();
  } catch (e) {
    return String(views);
  }
}

async function getAudioDownload(url) {
  const maxRetries = 1;
  const retryDelay = 500; 
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const API_KEY = 'DEPOOL-key60015';
      const endpoint = `https://rest.alyabotpe.xyz/dl/ytmp3?url=${encodeURIComponent(url)}&key=${API_KEY}`;
      
      console.log(`🔄 Obteniendo audio (intento ${retries + 1}/${maxRetries}): ${endpoint}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);
      
      try {
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📊 Respuesta API:', JSON.stringify(data, null, 2));

        if (!data.status) {
          if (data.message && data.message.includes('Key no registrada')) {
            throw new Error('API Key no válida');
          }
          throw new Error('API respondió con status false');
        }
        
        if (!data.data || !data.data.dl) {
          throw new Error('No se pudo obtener el enlace de descarga');
        }

        return {
          downloadUrl: data.data.dl,
          title: data.data.title,
          author: data.data.author,
          quality: data.data.quality || 'mp3'
        };
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Timeout de la API');
        }
        throw fetchError;
      }
      
    } catch (error) {
      console.error(`❌ Error obteniendo audio (intento ${retries + 1}):`, error.message);
      retries++;
      
      if (retries < maxRetries) {
        console.log(`🔄 Reintentando en ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('❌ Todos los intentos fallaron, intentando APIs de respaldo...');
        
        
        const backupApis = [
          { api: 'Adonix', endpoint: `${global.APIs.adonix.url}/download/ytaudio?apikey=${global.APIs.adonix.key}&url=${encodeURIComponent(url)}`, extractor: res => res?.data?.url },    
          { api: 'Ootaizumi', endpoint: `${global.APIs.ootaizumi.url}/downloader/youtube/play?query=${encodeURIComponent(url)}`, extractor: res => res.result?.download },
          { api: 'Vreden', endpoint: `${global.APIs.vreden.url}/api/v1/download/youtube/audio?url=${encodeURIComponent(url)}&quality=256`, extractor: res => res.result?.download?.url },
          { api: 'Stellar', endpoint: `${global.APIs.stellar.url}/dl/ytdl?url=${encodeURIComponent(url)}&format=mp3&key=${global.APIs.stellar.key}`, extractor: res => res.result?.download },
          { api: 'Ootaizumi v2', endpoint: `${global.APIs.ootaizumi.url}/downloader/youtube?url=${encodeURIComponent(url)}&format=mp3`, extractor: res => res.result?.download },
          { api: 'Vreden v2', endpoint: `${global.APIs.vreden.url}/api/v1/download/play/audio?query=${encodeURIComponent(url)}`, extractor: res => res.result?.download?.url },
          { api: 'Nekolabs', endpoint: `${global.APIs.nekolabs.url}/downloader/youtube/v1?url=${encodeURIComponent(url)}&format=mp3`, extractor: res => res.result?.downloadUrl },
          { api: 'Nekolabs v2', endpoint: `${global.APIs.nekolabs.url}/downloader/youtube/play/v1?q=${encodeURIComponent(url)}`, extractor: res => res.result?.downloadUrl }
        ];

        for (const { api, endpoint, extractor } of backupApis) {
          try {
            console.log(`🔄 Intentando API de respaldo: ${api}`);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(endpoint, { signal: controller.signal }).then(r => r.json());
            clearTimeout(timeout);
            const link = extractor(res);
            if (link) {
              console.log(`✅ API de respaldo ${api} funcionó`);
              return { downloadUrl: link, api };
            }
          } catch (e) {
            console.log(`❌ API de respaldo ${api} falló:`, e.message);
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        throw new Error(`No se pudo obtener el audio: ${error.message}`);
      }
    }
  }
}

async function getVideoDownload(url, quality = '360') {
  const maxRetries = 1;
  const retryDelay = 500; 
  let retries = 0;
  const API_KEY = 'DEPOOL-key60015';

  while (retries < maxRetries) {
    try {
      const endpoint = `https://rest.alyabotpe.xyz/dl/ytmp4?url=${encodeURIComponent(url)}&quality=${quality}&key=${API_KEY}`;
      
      console.log(`🔄 Obteniendo video (intento ${retries + 1}/${maxRetries}): ${endpoint}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);
      
      try {
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📊 Respuesta API:', JSON.stringify(data, null, 2));

        if (!data.status) {
          if (data.message && data.message.includes('Key no registrada')) {
            throw new Error('API Key no válida');
          }
          throw new Error('API respondió con status false');
        }
        
        if (!data.data || !data.data.dl) {
          throw new Error('No se pudo obtener el enlace de descarga');
        }

        return {
          downloadUrl: data.data.dl,
          title: data.data.title,
          author: data.data.author,
          quality: data.data.quality || quality
        };
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Timeout de la API');
        }
        throw fetchError;
      }
      
    } catch (error) {
      console.error(`❌ Error obteniendo video (intento ${retries + 1}):`, error.message);
      retries++;
      
      if (retries < maxRetries) {
        console.log(`🔄 Reintentando en ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('❌ Todos los intentos fallaron, intentando APIs de respaldo...');
        
    
        const backupApis = [
          { api: 'Adonix', endpoint: `${global.APIs.adonix.url}/download/ytvideo?apikey=${global.APIs.adonix.key}&url=${encodeURIComponent(url)}`, extractor: res => res?.data?.url },    
          { api: 'Vreden', endpoint: `${global.APIs.vreden.url}/api/v1/download/youtube/video?url=${encodeURIComponent(url)}&quality=360`, extractor: res => res.result?.download?.url },
          { api: 'Stellar', endpoint: `${global.APIs.stellar.url}/dl/ytdl?url=${encodeURIComponent(url)}&format=mp4&key=${global.APIs.stellar.key}`, extractor: res => res.result?.download },
          { api: 'Nekolabs', endpoint: `${global.APIs.nekolabs.url}/downloader/youtube/v1?url=${encodeURIComponent(url)}&format=360`, extractor: res => res.result?.downloadUrl },
          { api: 'Vreden v2', endpoint: `${global.APIs.vreden.url}/api/v1/download/play/video?query=${encodeURIComponent(url)}`, extractor: res => res.result?.download?.url }
        ];

        for (const { api, endpoint, extractor } of backupApis) {
          try {
            console.log(`🔄 Intentando API de respaldo: ${api}`);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(endpoint, { signal: controller.signal }).then(r => r.json());
            clearTimeout(timeout);
            const link = extractor(res);
            if (link) {
              console.log(`✅ API de respaldo ${api} funcionó`);
              return { downloadUrl: link, api };
            }
          } catch (e) {
            console.log(`❌ API de respaldo ${api} falló:`, e.message);
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        throw new Error(`No se pudo obtener el video: ${error.message}`);
      }
    }
  }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text.trim()) {
      return conn.reply(m.chat, `💙HATSUNE MIKU💙\n\n💙 Ingresa el nombre de la música o URL de YouTube a descargar.\n\nEjemplo: ${usedPrefix}${command} Let you Down Cyberpunk`, m);
    }

    let videoInfo;
    let url = '';

    if (text.includes('youtube.com') || text.includes('youtu.be')) {
      url = text;
      const videoId = extractYouTubeId(url);
      if (!videoId) {
        return m.reply('URL de YouTube inválida');
      }

      const search = await yts(videoId);
      if (search.all && search.all.length > 0) {
        const video = search.all.find(v => v.videoId === videoId);
        if (video) {
          videoInfo = {
            title: video.title,
            thumbnail: video.thumbnail,
            duration: video.duration,
            views: video.views,
            ago: video.ago,
            author: video.author,
            url: video.url,
            videoId: video.videoId
          };
        }
      }
    } else {
      const search = await yts(text);
      if (!search.all || search.all.length === 0) {
        return m.reply('No se encontraron resultados para tu búsqueda.');
      }
      videoInfo = search.all[0];
      url = videoInfo.url;
    }

    if (!videoInfo) {
      return m.reply('No se pudo obtener información del video.');
    }

    if (!url) {
      return m.reply('No se pudo obtener la URL del video.');
    }

    const vistas = formatViews(videoInfo.views);
    const canal = videoInfo.author?.name || 'Desconocido';
    
    const buttons = [
      ['🎵 Audio', `youtube_audio_${videoInfo.videoId}`],
      ['🎬 Video 360p', `youtube_video_360_${videoInfo.videoId}`],
      ['📁 Documento MP4', `youtube_video_doc_${videoInfo.videoId}`],
      ['📄 Documento MP3', `youtube_audio_doc_${videoInfo.videoId}`]
    ];
    
    const infoText = `*𖹭.╭╭ִ╼࣪━ִﮩ٨ـﮩ💙𝗠𝗶𝗸𝘂𝗺𝗶𝗻🌱ﮩ٨ـﮩ━ִ╾࣪╮╮.𖹭*

> 💙 *Título:* ${videoInfo.title}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> 🌱 *Duración:* ${videoInfo.duration}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> 💙 *Vistas:* ${vistas}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> 🌱 *Canal:* ${canal}
*°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°*
> 💙 *Publicado:* ${videoInfo.ago}
*⏝ּׅ︣︢ۛ۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫ۜ⏝ּׅ︣︢ۛ۫۫۫۫۫ۜ⏝ּׅ︣ׄۛ۫۫۫۫۫ۜ⏝ּׅ︣ׄۛ۫۫۫۫۫ۜ*

💌 *Selecciona el formato para descargar:*`;

    const footer = '🌱 Hatsune Miku Bot - YouTube';

    try {
      const thumb = videoInfo.thumbnail ? (await conn.getFile(videoInfo.thumbnail))?.data : null;
      await conn.sendNCarousel(m.chat, infoText, footer, thumb, buttons, null, null, null, m);
    } catch (thumbError) {
      await conn.sendNCarousel(m.chat, infoText, footer, null, buttons, null, null, null, m);
      console.error("Error al obtener la miniatura:", thumbError);
    }
      
    const usr = global.getUser ? global.getUser(m.sender) : (global.db.data.users[m.sender] = global.db.data.users[m.sender] || {})
    
    usr.lastYTSearch = {
      url,
      title: videoInfo.title,
      videoId: videoInfo.videoId,
      messageId: m.key.id,
      timestamp: Date.now(),
      videoInfo
    };

  } catch (error) {
    console.error("Error completo:", error);
    return m.reply(`💙 Ocurrió un error: ${error.message || 'Desconocido'}`);
  }
};

async function processDownload(conn, m, videoInfo, option) {
  const downloadTypes = {
    1: '🎵 Audio MP3',
    2: '🎬 Video 360p', 
    3: '📁 Documento MP4',
    4: '📁 Documento MP3'
  };
  
  const downloadType = downloadTypes[option] || 'archivo';
  await conn.reply(m.chat, `💙 Obteniendo ${downloadType}...`, m);
  
  let tempFilePath = null;
  
  try {
    let downloadData;
    let fileName = videoInfo.title.replace(/[^\w\s]/gi, '').substring(0, 50);
    
    switch (option) {
      case 1: 
      case 4: 
        downloadData = await getAudioDownload(videoInfo.url);
        break;
      case 2: 
      case 3: 
        downloadData = await getVideoDownload(videoInfo.url, '360');
        break;
    }
    
    tempFilePath = await downloadFile(downloadData.downloadUrl, `${Date.now()}_${fileName}.${option === 1 || option === 4 ? 'mp3' : 'mp4'}`);
    
    switch (option) {
      case 1: 
        await conn.sendMessage(m.chat, {
          audio: fs.readFileSync(tempFilePath),
          mimetype: 'audio/mpeg',
          fileName: fileName + '.mp3',
          ptt: false
        }, { quoted: m });
        break;
        
      case 2: 
        await conn.sendMessage(m.chat, {
          video: fs.readFileSync(tempFilePath),
          mimetype: 'video/mp4',
          fileName: fileName + '.mp4',
          caption: `🎬 ${videoInfo.title}` 
        }, { quoted: m });
        break;
        
      case 3: 
        await conn.sendMessage(m.chat, {
          document: { url: tempFilePath },
          mimetype: 'video/mp4',
          fileName: fileName + '.mp4',
          caption: `📁 ${videoInfo.title}` 
        }, { quoted: m });
        break;
        
      case 4: 
        await conn.sendMessage(m.chat, {
          document: { url: tempFilePath },
          mimetype: 'audio/mpeg',
          fileName: fileName + '.mp3',
          caption: `📄 ${videoInfo.title}` 
        }, { quoted: m });
        break;
    }
    
    const user = global.getUser ? global.getUser(m.sender) : global.db.data.users[m.sender];
    if (user && !user.monedaDeducted) {
      user.moneda = (user.moneda || 0) - 5;
      user.monedaDeducted = true;
      conn.reply(m.chat, `💙 Has utilizado 🌱 5 *Cebollines*`, m, global.miku);
    }
    
    return true;
  } catch (error) {
    console.error("Error al procesar descarga:", error);
    await conn.reply(m.chat, `💙 Error: ${error.message}`, m);
    return false;
  } finally {
    if (tempFilePath) {
      deleteFile(tempFilePath);
    }
  }
}

handler.before = async (m, { conn }) => {
  if (!m.text || typeof m.text !== 'string') {
    return false;
  }
  
  const buttonPatterns = [
    /youtube_audio_/,
    /youtube_video_360_/,
    /youtube_video_doc_/,
    /youtube_audio_doc_/
  ];
  
  let isButtonResponse = false;
  for (const pattern of buttonPatterns) {
    if (pattern.test(m.text)) {
      isButtonResponse = true;
      break;
    }
  }
  
  if (!isButtonResponse) {
    return false;
  }
  
  const user = global.db.data.users[m.sender];
  if (!user || !user.lastYTSearch) {
    await conn.reply(m.chat, '⏰ No hay búsqueda activa. Realiza una nueva búsqueda.', m);
    return false;
  }
  
  console.log(`🎵 Procesando: ${user.lastYTSearch.title}`);
  
  const currentTime = Date.now();
  const searchTime = user.lastYTSearch.timestamp || 0;
  
  if (currentTime - searchTime > 10 * 60 * 1000) {
    await conn.reply(m.chat, '⏰ La búsqueda ha expirado. Por favor realiza una nueva búsqueda.', m);
    return false; 
  }
  
  let option = null;
  if (m.text.includes('youtube_audio_')) {
    option = 1; 
  } else if (m.text.includes('youtube_video_360_')) {
    option = 2; 
  } else if (m.text.includes('youtube_video_doc_')) {
    option = 3; 
  } else if (m.text.includes('youtube_audio_doc_')) {
    option = 4; 
  }
  
  if (!option) {
    return false;
  }

  user.monedaDeducted = false;

  try {
    await processDownload(
      conn, 
      m, 
      user.lastYTSearch.videoInfo, 
      option
    );
    
    user.lastYTSearch = null;
    
  } catch (error) {
    console.error(`❌ Error en descarga:`, error.message);
    await conn.reply(m.chat, `💙 Error al procesar la descarga: ${error.message}`, m);
  }
  
  return true;
};

handler.command = handler.help = ['play', 'ytdlv2'];
handler.tags = ['downloader'];
handler.register = true;

export default handler;
