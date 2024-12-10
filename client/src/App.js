import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [userList, setUserList] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    // Kullanıcı listesini güncelle
    socket.on('update_user_list', (users) => {
      setUserList(users);
    });

    // Gelen mesajları işleme (genel veya özel)
    socket.on('receive_message', (data) => {
      setChat((prev) => [...prev, data]);
    });

    // Mesaj güncellemesi
    socket.on('update_chat', (updatedChat) => {
      setChat(updatedChat);
    });

    // Kayıt başarılı olduğunda rolü al
    socket.on('register_success', (data) => {
      setUserRole(data.role);
    });

    return () => {
      socket.off('update_user_list');
      socket.off('receive_message');
      socket.off('update_chat');
      socket.off('register_success');
    };
  }, []);

  const registerUser = () => {
    if (username.trim()) {
      if(isAdmin){
        if(password==="root"){
          socket.emit('register_user', {
            username,
            role:'admin',
          });
        }else{
          alert("Invalid admin password, Try again")
        }
      }else{
        socket.emit('register_user', {
          username,
          role: 'user',
        });
      }
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

  const deleteMessage = (messageId) => {
    socket.emit('delete_message', { admin: username, messageId });
  };

  const blockUser = (targetUser) => {
    socket.emit('block_user', { admin: username, targetUser });
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
      </div>
      <h3 style={{ marginTop: '20px' }}>For Admin:</h3>
      <div>
        <input
          type="checkbox"
          onChange={(e) => setIsAdmin(e.target.checked)}
        />
        <input
        type='password' 
        placeholder='Password'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div style={{marginTop: '20px'}}>
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
              <option key={index} value={user.username}>
                {user.username} ({user.role})
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
              color: msg.type === 'private' ? 'red' : msg.type === 'game' ? 'green' : 'black',
              marginBottom: '10px',
            }}
          >
            <strong>
              {msg.type === 'private'
                ? `${msg.from || 'Unknown'} (to ${msg.to || 'Unknown'}):`
                : `${msg.from || 'Unknown'}:`}
            </strong>{' '}
            {msg.message || 'No content'}{' '}
            <em>({new Date(msg.timestamp || Date.now()).toLocaleString()})</em>
            {userRole === 'admin' && msg.id && (
              <button onClick={() => deleteMessage(msg.id)}>Delete</button>
            )}
          </div>
        ))}

      </div>

      {/* Kullanıcıları göster */}
      <div style={{ marginTop: '20px' }}>
        <h3>Users</h3>
        {userList.length > 0 ? (
          userList.map((user, index) => (
            <div key={index} style={{color: user.role==='admin'? 'blue':'black'}}>
              {user.username} ({user.role})
              {userRole === 'admin' && user.role !== 'admin' && (
                <button onClick={() => blockUser(user.username)}>Block</button>
              )}
            </div>
          ))
        ) : (
          <p>No users connected</p>
        )}
      </div>
    </div>
  );
}

export default App;
