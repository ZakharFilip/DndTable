// socket-client.js — ИСПРАВЛЕННАЯ ВЕРСИЯ
const socket = io();

// Ждём, пока Konva полностью загрузится
function waitForKonva() {
  return new Promise(resolve => {
    if (window.stage && window.layer) {
      resolve();
    } else {
      const check = setInterval(() => {
        if (window.stage && window.layer) {
          clearInterval(check);
          resolve();
        }
      }, 10);
    }
  });
}

// Делаем stage и layer глобальными
window.stage = stage;
window.layer = layer;

socket.on('init', async state => {
  await waitForKonva(); // ← ВОЛШЕБНАЯ СТРОЧКА
  stage.scale({ x: state.zoom, y: state.zoom });
  stage.position(state.offset);
  Object.values(state.objects).forEach(obj => addObject(obj));
  layer.batchDraw();
});

socket.on('add', async obj => {
  await waitForKonva();
  addObject(obj);
});

socket.on('move', data => {
  const node = stage.findOne('#' + data.id);
  if (node) {
    node.position({ x: data.x, y: data.y });
    layer.batchDraw();
  }
});

socket.on('delete', id => {
  const node = stage.findOne('#' + id);
  if (node) node.destroy();
  layer.batchDraw();
});

// Остальное без изменений
function addObject(obj) {
  if (stage.findOne('#' + obj.id)) return;

  let node;
  if (obj.type === 'token') {
    // Фишки — всегда работают
    node = new Konva.Circle({
      x: obj.x, y: obj.y,
      radius: 30,
      fill: obj.color,
      stroke: 'black',
      strokeWidth: 3,
      draggable: true,
      id: obj.id
    });
    layer.add(node);
    layer.batchDraw();
    return;
  }

  if (obj.type === 'card') {
    const img = new Image();
    img.onload = () => {
      node = new Konva.Image({
        x: obj.x, y: obj.y,
        image: img,
        width: 200, height: 300,
        draggable: true,
        id: obj.id
      });
      layer.add(node);
      layer.batchDraw();
    };
    img.onerror = () => {
      console.warn('Картинка не найдена:', obj.src);
      // Рисуем заглушку вместо сломанной карты
      node = new Konva.Rect({
        x: obj.x, y: obj.y,
        width: 200, height: 300,
        fill: '#555',
        stroke: 'red',
        strokeWidth: 4,
        cornerRadius: 10,
        draggable: true,
        id: obj.id
      });
      const text = new Konva.Text({
        text: '404\nКарта не найдена',
        fontSize: 20,
        fill: 'white',
        align: 'center',
        verticalAlign: 'middle',
        width: 200,
        height: 300
      });
      const group = new Konva.Group({ id: obj.id });
      group.add(node, text);
      layer.add(group);
      group.moveToTop();
      layer.batchDraw();
    };
    img.crossOrigin = 'Anonymous';
    img.src = obj.src + '?t=' + Date.now(); // кэш-бустер
  }
}

// Кнопки
async function addToken() {
  await waitForKonva();
  const colors = ['red','blue','green','yellow','purple'];
  const id = 'token_' + Date.now();
  const obj = {
    id, type: 'token',
    x: stage.width()/2 + (Math.random()-0.5)*400,
    y: stage.height()/2 + (Math.random()-0.5)*400,
    color: colors[Math.floor(Math.random()*colors.length)]
  };
  socket.emit('add', obj);
  addObject(obj);
}

async function addCard() {
  await waitForKonva();
  const cards = ['/assets/card1.jpg','/assets/card2.jpg','/assets/dragon.png'];
  const id = 'card_' + Date.now();
  const obj = {
    id, type: 'card',
    src: cards[Math.floor(Math.random()*cards.length)],
    x: stage.width()/2,
    y: stage.height()/2
  };
  socket.emit('add', obj);
  addObject(obj);
}