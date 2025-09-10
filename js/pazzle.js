
(() => {
const COLS = 4;
const board = document.getElementById('board');
const shuffleBtn = document.getElementById('shuffleBtn');
const debugEl = document.getElementById('debug');

let imgUrl = './img/memory-4.jpg';   // картинка пазла
let prizeUrl = './img/memory-5.jpg'; // картинка приза
let order = [];

// A list of candidate images to try (stable public endpoints and the previous unsplash URLs)
const CANDIDATES = [
  './img/pazzle.jpg', // simple random image provider
  // 'https://images.unsplash.com/photo-1501769214405-5e86c85a8a8a?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3',
  // 'https://images.unsplash.com/photo-1545235617-9465d9ce6a09?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3'
];

// A simple SVG fallback (data URL) — will always work because it's embedded.
const SVG_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <defs>
    <linearGradient id="g" x1="0" x2="1">
      <stop offset="0" stop-color="#f6d365"/>
      <stop offset="1" stop-color="#fda085"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="48" fill="#333">Пазл</text>
</svg>
`);

function logDebug(msg){
  console.log('[puzzle]', msg);
}

function updateDebugList(statuses){
  if (!debugEl) return; // если элемента нет, просто выходим
  debugEl.innerHTML = '<h4>Проверка изображений</h4>';
  const ul = document.createElement('ul');
  statuses.forEach(s=>{
    const li = document.createElement('li');
    li.textContent = s.url;
    li.className = s.ok ? 'ok' : 'err';
    ul.appendChild(li);
  });
  debugEl.appendChild(ul);
  const small = document.createElement('div');
  small.className = 'small';
  small.textContent = 'Откройте DevTools (F12) → Console/Network для подробностей.';
  debugEl.appendChild(small);
}

function loadImageUrl(url, timeout = 8000){
  return new Promise(resolve => {
    const img = new Image();
    let done = false;
    const timer = setTimeout(()=>{
      if(done) return;
      done = true;
      img.src = ''; // stop loading
      resolve(false);
    }, timeout);

    img.onload = ()=>{
      if(done) return;
      done = true;
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = ()=>{
      if(done) return;
      done = true;
      clearTimeout(timer);
      resolve(false);
    };
    // try to load via normal cross-origin request (no special CORS required for background-image)
    try {
      img.src = url;
    } catch(e){
      clearTimeout(timer);
      resolve(false);
    }
  });
}

async function pickWorkingImage(){
  const statuses = [];
  for(const u of CANDIDATES){
    logDebug('Пробуем ' + u);
    const ok = await loadImageUrl(u);
    statuses.push({url:u, ok});
    updateDebugList(statuses);
    if(ok){
      logDebug('OK: ' + u);
      return u;
    } else {
      logDebug('Ошибка загрузки: ' + u);
    }
  }
  // none worked — use fallback
  statuses.push({url:'[fallback SVG встроенный]', ok:true});
  updateDebugList(statuses);
  return SVG_FALLBACK;
}

function init(){
  board.style.setProperty('--cols', COLS);
  shuffleBtn.addEventListener('click', shuffle);

  // Try to pick a working image and then start
  pickWorkingImage().then(url=>{
    imgUrl = url;
    prizeUrl = './img/pazzle-priz.png'; // use same image for prize unless changed
    reset();
    shuffle()
  });
}

function reset(){
  order = Array.from({length:COLS*COLS},(_,i)=>i);
  render();
}

function shuffle(){
  for(let i=order.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [order[i],order[j]] = [order[j],order[i]];
  }
  render();
}

function render(){
  board.innerHTML = '';
  const n = COLS;
  order.forEach((tileIndex,i)=>{
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.draggable = true;
    tile.dataset.index = tileIndex;
    tile.dataset.pos = i;
    const r = Math.floor(tileIndex / n);
    const c = tileIndex % n;
    const step = 100/(n-1);
    tile.style.backgroundPosition = (c*step) + '% ' + (r*step) + '%';
    tile.style.backgroundImage = `url(${imgUrl})`;
    addDragHandlers(tile);
    board.appendChild(tile);
  });
  markCorrect();
}

function addDragHandlers(tile){
  tile.addEventListener('dragstart', e=>{
    e.dataTransfer.setData('text/plain', tile.dataset.pos);
    tile.classList.add('dragging');
  });
  tile.addEventListener('dragend', e=>{
    tile.classList.remove('dragging');
  });
  tile.addEventListener('dragover', e=>{ e.preventDefault(); });
  tile.addEventListener('drop', e=>{
    e.preventDefault();
    const fromPos = parseInt(e.dataTransfer.getData('text/plain'));
    const toPos = parseInt(tile.dataset.pos);
    swapPositions(fromPos,toPos);
  });
}

function swapPositions(a,b){
  if(a===b) return;
  [order[a],order[b]] = [order[b],order[a]];
  render();
  checkWin();
}

function checkWin(){
  const solved = order.every((val,idx)=>val===idx);
  if(solved){
    showModal();
  }
}

function markCorrect(){
  const tiles = board.querySelectorAll('.tile');
  tiles.forEach((t,idx)=>{
    const correct = parseInt(t.dataset.index) === idx;
    t.classList.toggle('correct', correct);
  });
}

function showModal(){
  const tpl = document.getElementById('modalTpl');
  const clone = tpl.content.cloneNode(true);
  const backdrop = clone.querySelector('.modal-backdrop');
  const prImg = clone.querySelector('#prizeImg');
  prImg.src = prizeUrl;
  document.body.appendChild(backdrop);
    confetti({
    particleCount: 200,
    spread: 100,
    origin: { y: 0.6 }
  });

  const closeModal = backdrop.querySelector('#closeModal');
  closeModal.addEventListener('click', ()=>{
    backdrop.remove();
    reset();
    shuffle();
  });
}

init();
})();