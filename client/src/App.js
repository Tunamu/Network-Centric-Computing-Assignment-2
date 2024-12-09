import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

function App() {
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [chat, setChat] = useState([]);

  useEffect(() => {
    socket.on('receive_message', (data) => {
      setChat((prevChat) => [...prevChat, data]);
    });

    return () => {
      socket.off('receive_message');
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('send_message', { username,message });
      setMessage('');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Chat App</h1>
      <div style={{ marginBottom: '20px' }}>
        {chat.map((msg, index) => (
          <div key={index}>
            <strong>{msg.id}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Set Username"
        style={{ marginRight: '10px' }}
      />
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        style={{ marginRight: '10px' }}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default App;
