import { format } from 'util';

const debugMode = false;
const winScore = 4999;
const playScore = 99;

export default {
  command: ['ttt', 'tictactoe'],
  category: 'gacha',
  run: async (client, m, args, usedPrefix, command) => {
    this.game = this.game ? this.game : {};
    if (Object.values(this.game).find(room => room.id.startsWith('tictactoe') && [room.game.playerX, room.game.playerO].includes(m.sender))) {
      return m.reply('💙 Todavía estás en una partida de Tic-Tac-Toe.\n\nUsa *nyarah* o *rendirse* para salir de la partida.');
    }
    
    if (!args[0] || !m.mentionedJid.length) {
      return m.reply(`💙 Menciona a alguien para jugar Tic-Tac-Toe.\n\nEjemplo: *${usedPrefix}${command} @usuario*`);
    }
    
    const mentionedUser = m.mentionedJid[0];
    if (mentionedUser === m.sender) {
      return m.reply('💙 No puedes jugar contigo mismo.');
    }
    
    if (Object.values(this.game).find(room => room.id.startsWith('tictactoe') && [room.game.playerX, room.game.playerO].includes(mentionedUser))) {
      return m.reply('💙 El usuario mencionado ya está en una partida de Tic-Tac-Toe.');
    }
    
    const room = {
      id: 'tictactoe-' + Date.now(),
      game: {
        playerX: m.sender,
        playerO: mentionedUser,
        currentTurn: m.sender,
        board: 0,
        winner: null,
        state: 'PLAYING',
        turn: (player, position) => {
          const board = room.game.board;
          const mask = 1 << position;
          const current = player === room.game.playerO ? 0 : 1;
          
          if ((board & mask) !== 0) return -3;
          if (player !== room.game.currentTurn) return -1;
          if (room.game.state !== 'PLAYING') return 0;
          
          room.game.board = board | (current ? mask : 0);
          room.game.currentTurn = player === room.game.playerX ? room.game.playerO : room.game.playerX;
          
          const winPatterns = [
            0b111000000, 0b000111000, 0b000000111,
            0b100100100, 0b010010010, 0b001001001,
            0b100010001, 0b001010100
          ];
          
          const playerBoard = current ? ~board : board;
          for (const pattern of winPatterns) {
            if ((playerBoard & pattern) === pattern) {
              room.game.winner = player;
              room.game.state = 'ENDED';
              return 1;
            }
          }
          
          if (room.game.board === 0b111111111) {
            room.game.state = 'ENDED';
            return 0;
          }
          
          return 1;
        },
        render: () => {
          const board = room.game.board;
          const result = [];
          for (let i = 0; i < 9; i++) {
            const mask = 1 << i;
            if ((board & mask) === 0) {
              result.push(i + 1);
            } else if ((board & mask) && ((board >> 9) & mask)) {
              result.push('X');
            } else {
              result.push('O');
            }
          }
          return result;
        }
      },
      x: m.chat,
      o: m.chat
    };
    
    this.game[room.id] = room;
    
    const str = `
🎮 Tic-Tac-Toe 🎮

❎ = @${m.sender.split('@')[0]}
⭕ = @${mentionedUser.split('@')[0]}

        1️⃣ 2️⃣ 3️⃣
        4️⃣ 5️⃣ 6️⃣
        7️⃣ 8️⃣ 9️⃣

🎮 El juego ha comenzado. @${m.sender.split('@')[0]} comienza.
📝 Usa los números 1-9 para marcar tu posición.
🏳 Escribe *nyarah* o *rendirse* para rendirte.
`.trim();
    
    client.sendMessage(m.chat, { text: str, mentions: [m.sender, mentionedUser] }, { quoted: m });
  }
};

export async function before(m) {
  const datas = global
  const users = global.db.data.users
  
  let ok;
  let isWin = false;
  let isTie = false;
  let isSurrender = false;
  this.game = this.game ? this.game : {};
  const room = Object.values(this.game).find((room) => room.id && room.game && room.state && room.id.startsWith('tictactoe') && [room.game.playerX, room.game.playerO].includes(m.sender) && room.state == 'PLAYING');
  
  if (room) {
    if (!/^([1-9]|(me)?nyerah|\rendirse\|rendirse|RENDIRSE|surr?ender)$/i.test(m.text)) {
      return true;
    }
    isSurrender = !/^[1-9]$/.test(m.text);
    if (m.sender !== room.game.currentTurn) {
      if (!isSurrender) {
        return true;
      }
    }
    if (debugMode) {
      m.reply('[DEBUG]\n' + require('util').format({
        isSurrender,
        text: m.text
      }));
    }
    if (!isSurrender && 1 > (ok = room.game.turn(m.sender === room.game.playerO, parseInt(m.text) - 1))) {
      m.reply({
        '-3': '❌ La posición ya está ocupada',
        '-2': '❌ Posición inválida',
        '-1': '❌ No es tu turno',
        '0': '❌ Juego terminado',
      }[ok]);
      return true;
    }
    if (m.sender === room.game.winner) {
      isWin = true;
    } else if (room.game.board === 511) {
      isTie = true;
    }
    const arr = room.game.render().map((v) => {
      return {
        X: '❎',
        O: '⭕',
        1: '1️⃣',
        2: '2️⃣',
        3: '3️⃣',
        4: '4️⃣',
        5: '5️⃣',
        6: '6️⃣',
        7: '7️⃣',
        8: '8️⃣',
        9: '9️⃣',
      }[v];
    });
    if (isSurrender) {
      room.game._currentTurn = m.sender === room.game.playerX;
      isWin = true;
    }
    const winner = isSurrender ? room.game.currentTurn : room.game.winner;
    const str = `
🎮 Tic-Tac-Toe 🎮

❎ = @${room.game.playerX.split('@')[0]}
⭕ = @${room.game.playerO.split('@')[0]}

        ${arr.slice(0, 3).join('')}
        ${arr.slice(3, 6).join('')}
        ${arr.slice(6).join('')}

${isWin ? `@${(isSurrender ? room.game.currentTurn : room.game.winner).split('@')[0]} ¡Ganó! 🎉` : isTie ? '🤝 Empate' : `🔄 Turno de @${room.game.currentTurn.split('@')[0]}`}
`.trim();
    
    if ((room.game._currentTurn ^ isSurrender ? room.x : room.o) !== m.chat) {
      room[room.game._currentTurn ^ isSurrender ? 'x' : 'o'] = m.chat;
    }
    if (room.x !== room.o) {
      await this.sendMessage(room.x, { text: str, mentions: this.parseMention(str) }, { quoted: m });
    }
    await this.sendMessage(room.o, { text: str, mentions: this.parseMention(str) }, { quoted: m });
    if (isTie || isWin) {
      if (users[room.game.playerX]) users[room.game.playerX].exp += playScore;
      if (users[room.game.playerO]) users[room.game.playerO].exp += playScore;
      if (isWin && users[winner]) {
        users[winner].exp += winScore - playScore;
      }
      if (debugMode) {
        m.reply('[DEBUG]\n' + format(room));
      }
      delete this.game[room.id];
    }
    return true;
  }
}
