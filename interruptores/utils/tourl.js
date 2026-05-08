import axios from "axios"
import FormData from "form-data"

function formatBytes(bytes) {
  if (bytes === 0) return "0 B"
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`
}

function generateUniqueFilename(mime) {
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "bin"
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const id = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  return `${id}.${ext}`
}

async function uploadCatbox(buffer, mime) {
  const form = new FormData()
  form.append("reqtype", "fileupload")
  form.append("fileToUpload", buffer, {
    filename: generateUniqueFilename(mime),
    contentType: mime,
    knownLength: buffer.length
  })

  const res = await axios.post("https://catbox.moe/user/api.php", form, {
    headers: {
      ...form.getHeaders(),
      "Content-Length": form.getLengthSync()
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 60000
  })

  const result = typeof res.data === "string" ? res.data.trim() : ""
  if (!result.startsWith("https://")) {
    throw new Error("Respuesta inválida de Catbox: " + JSON.stringify(res.data))
  }
  return result
}

async function uploadUguu(buffer, mime) {
  const form = new FormData()
  form.append("files[]", buffer, {
    filename: generateUniqueFilename(mime || "image/jpeg"),
    contentType: mime || "image/jpeg",
    knownLength: buffer.length
  })

  const res = await axios.post("https://uguu.se/upload.php", form, {
    headers: {
      ...form.getHeaders(),
      "Content-Length": form.getLengthSync()
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 60000
  })

  const url = res.data?.files?.[0]?.url
  if (!url) throw new Error("Respuesta inválida de Uguu: " + JSON.stringify(res.data))
  return url
}

async function uploadQuax(buffer, mime) {
  const form = new FormData()
  form.append("file", buffer, {
    filename: generateUniqueFilename(mime),
    contentType: mime,
    knownLength: buffer.length
  })

  const res = await axios.post("https://qu.ax/upload.php", form, {
    headers: {
      ...form.getHeaders(),
      "Content-Length": form.getLengthSync()
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 60000
  })

  const url = res.data?.files?.[0]?.url
  if (!url) throw new Error("Respuesta inválida de Quax: " + JSON.stringify(res.data))
  return url
}

async function uploadAuto(buffer, mime) {
  const servers = [
    { name: "catbox", fn: () => uploadCatbox(buffer, mime) },
    { name: "uguu",   fn: () => uploadUguu(buffer, mime)   },
    { name: "quax",   fn: () => uploadQuax(buffer, mime)   }
  ]

  let lastError
  for (const s of servers) {
    try {
      const link = await s.fn()
      return { link, server: s.name }
    } catch (e) {
      lastError = e
      console.warn(`[tourl] ${s.name} falló:`, e.message)
    }
  }
  throw lastError
}

export default {
  command: ["tourl"],
  category: "utils",
  run: async (client, m, args, usedPrefix, command) => {
    const q = m.quoted || m
    const mime = (q.msg || q).mimetype || ""

    if (!mime) {
      return client.reply(
        m.chat,
        `💙 Responde a una imagen o video con *${usedPrefix + command} [servidor]* para convertirlo en URL.\n\n` +
        `Servidores disponibles:\n` +
        `› catbox (permanente)\n` +
        `› quax   (permanente)\n` +
        `› uguu   (temporal, 24h)\n\n` +
        `Si no indicas servidor se usará el modo automático.`,
        m
      )
    }

    try {
      const media = await q.download()
      if (!media || !media.length) return m.reply("💙 No se pudo descargar el archivo.")

      const serverArg = args[0]?.toLowerCase() || "auto"
      let link, server

      switch (serverArg) {
        case "catbox":
          link   = await uploadCatbox(media, mime)
          server = "catbox"
          break
        case "uguu":
          link   = await uploadUguu(media, mime)
          server = "uguu"
          break
        case "quax":
          link   = await uploadQuax(media, mime)
          server = "quax"
          break
        default: {
          const autoRes = await uploadAuto(media, mime)
          link   = autoRes.link
          server = autoRes.server
        }
      }

      const userName = m.pushName || "Usuario"
      const tipo     = mime.split("/")[1]?.toUpperCase() || "UNKNOWN"
      const upload   =
        `╭─「 📤 *UPLOAD* 」\n` +
        `│ 💙 *Servidor ›* ${server.toUpperCase()}\n` +
        `│ 💙 *Link ›* ${link}\n` +
        `│ 🌱 *Peso ›* ${formatBytes(media.length)}\n` +
        `│ 💙 *Tipo ›* ${tipo}\n` +
        `│ 🌱 *Solicitado por ›* ${userName}\n` +
        `╰────────────╯`

      return m.reply(upload)
    } catch (e) {
      console.error("[tourl] error:", e)
      return m.reply(`❌ Error al subir el archivo: ${e.message}`)
    }
  }
}
