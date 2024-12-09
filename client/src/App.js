import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

function App() {
  const [username, setUsername] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [userList, setUserList] = useState([]);

  useEffect(() => {
    // Kullanıcı listesini güncelle
    socket.on('update_user_list', (users) => {
      setUserList(users);
    });

    // Gelen mesajları işleme (genel veya özel)
    socket.on('receive_message', (data) => {
      setChat((prev) => [...prev, data]);
    });

    return () => {
      socket.off('update_user_list');
      socket.off('receive_message');
    };
  }, []);

  const registerUser = () => {
    if (username.trim()) {
      socket.emit('register_user', username);
    }
  };

  const sendGeneralMessage = () => {
    if (message.trim()) {
      socket.emit('send_general_message', { username, message });
      setMessage('');
    }
  };

  const sendPrivateMessage = () => {
    if (targetUser.trim() && message.trim()) {
      socket.emit('private_message', {
        from: username,
        to: targetUser,
        message,
      });
      setMessage('');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Chat App</h1>

      {/* Kullanıcı kaydı */}
      <div>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button onClick={registerUser}>Register</button>
      </div>

      {/* Mesaj gönderme */}
      <div style={{ marginTop: '20px' }}>
        <h2>Chat</h2>
        <div>
          <select
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
            style={{ marginRight: '10px' }}
          >
            <option value="">Send to General</option>
            {userList.map((user, index) => (
              <option key={index} value={user}>
                {user}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Type a message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ marginRight: '10px' }}
          />
          <button onClick={targetUser ? sendPrivateMessage : sendGeneralMessage}>
            Send
          </button>
        </div>
      </div>

      {/* Mesajları göster */}
      <div style={{ marginTop: '20px' }}>
        <h3>Messages</h3>
        {chat.map((msg, index) => (
          <div
            key={index}
            style={{
              color: msg.type === 'private' ? 'red' : 'black',
              marginBottom: '10px',
            }}
          >
            <strong>
              {msg.type === 'private'
                ? `${msg.from} (to ${msg.to}):`
                : `${msg.from}:`}
            </strong>{' '}
            {msg.message}{' '}
            <em>({new Date(msg.timestamp).toLocaleString()})</em>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
