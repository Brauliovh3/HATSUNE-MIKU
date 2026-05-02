import { promises as fsp } from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'

export async function toMp3(buffer, ext) {
  const tmpDir = path.join(os.tmpdir(), 'miku-mp3')
  const inputExt = ext || 'mp4'
  const inputPath = path.join(tmpDir, `input_${Date.now()}.${inputExt}`)
  const outputPath = path.join(tmpDir, `output_${Date.now()}.mp3`)

  await fsp.mkdir(tmpDir, { recursive: true })
  await fsp.writeFile(inputPath, buffer)

  return new Promise((resolve, reject) => {
    const args = ['-y', '-i', inputPath, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outputPath]
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })

    let err = ''
    const timeout = setTimeout(() => {
      p.kill('SIGKILL')
      reject(new Error('Timeout converting to MP3'))
    }, 120000)

    p.stderr.on('data', (d) => { err += d.toString() })
    p.on('error', (e) => {
      clearTimeout(timeout)
      cleanup()
      reject(e)
    })
    p.on('close', (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        cleanup()
        return reject(new Error(err || `ffmpeg failed (${code})`))
      }
      fsp.readFile(outputPath)
        .then((mp3) => {
          cleanup()
          resolve(mp3)
        })
        .catch(reject)
    })
  })

  function cleanup() {
    try { fsp.unlink(inputPath) } catch {}
    try { fsp.unlink(outputPath) } catch {}
  }
}
