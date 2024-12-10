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
 // Mesajları tutan obje

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('register_user', ({ username, role }) => {
    if (!users[username]) {
      users[username] = { socket, role };
      userList.push({ username, role });
      console.log(`SUCCESS: User ${username} is registered as ${role} role`);

      io.emit('update_user_list', userList);
      socket.emit('register_success', { role });
    } else {
      console.log(`FAILED: ${username} is already taken`);
      socket.emit('register_failed', 'Username is already taken');
    }
  });

  socket.on('send_general_message', ({ username, message }) => {
    if (message === '#GAMESTART') {
      if (!currentGame[username]) {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        currentGame[username] = {
          word: randomWord,
          attempts: 5,
          progress: '_'.repeat(randomWord.length).split(''),
        };
        const updateMessage = {
          type: 'game',
          from: 'Game System',
          message: `Game started! Word: ${currentGame[username].progress.join('')}`,
          timestamp: new Date().toISOString(),
        };
        messages[`${socket.id}-${Date.now()}`] = updateMessage;
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
        io.emit('receive_message', winMessage);
        delete currentGame[username];
      } else {
        game.attempts--;
        const guess = message.split('');
        const updatedProgress = game.progress.map((char, index) =>
          guess[index] === game.word[index] ? game.word[index] : char
        );
  
        game.progress = updatedProgress;
  
        if (game.attempts === 0) {
          const loseMessage = {
            type: 'game',
            from: 'Game System',
            message: `Game over! The word was: ${game.word}`,
            timestamp: new Date().toISOString(),
          };
          messages[`${socket.id}-${Date.now()}`] = loseMessage;
          io.emit('receive_message', loseMessage);
          delete currentGame[username];
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
    } else {
      const timestamp = new Date().toISOString();
      const messageId = `${socket.id}-${Date.now()}`;
      messages[messageId] = { id: messageId, type: 'general', from: username, message, timestamp };
      io.emit('receive_message', messages[messageId]);
    }
  });

  socket.on('private_message', ({ from, to, message }) => {
    const targetSocket = users[to]?.socket;
    const timestamp = new Date().toISOString();
    const messageId = `${socket.id}-${Date.now()}`;
    const privateMessage = { id: messageId, type: 'private', from, to, message, timestamp };

    messages[messageId] = privateMessage;

    if (targetSocket) targetSocket.emit('receive_message', privateMessage);
    console.log(`Private message from ${from} to ${to}: ${message}`);
    socket.emit('receive_message', privateMessage);
  });

  socket.on('delete_message', ({ admin, messageId }) => {
    if (messages[messageId]) {
      console.log(`Message (${messages[messageId].message}) is deleted by admin`);
      delete messages[messageId];
      io.emit('update_chat', Object.values(messages));
    }
  });

  socket.on('block_user', ({ admin, targetUser }) => {
    const targetSocket = users[targetUser]?.socket;
    if (targetSocket) {
      targetSocket.emit('blocked', { message: 'You have been blocked by an admin.' });
      console.log(`${targetUser} is blocked by admin`);
      targetSocket.disconnect();
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
      console.log(`User disconnected: ${username}`);
      io.emit('update_user_list', userList);
    }
  });
});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
