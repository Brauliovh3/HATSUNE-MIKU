import path from 'path'
import fs from 'fs'
import _ from 'lodash'
import yargs from 'yargs/yargs'

global.opts = Object(yargs(process.argv.slice(2)).exitProcess(false).parse())

const dbFile = path.join(process.cwd(), 'nucleo', 'database.json')

global.db = {
  data: {
    users: {},
    chats: {},
    settings: {},
    characters: {},
    stickerspack: {}
  },
  chain: null,
  READ: false,
  _snapshot: '{}',
  _pendingChanges: false,
  _saveQueued: false
}
global.DATABASE = global.db
global.loadDatabase = function loadDatabase() {
  if (global.db.READ) return global.db.data
  global.db.READ = true
  
  if (fs.existsSync(dbFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(dbFile, 'utf8'))
      global.db.data = Object.assign(global.db.data, parsed)
    } catch {}
  }
  global.db.chain = _.chain(global.db.data)
  global.db.READ = false
  global.db._snapshot = JSON.stringify(global.db.data)
  return global.db.data
}

function hasPendingChanges() {
  if (!global.db._pendingChanges) return false
  return global.db._snapshot !== JSON.stringify(global.db.data)
}

export function markDatabaseDirty() {
  global.db._pendingChanges = true
}

global.saveDatabase = function saveDatabase(force = false) {
  if (!force && !hasPendingChanges()) return
  try {
    fs.writeFileSync(dbFile, JSON.stringify(global.db.data, null, 2))
    global.db._snapshot = JSON.stringify(global.db.data)
    global.db._pendingChanges = false
  } catch (err) {
    console.error('Error saving database:', err.message)
  }
}

let lastSave = Date.now()
setInterval(() => {
  const now = Date.now()
  const elapsed = now - lastSave
  if (elapsed >= 2000 && global.db._pendingChanges) {
    global.saveDatabase()
    lastSave = now
  }
}, 1000)

export default global.db