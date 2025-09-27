
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// REST endpoint to fetch recent messages 
app.get('/messages', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM messages ORDER BY created_at ASC LIMIT 500');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

io.on('connection', async (socket) => {
  console.log('a user connected:', socket.id);

  // Send recent messages on connect
  try {
    const [rows] = await db.query('SELECT * FROM messages ORDER BY created_at ASC LIMIT 500');
    socket.emit('init messages', rows);
  } catch (e) {
    console.error('failed to load messages', e);
  }

  socket.on('send message', async (payload) => {
    // payload: { client_id, name, isAnonymous, text }
    try {
      const q = `INSERT INTO messages (client_id, user_name, is_anonymous, message_text) VALUES (?, ?, ?, ?)`;
      const params = [payload.client_id || null, payload.name || 'Anonymous', payload.isAnonymous ? 1 : 0, payload.text];
      const [result] = await db.query(q, params);

      // fetch the inserted row to get timestamp + id
      const [rows] = await db.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
      const message = rows[0];

      // broadcast the saved message to all clients
      io.emit('new message', message);
    } catch (err) {
      console.error('insert message error', err);
      socket.emit('error message', { error: 'unable to save message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port', PORT));
