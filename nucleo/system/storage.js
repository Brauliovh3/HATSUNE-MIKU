import fs from 'fs'
import os from 'os'
import path from 'path'

const MB = 1024 * 1024
const root = process.cwd()

export const STORAGE_LIMITS = {
  maxDownloadBytes: Number(process.env.MIKU_MAX_DOWNLOAD_MB || 80) * MB,
  maxTmpDirBytes: Number(process.env.MIKU_TMP_QUOTA_MB || 250) * MB,
  minFreeBytes: Number(process.env.MIKU_MIN_FREE_MB || 512) * MB,
  tmpMaxAgeMs: Number(process.env.MIKU_TMP_MAX_AGE_MIN || 30) * 60 * 1000,
  sessionFileMaxAgeMs: Number(process.env.MIKU_SESSION_FILE_MAX_HOURS || 6) * 60 * 60 * 1000,
}

export const PROJECT_TMP_DIR = path.join(root, 'tmp')
export const DOWNLOAD_TMP_DIR = path.join(root, 'tmp-descargas')
export const CHANNEL_AUDIO_DIR = path.join(root, 'channel-audios')
export const MP3_TMP_DIR = path.join(os.tmpdir(), 'miku-mp3')
export const VECTORINK_TMP_DIR = path.join(os.tmpdir(), 'vectorink')

const TEMP_DIRS = [
  PROJECT_TMP_DIR,
  DOWNLOAD_TMP_DIR,
  CHANNEL_AUDIO_DIR,
  MP3_TMP_DIR,
  VECTORINK_TMP_DIR,
  path.join(root, 'temp'),
  path.join(root, 'Sessions', 'temp'),
  path.join(root, 'interruptores', 'tmp-descargas'),
]

const SYSTEM_TMP_FILE_PREFIXES = ['miku-in-', 'miku-out-']

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function isNoSpaceError(err) {
  return String(err?.code || '').toUpperCase() === 'ENOSPC' || /ENOSPC|no space left/i.test(String(err?.message || err || ''))
}

export async function getDiskInfo(target = root) {
  try {
    const stats = await fs.promises.statfs(target)
    const free = stats.bavail * stats.bsize
    const total = stats.blocks * stats.bsize
    return { free, total, used: Math.max(0, total - free), usedPercent: total ? ((total - free) / total) * 100 : 0 }
  } catch {
    return null
  }
}

export async function hasEnoughDiskSpace(requiredBytes = 0) {
  const info = await getDiskInfo(root)
  if (!info) return true
  return info.free - requiredBytes > STORAGE_LIMITS.minFreeBytes
}

async function walkFiles(dir, out = []) {
  let entries
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    try {
      const stat = await fs.promises.stat(fullPath)
      if (entry.isDirectory()) {
        await walkFiles(fullPath, out)
      } else {
        out.push({ path: fullPath, name: entry.name, size: stat.size, mtimeMs: stat.mtimeMs })
      }
    } catch {}
  }

  return out
}

async function unlinkQuiet(filePath) {
  try {
    await fs.promises.unlink(filePath)
    return true
  } catch {
    return false
  }
}

async function cleanTempDir(dir, options = {}) {
  const maxAgeMs = options.maxAgeMs ?? STORAGE_LIMITS.tmpMaxAgeMs
  const maxBytes = options.maxBytes ?? STORAGE_LIMITS.maxTmpDirBytes
  const now = Date.now()
  const files = await walkFiles(dir)
  let freed = 0
  let cleaned = 0
  let remaining = 0

  for (const file of files) {
    const old = now - file.mtimeMs > maxAgeMs
    const oversized = file.size > STORAGE_LIMITS.maxDownloadBytes
    const disposable = /\.(tmp|part|crdownload)$/i.test(file.name) || /^(tmp-|input_|output_|conv-|sticker-|video-|urlvid-|url-|in-)/i.test(file.name)
    if (old || oversized || disposable) {
      if (await unlinkQuiet(file.path)) {
        freed += file.size
        cleaned++
        continue
      }
    }
    remaining += file.size
  }

  if (remaining > maxBytes) {
    const keep = files
      .filter(file => fs.existsSync(file.path))
      .sort((a, b) => a.mtimeMs - b.mtimeMs)

    for (const file of keep) {
      if (remaining <= maxBytes) break
      if (await unlinkQuiet(file.path)) {
        remaining -= file.size
        freed += file.size
        cleaned++
      }
    }
  }

  return { cleaned, freed }
}

export async function cleanProjectStorage(options = {}) {
  const totals = { cleaned: 0, freed: 0, sessionsCleaned: 0 }

  for (const dir of TEMP_DIRS) {
    if (!fs.existsSync(dir)) continue
    const result = await cleanTempDir(dir, options)
    totals.cleaned += result.cleaned
    totals.freed += result.freed
  }

  const systemResult = await cleanSystemTmpFiles(options)
  totals.cleaned += systemResult.cleaned
  totals.freed += systemResult.freed

  totals.sessionsCleaned = await cleanSessionCache(options.sessionFileMaxAgeMs ?? STORAGE_LIMITS.sessionFileMaxAgeMs)
  return totals
}

async function cleanSystemTmpFiles(options = {}) {
  const maxAgeMs = options.maxAgeMs ?? STORAGE_LIMITS.tmpMaxAgeMs
  const now = Date.now()
  let cleaned = 0
  let freed = 0
  let entries

  try {
    entries = await fs.promises.readdir(os.tmpdir(), { withFileTypes: true })
  } catch {
    return { cleaned, freed }
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!SYSTEM_TMP_FILE_PREFIXES.some(prefix => entry.name.startsWith(prefix))) continue
    const fullPath = path.join(os.tmpdir(), entry.name)
    try {
      const stat = await fs.promises.stat(fullPath)
      if (now - stat.mtimeMs > maxAgeMs || stat.size > STORAGE_LIMITS.maxDownloadBytes) {
        if (await unlinkQuiet(fullPath)) {
          cleaned++
          freed += stat.size
        }
      }
    } catch {}
  }

  return { cleaned, freed }
}

export async function cleanSessionCache(maxAgeMs = STORAGE_LIMITS.sessionFileMaxAgeMs) {
  const sessionsRoot = path.join(root, 'Sessions')
  const now = Date.now()
  let cleaned = 0
  const files = await walkFiles(sessionsRoot)

  for (const file of files) {
    if (file.name === 'creds.json') continue
    const isBaileysCache =
      file.name.startsWith('pre-key-') ||
      file.name.startsWith('sender-key-') ||
      file.name.startsWith('session-') ||
      file.name.startsWith('app-state-') ||
      file.name.startsWith('app-state-sync-key')

    if (isBaileysCache && now - file.mtimeMs > maxAgeMs) {
      if (await unlinkQuiet(file.path)) cleaned++
    }
  }

  return cleaned
}

export function readableBytes(bytes = 0) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let idx = 0
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024
    idx++
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}
