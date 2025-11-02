const width = window.innerWidth;
const height = window.innerHeight;

const stage = new Konva.Stage({
  container: 'container',
  width, height,
  draggable: true,
  x: 0, y: 0
});

const layer = new Konva.Layer();
stage.add(layer);

function loadImage(src) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.src = src;
  });
}

// Зум колёсиком к курсору
stage.on('wheel', e => {
  e.evt.preventDefault();
  const scaleBy = 1.15;
  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition();

  const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
  stage.scale({ x: newScale, y: newScale });

  const newPos = {
    x: pointer.x - (pointer.x - stage.x()) * (newScale / oldScale),
    y: pointer.y - (pointer.y - stage.y()) * (newScale / oldScale),
  };
  stage.position(newPos);
  sendViewport();
});

// ПКМ — удалить
stage.on('contextmenu', e => {
  if (e.target === stage) return;
  const shape = e.target;
  const id = shape.id();
  socket.emit('delete', id);
  shape.destroy();
});

// Перетаскивание
stage.on('dragend', e => {
  const shape = e.target;
  if (shape === stage) {
    sendViewport();
    return;
  }
  socket.emit('move', {
    id: shape.id(),
    x: shape.x(),
    y: shape.y(),
    rotation: shape.rotation()
  });
});

function sendViewport() {
  socket.emit('viewport', {
    zoom: stage.scaleX(),
    offset: stage.position()
  });
}