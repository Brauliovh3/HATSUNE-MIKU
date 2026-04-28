import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const execAsync = promisify(exec)

async function reloadCommands(dir = path.join(__dirname, '..')) {
  const commandsMap = new Map()
  async function readCommands(folder) {
    const files = fs.readdirSync(folder)
    for (const file of files) {
      const fullPath = path.join(folder, file)
      if (fs.lstatSync(fullPath).isDirectory()) {
        await readCommands(fullPath)
      } else if (file.endsWith('.js')) {
        try {
          const { default: cmd } = await import(fullPath + '?update=' + Date.now()) 
          if (cmd?.command) {
            cmd.command.forEach((c) => {
              commandsMap.set(c.toLowerCase(), cmd)
            })
          }
        } catch (err) {
          console.error(`Error recargando comando ${file}:`, err)
        }
      }
    }
  }
  await readCommands(dir)
  global.comandos = commandsMap
}

export default {
  command: ['fix', 'update'],
  isOwner: true,
  run: async (client, m) => {
    const botId = (client.user?.id?.split(':')[0] || client.user?.lid || '') + '@s.whatsapp.net'
    const botName = global.db.data.settings[botId]?.namebot || 'Hatsune Miku'
    const divider = `╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌`

    const sent = await client.sendMessage(
      m.chat, 
      { text: `\`🎵 Conectando con el repositorio...\`` }, 
      { quoted: m }
    )

    try {
      const { stdout } = await execAsync('git pull')
      await reloadCommands(path.join(__dirname, '..'))

      if (stdout.includes('Already up to date.') || stdout.includes('Ya está actualizado.')) {
        await client.sendMessage(m.chat, {
          text: `🩵 *S I S T E M A   A L   D Í A* 🩵\n${divider}\n\n🌿 *Estado:* Sin novedades\n🎵 *Detalle:* ${botName} ya cuenta con la versión más reciente del repositorio.\n\n${divider}\n🎵 *Hatsune Miku*  *Bot* 🎵`,
          edit: sent.key
        })
        return
      }

      let files = stdout.split('\n')
        .filter(line => line.includes('|') && !line.includes('Fast-forward'))
        .map(line => line.split('|')[0].trim())

      let fileList = files.length > 0 
        ? files.map(f => `> 📄 \`${f}\``).join('\n') 
        : `> 📄 \`Múltiples cambios internos aplicados\``

      const msg = `🩵 *A C T U A L I Z A D O* 🩵\n${divider}\n\n🌿 *Estado:* Sincronización Exitosa\n🎵 *Archivos Modificados:*\n${fileList}\n\n${divider}\n⚠️ *Nota:* Los comandos han sido recargados en memoria.\n\n🎵 *Hatsune Miku*  *Bot* 🎵`
      await client.sendMessage(m.chat, { text: msg, edit: sent.key })

    } catch (error) {
      await client.sendMessage(m.chat, {
        text: `❌ *E R R O R   D E   R E D* ❌\n${divider}\n\nNo se pudo sincronizar con GitHub.\n\n\`\`\`${error.message}\`\`\``,
        edit: sent.key
      })
    }
  }
}
