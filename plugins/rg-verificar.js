import { createHash } from 'crypto'
import PhoneNumber from 'awesome-phonenumber'
import _ from "lodash"
import axios from 'axios'


let Reg = /\|?(.+?)([.|] *?)([0-9]+)$/i

let handler = async function (m, { conn, text, usedPrefix, command }) {

  console.log(`Comando recibido: ${usedPrefix}${command} ${text}`)
  
  let user = global.db.data.users[m.sender]
  let name2 = conn.getName(m.sender)
  

  if (user.registered === true) {
    return conn.reply(m.chat, `*💙 Ya estas registrado, para volver a registrarte, usa el comando: #unreg*`, m, rcanal)
  }
  

  if (!text) {
    return conn.reply(m.chat, `*💙 El comando ingresado es incorrecto, uselo de la siguiente manera:*\n\n#reg Nombre.edad\n\n\`\`\`Ejemplo:\`\`\`\n#reg *${name2}.18*`, m, rcanal)
  }
  
  
  text = text.trim()
  if (text.startsWith('(') && !text.includes(')')) {
    text = text.substring(1) 
  }
  

  let nameWithParentheses = false
  if (text.includes('(') && text.includes(')')) {
    
    const match = text.match(/(.+)\.([0-9]+)$/)
    if (match) {
      nameWithParentheses = true
      text = match[1] + '.' + match[2] 
      console.log(`Reformateado con paréntesis: ${text}`)
    }
  }
  
  
  if (!Reg.test(text)) {
    console.log(`Regex no coincidió con: ${text}`)
    return conn.reply(m.chat, `*💙 El comando ingresado es incorrecto, uselo de la siguiente manera:*\n\n#reg Nombre.edad\n\n\`\`\`Ejemplo:\`\`\`\n#reg *${name2}.18*`, m, rcanal)
  }
  

  let [_, name, splitter, age] = text.match(Reg)
  
  // Validaciones
  if (!name) {
    return conn.reply(m.chat, '*💙 No puedes registrarte sin nombre, el nombre es obligatorio. Inténtelo de nuevo.*', m, rcanal)
  }
  if (!age) {
    return conn.reply(m.chat, '*💙 No puedes registrarte sin la edad, la edad es opcional. Inténtelo de nuevo.*', m, rcanal)
  }
  if (name.length >= 30) {
    return conn.reply(m.chat, '*💙 El nombre no debe de tener mas de 30 caracteres.*', m, rcanal)
  }
  

  age = parseInt(age)
  if (isNaN(age)) {
    return conn.reply(m.chat, '*💙 La edad debe ser un número válido.*', m, rcanal)
  }
  if (age > 999) {
    return conn.reply(m.chat, '*『😏』Viejo/a Sabroso/a*', m, rcanal)
  }
  if (age < 5) {
    return conn.reply(m.chat, '*『🍼』Ven aquí, te adoptare!!*', m, rcanal)
  }
  
  try {
   
    let delirius = await axios.get(`https://delirius-apiofc.vercel.app/tools/country?text=${PhoneNumber('+' + m.sender.replace('@s.whatsapp.net', '')).getNumber('international')}`)
    let paisdata = delirius.data.result
    let mundo = paisdata ? `${paisdata.name} ${paisdata.emoji}` : 'Desconocido'
    let perfil = await conn.profilePictureUrl(m.sender, 'image').catch(_ => 'https://i.pinimg.com/736x/7b/c6/95/7bc6955d19ce9fa6e562e634d85c912b.jpg')
    

    let bio = 0, fechaBio
    let sinDefinir = '😿 Es privada'
    let biografia = await conn.fetchStatus(m.sender).catch(() => null)
    if (!biografia || !biografia[0] || biografia[0].status === null) {
      bio = sinDefinir
      fechaBio = "Fecha no disponible"
    } else {
      bio = biografia[0].status || sinDefinir
      fechaBio = biografia[0].setAt ? new Date(biografia[0].setAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", }) : "Fecha no disponible"
    }
    
   
    user.name = name.trim()
    user.age = age
    user.descripcion = bio
    user.regTime = + new Date
    user.registered = true
    
    
    global.db.data.users[m.sender].money += 5
    global.db.data.users[m.sender].cebollines += 15
    global.db.data.users[m.sender].exp += 245
    global.db.data.users[m.sender].joincount += 12
    
   
    let sn = createHash('md5').update(m.sender).digest('hex').slice(0, 20)
    
    
    m.react('📩')
    let regbot = `💙 𝗥 𝗘 𝗚 𝗜 𝗦 𝗧 𝗥 𝗢 💙
•┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄•
「💭」𝗡𝗼𝗺𝗯𝗿𝗲: ${name}
「✨️」𝗘𝗱𝗮𝗱: ${age} años
•┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄•
「🎁」𝗥𝗲𝗰𝗼𝗺𝗽𝗲𝗻𝘀𝗮𝘀:
• 15 Cebollines 🌱
• 5 coins 🪙
• 245 Experiencia 💸
• 12 Tokens 💰
sіgᥙᥱ ᥒᥙᥱs𝗍r᥆ 𝗍ᥱᥲm!:
${channel2}
•┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄•
${packname}`

    await conn.sendMessage(m.chat, {
      text: regbot,
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          title: '¡Usᥙᥲrі᥆ rᥱgіs𝗍rᥲძ᥆!',
          body: '💙 LA MELODIA MAS AGUDA!!',
          thumbnailUrl: imagen3,
          sourceUrl: redes,
          previewType: "PHOTO",
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    })
    
    console.log(`Usuario registrado: ${name} con edad ${age}`)
  } catch (error) {
    console.error('Error en el registro:', error)
    return conn.reply(m.chat, '*💙 Ocurrió un error durante el registro. Inténtelo de nuevo.*', m, rcanal)
  }
}

handler.help = ['reg']
handler.tags = ['rg']
handler.command = ['verify', 'verificar', 'reg', 'register', 'registrar'] 

export default handler
