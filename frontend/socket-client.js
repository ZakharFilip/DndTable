const socket = io();

let myId = 'player_' + Math.random().toString(36).slice(2, 9);

socket.on('init', state => {
  stage.scale({ x: state.zoom, y: state.zoom });
  stage.position(state.offset);
  Object.values(state.objects).forEach(obj => addObject(obj));
});

socket.on('add', obj => addObject(obj));
socket.on('move', data => {
  const node = stage.findOne('#' + data.id);
  if (node) node.position({ x: data.x, y: data.y });
});
socket.on('delete', id => {
  const node = stage.findOne('#' + id);
  if (node) node.destroy();
});

function addObject(obj) {
  if (stage.findOne('#' + obj.id)) return;

  let node;
  if (obj.type === 'token') {
    node = new Konva.Circle({
      x: obj.x, y: obj.y,
      radius: 30,
      fill: obj.color,
      stroke: 'black',
      strokeWidth: 3,
      draggable: true,
      id: obj.id
    });
  } else if (obj.type === 'card') {
    const img = new Image();
    img.src = obj.src;
    node = new Konva.Image({
      x: obj.x, y: obj.y,
      image: img,
      width: 200, height: 300,
      draggable: true,
      id: obj.id
    });
  }
  layer.add(node);
  layer.batchDraw();
}

async function addToken() {
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

function clearAll() {
  if (confirm('Очистить весь стол?')) {
    layer.destroyChildren();
    socket.emit('delete', 'all');
  }
}