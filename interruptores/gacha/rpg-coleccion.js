import fs from 'fs';
import path from 'path';


const dbPath = path.join(process.cwd(), 'src', 'database');
const databaseFilePath = path.join(dbPath, 'waifudatabase.json');


function loadDatabase() {
    if (!fs.existsSync(databaseFilePath)) {
        return { users: {} }; 
    }
    try {
        return JSON.parse(fs.readFileSync(databaseFilePath, 'utf-8'));
    } catch (error) {
        console.error('❌ Error al cargar database:', error);
        return { users: {} };
    }
}

let handler = async (client, m) => {
    const userId = m.sender;
    
    try {
        if (!global.db.data) global.db.data = {}
        if (!global.db.data.users) global.db.data.users = {}
        if (!global.db.data.users[userId]) global.db.data.users[userId] = {}
        const user = global.db.data.users[userId]
        if (!user.waifu) user.waifu = { characters: [], pending: null, cooldown: 0 }
        if (!Array.isArray(user.waifu.characters)) user.waifu.characters = []

        let collection = user.waifu.characters

        if (!collection || collection.length === 0) {
            const oldDb = loadDatabase()
            const oldChars = oldDb?.users?.[userId]?.characters
            if (Array.isArray(oldChars) && oldChars.length > 0) {
                for (const w of oldChars) {
                    if (!w?.name || !w?.rarity) continue
                    const exists = user.waifu.characters.find(x => x.name === w.name && x.rarity === w.rarity)
                    if (!exists) {
                        user.waifu.characters.push({
                            name: w.name,
                            rarity: w.rarity,
                            power: w.power,
                            skill: w.skill,
                            skillDesc: w.skillDesc,
                            pvp: w.pvp || null,
                            obtainedAt: w.obtainedAt || new Date().toISOString(),
                            obtainedFrom: w.obtainedFrom || 'migrated'
                        })
                    }
                }
                collection = user.waifu.characters
            }
        }

        if (!collection || collection.length === 0) {
            return m.reply('📝 Tu colección está vacía. Usa .rw para obtener personajes.');
        }
        
       
        const uniqueCollection = [];
        const seen = new Set();
        
        collection.forEach(waifu => {
            if (!waifu?.name || !waifu?.rarity) return;
            
            const key = `${waifu.name.toLowerCase()}_${waifu.rarity.toLowerCase()}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueCollection.push(waifu);
            }
        });
        
        
        const rarityOrder = { 'legendaria': 0, 'ultra rara': 1, 'épica': 2, 'rara': 3, 'común': 4 };
        uniqueCollection.sort((a, b) => {
            const rarityDiff = rarityOrder[a.rarity.toLowerCase()] - rarityOrder[b.rarity.toLowerCase()];
            if (rarityDiff !== 0) return rarityDiff;
            return a.name.localeCompare(b.name);
        });

        const keyOf = (w) => `${String(w?.name || '').toLowerCase()}_${String(w?.rarity || '').toLowerCase()}`
        const indexMap = new Map()
        uniqueCollection.forEach((w, i) => indexMap.set(keyOf(w), i + 1))
        
        const rarityCount = {
            'legendaria': 0,
            'ultra rara': 0,
            'épica': 0,
            'rara': 0,
            'común': 0
        };
        
        uniqueCollection.forEach(waifu => {
            const rarityLower = waifu.rarity.toLowerCase();
            if (rarityCount[rarityLower] !== undefined) {
                rarityCount[rarityLower]++;
            }
        });
        
        const getTopName = (rarity) => {
            const found = uniqueCollection.find(w => (w?.rarity || '').toLowerCase() === rarity)
            return found?.name || null
        }
        const topLegend = getTopName('legendaria')
        const topUltra = getTopName('ultra rara')
        
        let message = `🎴 *COLECCIÓN DE WAIFUS* 🎴\n`;
        message += `━━━━━━━━━━━━━━━━━━\n`;
        message += `👤 @${userId.split('@')[0]}\n`;
        message += `📦 Total: *${uniqueCollection.length}*\n`;
        message += `━━━━━━━━━━━━━━━━━━\n\n`;

        message += `📊 *Resumen por rareza*\n`;
        message += `🔴 Legendaria: *${rarityCount['legendaria']}* ${createBar(rarityCount['legendaria'], 10)}\n`;
        message += `🟡 Ultra rara: *${rarityCount['ultra rara']}* ${createBar(rarityCount['ultra rara'], 10)}\n`;
        message += `🟣 Épica: *${rarityCount['épica']}* ${createBar(rarityCount['épica'], 10)}\n`;
        message += `🔵 Rara: *${rarityCount['rara']}* ${createBar(rarityCount['rara'], 10)}\n`;
        message += `⚪ Común: *${rarityCount['común']}* ${createBar(rarityCount['común'], 10)}\n\n`;

        if (topLegend || topUltra) {
            message += `⭐ *Destacadas*\n`
            if (topLegend) message += `🔴 ${topLegend}\n`
            if (topUltra) message += `🟡 ${topUltra}\n`
            message += `\n`
        }
        
   
        const rarityEmojis = {
            'legendaria': '🔴',
            'ultra rara': '🟡',
            'épica': '🟣',
            'rara': '🔵',
            'común': '⚪'
        };
        
      
        const groupedByRarity = {};
        uniqueCollection.forEach(waifu => {
            const rarityLower = waifu.rarity.toLowerCase();
            if (!groupedByRarity[rarityLower]) {
                groupedByRarity[rarityLower] = [];
            }
            groupedByRarity[rarityLower].push(waifu);
        });
        
      
        for (const rarity of ['legendaria', 'ultra rara', 'épica', 'rara', 'común']) {
            const rarityLower = rarity.toLowerCase();
            if (groupedByRarity[rarityLower]?.length > 0) {
                message += `${rarityEmojis[rarityLower]} *${rarity.toUpperCase()} (${groupedByRarity[rarityLower].length})*\n`;
                const list = groupedByRarity[rarityLower]
                
                
                const displayList = list.slice(0, 15);
                displayList.forEach((waifu, index) => {
                    const dateObj = new Date(waifu.obtainedAt);
                    const date = isNaN(dateObj.getTime()) ? '??' : dateObj.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit'
                    });
                    const globalIndex = indexMap.get(keyOf(waifu)) || (index + 1)
                    message += `#${String(globalIndex).padStart(2, '0')} ${waifu.name} 📅${date}\n`;
                });
                
                if (list.length > 15) {
                    message += `    ... y ${list.length - 15} más\n`;
                }
                message += `\n`;
            }
        }
        
        message += `━━━━━━━━━━━━━━━━━━\n`;
        message += `💡 *Comandos útiles:*\n`;
        message += `• *.rw* - Obtener nuevos personajes\n`;
        message += `• *.c* - Reclamar personaje pendiente\n`;
        message += `• *.v* - Vender personaje pendiente\n`;
        message += `• *.gallery* - Ver galería con imágenes\n`;
        message += `• *.waifupvp 01 @user 02* - Batalla PVP\n`;
        message += `━━━━━━━━━━━━━━━━━━`;

        const buttons = [
            { buttonId: '.gallery', buttonText: { displayText: '🎨 Galería' }, type: 1 },
            { buttonId: '.rw', buttonText: { displayText: '🎲 Invocar' }, type: 1 }
        ];

        return await client.sendButton(
            m.chat, 
            message, 
            '🎮 Colección - Hatsune Miku Bot',
            'https://files.catbox.moe/y980w8.png',
            buttons,
            null,
            { mentions: [userId] },
            m
        );
    } catch (e) {
        console.error(e);
        return m.reply('💙 Error al mostrar la colección. Intenta de nuevo.');
    }
}


function createBar(value, maxSize) {
    const filled = Math.ceil((value / 20) * maxSize); 
    const empty = maxSize - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

export default {
  command: ['collection', 'coleccion', 'col', 'personajes', 'harem', 'waifus', 'miwaifu'],
  category: 'gacha',
  run: handler
};





