import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { DOWNLOAD_TMP_DIR, STORAGE_LIMITS, ensureDir, hasEnoughDiskSpace, isNoSpaceError, cleanProjectStorage, readableBytes } from '../../nucleo/system/storage.js'

const _h=[82,101,115,116,46,97,112,105,99,97,117,115,97,115,46,120,121,122].map(c=>String.fromCharCode(c)).join('')
const NEW_API_BASE = process.env.NEW_API_BASE || `https://${_h}`
const NEW_API_KEY = process.env.NEW_API_KEY || [68,69,80,79,79,76,45,107,101,121,50,53,50,53,56,48].map(c=>String.fromCharCode(c)).join('')

function extractFirstUrl(text = '') {
  const match = String(text || '').trim().match(/https?:\/\/[^\s]+/i)
  if (match) return match[0]
  return String(text || '').trim().split(/\s+/).find(v => /instagram\.com|instagr\.am/i.test(v)) || ''
}

function normalizeInstagramUrl(input = '') {
  let raw = String(input || '').trim()
  if (!raw) return ''

  raw = extractFirstUrl(raw) || raw
  raw = raw.replace(/[)>.,]+$/g, '')
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`

  try {
    const u = new URL(raw)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    if (!['instagram.com', 'm.instagram.com', 'instagr.am'].includes(host) && !host.endsWith('.instagram.com')) return ''
    return u.toString()
  } catch {
    return ''
  }
}

function isValidInstagramUrl(input = '') {
  const normalized = normalizeInstagramUrl(input)
  if (!normalized) return false
  return /(?:instagram\.com|instagr\.am)\/(?:(?:p|reel|reels|tv|stories)\/[^\s?#]+|share\/(?:p|reel|reels|tv)\/[^\s?#]+)(?:[/?#].*)?$/i.test(normalized)
}

function isDnsError(err) {
  return (
    String(err?.code || '').toUpperCase() === 'ENOTFOUND' ||
    /getaddrinfo ENOTFOUND/i.test(String(err?.message || err || ''))
  )
}

async function validateDownloadUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let response = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);

    if (response.ok || response.status === 301 || response.status === 302) return true;


    if ([400, 401, 403, 405].includes(response.status)) {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 5000);
      response = await fetch(url, {
        method: 'GET',
        signal: controller2.signal,
        redirect: 'follow',
        headers: {
          Range: 'bytes=0-0',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
      });
      clearTimeout(timeout2);
      return response.ok || response.status === 206;
    }

    return false;
  } catch {
    return false;
  }
}

async function downloadFile(url, filename) {
  const tempDir = ensureDir(DOWNLOAD_TMP_DIR);

  const tempFilePath = path.join(tempDir, filename);

  try {
    console.log(`🚀 Descargando: ${filename}`);
    console.log(`📥 URL: ${url.substring(0, 80)}...`);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Referer': 'https://www.google.com/',
        'Origin': 'https://www.google.com'
      },
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(t);

    if (!response.ok) {
      if (response.status === 403) throw new Error('URL de descarga expirada.');
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > STORAGE_LIMITS.maxDownloadBytes) {
      throw new Error(`Archivo demasiado grande (${readableBytes(contentLength)}). Límite: ${readableBytes(STORAGE_LIMITS.maxDownloadBytes)}`);
    }
    if (!(await hasEnoughDiskSpace(contentLength || STORAGE_LIMITS.maxDownloadBytes))) {
      await cleanProjectStorage({ maxAgeMs: 0 });
      if (!(await hasEnoughDiskSpace(contentLength || STORAGE_LIMITS.maxDownloadBytes))) {
        throw new Error('No hay espacio libre suficiente para esta descarga.');
      }
    }

    const contentType = response.headers.get('content-type') || '';
    console.log(`📦 Content-Type: ${contentType}`);

    const fileStream = fs.createWriteStream(tempFilePath);

    return new Promise((resolve, reject) => {
      let downloaded = 0;
      response.body.on('data', (chunk) => {
        downloaded += chunk.length;
        if (downloaded > STORAGE_LIMITS.maxDownloadBytes) {
          response.body.destroy(new Error(`Archivo demasiado grande. Límite: ${readableBytes(STORAGE_LIMITS.maxDownloadBytes)}`));
          return;
        }
        fileStream.write(chunk);
      });

      response.body.on('end', () => {
        fileStream.end();
        fileStream.on('finish', () => {
          try {
            const stats = fs.statSync(tempFilePath);
            if (!stats.size || stats.size < 1024) {
              return reject(new Error('Archivo descargado vacío o muy pequeño'));
            }
            console.log(`✅ Descarga completada (${stats.size} bytes)`);
            resolve(tempFilePath);
          } catch (e) {
            reject(e);
          }
        });
      });

      response.body.on('error', (err) => {
        console.error('❌ Error en stream de respuesta:', err.message);
        fileStream.close();
        reject(err);
      });

      fileStream.on('error', (err) => {
        console.error('❌ Error en fileStream:', err.message);
        reject(err);
      });
    });

  } catch (error) {
    console.error(`❌ Error en descarga:`, error.message || error);
    try { if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); } catch (e) {}
    if (isNoSpaceError(error)) {
      await cleanProjectStorage({ maxAgeMs: 0 }).catch(() => {});
      throw new Error('ENOSPC: el disco se quedó sin espacio durante la descarga; se limpió el temporal.');
    }
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

export default {
  command: ['instagram', 'ig'],
  category: 'downloader',
  run: async (client, m, args, usedPrefix, command) => {
    const rawInput = args.join(' ').trim()
    if (!rawInput) {
      return m.reply('💙 Ingresa un enlace de Instagram.', global.miku)
    }
    const igUrl = normalizeInstagramUrl(rawInput)
    if (!igUrl || !isValidInstagramUrl(igUrl)) {
      return m.reply('💙 Enlace inválido, envía un link de Instagram válido.', global.miku)
    }
    
    await m.react('⏳')
    
    let tempFilePath = null
    try {
      const data = await getInstagramMedia(igUrl)
      if (!data || !data.url) {
        await m.react('❌')
        return m.reply('💙 No se pudo obtener el contenido.', global.miku)
      }
      
      const caption = `╭━━━━━━━━━━━━━━━╮
┃ 💙 *INSTAGRAM DOWNLOAD*
┃━━━━━━━━━━━━━━━${data.title ? `\n┃ 👤 ${data.title}` : ''}${data.like ? `\n┃ ❤️ ${data.like}` : ''}${data.comment ? `\n┃ 💬 ${data.comment}` : ''}${data.duration ? `\n┃ ⏱️ ${data.duration}` : ''}
╰━━━━━━━━━━━━━━━╯`
      
      const messageOptions = {
          caption,
          ...global.miku
      }

      if (data.type === 'video') {
        messageOptions.video = { url: data.url };
        messageOptions.mimetype = 'video/mp4';
      } else {
        messageOptions.image = { url: data.url };
      }

      try {
        await client.sendMessage(m.chat, messageOptions, { quoted: m });
      } catch (sendErr) {
        console.log(`URL send failed (${sendErr?.message || sendErr}). Falling back to local download...`);
        
        const freshData = await getInstagramMedia(igUrl);
        if (!freshData || !freshData.url) {
          throw new Error('No se pudo re-obtener el enlace de descarga para el fallback');
        }

        const fileName = `${Date.now()}_instagram.${data.type === 'video' ? 'mp4' : 'jpg'}`;
        tempFilePath = await downloadFile(freshData.url, fileName);
        const fileBuffer = fs.readFileSync(tempFilePath);

        if (data.type === 'video') {
            messageOptions.video = fileBuffer;
        } else {
            messageOptions.image = fileBuffer;
        }
        
        await client.sendMessage(m.chat, messageOptions, { quoted: m });
      }
      
      await m.react('✅')
    } catch (e) {
      await m.react('❌')
      await m.reply(`💙 *ERROR*\n\nOcurrió un error: ${e.message}`, global.miku)
    } finally {
        if (tempFilePath) {
            deleteFile(tempFilePath)
        }
    }
  }
}

async function getInstagramMedia(url) {
    console.log('🚀 Iniciando descarga de Instagram...');
    let lastError = null;
    let fallbackCandidate = null;

  const apis = [
    {
      name: 'Api Causas',
      endpoint: `${NEW_API_BASE}/api/v1/descargas/instagram?apikey=${encodeURIComponent(NEW_API_KEY)}&url=${encodeURIComponent(url)}`,
      extractor: res => {
        if (!res.status || !res.data?.download?.url) return null
        return {
          type: res.data.download.type === 'video/mp4' ? 'video' : 'image',
          url: res.data.download.url
        }
      }
    },
    {
      name: 'Alya',
      endpoint: `https://rest.alyabotpe.xyz/dl/instagram?url=${encodeURIComponent(url)}&key=${[68,69,80,79,79,76,45,107,101,121,54,48,48,49,53].map(c=>String.fromCharCode(c)).join('')}`,
      extractor: res => {
        if (!res.status || !res.data?.dl) return null
        return {
          type: res.data.type || 'video',
          title: res.data.username || null,
          like: res.data.like || null,
          comment: res.data.comment || null,
          url: res.data.dl
        }
      }
    },
    { 
      name: 'Stellar (v1)',
      endpoint: `${global.APIs.stellar.url}/dl/instagram?url=${encodeURIComponent(url)}&key=${global.APIs.stellar.key}`, 
      extractor: res => {
        if (!res.status || !Array.isArray(res.data) || !res.data.length) return null
        const media = res.data[0]
        if (!media?.url) return null
        return { 
          type: media.tipo === 'video' ? 'video' : 'image', 
          title: null, 
          url: media.url 
        }
      }
    },
    { 
      name: 'Stellar (v2)',
      endpoint: `${global.APIs.stellar.url}/dl/instagramv2?url=${encodeURIComponent(url)}&key=${global.APIs.stellar.key}`, 
      extractor: res => {
        if (!res.status || !res.data?.url) return null
        const mediaUrl = res.data.mediaUrls?.[0] || res.data.url
        if (!mediaUrl) return null
        return { 
          type: res.data.type === 'video' ? 'video' : 'image', 
          title: res.data.username || null, 
          duration: res.data.videoMeta?.duration ? `${Math.round(res.data.videoMeta.duration)}s` : null,
          url: mediaUrl
        }
      }
    },
    { 
      name: 'NekoLabs',
      endpoint: `${global.APIs.nekolabs.url}/downloader/instagram?url=${encodeURIComponent(url)}`, 
      extractor: res => {
        if (!res.success || !res.result?.downloadUrl?.length) return null
        const mediaUrl = res.result.downloadUrl[0]
        if (!mediaUrl) return null
        return { 
          type: res.result.metadata?.isVideo ? 'video' : 'image', 
          title: res.result.metadata?.username || null, 
          like: res.result.metadata?.like || null, 
          comment: res.result.metadata?.comment || null,
          url: mediaUrl
        }
      }
    },
    { 
      name: 'Ootaizumi (v2)',
      endpoint: `${global.APIs.ootaizumi.url}/downloader/instagram/v2?url=${encodeURIComponent(url)}`, 
      extractor: res => {
        if (!res.status || !res.result?.url?.length) return null
        const media = res.result.url[0]
        if (!media?.url) return null
        return { 
          type: media.type === 'mp4' ? 'video' : 'image', 
          title: res.result.meta?.username || null, 
          like: res.result.meta?.like_count || null, 
          comment: res.result.meta?.comment_count || null,
          url: media.url
        }
      }
    },
    { 
      name: 'Ootaizumi (v1)',
      endpoint: `${global.APIs.ootaizumi.url}/downloader/instagram/v1?url=${encodeURIComponent(url)}`, 
      extractor: res => {
        if (!res.status || !res.result?.media?.length) return null
        const media = res.result.media[0]
        if (!media?.url) return null
        return { 
          type: media.isVideo ? 'video' : 'image', 
          title: res.result.metadata?.author || null, 
          like: res.result.metadata?.like || null, 
          duration: res.result.metadata?.duration ? `${Math.round(res.result.metadata.duration)}s` : null,
          url: media.url
        }
      }
    }
  ]

  for (const api of apis) {
    const startTime = Date.now()
    try {
      console.log(`🔄 Intentando con ${api.name}...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(api.endpoint, { signal: controller.signal }).then(r => r.json());
      clearTimeout(timeout)
      
      const result = api.extractor(res);
      const duration = Date.now() - startTime;
      
      if (result?.url) {
        const guessedType = /\.mp4(\?|$)/i.test(result.url) ? 'video' : /\.(jpe?g|png|webp)(\?|$)/i.test(result.url) ? 'image' : result.type
        const normalizedResult = { ...result, type: guessedType || result.type || 'video' }
        if (!fallbackCandidate) fallbackCandidate = { ...normalizedResult, api: `${api.name} (sin validar)` }

        const isValid = await validateDownloadUrl(result.url);
        if (isValid) {
            console.log(`✅ ${api.name} OK (${duration}ms)`);
            return { ...normalizedResult, api: api.name };
        } else {
            console.log(`- ${api.name} sin enlace válido (${duration}ms)`);
        }
      } else {
        console.log(`- ${api.name} no devolvió resultado (${duration}ms)`);
      }
    } catch (e) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${api.name} falló: ${e.message} (${duration}ms)`);
      if (isDnsError(e)) {
        lastError = e.message;
        continue;
      }
      lastError = e.message;
    }
  }

  if (fallbackCandidate?.url) {
    console.log('⚠️ Usando enlace provisional de Instagram (validación HEAD/GET falló, pero se intentará enviar).')
    return fallbackCandidate
  }

  const finalErr = lastError || 'Todas las APIs de Instagram fallaron';
  if (isDnsError({ message: finalErr })) {
    throw new Error(`No se pudo obtener el medio (DNS/hosting bloquea dominios): ${finalErr}`);
  }
  throw new Error(`No se pudo obtener el medio: ${finalErr}`);
}
