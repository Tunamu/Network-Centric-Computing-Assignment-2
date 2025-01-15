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
const words = ['socket', 'network', 'paralel', 'computing', 'line', 'cpu', 'cable'];
let currentGame = {}; // Oyun durumu { username: { word, attempts, progress } }

io.on('connection', (socket) => {
  console.info(`User connected: ${socket.id}`);

  // Kullanıcı kaydı
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

  // Genel mesaj gönderme
  socket.on('send_general_message', ({ username, message }) => {
    const timestamp = new Date().toISOString();
    const messageId = `${socket.id}-${Date.now()}`;
    messages[messageId] = { id: messageId, type: 'general', from: username, message, timestamp };
    console.info(`General message from ${username}: ${message}`);
    io.emit('receive_message', messages[messageId]);

    const userRole = users[username]?.role;

    if (message === '#GAMESTART') {
      if (userRole === 'admin') {
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
          console.info(`Game started by admin ${username}, word: ${currentGame[username].progress.join('')}`);
          io.emit('receive_message', updateMessage);
        } else {
          socket.emit('game_update', 'A game is already active!');
        }
      } else {
        // Admin olmayanlar için hata mesajı
        socket.emit('game_update', 'You do not have permission to start the game.');
        console.warn(`Unauthorized game start attempt by ${username}`);
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
          let revealed = false;
          while (!revealed) {
            const randomIndex = Math.floor(Math.random() * game.word.length);
            if (game.progress[randomIndex] === '_') {
              game.progress[randomIndex] = game.word[randomIndex];
              revealed = true;
            }
          }

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
  
  socket.on('private_message', ({ from, to, message }) => {
    const targetSocket = users[to]?.socket;
    const timestamp = new Date().toISOString();
    const messageId = `${socket.id}-${Date.now()}`;
    const privateMessage = { id: messageId, type: 'private', from, to, message, timestamp };

    messages[messageId] = privateMessage;

    if (targetSocket) targetSocket.emit('receive_message', privateMessage);
    console.info(`Private message from ${from} to ${to}: ${message}`);
    socket.emit('receive_message', privateMessage);
  });


  socket.on('delete_message', ({ admin, messageId }) => {
    if (messages[messageId]) {
      console.info(`Message (${messages[messageId].message}) is deleted by admin`);
      delete messages[messageId];
      io.emit('update_chat', Object.values(messages));
    }
  });

  socket.on('block_user', ({ admin, targetUser }) => {
    const targetSocket = users[targetUser]?.socket;
    if (targetSocket) {
      targetSocket.emit('blocked', { message: 'You have been blocked by an admin.' });
      console.warn(`${targetUser} is blocked by admin`);
      targetSocket.disconnect();
    }
  });

  // Kullanıcı bağlantısını kopardığında
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
