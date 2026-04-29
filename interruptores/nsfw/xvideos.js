import fetch from "node-fetch"
import cheerio from "cheerio"
import { getBuffer } from "../../nucleo/message.js"
import { proto, generateWAMessageFromContent, generateWAMessageContent } from "@whiskeysockets/baileys"

export default {
  command: ["xvideos"],
  category: "nsfw",
  nsfw: true,
  run: async (client, m, args, usedPrefix, command) => {
    try {
      try { await client.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }) } catch {}
      const query = args.join(" ")
      if (!query) return m.reply("💙 Por favor, ingresa el título o URL del video de XVIDEOS.", m, global.miku)
      const isUrl = query.includes("xvideos.com")
      if (isUrl) {
        const res = await xvideosdl(query)
        const { duration, views, likes, deslikes } = res.result
        const dll = res.result.url
        const thumbBuffer = await getBuffer(res.result.thumb)
        const videoBuffer = await getBuffer(dll)
        let mensaje = { document: videoBuffer, mimetype: "video/mp4", fileName: `${res.result.title}.mp4`, caption: `乂 ¡XVIDEOS - DOWNLOAD! 乂

≡ Título : ${res.result.title}
≡ Duración : ${duration || "Desconocida"}
≡ Likes : ${likes || "Desconocidos"}
≡ Des-Likes : ${deslikes || "Desconocidos"}
≡ Vistas : ${views || "Desconocidas"}` }
        await client.sendMessage(m.chat, mensaje, { quoted: m })
        try { await client.sendMessage(m.chat, { react: { text: '✅', key: m.key } }) } catch {}
        return
      }
      const res = await search(encodeURIComponent(query))
      if (!res.length) return m.reply("💙 No se encontraron resultados.", m, global.miku)

      const ready = []
      for (const item of res.slice(0, 6)) {
        try {
          const dl = await xvideosdl(item.url)
          const videoUrl = dl?.result?.url || ''
          if (!isHttp(videoUrl)) continue
          ready.push({
            title: dl?.result?.title || item.title || 'Sin título',
            videoUrl,
          })
          if (ready.length >= 4) break
        } catch {}
      }

      if (!ready.length) return m.reply("💙 No se pudieron preparar videos de la búsqueda.", m, global.miku)
      await sendSearchVideoCarousel(client, m, 'XVIDEOS', ready)
      try { await client.sendMessage(m.chat, { react: { text: '✅', key: m.key } }) } catch {}
    } catch (e) {
      try { await client.sendMessage(m.chat, { react: { text: '❌', key: m.key } }) } catch {}
      return m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`, m, global.miku)
    }
  },
}

function isHttp(url = "") {
  return /^https?:\/\//i.test(String(url || ""))
}

async function sendSearchVideoCarousel(client, m, source, videos = []) {
  const cards = []

  for (const video of videos) {
    try {
      const { videoMessage } = await generateWAMessageContent(
        { video: { url: video.videoUrl } },
        { upload: client.waUploadToServer },
      )

      const title = String(video.title || 'Sin título').replace(/\s+/g, ' ').slice(0, 64)

      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: `💙 ${title}`,
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: '' }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: '',
          hasMediaAttachment: true,
          videoMessage,
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: [] }),
      })
    } catch {}
  }

  if (!cards.length) throw new Error(`No se pudo crear carrusel de videos de ${source}`)

  const message = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({ text: `💙 Resultados ${source}` }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: '' }),
            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards }),
          }),
        },
      },
    },
    { quoted: m },
  )

  await client.relayMessage(m.chat, message.message, { messageId: message.key.id })
}

async function search(query) {
  return new Promise(async (resolve, reject) => {
    try {
      const url = `https://www.xvideos.com/?k=${encodeURIComponent(query)}`
      const res = await fetch(url)
      const html = await res.text()
      const $ = cheerio.load(html)
      const results = []
      $("div.mozaique > div").each((index, element) => {
        const title = $(element).find("p.title a").attr("title")
        const videoUrl = "https://www.xvideos.com" + $(element).find("p.title a").attr("href")
        const quality = $(element).find("span.video-hd-mark").text().trim()
        if (title && videoUrl) results.push({ title, url: videoUrl, quality })
      })
      resolve(results)
    } catch (error) {
      reject(error)
    }
  })
}

async function xvideosdl(url) {
  return new Promise((resolve, reject) => {
    fetch(url, { method: "get" }).then(res => res.text()).then(res => {
        const $ = cheerio.load(res, { xmlMode: false })
        const title = $("meta[property='og:title']").attr("content")
        const duration = (() => { 
          const s = parseInt($('meta[property="og:duration"]').attr("content"), 10) || 0
          return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s` 
               : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` 
               : `${s}s` 
        })()
        const views = $("span.nb_views").text().trim() || $("strong.mobile-hide").text().trim()
        const likes = $("span.rating-good-nbr").text().trim()
        const deslikes = $("span.rating-bad-nbr").text().trim()
        const thumb = $("meta[property='og:image']").attr("content")
        const videoUrl = $("#html5video > #html5video_base > div > a").attr("href")
        resolve({ status: 200, result: { title, duration, url: videoUrl, views, likes, deslikes, thumb }})
      }).catch(err => reject(err))
  })
}