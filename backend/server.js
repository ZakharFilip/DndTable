// 1. ПОДКЛЮЧАЕМ БИБЛИОТЕКИ
const express = require('express');      // веб-сервер (как Apache, только в 100 раз проще)
const http = require('http');            // «обёртка» над TCP, чтобы прикрутить WebSocket
const { Server } = require('socket.io'); // магия реал-тайма: 1 строчка = 1000 строк кода
const fs = require('fs');                // работа с файлами (чтение/запись state.json)
const path = require('path');            // склеивает пути правильно на Windows (\ вместо /)

// 2. СОЗДАЁМ СЕРВЕР
const app = express();                   // обычный HTTP-сервер
const server = http.createServer(app);   // «надстраиваем» его над Node.js
const io = new Server(server, {          // ← ВОЛШЕБНАЯ СТРОЧКА
  cors: { origin: '*' }                  // разрешаем подключаться с любого сайта
});


// 3. ОТДАЁМ ФРОНТЕНД (всё, что в папке ../frontend)
app.use(express.static(path.join(__dirname, '..', 'frontend')));
// ← теперь любой файл (index.html, картинки, .js) отдаётся автоматически

app.use('/assets', express.static(path.join(__dirname, '..', 'frontend', 'assets')));
// ← /assets/card1.jpg → берётся из frontend\assets\card1.jpg

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});
// ← если человек зашёл по http://localhost:3000/любая-папка — всё равно покажем index.html


// 4. ПАМЯТЬ СЕРВЕРА: где хранится весь стол
const STATE_FILE = path.join(__dirname, '..', 'data', 'state.json');
let state = { objects: {}, zoom: 1, offset: { x: 0, y: 0 } };

if (fs.existsSync(STATE_FILE)) {
  state = JSON.parse(fs.readFileSync(STATE_FILE));
}
// ← при старте сервера читаем последний сейв



// 5. КОГДА КТО-ТО ПОДКЛЮЧАЕТСЯ
io.on('connection', socket => {
  console.log('Player connected:', socket.id);

  // 5.1 Отправляем новичку ВСЁ, что уже есть на столе
  socket.emit('init', state);

  // 5.2 Слушаем события от ЭТОГО игрока
  socket.on('move', data => {
    state.objects[data.id] = data;           // запоминаем новое положение
    socket.broadcast.emit('move', data);     // шлём ВСЕМ, КРОМЕ себя
  });

  socket.on('add', obj => {
    state.objects[obj.id] = obj;
    socket.broadcast.emit('add', obj);
  });

  socket.on('delete', id => {
    delete state.objects[id];
    socket.broadcast.emit('delete', id);
  });

  socket.on('viewport', vp => {
    state.zoom = vp.zoom;
    state.offset = vp.offset;
  });
});


// 6. АВТОСЕЙВ КАЖДЫЕ 5 СЕКУНД
setInterval(() => {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log('State saved');
}, 5000);

// 7. ЗАПУСК
server.listen(3000, () => console.log('http://localhost:3000'));