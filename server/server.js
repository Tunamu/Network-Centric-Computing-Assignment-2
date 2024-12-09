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

// Kullanıcıları tutmak için bir obje
const users = {};
const userList = []; // Kullanıcı adlarını tutar

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Kullanıcı kaydı
  socket.on('register_user', (username) => {
    if (!users[username]) {
      users[username] = socket.id;
      userList.push(username);
      console.log(`User registered: ${username}`);
      
      // Kullanıcı listesini güncelle
      io.emit('update_user_list', userList);
    }
  });

  // Genel mesaj gönderme
  socket.on('send_general_message', ({ username, message }) => {
    const timestamp = new Date().toISOString();
    io.emit('receive_message', {
      type: 'general',
      from: username,
      message,
      timestamp,
    });
    console.log(`General message from ${username}: ${message}`);
  });

  // Özel mesaj gönderme
  socket.on('private_message', ({ from, to, message }) => {
    const targetSocketId = users[to];
    const timestamp = new Date().toISOString();
    const privateMessage = {
      type: 'private',
      from,
      to,
      message,
      timestamp,
    };

    // Alıcıya özel mesaj gönder
    if (targetSocketId) {
      io.to(targetSocketId).emit('receive_message', privateMessage);
    }
    // Gönderenin de mesaj geçmişine ekle
    socket.emit('receive_message', privateMessage);
    console.log(`Private message from ${from} to ${to}: ${message}`);
  });

  // Kullanıcı bağlantıyı kapatırsa listeden kaldır
  socket.on('disconnect', () => {
    for (const username in users) {
      if (users[username] === socket.id) {
        delete users[username];
        const index = userList.indexOf(username);
        if (index !== -1) userList.splice(index, 1);
        console.log(`User disconnected: ${username}`);
        io.emit('update_user_list', userList); // Kullanıcı listesini güncelle
        break;
      }
    }
  });
});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
