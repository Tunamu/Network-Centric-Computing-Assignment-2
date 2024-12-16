const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const users = {};
const userList = [];
const messages = {};

const words = ['apple', 'banana', 'grape', 'orange', 'peach', 'pear', 'plum', 'berry', 'mango', 'melon'];
let currentGame = {}; // Oyun durumu { username: { word, attempts, progress } }

io.on('connection', (socket) => {
  console.info(`User connected: ${socket.id}`);

  socket.on('register_user', ({ username, role }) => {
    if (!users[username]) {
      users[username] = { socket, role };
      userList.push({ username, role });
      console.info(`SUCCESS: User ${username} is registered as ${role} role`);

      io.emit('update_user_list', userList);
      socket.emit('register_success', { role });
    } else {
      console.error(`FAILED: ${username} is already taken`);
      socket.emit('register_failed', 'Username is already taken');
    }
  });

  socket.on('send_general_message', ({ username, message }) => {
    const timestamp = new Date().toISOString();
    const messageId = `${socket.id}-${Date.now()}`;
    messages[messageId] = { id: messageId, type: 'general', from: username, message, timestamp };
    console.info(`General message from ${username}: ${message}`);
    io.emit('receive_message', messages[messageId]);
    
    if (message === '#GAMESTART') {
      if (!currentGame[username]) {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        const initialProgress = '_'.repeat(randomWord.length).split('');
        
        // Rastgele bir harf aç
        const randomIndex = Math.floor(Math.random() * randomWord.length);
        initialProgress[randomIndex] = randomWord[randomIndex];

        currentGame[username] = {
          word: randomWord,
          attempts: 3,
          progress: initialProgress,
        };

        const updateMessage = {
          type: 'game',
          from: 'Game System',
          message: `Game started! Word: ${currentGame[username].progress.join('')}`,
          timestamp: new Date().toISOString(),
        };
        messages[`${socket.id}-${Date.now()}`] = updateMessage;
        console.info(`Game started by ${username}, word: ${currentGame[username].progress.join('')}`);
        io.emit('receive_message', updateMessage);
      } else {
        socket.emit('game_update', 'You are already in a game!');
      }
    } else if (message === '#GAMESTOP') {
      if (currentGame[username]) {
        delete currentGame[username];
        const updateMessage = {
          type: 'game',
          from: 'Game System',
          message: 'Game stopped.',
          timestamp: new Date().toISOString(),
        };
        messages[`${socket.id}-${Date.now()}`] = updateMessage;
        console.info(`Game stopped by ${username}`);
        io.emit('receive_message', updateMessage);
      } else {
        socket.emit('game_update', 'No active game to stop.');
      }
    } else if (currentGame[username]) {
      const game = currentGame[username];

      if (message === game.word) {
        // Oyuncu kelimeyi doğru tahmin ettiğinde kazanır
        const winMessage = {
          type: 'game',
          from: 'Game System',
          message: `Congratulations ${username}! You guessed the word: ${game.word}`,
          timestamp: new Date().toISOString(),
        };
        messages[`${socket.id}-${Date.now()}`] = winMessage;
        console.info(`Game finished by ${username}: ${game.word}`);
        io.emit('receive_message', winMessage);
        delete currentGame[username];
      } else {
        game.attempts--;

        if (game.attempts === 0) {
          // Tüm haklar bittiğinde rastgele bir harf aç
          let revealed = false;
          while (!revealed) {
            const randomIndex = Math.floor(Math.random() * game.word.length);
            if (game.progress[randomIndex] === '_') {
              game.progress[randomIndex] = game.word[randomIndex];
              revealed = true;
            }
          }

          // Eğer artık kelimede kapalı harf kalmadıysa ve kullanıcı hala doğru tahmin edemediyse
          if (!game.progress.includes('_')) {
            const loseMessage = {
              type: 'game',
              from: 'Game System',
              message: `Game over! The word was: ${game.word}. Better luck next time, ${username}!`,
              timestamp: new Date().toISOString(),
            };
            messages[`${socket.id}-${Date.now()}`] = loseMessage;
            console.info(`Game over automatically for ${username}: ${game.word}`);
            io.emit('receive_message', loseMessage);
            delete currentGame[username];
          } else {
            // Hakkı sıfırla ve ilerleme mesajı gönder
            game.attempts = 3;
            const revealMessage = {
              type: 'game',
              from: 'Game System',
              message: `No attempts left! A new letter has been revealed: ${game.progress.join('')}`,
              timestamp: new Date().toISOString(),
            };
            messages[`${socket.id}-${Date.now()}`] = revealMessage;
            console.info(`No attempts left for ${username}, revealed a letter: ${game.progress.join('')}`);
            io.emit('receive_message', revealMessage);
          }
        } else {
          // Yanlış tahminde bulunulduğu mesajı
          const progressMessage = {
            type: 'game',
            from: 'Game System',
            message: `Progress: ${game.progress.join('')} | Remaining attempts: ${game.attempts}`,
            timestamp: new Date().toISOString(),
          };
          messages[`${socket.id}-${Date.now()}`] = progressMessage;
          io.emit('receive_message', progressMessage);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    const username = Object.keys(users).find(
      (key) => users[key].socket.id === socket.id
    );
    if (username) {
      delete users[username];
      const index = userList.findIndex((user) => user.username === username);
      if (index !== -1) userList.splice(index, 1);
      console.warn(`User disconnected: ${username}`);
      io.emit('update_user_list', userList);
    }
  });
});

server.listen(3001, () => {
  console.info('Server is running on port 3001');
});
