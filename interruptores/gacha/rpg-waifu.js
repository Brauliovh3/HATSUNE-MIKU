import { promises as fs } from 'fs';
import fs_sync from 'fs';
import path from 'path';
import { instantiateWaifu, formatPvpLine } from '../../nucleo/gacha/waifuPvp.js'
import imageCache from '../../nucleo/system/imageCache.js'

const dbPath = path.join(process.cwd(), 'src', 'database');
const databaseFilePath = path.join(dbPath, 'waifudatabase.json');

const SELL_PRICES = {
    'común': 10,
    'rara': 50,
    'épica': 100,
    'ultra rara': 200,
    'legendaria': 500
};


const RARITY_POWER = {
    'común': { min: 50, max: 150 },
    'rara': { min: 150, max: 300 },
    'épica': { min: 300, max: 500 },
    'ultra rara': { min: 500, max: 800 },
    'legendaria': { min: 800, max: 1200 }
};

function loadDatabase() {
    try {
        if (!fs_sync.existsSync(dbPath)) {
            fs_sync.mkdirSync(dbPath, { recursive: true });
        }
        if (!fs_sync.existsSync(databaseFilePath)) {
            const data = { users: {} };
            fs_sync.writeFileSync(databaseFilePath, JSON.stringify(data, null, 2));
            return data;
        }
        const data = JSON.parse(fs_sync.readFileSync(databaseFilePath, 'utf-8'));
        return data;
    } catch (error) {
        console.error('Error DB:', error);
        return { users: {} };
    }
}

function saveDatabase(data) {
    try {
        fs_sync.writeFile(databaseFilePath, JSON.stringify(data, null, 2), () => {})
        return true
    } catch { return false }
}

global.db = global.db || {};
global.db.data = global.db.data || {};
global.db.data.users = global.db.data.users || {};

if (!global.waifuDBLoaded) {
    try {
        const fileData = loadDatabase();
        if (fileData && fileData.users) {
            for (const uid of Object.keys(fileData.users)) {
                if (!global.db.data.users[uid]) global.db.data.users[uid] = fileData.users[uid];
            }
        }
        global.waifuDBLoaded = true;
        console.log('💙 Waifu database loaded');
    } catch (e) { 
        console.error('Error loading waifu DB:', e);
    }
}


const waifuList = [
   
    {
        name: "Hatsune Chibi",
        rarity: "común",
        probability: 5,  
        img: "https://i.pinimg.com/originals/21/68/0a/21680a7aeec369f1428daaa82a054eac.png",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Canto Melódico",
        skillDesc: "Aumenta el poder en 20%"
    },
    {
        name: "Aoki Chibi",
        rarity: "común",
        probability: 5,  
        img: "https://files.catbox.moe/ds1rt5.png",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Escudo Azul",
        skillDesc: "Reduce daño recibido en 15%"
    },
    {
        name: "Momo Chibi",
        rarity: "común",
        probability: 5,  
        img: "https://i.pinimg.com/736x/89/85/bf/8985bf3fefe2bf09fbd5602bf325285b.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['común'].max - RARITY_POWER['común'].min + 1)) + RARITY_POWER['común'].min,
        skill: "Dulce Sombra",
        skillDesc: "Ciega al oponente por 1 turno"
    },
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
        img: "https://files.catbox.moe/agw1y1.png",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Mensaje Mítico",
        skillDesc: "Ataque con 80% más daño + muerte instantánea"
    },
    {
        name: "💗EMU OTORI💗",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://files.catbox.moe/ekzntn.png",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Maravilla Mítica",
        skillDesc: "Aumenta poder allies 60% + invulnerabilidad grupo"
    },
    {
        name: "💚Megpoid Gumi💚",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://files.catbox.moe/opn7vz.png",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Pop Mítico",
        skillDesc: "Curación 50 HP + invulnerabilidad 2 rondas + revive"
    },
    {
        name: "❤KASANE TETO❤",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://files.catbox.moe/6j9jgl.webp",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Grito Mítico",
        skillDesc: "Confunde + daño extra 80% + miedo absoluto"
    },
    {
        name: "💛KAGAMINE RIN💛",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://files.catbox.moe/lh5sxn.png",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Cuádruple Energía",
        skillDesc: "Ataca 4 veces seguidas + daño crítico"
    },
    {
        name: "💥KAGAMINE LEN💢",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://files.catbox.moe/awuecy.png",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Espada Mítica",
        skillDesc: "Crítico +70% + daño absoluto + instakill"
    },
    {
        name: "💗MEGUMIRE LUKA💮",
        rarity: "ultra rara",
        probability: 0.4,
        img: "https://files.catbox.moe/jodjln.png",
        power: Math.floor(Math.random() * (RARITY_POWER['ultra rara'].max - RARITY_POWER['ultra rara'].min + 1)) + RARITY_POWER['ultra rara'].min,
        skill: "Voz Mítica",
        skillDesc: "Controla enemigo 3 rondas + drena poder + curación"
    },
    
    
    {
        name: "💙Brazilian Miku💛",
        rarity: "legendaria",
        probability: 0.167,
        img: "https://files.catbox.moe/ifl773.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['legendaria'].max - RARITY_POWER['legendaria'].min + 1)) + RARITY_POWER['legendaria'].min,
        skill: "Concierto Legendario",
        skillDesc: "Aumenta poder 100% + invulnerabilidad permanente"
    },
    {
        name: "🖤Inabakumori🖤",
        rarity: "legendaria",
        probability: 0.167,
        img: "https://i.ytimg.com/vi/4bzEgrvU1lA/maxresdefault.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['legendaria'].max - RARITY_POWER['legendaria'].min + 1)) + RARITY_POWER['legendaria'].min,
        skill: "Melancolía Legendaria",
        skillDesc: "Reduce poder enemigo 80% + drena vida + control total"
    },
    {
        name: "❤KASANE TETO❤",
        rarity: "legendaria",
        probability: 0.167,
        img: "https://files.catbox.moe/3cb73f.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['legendaria'].max - RARITY_POWER['legendaria'].min + 1)) + RARITY_POWER['legendaria'].min,
        skill: "Grito Legendario",
        skillDesc: "Daño absoluto + muerte instantánea + revive allies"
    },
    {
        name: "☢️Cyberpunk Edgeruners💫",
        rarity: "legendaria",
        probability: 0.167,
        img: "https://i.pinimg.com/736x/41/20/97/4120973c715fbcaa8baeb348e7610b5d.jpg",
        power: Math.floor(Math.random() * (RARITY_POWER['legendaria'].max - RARITY_POWER['legendaria'].min + 1)) + RARITY_POWER['legendaria'].min,
        skill: "Tecnología Futurista",
        skillDesc: "Ataque área + parálisis permanente + hackeo"
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



const totalProbability = waifuList.reduce((sum, waifu) => sum + waifu.probability, 0);


const cumulativeProbabilities = [];
let accumulated = 0;
for (const waifu of waifuList) {
    accumulated += waifu.probability;
    cumulativeProbabilities.push({ waifu, threshold: accumulated });
}

const _rwInFlight = new Set()

let handler = async (client, m) => {
    const userId = m.sender;
    if (!userId) return m.reply('❌ Error: No se pudo identificar tu usuario.')
    if (_rwInFlight.has(userId)) return
    _rwInFlight.add(userId)
    const currentTime = Date.now();

    try {
    if (!global.db.data) global.db.data = {}
    if (!global.db.data.users) global.db.data.users = {}
    if (!global.db.data.users[userId]) global.db.data.users[userId] = {}
    const user = global.db.data.users[userId]
    if (!user.waifu) user.waifu = { characters: [], pending: null, cooldown: 0 }
    if (!Array.isArray(user.waifu.characters)) user.waifu.characters = []

    if (user.waifu.cooldown) {
        const timeDiff = currentTime - user.waifu.cooldown;
        if (timeDiff < 900000) {
            const remainingTime = 900000 - timeDiff;
            const minutes = Math.floor(remainingTime / 60000);
            const seconds = Math.floor((remainingTime % 60000) / 1000);
            return m.reply(`⏰ Debes esperar ${minutes}m ${seconds}s para volver a usar este comando.`);
        }
    }

   
    const roll = Math.random() * totalProbability;
    let selectedWaifu = null;
    
    for (const { waifu, threshold } of cumulativeProbabilities) {
        if (roll <= threshold) {
            selectedWaifu = waifu;
            break;
        }
    }
    
    if (!selectedWaifu) {
        selectedWaifu = waifuList[waifuList.length - 1];
    }
    
    selectedWaifu = instantiateWaifu(selectedWaifu, RARITY_POWER)

    const rarityColors = {
        'común': '⚪',
        'rara': '🔵',
        'épica': '🟣',
        'ultra rara': '🟡',
        'legendaria': '🔴'
    };

    const rarityProbs = {
        'común': '50%',
        'rara': '30%',
        'épica': '15%',
        'ultra rara': '4%',
        'legendaria': '1%'
    };


    const sellPrice = SELL_PRICES[selectedWaifu.rarity] || 10;

    let message = `🎲 WAIFU GACHA 🎲\n\n`;
    message += `👤 Invocador: @${userId.split('@')[0]}\n`;
    message += `${rarityColors[selectedWaifu.rarity]} Rareza: ${selectedWaifu.rarity.toUpperCase()} (${rarityProbs[selectedWaifu.rarity]})\n`;
    message += `⚡ Poder: ${selectedWaifu.power || 100}\n`;
    message += `🎯 Habilidad: ${selectedWaifu.skill || 'Básica'}\n`;
    message += formatPvpLine(selectedWaifu)
    message += `💫 ¡Felicidades! Obtuviste a:\n`;
    message += `💙 ${selectedWaifu.name}\n\n`;
    message += `💡 ¿Qué deseas hacer con este personaje?\n`;
    message += `⚠️ Si falla el botón, usa *.c* para reclamar o *.v* para vender.`;

    const buttons = [
        ['💚 Reclamar Personaje', `waifu_claim_${userId.split('@')[0]}`],
        [`💰 Vender por ${sellPrice} cebollines`, `waifu_sell_${userId.split('@')[0]}`]
    ];

    const sent = await client.sendButton(
        m.chat,
        message,
        '🎮 Sistema de Personajes - Hatsune Miku Bot',
        selectedWaifu.img,
        buttons,
        null,
        null,
        m
    );

    user.waifu.cooldown = currentTime
    user.waifu.pending = {
        ...selectedWaifu,
        owner: userId,
        chat: m.chat,
        messageId: sent?.key?.id || null,
        createdAt: new Date().toISOString(),
    }
    } finally {
        _rwInFlight.delete(userId)
    }
}

export default {
    command: ['rw', 'rollwaifu', 'gacha', 'c', 'v', 'reclamarwaifu', 'venderwaifu'],
    category: 'gacha',
    run: async (client, m, args, usedPrefix, command) => {
        const cmd = String(command || '').toLowerCase();
        if (cmd === 'c' || cmd === 'reclamarwaifu') {
            return reclamarWaifuHandler(m, { conn: client });
        }
        if (cmd === 'v' || cmd === 'venderwaifu') {
            return venderWaifuHandler(m, { conn: client });
        }
        return handler(client, m);
    }
};

handler.before = async function (m, { conn, client }) {
    if (!m || !m.message) return false;

    if (m.isGroup) {
        const chat = global.db?.data?.chats?.[m.chat] || {};
        const primaryBot = chat?.primaryBot;
        if (primaryBot) {
            const currentClient = client || conn;
            if (!currentClient?.user) return false;
            const candidates = [
                currentClient?.user?.id,
                currentClient?.user?.jid,
                currentClient?.user?.lid,
            ]
                .map((x) => String(x || '').split('@')[0].split(':')[0].replace(/\D/g, ''))
                .filter(Boolean);
            const primaryDigits = String(primaryBot || '').split('@')[0].split(':')[0].replace(/\D/g, '');
            if (primaryDigits && !candidates.includes(primaryDigits)) {
                return false;
            }
        }
    }

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

    if (!buttonId || (!buttonId.startsWith('waifu_claim_') && !buttonId.startsWith('waifu_sell_'))) {
        return false;
    }
    let userId;
    try {
        const parts = buttonId.split('_');
        if (parts.length >= 3) {
            const userPart = parts.slice(2).join('_');
            userId = userPart + '@s.whatsapp.net';
        } else {
            return false;
        }
    } catch (e) {
        return false;
    }

    if (!userId) {
        return false;
    }

    if (m.sender !== userId) {
        await m.reply('❌ Este personaje no es tuyo. No puedes reclamarlo.');
        return true;
    }

    const clientToUse = client || conn;
    let userName = global.db.data.users?.[userId]?.name || userId.split('@')[0]

    if (!global.db.data) global.db.data = {}
    if (!global.db.data.users) global.db.data.users = {}
    if (!global.db.data.users[userId]) global.db.data.users[userId] = {}
    const user = global.db.data.users[userId]
    if (!user.waifu) user.waifu = { characters: [], pending: null, cooldown: 0 }
    if (!Array.isArray(user.waifu.characters)) user.waifu.characters = []

    if (!user.waifu.pending) {
        await m.reply('❌ No tienes ningún personaje disponible para reclamar.\n\n💡 Usa *.rw* para obtener un nuevo personaje.');
        return true;
    }


    if (m.quoted && user.waifu.pending?.messageId && user.waifu.pending?.chat) {
        const quotedId = m.quoted?.id
        const sameChat = user.waifu.pending.chat === m.chat
        if (sameChat && quotedId && quotedId !== user.waifu.pending.messageId) {
            return await m.reply('💙 Responde al mensaje del personaje que obtuviste para poder reclamarlo.');
        }
    }

    const currentWaifu = user.waifu.pending;
    const action = buttonId.startsWith('waifu_claim_') ? 'claim' : 'sell';

    try {
        if (action === 'claim') {
            const exists = user.waifu.characters.find(
                char => char.name === currentWaifu.name && char.rarity === currentWaifu.rarity
            );

            if (exists) {
                user.waifu.pending = null
                await m.reply(`💙 Ya tienes a *${currentWaifu.name}* (${currentWaifu.rarity}) en tu colección.\n\n🔍 Usa *.miwaifu* o *.col* para ver todas tus waifus guardadas.`);
                return true;
            }

            user.waifu.characters.push({
                name: currentWaifu.name,
                rarity: currentWaifu.rarity,
                power: currentWaifu.power,
                skill: currentWaifu.skill,
                skillDesc: currentWaifu.skillDesc,
                pvp: currentWaifu.pvp || null,
                obtainedAt: new Date().toISOString(),
                obtainedFrom: 'rw'
            });

            user.waifu.pending = null
            
            try { 
                saveDatabase({ users: global.db.data.users }) 
            } catch (e) { 
                console.error('Error saving waifu DB (claim):', e) 
            }

            const rarityColors = {
                'común': '⚪',
                'rara': '🔵',
                'épica': '🟣',
                'ultra rara': '🟡',
                'legendaria': '🔴'
            };

            const emoji = rarityColors[currentWaifu.rarity] || '💙';

            let msg = `✅ ¡PERSONAJE RECLAMADO! ✅\n\n`;
            msg += `${emoji} *${currentWaifu.name}*\n`;
            msg += `💎 *${currentWaifu.rarity.toUpperCase()}*\n`;
            msg += `👤 ${userName}\n`;
            msg += `📊 Total: *${user.waifu.characters.length}* personajes\n\n`;
            msg += `🔍 Usa *.miwaifu* para ver tu colección completa\n`;

            await client.sendButton(
                m.chat,
                msg,
                '🎮 Sistema de Personajes - Hatsune Miku Bot',
                currentWaifu.img,
                [['🏠 Menú', '.menu']],
                null,
                null,
                m
            );
            return true;

        } else if (action === 'sell') {
            const sellPrice = SELL_PRICES[currentWaifu.rarity] || 10;

            if (!user.coin) user.coin = 0
            user.coin += sellPrice

            user.waifu.pending = null
            
            try { 
                saveDatabase({ users: global.db.data.users }) 
            } catch (e) { 
                console.error('Error saving waifu DB (sell):', e) 
            }

            const rarityColors = {
                'común': '⚪',
                'rara': '🔵',
                'épica': '🟣',
                'ultra rara': '🟡',
                'legendaria': '🔴'
            };

            const emoji = rarityColors[currentWaifu.rarity] || '💙';

            let msg = `💰 ¡PERSONAJE VENDIDO! 💰\n\n`;
            msg += `${emoji} *${currentWaifu.name}*\n`;
            msg += `💎 *${currentWaifu.rarity.toUpperCase()}*\n`;
            msg += `💵 *Recibiste:* ${sellPrice} cebollines\n`;
            msg += `💳 *Total cebollines:* ${user.coin}\n\n`;
            msg += `🏪 Usa *.tienda* para gastar tus cebollines`;

            await client.sendButton(
                m.chat,
                msg,
                '🎮 Sistema de Personajes - Hatsune Miku Bot',
                currentWaifu.img,
                [['🏠 Menú', '.menu']],
                null,
                null,
                m
            );
            return true;
        }

    } catch (error) {
        console.error('Error en waifu button handler:', error);
        await m.reply(`❌ Error al procesar: ${error.message}`);
        return true;
    }

    return false;
}




let reclamarWaifuHandler = async (m, { conn }) => {
    const userId = m.sender;
    
    if (!global.db.data) global.db.data = {}
    if (!global.db.data.users) global.db.data.users = {}
    if (!global.db.data.users[userId]) global.db.data.users[userId] = {}
    const user = global.db.data.users[userId]
    if (!user.waifu) user.waifu = { characters: [], pending: null, cooldown: 0 }
    if (!Array.isArray(user.waifu.characters)) user.waifu.characters = []

    if (!user.waifu.pending) {
        return await m.reply('❌ No tienes ningún personaje disponible para reclamar.\n\n💡 Usa *.rw* para obtener un nuevo personaje.');
    }

    const currentWaifu = user.waifu.pending;
    
    
    const exists = user.waifu.characters.find(
        char => char.name === currentWaifu.name && char.rarity === currentWaifu.rarity
    );

    if (exists) {
        user.waifu.pending = null
        return await m.reply(`💙 Ya tienes a *${currentWaifu.name}* (${currentWaifu.rarity}) en tu colección.\n\n🔍 Usa *.miwaifu* para ver todas tus waifus guardadas.`);
    }

    
    user.waifu.characters.push({
        name: currentWaifu.name,
        rarity: currentWaifu.rarity,
        power: currentWaifu.power,
        skill: currentWaifu.skill,
        skillDesc: currentWaifu.skillDesc,
        pvp: currentWaifu.pvp || null,
        obtainedAt: new Date().toISOString(),
        obtainedFrom: 'rw'
    });

    user.waifu.pending = null
    
    try { 
        saveDatabase({ users: global.db.data.users }) 
            } catch (e) { 
        console.error('Error saving waifu DB (alt claim):', e) 
    }

    const rarityColors = {
        'común': '⚪',
        'rara': '🔵',
        'épica': '🟣',
        'ultra rara': '🟡',
        'legendaria': '🔴'
    };

    const emoji = rarityColors[currentWaifu.rarity] || '💙';

    let msg = `✅ ¡PERSONAJE RECLAMADO! ✅\n\n`;
    msg += `${emoji} *${currentWaifu.name}*\n`;
    msg += `💎 *${currentWaifu.rarity.toUpperCase()}*\n`;
    msg += `📊 Total: *${user.waifu.characters.length}* personajes\n\n`;
    msg += `🔍 Usa *.harem* para ver tu colección completa`;
    
    return await m.reply(msg);
};

let venderWaifuHandler = async (m, { conn }) => {
    const userId = m.sender;
    
    if (!global.db.data) global.db.data = {}
    if (!global.db.data.users) global.db.data.users = {}
    if (!global.db.data.users[userId]) global.db.data.users[userId] = {}
    const user = global.db.data.users[userId]
    if (!user.waifu) user.waifu = { characters: [], pending: null, cooldown: 0 }

    if (!user.waifu.pending) {
        return await m.reply('❌ No tienes ningún personaje disponible para vender.\n\n💡 Usa *.rw* para obtener un nuevo personaje.');
    }

    const currentWaifu = user.waifu.pending;
    const sellPrice = SELL_PRICES[currentWaifu.rarity] || 10;

    if (!user.coin) user.coin = 0
    user.coin += sellPrice

    user.waifu.pending = null
    
    try { 
        saveDatabase({ users: global.db.data.users }) 
            } catch (e) { 
        console.error('Error saving waifu DB (alt sell):', e) 
    }

    const rarityColors = {
        'común': '⚪',
        'rara': '🔵',
        'épica': '🟣',
        'ultra rara': '🟡',
        'legendaria': '🔴'
    };

    const emoji = rarityColors[currentWaifu.rarity] || '💙';

    let msg = `💰 ¡PERSONAJE VENDIDO! 💰\n\n`;
    msg += `${emoji} *${currentWaifu.name}*\n`;
    msg += `💎 *${currentWaifu.rarity.toUpperCase()}*\n`;
    msg += `💵 *Recibiste:* ${sellPrice} cebollines\n`;
    msg += `💳 *Total cebollines:* ${user.coin}\n\n`;
    msg += `🏪 Usa *.tienda* para gastar tus cebollines`;

    return await m.reply(msg);
};








