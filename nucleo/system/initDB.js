let isNumber = (x) => typeof x === 'number' && !isNaN(x)

function initDB(m, client) {
  const jid = client.user?.id?.split(':')[0] + '@s.whatsapp.net'

  const settings = global.db.data.settings[jid] ||= {}
  settings.self ??= false
  settings.prefix ??= ['/', '!', '.', '#']
  settings.commandsejecut ??= isNumber(settings.commandsejecut) ? settings.commandsejecut : 0
  settings.id ??= '120363315369913363@newsletter'
  settings.nameid ??= '💙HATSUNE MIKU CHANNEL💙'
  settings.type ??= 'Owner'
  settings.link ??= 'https://www.whatsapp.com/channel/0029VajYamSIHphMAl3ABi1o'
  settings.banner ??= 'https://i.pinimg.com/736x/0c/1e/f8/0c1ef8e804983e634fbf13df1044a41f.jpg'
  settings.icon ??= 'https://i.pinimg.com/736x/0c/1e/f8/0c1ef8e804983e634fbf13df1044a41f.jpg'
  settings.currency ??= '🌱 Cebollines'
  settings.audios ??= false
  settings.namebot ??= '💙HATSUNE MIKU💙'
  settings.botname ??= '💙HATSUNE MIKU💙'  
  settings.owner ??= '(ㅎㅊDEPOOLㅊㅎ)'

  const user = global.db.data.users[m.sender] ||= {}
  user.name ??= m.pushName
  user.exp = isNumber(user.exp) ? user.exp : 0
  user.level = isNumber(user.level) ? user.level : 0
  user.usedcommands = isNumber(user.usedcommands) ? user.usedcommands : 0
  user.pasatiempo ??= ''
  user.description ??= ''
  user.marry ??= ''
  user.genre ??= ''
  user.birth ??= ''
  user.metadatos ??= null
  user.metadatos2 ??= null

  const chat = global.db.data.chats[m.chat] ||= {}
  chat.users ||= {}
  chat.mutedUsers ??= {}
  chat.isBanned ??= false
  chat.welcome ??= false
  chat.goodbye ??= false
  chat.sWelcome ??= ''
  chat.sGoodbye ??= ''
  chat.nsfw ??= false
  chat.alerts ??= true
  chat.gacha ??= true
  chat.economy ??= true
  chat.audios ??= false
  chat.adminonly ??= false
  chat.primaryBot ??= null
  chat.antilinks ??= true

  chat.users[m.sender] ||= {}
  chat.users[m.sender].stats ||= {}
  chat.users[m.sender].usedTime ??= null
  chat.users[m.sender].lastCmd = isNumber(chat.users[m.sender].lastCmd) ? chat.users[m.sender].lastCmd : 0
  chat.users[m.sender].coins = isNumber(chat.users[m.sender].coins) ? chat.users[m.sender].coins : 0
  chat.users[m.sender].bank = isNumber(chat.users[m.sender].bank) ? chat.users[m.sender].bank : 0
  chat.users[m.sender].afk = isNumber(chat.users[m.sender].afk) ? chat.users[m.sender].afk : -1
  chat.users[m.sender].afkReason ??= ''
  chat.users[m.sender].characters = Array.isArray(chat.users[m.sender].characters) ? chat.users[m.sender].characters : []
}

export default initDB;
