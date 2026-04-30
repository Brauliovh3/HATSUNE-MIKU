import fetch from 'node-fetch';
import { resolveLidToRealJid } from "../../nucleo/utils.js"

const _0xanimeKey = [68,69,80,79,79,76,45,107,101,121,54,48,48,49,53,48,57,49].map(c=>String.fromCharCode(c)).join('');

const captions = {
  sleep: (from, to, genero) => from === to ? 'está durmiendo plácidamente.' : 'está durmiendo con',
  seduce: (from, to, genero) => from === to ? 'lanzó una mirada seductora al vacío.' : 'está intentando seducir a',
  shy: (from, to, genero) => from === to ? `se sonrojó tímidamente y desvió la mirada.` : `se siente demasiado ${genero === 'Hombre' ? 'tímido' : genero === 'Mujer' ? 'tímida' : 'tímide'} para mirar a`,
  slap: (from, to, genero) => from === to ? `se dio una bofetada a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'le dio una bofetada a',
  bath: (from, to) => (from === to ? 'se está bañando.' : 'está bañando a'),
  angry: (from, to, genero) => from === to ? `está muy ${genero === 'Hombre' ? 'enojado' : genero === 'Mujer' ? 'enojada' : 'enojadx'}.` : `está super ${genero === 'Hombre' ? 'enojado' : genero === 'Mujer' ? 'enojada' : 'enojadx'} con`,
  bored: (from, to, genero) => from === to ? `está muy ${genero === 'Hombre' ? 'aburrido' : genero === 'Mujer' ? 'aburrida' : 'aburridx'}.` : `está ${genero === 'Hombre' ? 'aburrido' : genero === 'Mujer' ? 'aburrida' : 'aburridx'} de`,
  bite: (from, to, genero) => from === to ? `se mordió ${genero === 'Hombre' ? 'solito' : genero === 'Mujer' ? 'solita' : 'solitx'}.` : 'mordió a',
  bleh: (from, to) => from === to ? 'se sacó la lengua frente al espejo.' : 'le está haciendo muecas con la lengua a',
  blush: (from, to) => (from === to ? 'se sonrojó.' : 'se sonrojó por'),
  bullying: (from, to, genero) => from === to ? `se hace bullying ${genero === 'Hombre' ? 'el mismo' : genero === 'Mujer' ? 'ella misma' : 'el/ella mismx'}… alguien ${genero === 'Hombre' ? 'que lo abrace' : genero === 'Mujer' ? 'que la abrace' : `que ${genero === 'Hombre' ? 'lo' : genero === 'Mujer' ? 'la' : 'lx'} ayude`}.` : 'le está haciendo bullying a',
  cry: (from, to) => (from === to ? 'está llorando.' : 'está llorando por'),
  happy: (from, to) => (from === to ? 'está feliz.' : 'está feliz con'),
  coffee: (from, to) => (from === to ? 'está tomando café.' : 'está tomando café con'),
  clap: (from, to) => (from === to ? 'está aplaudiendo por algo.' : 'está aplaudiendo por'),
  dance: (from, to) => (from === to ? 'está bailando.' : 'está bailando con'),
  cuddle: (from, to, genero) => from === to ? `se acurrucó ${genero === 'Hombre' ? 'solo' : genero === 'Mujer' ? 'sola' : 'solx'}.` : 'se acurrucó con',
  drunk: (from, to, genero) => from === to ? `está demasiado ${genero === 'Hombre' ? 'borracho' : genero === 'Mujer' ? 'borracha' : 'borrachx'}` : `está ${genero === 'Hombre' ? 'borracho' : genero === 'Mujer' ? 'borracha' : 'borrachx'} con`,
  handhold: (from, to, genero) => from === to ? `se dio la mano consigo ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'le agarró la mano a',
  eat: (from, to) => (from === to ? 'está comiendo algo delicioso.' : 'está comiendo con'),
  highfive: (from, to) => from === to ? 'se chocó los cinco frente al espejo.' : 'chocó los 5 con',
  hug: (from, to, genero) => from === to ? `se abrazó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'le dio un abrazo a',
  kill: (from, to) => (from === to ? 'se autoeliminó en modo dramático.' : 'asesinó a'),
  kiss: (from, to) => (from === to ? 'se mandó un beso al aire.' : 'le dio un beso a'),
  lick: (from, to) => (from === to ? 'se lamió por curiosidad.' : 'lamió a'),
  laugh: (from, to) => (from === to ? 'se está riendo de algo.' : 'se está burlando de'),
  pat: (from, to) => (from === to ? 'se acarició la cabeza con ternura.' : 'le dio una caricia a'),
  love: (from, to, genero) => from === to ? `se quiere mucho a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'}.` : 'siente atracción por',
  pout: (from, to, genero) => from === to ? `está haciendo pucheros ${genero === 'Hombre' ? 'solo' : genero === 'Mujer' ? 'sola' : 'solx'}.` : 'está haciendo pucheros con',
  punch: (from, to) => (from === to ? 'lanzó un puñetazo al aire.' : 'le dio un puñetazo a'),
  run: (from, to) => (from === to ? 'está corriendo por su vida.' : 'está corriendo con'),
  scared: (from, to, genero) => from === to ? `está ${genero === 'Hombre' ? 'asustado' : genero === 'Mujer' ? 'asustada' : 'asustxd'} por algo.` : `está ${genero === 'Hombre' ? 'asustado' : genero === 'Mujer' ? 'asustada' : 'asustxd'} por`,
  sad: (from, to) => (from === to ? `está triste` : `está expresando su tristeza a`),
  smoke: (from, to) => (from === to ? 'está fumando tranquilamente.' : 'está fumando con'),
  smile: (from, to) => (from === to ? 'está sonriendo.' : 'le sonrió a'),
  spit: (from, to, genero) => from === to ? `se escupió a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} por accidente.` : 'le escupió a',
  think: (from, to) => from === to ? 'está pensando profundamente.' : 'no puede dejar de pensar en',
  wave: (from, to, genero) => from === to ? `se saludó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} en el espejo.` : 'está saludando a',
  walk: (from, to) => (from === to ? 'salió a caminar en soledad.' : 'decidió dar un paseo con'),
  wink: (from, to, genero) => from === to ? `se guiñó a sí ${genero === 'Hombre' ? 'mismo' : genero === 'Mujer' ? 'misma' : 'mismx'} en el espejo.` : 'le guiñó a',
  facepalm: (from, to) => (from === to ? 'se dio un facepalm a sí mismo.' : 'le dio un facepalm a'),
  poke: (from, to) => (from === to ? 'se pokea a sí mismo.' : 'le dio un poke a'),
}

const symbols = ['(⁠◠⁠‿⁠◕⁠)', '˃͈◡˂͈', '૮(˶ᵔᵕᵔ˶)ა', '(づ｡◕‿‿◕｡)づ', '(✿◡‿◡)', '(꒪⌓꒪)', '(✿✪‿✪｡)', '(*≧ω≦)', '(✧ω◕)', '˃ 𖥦 ˂', '(⌒‿⌒)', '(¬‿¬)', '(✧ω✧)', '✿(◕ ‿◕)✿', 'ʕ•́ᴥ•̀ʔっ', '(ㅇㅅㅇ❀)', '(∩︵∩)', '(✪ω✪)', '(✯◕‿◕✯)', '(•̀ᴗ•́)و ̑̑']
function getRandomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)]
}

const alias = {
  angry: ['angry','enojado','enojada'],
  bleh: ['bleh'],
  bored: ['bored','aburrido','aburrida'],
  clap: ['clap','aplaudir'],
  coffee: ['coffee','cafe'],
  drunk: ['drunk'],
  eat: ['eat','nom','comer'],
  facepalm: ['facepalm'],
  laugh: ['laugh'],
  love: ['love','amor'],
  pout: ['pout','mueca'],
  punch: ['punch','golpear'],
  run: ['run','correr'],
  sad: ['sad','triste'],
  scared: ['scared','asustado'],
  seduce: ['seduce','seducir'],
  shy: ['shy','timido','timida'],
  sleep: ['sleep','dormir'],
  smoke: ['smoke','fumar'],
  spit: ['spit','escupir'],
  think: ['think','pensar'],
  walk: ['walk','caminar'],
  hug: ['hug','abrazar'],
  kill: ['kill','matar'],
  eat: ['eat','nom','comer'],
  kiss: ['kiss','muak','besar','blowkiss','besito'],
  wink: ['wink','guiñar'],
  pat: ['pat','acariciar'],
  happy: ['happy','feliz'],
  bullying: ['bullying','molestar'],
  bite: ['bite','morder'],
  blush: ['blush','sonrojarse'],
  wave: ['wave','saludar'],
  bath: ['bath','bañarse'],
  smile: ['smile','sonreir'],
  highfive: ['highfive','choca'],
  handhold: ['handhold','tomar'],
  cry: ['cry','llorar'],
  lick: ['lick','lamer'],
  slap: ['slap','bofetada'],
  dance: ['dance','bailar'],
  cuddle: ['cuddle','acurrucar'],
  poke: ['poke','tocar'],
};

export default {
command: [
  'cry','llorar','hug','abrazar','pat','palmear','acariciar','kill','matar','blush','ruborizarse','sonrojarse','kiss','besar','muak','blowkiss','besito','coffee','cafe','angry','enojado','enojada','sad','triste','happy','feliz','bored','aburrido','aburrida','scared','asustarse','asustado','shy','timido','timida','smile','sonreir','bath','bañarse','slap','bofetada','wave','saludar','drunk','borracho','borracha','eat','comer','nom','facepalm','love','amor','wink','guiñar','highfive','choca','spit','escupir','sleep','dormir','walk','caminar','bite','morder','run','correr','punch','golpear','smoke','fumar','dance','bailar','bleh','sacar la lengua','poke','tocar','clap','aplaudir','lick','lamer','pout','hacer pucheros','mueca','think','pensar','bullying','molestar','seduce','seducir','handhold','tomar de la mano','tomar','laugh','reir','cuddle','acurrucarse','acurrucar'
],
  category: 'anime',
  run: async (client, m, args, usedPrefix, command) => {
    const currentCommand = Object.keys(alias).find(key => alias[key].includes(command)) || command
    if (!captions[currentCommand]) return
    let mentionedJid = m.mentionedJid
    let who2 = mentionedJid.length > 0 ? mentionedJid[0] : (m.quoted ? m.quoted.sender : m.sender)
    const who = await resolveLidToRealJid(who2, client, m.chat)
    const fromName = global.db.data.users[m.sender]?.name || '@'+m.sender.split('@')[0]
    const toName = global.db.data.users[who]?.name || '@'+who.split('@')[0]
    const genero = global.db.data.users[m.sender]?.genre || 'Oculto'
    const captionText = captions[currentCommand](fromName, toName, genero)
    const caption = who !== m.sender ? `\`${fromName}.\` ${captionText} \`${toName}.\` ${getRandomSymbol()}.` : `\`${fromName}\` ${captionText} ${getRandomSymbol()}.`
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const response = await fetch(`https://api.alyacore.xyz/anime/interaction?type=${currentCommand}&key=${_0xanimeKey}`, { signal: controller.signal })
      const json = await response.json()
      clearTimeout(timeout)
      const videoUrl = json?.result
      if (!videoUrl) {
        return await m.reply(`💙 No se pudo obtener el video de la API. Inténtalo de nuevo más tarde.`);
      }
      await client.sendMessage(m.chat, { video: { url: videoUrl }, gifPlayback: true, caption, mentions: [who, m.sender] }, { quoted: m });
    } catch (e) {
    await m.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`)
    }
  },
};
