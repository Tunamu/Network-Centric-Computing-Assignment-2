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
const messages = {}; // Mesajları tutan obje

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
    const timestamp = new Date().toISOString();
    const messageId = `${socket.id}-${Date.now()}`;
    messages[messageId] = { id: messageId, type: 'general', from: username, message, timestamp };
    console.log(`General message from ${username}: ${message}`);
    io.emit('receive_message', messages[messageId]);
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
