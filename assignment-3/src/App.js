import React, { useState, useEffect } from 'react';

const App = () => {
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');
    socket.onopen = () => console.log('Connected to the server');
    socket.onmessage = (event) => {
      setMessages((prevMessages) => [...prevMessages, event.data]);
    };
    setWs(socket);

    return () => socket.close();
  }, []);

  const sendMessage = () => {
    if (ws && message) {
      ws.send(message);
      setMessage('');
    }
  };

  return (
    <div>
      <h1>Chat Uygulaması</h1>
      {!nickname ? (
        <div>
          <input
            type="text"
            placeholder="Kullanıcı Adı"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <button onClick={() => setNickname(nickname)}>Giriş Yap</button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder="Mesaj Yaz"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button onClick={sendMessage}>Gönder</button>
          <div>
            <h2>Mesajlar:</h2>
            {messages.map((msg, idx) => (
              <p key={idx}>{msg}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
