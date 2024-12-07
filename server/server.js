const express = require('express');
const WebSocket = require('ws');
const app = express();
const port = 8080;

// WebSocket server'ı kuruyoruz
const wss = new WebSocket.Server({ noServer: true });
let users = [];  // Bağlanan kullanıcıların listesi

// Mesajları tüm kullanıcılara göndermek için yardımcı fonksiyon
function broadcast(message, ws) {
  users.forEach(user => {
    if (user.ws !== ws) {  // Gönderilen kullanıcıya mesaj gönderme
      user.ws.send(message);
    }
  });
}

// WebSocket bağlantısı kurulduğunda
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log('received: %s', message);
    broadcast(message, ws);  // Mesajı diğer kullanıcılara yayınla
  });

  // Bağlantı kesildiğinde kullanıcının listesinden sil
  ws.on('close', () => {
    users = users.filter(user => user.ws !== ws);
  });

  // Yeni bir kullanıcı bağlandığında kullanıcıyı ekle
  users.push({ ws });
});

// HTTP server ile WebSocket server'ını aynı anda çalıştırmak için:
app.server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

// WebSocket bağlantısı için HTTP server'ı yönlendir
app.server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
