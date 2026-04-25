import path from 'path';
import fs from 'fs';

const RARITY_POWER = {
    'común': { min: 50, max: 150 },
    'rara': { min: 150, max: 300 },
    'épica': { min: 300, max: 500 },
    'ultra rara': { min: 500, max: 800 },
    'legendaria': { min: 800, max: 1200 }
};

const waifuList = [
    {
        name: "Ritsu chibi",
        rarity: "común",
        probability: 5,  
        img: "https://i.pinimg.com/474x/6a/40/42/6a4042784e3330a180743d6cef798521.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Ritmo Batería",
        skillDesc: "Ataque rápido con 25% más de daño"
    },
    {
        name: "Defoko Chibi",
        rarity: "común",
        probability: 5,  
        img: "https://files.catbox.moe/r951p2.png",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Voz Fuerte",
        skillDesc: "Ignora 10% de defensa enemiga"
    },
    {
        name: "Neru Chibi",
        rarity: "común",
        probability: 5,
        img: "https://files.catbox.moe/ht6aci.png",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Mensaje Rápido",
        skillDesc: "Ataque prioritario"
    },
    {
        name: "Haku Chibi",
        rarity: "común",
        probability: 5,
        img: "https://images.jammable.com/voices/yowane-haku-6GXWn/2341bc1d-9a5e-4419-8657-cb0cd6bbba40.png",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Melancolía",
        skillDesc: "Reduce poder enemigo 15%"
    },
    {
        name: "Rin Chibi",
        rarity: "común",
        probability: 5,
        img: "https://files.catbox.moe/2y6wre.png",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Doble Energía",
        skillDesc: "Dos ataques seguidos"
    },
    {
        name: "Teto Chibi",
        rarity: "común",
        probability: 5,
        img: "https://files.catbox.moe/h9m6ac.webp",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Grito Tsundere",
        skillDesc: "Ataque con daño extra 20%"
    },
    {
        name: "Gumi Chibi",
        rarity: "común",
        probability: 5,
        img: "https://i.pinimg.com/originals/84/20/37/84203775150673cf10084888b4f7d67f.png",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Pop Verde",
        skillDesc: "Curación 10 HP por ronda"
    },
    {
        name: "Emu Chibi",
        rarity: "común",
        probability: 5,
        img: "https://files.catbox.moe/nrchrb.webp",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Maravilla",
        skillDesc: "Aumenta poder allies 10%"
    },
    {
        name: "Len Chibi",
        rarity: "común",
        probability: 5,
        img: "https://files.catbox.moe/rxvuqq.png",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Espada Dorada",
        skillDesc: "Crítico +15%"
    },
    {
        name: "Luka Chibi",
        rarity: "común",
        probability: 5,
        img: "https://files.catbox.moe/5cyyis.png",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Voz Seductora",
        skillDesc: "Confunde enemigo 1 turno"
    },
    {
        name: "Sukone Chibi",
        rarity: "común",
        probability: 5,
        img: "https://i.pinimg.com/736x/bd/65/34/bd65347807569025f7196e1da753c252.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Celos",
        skillDesc: "Daño extra si enemigo es mujer"
    },
    {
        name: "Fuiro Chibi",
        rarity: "común",
        probability: 5,
        img: "https://i.pinimg.com/736x/ca/b5/a4/cab5a41cac30a455a70d1b80c89c662b.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Fuego Oscuro",
        skillDesc: "Quema 5 HP por ronda"
    },
    {
        name: "Hatsune Miku 2006",
        rarity: "rara",
        probability: 3,
        img: "https://i.pinimg.com/736x/ab/22/a9/ab22a9b92f94e77c46645ac78d16a01b.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Concierto Diva",
        skillDesc: "Aumenta poder 30% por 3 rondas"
    },
    {
        name: "Aoki Lapis 2006",
        rarity: "rara",
        probability: 3,
        img: "https://files.catbox.moe/5m2nw3.png",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Espada Azul",
        skillDesc: "Daño crítico +25%"
    },
    {
        name: "Momone momo 2006",
        rarity: "rara",
        probability: 3,
        img: "https://i.pinimg.com/736x/23/42/38/2342389710827674684269196ebabbb6.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Dulce Melodía",
        skillDesc: "Curación 20 HP"
    },
    {
        name: "Namine Ritsu 2006",
        rarity: "rara",
        probability: 3,
        img: "https://i.pinimg.com/736x/64/4d/7e/644d7e9ddff3461dee41850febf411c5.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Redoble Potente",
        skillDesc: "Ataque área 2 enemigos"
    },
    {
        name: "Defoko Utau",
        rarity: "rara",
        probability: 3,
        img: "https://files.catbox.moe/0ghewm.png",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Voz Poderosa",
        skillDesc: "Silencia enemigo 2 rondas"
    },
    {
        name: "Yowane Haku 2006",
        rarity: "rara",
        probability: 3,
        img: "https://i.pinimg.com/originals/13/5d/02/135d0231c953db4d8cd85cc42abdf7b2.png",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Tristeza Profunda",
        skillDesc: "Reduce poder enemigo 25%"
    },
    {
        name: "Akita Neru 2006",
        rarity: "rara",
        probability: 3,
        img: "https://files.catbox.moe/zia0tk.png",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Mensaje Furioso",
        skillDesc: "Ataque con 35% más daño"
    },
    {
        name: "Sukone Tei 2006",
        rarity: "rara",
        probability: 3,
        img: "https://i.pinimg.com/736x/67/1e/40/671e40a106af9b5e4cf1e14a212266a7.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Celos Intensos",
        skillDesc: "Daño doble si enemigo es mujer"
    },
    {
        name: "Gumi Megpoid 2006",
        rarity: "rara",
        probability: 3,
        img: "https://files.catbox.moe/ulvmhk.png",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Pop Evolucionado",
        skillDesc: "Curación 15 HP + boost poder"
    },
    {
        name: "Rin",
        rarity: "rara",
        probability: 3,
        img: "https://files.catbox.moe/wk4sh0.png",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Doble Ataque",
        skillDesc: "Ataca 2 veces seguidas"
    },
    {
        name: "Teto",
        rarity: "rara",
        probability: 3,
        img: "https://i.pinimg.com/736x/ff/1b/5e/ff1b5e2a8c30cedab77eb4490cea7b0e.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Grito Tsundere Plus",
        skillDesc: "Confunde + daño extra 30%"
    },
    {
        name: "Emu Otori",
        rarity: "rara",
        probability: 3,
        img: "https://files.catbox.moe/vphcvo.png",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Maravilla Increíble",
        skillDesc: "Aumenta poder allies 20%"
    },
    {
        name: "Len",
        rarity: "rara",
        probability: 3,
        img: "https://files.catbox.moe/x4du11.png",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Espada Legendaria",
        skillDesc: "Crítico +30% + daño extra"
    },
    {
        name: "Luka Megurine 2006",
        rarity: "rara",
        probability: 3,
        img: "https://i1.sndcdn.com/artworks-8ne47oeiNyxO90bm-LBx2Ng-t500x500.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Voz Hipnótica",
        skillDesc: "Controla enemigo 1 ronda"
    },
    {
        name: "Fuiro 2006",
        rarity: "rara",
        probability: 3,
        img: "https://gprw.s3.amazonaws.com/uploads/releases/614/image/lg-022f3cf7193976905295029c6bbfbe86.png",
        power: Math.floor(Math.random() * (RARITY_POWER['rara'].max - RARITY_POWER['rara'].min + 1)) + RARITY_POWER['rara'].min,
        skill: "Fuego Azul",
        skillDesc: "Quema 10 HP + reduce defensa"
    },
    {
        name: "💙Miku💙",
        rarity: "épica",
        probability: 1.5,
        img: "https://cdn.vietgame.asia/wp-content/uploads/20161116220419/hatsune-miku-project-diva-future-tone-se-ra-mat-o-phuong-tay-news.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Concierto Legendaria",
        skillDesc: "Aumenta poder 50% por 5 rondas"
    },
    {
        name: "💚Momo💗",
        rarity: "épica",
        probability: 1.5,
        img: "https://i.pinimg.com/736x/e7/8e/99/e78e995ea0bd0c4affd17c8d476c4c09.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Dulce Divino",
        skillDesc: "Curación completa 50 HP"
    },
    {
        name: "🩵Aoki Lapis🩵",
        rarity: "épica",
        probability: 1.5,
        img: "https://files.catbox.moe/gje6q7.png",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Espada Celestial",
        skillDesc: "Daño crítico +40% + ignora defensa"
    },
    {
        name: "❤Sukone🤍",
        rarity: "épica",
        probability: 1.5,
        img: "https://i1.sndcdn.com/artworks-000147734539-c348up-t1080x1080.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Celos Divinos",
        skillDesc: "Daño triple si enemigo es mujer"
    },
    {
        name: "💜Defoko Utane💜",
        rarity: "épica",
        probability: 1.5,
        img: "https://files.catbox.moe/eb1jy3.png",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Voz Angelical",
        skillDesc: "Silencia enemigo 3 rondas + curación"
    },
    {
        name: "❤Ritsu🖤",
        rarity: "épica",
        probability: 1.5,
        img: "https://i1.sndcdn.com/artworks-000033453125-njjsvn-t1080x1080.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Redoble Divino",
        skillDesc: "Ataque área todos los enemigos"
    },
    {
        name: "💛Neru💛",
        rarity: "épica",
        probability: 1.5,
        img: "https://images3.alphacoders.com/768/768095.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Mensaje Divino",
        skillDesc: "Ataque con 50% más daño + petrificación"
    },
    {
        name: "🍺Haku🍺",
        rarity: "épica",
        probability: 1.5,
        img: "https://prodigits.co.uk/thumbs/wallpapers/p2/anime/12/681ab84912482088.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Melancolía Divina",
        skillDesc: "Reduce poder enemigo 40% + drena vida"
    },
    {
        name: "💛Rin💛",
        rarity: "épica",
        probability: 1.5,
        img: "https://images5.alphacoders.com/330/330144.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Triple Energía",
        skillDesc: "Ataca 3 veces seguidas"
    },
    {
        name: "💚Gumi💚",
        rarity: "épica",
        probability: 1.5,
        img: "https://files.catbox.moe/hpalur.png",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Pop Divino",
        skillDesc: "Curación 30 HP + invulnerabilidad 1 ronda"
    },
    {
        name: "❤Teto❤",
        rarity: "épica",
        probability: 1.5,
        img: "https://files.catbox.moe/k5w0ea.png",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Grito Divino",
        skillDesc: "Confunde + daño extra 50% + miedo"
    },
    {
        name: "💗Emu💗",
        rarity: "épica",
        probability: 1.5,
        img: "https://files.catbox.moe/sygb0h.png",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Maravilla Divina",
        skillDesc: "Aumenta poder allies 40% + curación grupo"
    },
    {
        name: "🍌 Len 🍌",
        rarity: "épica",
        probability: 1.5,
        img: "https://i.pinimg.com/236x/3a/af/e5/3aafe5d43f983f083440fb5ab9d9f3d8.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Espada Sagrada",
        skillDesc: "Crítico +50% + daño absoluto"
    },
    {
        name: "💗LUKA🪷",
        rarity: "épica",
        probability: 1.5,
        img: "https://files.catbox.moe/bp2wrg.webp",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Voz Divina",
        skillDesc: "Controla enemigo 2 rondas + drena poder"
    },
    {
        name: "🖤FUIRO🖤",
        rarity: "épica",
        probability: 1.5,
        img: "https://media.tenor.com/-zHmFGOc-rkAAAAe/fuiro-vocaloid.png",
        power: Math.floor(Math.random() * (RARITY_POWER['épica'].max - RARITY_POWER['épica'].min + 1)) + RARITY_POWER['épica'].min,
        skill: "Fuego Divino",
        skillDesc: "Quema 20 HP + reduce defensa 50%"
    },
    {
        name: "💙HATSUNE MIKU💙",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://files.catbox.moe/881c3b.png",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Concierto Mítico",
        skillDesc: "Aumenta poder 80% por 7 rondas + invulnerabilidad"
    },
    {
        name: "💚Momone Momo💗",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://i.ytimg.com/vi/SinNL35NUuc/maxresdefault.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Dulce Mítico",
        skillDesc: "Curación completa 100 HP + revive allies"
    },
    {
        name: "🩵Aoki Lapis🩵",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://c4.wallpaperflare.com/wallpaper/737/427/729/vocaloid-aoki-lapis-sword-blue-hair-wallpaper-preview.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Espada Mítica",
        skillDesc: "Daño crítico +60% + instakill 10%"
    },
    {
        name: "🖤Namine Ritsu💞",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://images.gamebanana.com/img/ss/mods/668cabe0bcbff.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Redoble Mítico",
        skillDesc: "Ataque área + parálisis 3 rondas"
    },
    {
        name: "🍻Yowane Haku🥂",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://files.catbox.moe/fk14cc.png",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Melancolía Mítica",
        skillDesc: "Reduce poder enemigo 60% + drena todo"
    },
    {
        name: "🤍Sukone Tei💘",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://i.ytimg.com/vi/dxvU8lowsbg/maxresdefault.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Celos Míticos",
        skillDesc: "Daño cuádruple si enemigo es mujer"
    },
    {
        name: "💜Utane Defoko💜",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://i.pinimg.com/236x/4a/c8/aa/4ac8aa5c5fc1fc5ce83ef0fb71952e14.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Voz Mítica",
        skillDesc: "Silencia enemigo 5 rondas + curación grupo"
    },
    {
        name: "💛AKITA NERU💛",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://i.pinimg.com/736x/89/3a/4b/893a4b5c6d7e8f9a0b1c2d3e4f5a6b7c.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Mensaje Mítico",
        skillDesc: "Ataque absoluto + petrificación permanente"
    },
    {
        name: "💙Hatsune Miku💙",
        rarity: "legendaria",
        probability: 0.167,
        img: "https://files.catbox.moe/70548q.png",
        power: Math.floor(Math.random() * (RARITY_POWER['legendaria'].max - RARITY_POWER['legendaria'].min + 1)) + RARITY_POWER['legendaria'].min,
        skill: "Cantante Divina",
        skillDesc: "Curación masiva + boost ataque 50% + invocación allies"
    },
    {
        name: "🖤Megurine Luka🖤",
        rarity: "legendaria",
        probability: 0.167,
        img: "https://files.catbox.moe/ucarkl.png",
        power: Math.floor(Math.random() * (RARITY_POWER['legendaria'].max - RARITY_POWER['legendaria'].min + 1)) + RARITY_POWER['legendaria'].min,
        skill: "Voz Profunda",
        skillDesc: "Daño área + silencia enemigos + defensa allies"
    },
    {
        name: "🧡Kagamine Rin🧡",
        rarity: "legendaria",
        probability: 0.167,
        img: "https://i.pinimg.com/736x/9a/7e/4e/9a7e4e6c3b8f2d1a5c4e3f2b1a9e8d7c.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['legendaria'].max - RARITY_POWER['legendaria'].min + 1)) + RARITY_POWER['legendaria'].min,
        skill: "Fuego Veloz",
        skillDesc: "Ataque crítico + velocidad + burn enemigos"
    },
    {
        name: "💛Kagamine Len💛",
        rarity: "legendaria",
        probability: 0.167,
        img: "https://i.pinimg.com/736x/8b/2f/1a/8b2f1a7c6d5e4f3b2a1c9d8e7f6a5b4c.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['legendaria'].max - RARITY_POWER['legendaria'].min + 1)) + RARITY_POWER['legendaria'].min,
        skill: "Rayo Dorado",
        skillDesc: "Daño eléctrico + parálisis + counter attack"
    },
    {
        name: "💚Kaito💚",
        rarity: "legendaria",
        probability: 0.167,
        img: "https://i.pinimg.com/736x/5c/4e/3d/5c4e3d2b1a9f8e7d6c5b4a3f2e1d0c9.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['legendaria'].max - RARITY_POWER['legendaria'].min + 1)) + RARITY_POWER['legendaria'].min,
        skill: "Hielo Eterno",
        skillDesc: "Congela enemigos + daño continuo + shield allies"
    },
    {
        name: "❤️🩷VOCALOIDS💛💙",
        rarity: "legendaria",
        probability: 0.167,
        img: "https://files.catbox.moe/g6kfb6.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['legendaria'].max - RARITY_POWER['legendaria'].min + 1)) + RARITY_POWER['legendaria'].min,
        skill: "Armonía Perfecta",
        skillDesc: "Curación completa + boost allies 100% + invulnerabilidad grupo"
    },
    {
        name: "💢💥BORDERLANDS☢⚠",
        rarity: "legendaria",
        probability: 0.167,
        img: "https://pixelz.cc/wp-content/uploads/2019/05/borderlands-3-super-deluxe-edition-uhd-4k-wallpaper.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['legendaria'].max - RARITY_POWER['legendaria'].min + 1)) + RARITY_POWER['legendaria'].min,
        skill: "Caos Total",
        skillDesc: "Daño absoluto + destrucción + reset enemigo"
    },
    {
        name: "🌌HALO⚕️",
        rarity: "legendaria",
        probability: 0.167,
        img: "https://c4.wallpaperflare.com/wallpaper/752/1001/122/halo-master-chief-hd-wallpaper-preview.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['legendaria'].max - RARITY_POWER['legendaria'].min + 1)) + RARITY_POWER['legendaria'].min,
        skill: "Poder Divino",
        skillDesc: "Inmunidad total + daño absoluto + control del tiempo"
    }
];

const gallerySessions = new Map();

let handler = async (client, m, args, usedPrefix, command) => {
    const userId = m.sender;
    const sessionId = `${userId}_${m.chat}`;
    
    if (!global.db.data) global.db.data = {}
    if (!global.db.data.users) global.db.data.users = {}
    if (!global.db.data.users[userId]) global.db.data.users[userId] = {}
    const user = global.db.data.users[userId]
    if (!user.waifu) user.waifu = { characters: [], pending: null, cooldown: 0 }
    if (!Array.isArray(user.waifu.characters)) user.waifu.characters = []

    if (user.waifu.characters.length === 0) {
        return m.reply(`🎨 *GALERÍA VACÍA* 🎨\n\n` +
            `💙 No tienes personajes en tu colección.\n\n` +
            `💡 Usa *.rw* para invocar tu primer personaje.`);
    }

    const userCharacters = user.waifu.characters;
    
    let index = 0;
    if (args[0] && !isNaN(args[0])) {
        index = parseInt(args[0]) - 1;
        if (index < 0) index = 0;
        if (index >= userCharacters.length) index = userCharacters.length - 1;
    }

    const waifu = userCharacters[index];
    
    const rarityColors = {
        'común': '⚪',
        'rara': '🔵',
        'épica': '🟣',
        'ultra rara': '🟡',
        'legendaria': '🔴'
    };

    const emoji = rarityColors[waifu.rarity] || '💙';

    let message = `🎨 *MI COLECCIÓN* 🎨\n\n`;
    message += `${emoji} *${waifu.name}*\n`;
    message += `💎 *Rareza:* ${waifu.rarity.toUpperCase()}\n`;
    message += `⚡ *Poder:* ${waifu.power}\n`;
    message += `🎯 *Habilidad:* ${waifu.skill}\n`;
    message += `📜 *Descripción:* ${waifu.skillDesc}\n\n`;
    message += `📖 Personaje ${index + 1} de ${userCharacters.length}\n`;
    message += `📊 Total en colección: ${userCharacters.length}\n\n`;
    message += `💡 Usa los botones para navegar`;

    const buttons = [
        ['⬅️ Anterior', `gallery_prev_${sessionId}`],
        ['➡️ Siguiente', `gallery_next_${sessionId}`],
        ['🎲 Invocar', '.rw']
    ];

    const sent = await client.sendButton(
        m.chat,
        message,
        '🎮 Mi Colección - Hatsune Miku Bot',
        waifu.img,
        buttons,
        null,
        null,
        m
    );

    gallerySessions.set(sessionId, {
        index,
        messageId: sent?.key?.id,
        chat: m.chat,
        userId,
        characters: userCharacters
    });
};

handler.before = async function (m, { conn, client }) {
    if (!m || !m.message) return false;

    let buttonId = m.body || m.text || null;

    try {
        if (m.message?.templateButtonReplyMessage?.selectedId) {
            buttonId = m.message.templateButtonReplyMessage.selectedId;
        }
        if (m.message?.buttonsResponseMessage?.selectedButtonId) {
            buttonId = m.message.buttonsResponseMessage.selectedButtonId;
        }
        if (m.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
            buttonId = m.message.listResponseMessage.singleSelectReply.selectedRowId;
        }
        if (m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try {
                const paramsJson = m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson;
                if (paramsJson) {
                    const params = JSON.parse(paramsJson);
                    if (params && params.id) {
                        buttonId = params.id;
                    }
                }
            } catch (e) {}
        }
    } catch (e) {
        return false;
    }

    if (!buttonId || (!buttonId.startsWith('gallery_prev_') && !buttonId.startsWith('gallery_next_'))) {
        return false;
    }

    const sessionId = buttonId.split('_').slice(2).join('_');
    const session = gallerySessions.get(sessionId);

    if (!session) {
        await m.reply('❌ Sesión de galería expirada. Usa *.gallery* nuevamente.');
        return true;
    }

    if (m.sender !== session.userId) {
        await m.reply('❌ Esta galería no es tuya.');
        return true;
    }

    const action = buttonId.startsWith('gallery_prev_') ? 'prev' : 'next';
    let newIndex = session.index;
    const userCharacters = session.characters || [];

    if (action === 'prev') {
        newIndex = session.index - 1;
        if (newIndex < 0) newIndex = userCharacters.length - 1;
    } else {
        newIndex = session.index + 1;
        if (newIndex >= userCharacters.length) newIndex = 0;
    }

    const waifu = userCharacters[newIndex];
    
    const rarityColors = {
        'común': '⚪',
        'rara': '🔵',
        'épica': '🟣',
        'ultra rara': '🟡',
        'legendaria': '🔴'
    };

    const emoji = rarityColors[waifu.rarity] || '💙';

    let message = `🎨 *MI COLECCIÓN* 🎨\n\n`;
    message += `${emoji} *${waifu.name}*\n`;
    message += `💎 *Rareza:* ${waifu.rarity.toUpperCase()}\n`;
    message += `⚡ *Poder:* ${waifu.power}\n`;
    message += `🎯 *Habilidad:* ${waifu.skill}\n`;
    message += `📜 *Descripción:* ${waifu.skillDesc}\n\n`;
    message += `📖 Personaje ${newIndex + 1} de ${userCharacters.length}\n`;
    message += `📊 Total en colección: ${userCharacters.length}\n\n`;
    message += `💡 Usa los botones para navegar`;

    const buttons = [
        ['⬅️ Anterior', `gallery_prev_${sessionId}`],
        ['➡️ Siguiente', `gallery_next_${sessionId}`],
        ['🎲 Invocar', '.rw']
    ];

    const clientToUse = client || conn;
    const sent = await clientToUse.sendButton(
        m.chat,
        message,
        '🎮 Galería - Hatsune Miku Bot',
        waifu.img,
        buttons,
        null,
        null,
        m
    );

    gallerySessions.set(sessionId, {
        index: newIndex,
        messageId: sent?.key?.id,
        chat: m.chat,
        userId: session.userId,
        characters: userCharacters
    });

    return true;
};

export default {
    command: ['gallery', 'galeria', 'waifus', 'personajes'],
    category: 'gacha',
    run: handler
};
