const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');          // ← добавили

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// 1. Отдаём всё, что лежит в ../frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// 2. Отдаём картинки
app.use('/assets', express.static(path.join(__dirname, '..', 'frontend', 'assets')));

// 3. Любой запрос — отдаём index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const STATE_FILE = path.join(__dirname, '..', 'data', 'state.json');
let state = { objects: {}, zoom: 1, offset: { x: 0, y: 0 } };
if (fs.existsSync(STATE_FILE)) state = JSON.parse(fs.readFileSync(STATE_FILE));

// ─────── Socket.io (без изменений) ───────
io.on('connection', socket => {
  socket.emit('init', state);
  socket.on('move', data => { state.objects[data.id] = data; socket.broadcast.emit('move', data); });
  socket.on('add', obj => { state.objects[obj.id] = obj; socket.broadcast.emit('add', obj); });
  socket.on('delete', id => { delete state.objects[id]; socket.broadcast.emit('delete', id); });
  socket.on('viewport', vp => { state.zoom = vp.zoom; state.offset = vp.offset; });
});

setInterval(() => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)), 5000);

server.listen(3000, () => console.log('http://localhost:3000'));