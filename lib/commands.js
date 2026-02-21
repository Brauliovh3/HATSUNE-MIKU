export const bodyMenu = `╭━━━━━━━━━━━━━━━━━━━╮
┃ 🎤*HATSUNE MIKU BOT*🎤 ┃
╰━━━━━━━━━━━━━━━━━━━╯

🌸*¡Konnichiwa,* @$sender!🌸

┏━━━━━━━━━━━━━━━━┓
┃ 💙 *Estado:* $botType
┃ ⏰ *Activo:* $tiempo
┃ 👥 *Usuarios:* $users
┃ 📊 *Comandos:* ${Object.keys(menuObject).length}
┃ 📱 *Creador:* $owner
┃ 💻 *Sistema:* $device
┗━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃💙 *¿Tu propio bot?* Usa .code            ┃
┃✨ Escribe el comando para usarlo    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━┛`.trim()
export const menuObject = {
economia: `╭─「 💰 *ECONOMÍA & RPG* 」
├ 👷 .work - Trabajar
├ 🎁 .daily - Recompensa diaria
├ ⛏️ .mine - Minar recursos
├ 🎰 .casino - Apostar
├ 🪙 .cf - Cara o cruz
├ 🎰 .slot - Tragamonedas
├ 🎲 .ruleta - Ruleta rusa
├ 💸 .steal - Robar dinero
├ ⭐ .robarxp - Robar XP
├ 🏦 .bank - Ver banco
├ 👛 .wallet - Ver cartera
├ 💳 .deposit - Depositar
├ 💰 .withdraw - Retirar
├ 🤝 .transfer - Transferir dinero
├ 🛒 .buyall - Comprar con XP
├ 📦 .cofre - Cofre diario
├ 📅 .weekly - Regalo semanal
├ 🗓️ .monthly - Regalo mensual
├ 🏆 .eboard - Ranking millonarios
├ 🗺️ .aventura - Aventurarse
├ ❤️‍🩹 .curar - Curar salud
├ 🏹 .cazar - Cazar
├ 🎒 .inv - Ver inventario
├ 🏰 .mazmorra - Explorar mazmorras
├ 🏪 .tiendarpg - Tienda RPG completa
├ 📊 .rpgstats - Estadísticas RPG
├ 🏆 .ranking - Ranking aventureros
├ 🎃 .halloween - Dulce o truco
├ 🎄 .christmas - Regalo navideño
├ 🦹 .crime - Trabajar ladrón
╰ 💋 .slut - Trabajo prostituta`,
gacha: `╭─「 🎯 *GACHA & WAIFUS* 」
├ 🎲 .rollwaifu - Buscar waifu
├ ❤️ .claim - Reclamar personaje
├ 👥 .harem - Ver colección
├ 🖼️ .charimage - Imagen personaje
├ ℹ️ .charinfo - Info personaje
├ 🎁 .givechar - Regalar personaje
├ 👍 .vote - Votar personaje
╰ 🏆 .waifusboard - Top waifus`,
downloads: `╭─「 📥 *DESCARGAS* 」
├ 🎵 .play - Música/video YouTube
├ 📱 .tiktok - Videos TikTok
├ 📷 .instagram - Posts Instagram
├ 💙 .facebook - Videos Facebook
├ 📁 .mediafire - Archivos MediaFire
├ ☁️ .mega - Archivos MEGA
├ 🐦 .twitter - Videos Twitter/X
├ 🎬 .ytmp3/.ytmp4 - YouTube por URL
├ 📌 .pinvid - Videos Pinterest
├ 📦 .terabox - Archivos Terabox
├ 🌿 .gitclone - Repositorios GitHub
├ 📲 .apk - APKs de Aptoide
╰ 📦 .npmdl - Paquetes NPM`,
profile: `╭─「 📝 *PERFIL & USUARIO* 」
├ 📝 .reg - Registrarse
├ ❌ .unreg - Eliminar registro
├ 👤 .profile - Ver perfil
├ 💍 .marry - Casarse
├ 💔 .divorce - Divorciarse
├ ⚥ .setgenre - Establecer género
├ ❌ .delgenre - Eliminar género
├ 🎂 .setbirth - Fecha nacimiento
├ ❌ .delbirth - Eliminar fecha
├ 📄 .setdescription - Descripción
├ ❌ .deldescription - Eliminar descripción
├ 🏆 .lb - Top usuarios XP
├ 📊 .level - Ver nivel
├ ⭐ .comprarpremium - Comprar premium
╰ 💌 .confesiones - Confesar sentimientos`,
sockets: `╭─「 ⚙️ *INFORMACIÓN & CONFIG* 」
├ 📡 .ping - Velocidad bot
├ ⏱️ .uptime - Tiempo activo
├ 🤖 .serbot - Crear SubBot
├ 📱 .qr - Código QR SubBot
├ 📊 .status - Estado del bot
├ ℹ️ .infobot - Info completa bot
├ 📜 .script - Código fuente
├ 👨‍💻 .staff - Desarrolladores
├ 🔗 .bots - Lista Sub-Bots
├ 🌐 .links - Enlaces oficiales
├ 💡 .sug - Sugerir comando
├ 🐛 .reporte - Reportar errores
├ 💻 .sistema - Estado sistema
├ 🚀 .speed - Estadísticas velocidad
├ 👥 .views - Cantidad usuarios
├ 🛠️ .funciones - Ver funciones
├ 🔄 .ds - Limpiar sesión
╰ 🤖 .editautoresponder - Config auto respuesta`,
utils: `╭─「 🛠️ *HERRAMIENTAS* 」
├ 🌤️ .clima - Ver clima
├ 🈵 .translate - Traducir
├ ✨ .enhance - Mejorar imagen
├ 🧮 .calcular - Calculadora
├ 🎭 .fake - Mensajes falsos
├ 🔤 .letra - Cambiar fuente
├ 👁️ .read - Ver imágenes vista única
├ 🎵 .whatmusic - Identificar canciones
├ 📸 .ss - Screenshot páginas
├ 📏 .length - Cambiar tamaño archivos
├ 🗣️ .say - Repetir mensajes
├ 📄 .todoc - Crear documentos
╰ 🕐 .horario - Horario global`,
grupo: `╭─「 👥 *GRUPOS (Solo admins)* 」
├ 👻 .hidetag - Mencionar todos oculto
├ 🦵 .kick - Eliminar usuario
├ ➕ .add - Invitar usuario
├ ⬆️ .promote - Dar admin
├ ⬇️ .demote - Quitar admin
├ 🔗 .link - Enlace del grupo
├ 🔄 .revoke - Restablecer enlace
├ 🔓 .group open/close - Abrir/cerrar grupo
├ ⚠️ .warn - Advertir usuario
├ ✅ .unwarn - Quitar advertencias
├ 📋 .advlist - Ver advertidos
├ 🔇 .mute - Silenciar usuario
├ 🔊 .unmute - Quitar silencio
├ 🗑️ .delete - Eliminar mensaje
├ 👑 .admins - Mencionar admins
├ ℹ️ .gp - Info del grupo
├ 📊 .linea - Usuarios online
├ 👋 .setwelcome - Mensaje bienvenida
├ 👋 .setbye - Mensaje despedida
├ 📊 .encuesta - Crear encuesta
├ 👻 .fantasmas - Ver inactivos
├ 🧹 .kickfantasmas - Eliminar inactivos
├ 📢 .invocar - Invocar todos
├ 😀 .setemoji - Cambiar emoji
├ 🌍 .listnum - Eliminar por país
├ 🖼️ .gpbanner - Cambiar imagen grupo
├ 📝 .gpname - Cambiar nombre
├ 📄 .gpdesc - Cambiar descripción
╰ 🤖 .bot on/off - Encender/apagar bot`,
nsfw: `╭─「 🔞 *NSFW (Solo +18)* 」
├ 🔞 .waifu - Waifu NSFW
├ 🔞 .rule34 - Buscar R34
├ 🔞 .anal - Contenido anal
├ 🛁 .bath - Bañarse juntos
├ 🔞 .blowjob - Hacer mamada
├ 🔞 .boobjob - Hacer rusa
├ 🔞 .cum - Venirse
├ 🔞 .fap - Hacerse paja
├ 🔞 .ppcouple - Imágenes parejas
├ 🔞 .footjob - Paja con pies
├ 🔞 .fuck - Follar
├ ☕ .cafe - Tomar café juntos
├ 🔞 .violar - Violar
├ 🔞 .grabboobs - Agarrar pechos
├ 🔞 .grop - Manosear
├ 🔞 .lickpussy - Lamer coño
├ 🔞 .sixnine - Hacer 69
├ 🔞 .spank - Dar nalgada
├ 🔞 .suckboobs - Chupar pechos
├ 🔞 .undress - Desnudar
╰ 🔞 .yuri - Hacer tijeras lésbicas`,
anime: `╭─「 🎌 *ANIME & REACCIONES* 」
├ 🤗 .hug - Dar abrazos
├ 😘 .kiss - Dar besos
├ 🤲 .pat - Acariciar
├ 👋 .slap - Abofetear
├ 😢 .cry - Llorar
├ 😊 .happy - Estar feliz
├ 😠 .angry - Estar enojado
├ ❤️ .love - Enamorarse
├ 🦷 .bite - Morder
├ 😝 .bleh - Sacar lengua
├ 😳 .blush - Sonrojarse
├ 😑 .bored - Estar aburrido
├ 🤗 .cuddle - Acurrucarse
├ 💃 .dance - Bailar
├ 🍺 .drunk - Estar borracho
├ 🍽️ .eat - Comer
├ 🤦 .facepalm - Palmada cara
├ 🤰 .impregnate - Embarazar
├ ⚰️ .kill - Matar
├ 😂 .laugh - Reírse
├ 👅 .lick - Lamer
├ 👉 .poke - Picar
├ 😤 .pout - Hacer pucheros
├ 👊 .punch - Dar puñetazo
├ 🏃 .run - Correr
├ 😔 .sad - Estar triste
├ 😨 .scared - Estar asustado
├ 😏 .seduce - Seducir
├ 😳 .shy - Sentir timidez
├ 🌅 .dias - Buenos días
├ 🌃 .noches - Buenas noches
├ 😴 .sleep - Irse a dormir
├ 🚬 .smoke - Fumar
╰ 🤔 .think - Pensar`,
}
