import fetch from "node-fetch"
import cheerio from "cheerio"
import { getBuffer } from "../../nucleo/message.js"
import { proto, generateWAMessageFromContent, generateWAMessageContent } from "@whiskeysockets/baileys"

export default {
  command: ["xnxx"],
  category: "nsfw",
  nsfw: true,
  run: async (client, m, args, usedPrefix, command) => {
    try {
      try { await client.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }) } catch {}
      const query = args.join(" ")
      if (!query) return m.reply("💙 Por favor, ingresa el título o URL del video de XNXX.", m, global.miku)
      const isUrl = query.includes("xnxx.com")
      if (isUrl) {
        const res = await xnxxdl(query)
        const { dur, qual, views } = res.result.info
        const dll = res.result.files.high || res.result.files.low
        const thumbBuffer = await getBuffer(res.result.image)
        const videoBuffer = await getBuffer(dll)
        let mensaje = { document: videoBuffer, mimetype: "video/mp4", fileName: `${res.result.title}.mp4`, caption: `乂 ¡XNXX - DOWNLOAD! 乂

≡ Título : ${res.result.title}
≡ Duración : ${dur || "Desconocida"}
≡ Calidad : ${qual || "Desconocida"}
≡ Vistas : ${views || "Desconocidas"}` }
        await client.sendMessage(m.chat, mensaje, { quoted: m })
        try { await client.sendMessage(m.chat, { react: { text: '✅', key: m.key } }) } catch {}
        return
      }
      const res = await search(encodeURIComponent(query))
      if (!res.result?.length) return m.reply("💙 No se encontraron resultados.", m, global.miku)

      const ready = []
      for (const item of res.result.slice(0, 6)) {
        try {
          const dl = await xnxxdl(item.link)
          const videoUrl = dl?.result?.files?.high || dl?.result?.files?.low || ''
          if (!isHttp(videoUrl)) continue
          ready.push({
            title: dl?.result?.title || item.title || "Sin título",
            videoUrl,
          })
          if (ready.length >= 4) break
        } catch {}
      }

      if (!ready.length) return m.reply("💙 No se pudieron preparar videos de la búsqueda.", m, global.miku)
      await sendSearchVideoCarousel(client, m, "XNXX", ready)
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

      const title = String(video.title || "Sin título").replace(/\s+/g, ' ').slice(0, 64)

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

function parseInfo(infoStr = "", viewsStr = "", pageText = "", jsonViews = "") {
  let dur = "", qual = "", views = ""
  const durMatch = infoStr.match(/(\d+\s?min)/i)
  if (durMatch) dur = durMatch[1]
  const qualMatch = infoStr.match(/([0-9]{3,4}p)/i)
  if (qualMatch) qual = qualMatch[1]
  const cleanNumber = (s) => {
    const m = (s || "").match(/([0-9][0-9.,\s]*)/)
    return m ? m[1].replace(/\s+/g, "").trim() : ""
  }
  if (!views && jsonViews) views = cleanNumber(jsonViews)
  if (!views && viewsStr) views = cleanNumber(viewsStr)
  if (!views && pageText) {
    const v2 = pageText.match(/([0-9][0-9.,\s]*)\s*(views|view|visualizaciones|vistas)/i)
    if (v2) views = cleanNumber(v2[1])
  }
  return { dur, qual, views }
}

async function xnxxdl(URL) {
  return new Promise((resolve, reject) => {
    fetch(URL, { method: "get" }).then((res) => res.text()).then((res) => {
        const $ = cheerio.load(res, { xmlMode: false })
        const title = $('meta[property="og:title"]').attr("content") || $("title").text().trim()
        const image = $('meta[property="og:image"]').attr("content")
        const info = $("span.metadata").text() || $(".video-metadata .metadata").text()
        const scriptBlocks = []
        $("#video-player-bg script, script").each((i, el) => {
          const txt = $(el).html() || ""
          if (txt.includes("html5player.setVideoUrl")) scriptBlocks.push(txt)
        })
        const videoScript = scriptBlocks.join("\n")
        const files = {
          low: (videoScript.match(/html5player\.setVideoUrlLow\('(.*?)'\);/) || [])[1],
          high: (videoScript.match(/html5player\.setVideoUrlHigh\('(.*?)'\);/) || [])[1],
        }
        const viewsCandidates = [
          $(".nb_views").text(),
          $(".rating-box strong").text(),
          $(".video-metadata .metadata:contains('views')").text(),
          $(".metadata:contains('views')").text(),
          $(".metadata:contains('vistas')").text(),
          $(".video-details").text(),
        ]
        const viewsStr = viewsCandidates.find(v => (v || "").trim().length) || ""

        let jsonViews = ""
        const jsonLd = $('script[type="application/ld+json"]').html()
        if (jsonLd) {
          try {
            const data = JSON.parse(jsonLd)
            if (typeof data === "object") {
              jsonViews = String(
                data.interactionStatistic?.userInteractionCount ||
                data.aggregateRating?.ratingCount ||
                ""
              )
            }
          } catch {}
        }
        const pageText = $.root().text()
        resolve({ status: 200, result: { title, URL, image, info: parseInfo(info, viewsStr, pageText, jsonViews), files }})
      }).catch((err) => reject({ code: 503, status: false, result: err }))
  })
}

async function search(query) {
  return new Promise((resolve, reject) => {
    const baseurl = "https://www.xnxx.com"
    fetch(`${baseurl}/search/${query}/${Math.floor(Math.random() * 3) + 1}`, { method: "get" }).then((res) => res.text()).then((res) => {
        const $ = cheerio.load(res, { xmlMode: false })
        const results = []
        $("div.mozaique").each(function (a, b) {
          $(b).find("div.thumb-under").each(function (c, d) {
            const href = $(d).find("a").attr("href") || ""
            if (!href) return
            const url = baseurl + href.replace("/THUMBNUM/", "/")
            const titleAttr = $(d).find("a").attr("title")
            const titleText = $(d).find("a").text().trim()
            const title = titleAttr || titleText || $(d).find("span").text().trim() || "Sin título"
            const desc = $(d).find("p.metadata").text()
            results.push({ title, info: desc, link: url })
          })
        })
        resolve({ code: 200, status: true, result: results })
      }).catch((err) => reject({ code: 503, status: false, result: err }))
  })
}