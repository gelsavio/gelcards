/* =============================================================
   KLONDIKE SOLITAIRE ENGINE — CORE DATA & MECHANICS
============================================================= */

const SUITS  = ['♠','♥','♦','♣'];
const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RED_SUITS = new Set(['♥','♦']);

const OFFSET_DOWN = 22;
const OFFSET_UP   = 30;
const DRAG_THRESHOLD = 6; 

let stock       = [];
let waste       = [];
let foundations = [[],[],[],[]];
let tableau     = Array.from({length: 7}, () => []);

let selected      = null;  
let moves         = 0;
let seconds       = 0;
let timerInterval = null;
let gameWon       = false;

let drag = {
  active    : false,
  pointerId : null,
  src       : null,   
  col       : null,
  startIdx  : null,
  cards     : [],
  sourceEl  : null,    
  ghostOffX : 0,
  ghostOffY : 0,
  startX    : 0,
  startY    : 0,
  moved     : false,
};

const ghostEl = document.getElementById('drag-ghost');

const isRed   = suit => RED_SUITS.has(suit);
const cardVal = c => VALUES.indexOf(c.value);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function newGame() {
  clearInterval(timerInterval);
  resetDragState();
  seconds = 0; moves = 0; selected = null; gameWon = false;

  document.getElementById('timer').textContent      = '00:00';
  document.getElementById('move-count').textContent = '0';
  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('auto-btn').style.display = 'none';

  let deck = [];
  for (const suit of SUITS)
    for (const value of VALUES)
      deck.push({ suit, value, faceUp: false });

  shuffle(deck);
  foundations = [[], [], [], []];
  tableau     = Array.from({length: 7}, () => []);
  waste       = [];
  stock       = [];

  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck.pop();
      card.faceUp = (row === col);
      tableau[col].push(card);
    }
  }

  stock = deck.map(c => ({ ...c, faceUp: false }));
  render();

  timerInterval = setInterval(() => {
    seconds++;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    document.getElementById('timer').textContent =
      `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }, 1000);
}

function render() {
  renderStock();
  renderWaste();
  for (let i = 0; i < 4; i++) renderFoundation(i);
  for (let i = 0; i < 7; i++) renderTableau(i);
  checkAutoComplete();
}

function renderStock() {
  const el = document.getElementById('stock');
  if (!el) return;
  el.innerHTML = stock.length > 0
    ? '<div class="card face-down" style="pointer-events:none"></div>'
    : '';
}

function renderWaste() {
  const el = document.getElementById('waste');
  if (!el) return;
  el.innerHTML = '';
  if (!waste.length) return;

  const c     = waste[waste.length - 1];
  const cls   = isRed(c.suit) ? 'red' : 'black';
  const isSel = selected && selected.src === 'waste';

  const div = document.createElement('div');
  div.className = `card face-up ${cls}${isSel ? ' selected' : ''}`;
  div.innerHTML = faceHTML(c);

  div.addEventListener('click', e => { e.stopPropagation(); clickWaste(); });
  attachDragHandlers(div, { src: 'waste', cards: [c] });

  el.appendChild(div);
}

function renderFoundation(i) {
  const el = document.getElementById(`f${i}`);
  if (!el) return;
  const cards = foundations[i];
  el.innerHTML = `<span class="foundation-label">${SUITS[i]}</span>`;

  if (!cards.length) return;

  const c   = cards[cards.length - 1];
  const cls = isRed(c.suit) ? 'red' : 'black';
  const div = document.createElement('div');
  div.className = `card face-up ${cls}`;
  div.style.pointerEvents = 'none';
  div.innerHTML = faceHTML(c);
  el.appendChild(div);
}

function renderTableau(col) {
  const el = document.getElementById(`col${col}`);
  if (!el) return;
  const cards = tableau[col];
  el.innerHTML = '';

  let totalH = 130;
  if (cards.length > 0) {
    let h = 0;
    for (const c of cards) h += (c.faceUp ? OFFSET_UP : OFFSET_DOWN);
    totalH = Math.max(130, h + 90);
  }
  el.style.height = totalH + 'px';

  let top = 0;
  cards.forEach((card, idx) => {
    const isLast = idx === cards.length - 1;
    const isSel = selected && selected.src === 'tableau'
      && selected.col === col && selected.startIdx <= idx;

    const div = document.createElement('div');
    div.style.cssText = `position:absolute;left:0;right:0;top:${top}px;z-index:${idx + 1}`;

    if (!card.faceUp) {
      div.className = 'card face-down tableau-card';
      div.style.height = '60px';
    } else {
      const cls = isRed(card.suit) ? 'red' : 'black';
      div.className = `card face-up ${cls} tableau-card${isSel ? ' selected' : ''}`;
      div.style.height    = isLast ? 'auto' : '60px';
      div.style.minHeight = '40px';
      div.innerHTML       = faceHTML(card);

      div.addEventListener('click', e => { e.stopPropagation(); clickTableauCard(col, idx); });

      attachDragHandlers(div, {
        src      : 'tableau',
        col,
        startIdx : idx,
        cards    : tableau[col].slice(idx),
      });
    }

    el.appendChild(div);
    top += card.faceUp ? OFFSET_UP : OFFSET_DOWN;
  });

  el.onclick = () => { if (!cards.length) clickTableauEmpty(col); };
}

function faceHTML(card) {
  return `
    <div class="card-corner-top">
      <div>${card.value}</div>
      <div>${card.suit}</div>
    </div>
    <div class="card-suit-center">${card.suit}</div>
    <div class="card-corner-bottom">
      <div>${card.value}</div>
      <div>${card.suit}</div>
    </div>`;
}

/* =============================================================
   POINTER EVENTS POOL (DRAG & DROP ENGINE)
============================================================= */

function attachDragHandlers(el, meta) {
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return; 
    e.stopPropagation();

    drag.active    = true;
    drag.pointerId = e.pointerId;
    drag.src       = meta.src;
    drag.col       = meta.col;
    drag.startIdx  = meta.startIdx;
    drag.cards     = meta.cards;
    drag.sourceEl  = el;
    drag.startX    = e.clientX;
    drag.startY    = e.clientY;
    drag.moved     = false;

    const rect = el.getBoundingClientRect();
    drag.ghostOffX = e.clientX - rect.left;
    drag.ghostOffY = e.clientY - rect.top;

    try { el.setPointerCapture(e.pointerId); } catch (err) { }
  });

  el.addEventListener('pointermove', e => {
    if (!drag.active || e.pointerId !== drag.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      selected = null; 
      buildGhost(drag.cards);
      if (ghostEl) ghostEl.style.display = 'flex';
      if (drag.sourceEl) drag.sourceEl.style.opacity = '0.3';
    }

    if (ghostEl) {
      ghostEl.style.left = (e.clientX - drag.ghostOffX) + 'px';
      ghostEl.style.top  = (e.clientY - drag.ghostOffY) + 'px';
    }

    highlightDropZones(e.clientX, e.clientY);
  });

  el.addEventListener('pointerup', e => {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    finishDrag(e.clientX, e.clientY);
  });

  el.addEventListener('pointercancel', e => {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    finishDrag(null, null);
  });
}

function finishDrag(clientX, clientY) {
  const wasMoved = drag.moved;
  const target = (wasMoved && clientX !== null) ? getDropTarget(clientX, clientY) : null;

  if (drag.sourceEl) drag.sourceEl.style.opacity = '';

  if (ghostEl) {
    ghostEl.style.display = 'none';
    ghostEl.innerHTML = '';
  }
  clearDropHighlights();

  const dragData = {
    src: drag.src, col: drag.col, startIdx: drag.startIdx, cards: drag.cards,
  };

  resetDragState();

  if (wasMoved && target) {
    selected = dragData;
    if (target.type === 'foundation') {
      placeOnFoundation(target.fi);   
    } else if (target.type === 'tableau') {
      placeOnTableau(target.col);     
    } else {
      render(); 
    }
  } else if (wasMoved) {
    render();
  }
}

function resetDragState() {
  drag.active    = false;
  drag.pointerId = null;
  drag.src       = null;
  drag.col       = null;
  drag.startIdx  = null;
  drag.cards     = [];
  drag.sourceEl  = null;
  drag.moved     = false;
}

function buildGhost(cards) {
  if (!ghostEl) return;
  ghostEl.innerHTML = '';
  cards.forEach((card, i) => {
    const cls = isRed(card.suit) ? 'red' : 'black';
    const div = document.createElement('div');
    div.className = `card face-up ${cls}`;
    if (i > 0) div.style.marginTop = '-70px'; 
    div.innerHTML = faceHTML(card);
    ghostEl.appendChild(div);
  });
}

function getDropTarget(cx, cy) {
  if (!drag.cards.length) return null;

  if (drag.cards.length === 1) {
    for (let fi = 0; fi < 4; fi++) {
      const el = document.getElementById(`f${fi}`);
      if (el && pointInRect(el, cx, cy) && canMoveToFoundation(drag.cards[0], fi)) {
        return { type: 'foundation', fi };
      }
    }
  }

  for (let col = 0; col < 7; col++) {
    const el = document.getElementById(`col${col}`);
    if (el && pointInRect(el, cx, cy) && canMoveToTableau(drag.cards[0], col)) {
      return { type: 'tableau', col };
    }
  }

  return null;
}

function pointInRect(el, cx, cy) {
  const r = el.getBoundingClientRect();
  return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
}

function highlightDropZones(cx, cy) {
  clearDropHighlights();
  if (!drag.active || !drag.cards.length) return;

  if (drag.cards.length === 1) {
    for (let fi = 0; fi < 4; fi++) {
      const el = document.getElementById(`f${fi}`);
      if (el && pointInRect(el, cx, cy) && canMoveToFoundation(drag.cards[0], fi)) {
        el.classList.add('drop-target-valid');
      }
    }
  }
  for (let col = 0; col < 7; col++) {
    const el = document.getElementById(`col${col}`);
    if (el && pointInRect(el, cx, cy) && canMoveToTableau(drag.cards[0], col)) {
      el.classList.add('drop-target-valid');
    }
  }
}

function clearDropHighlights() {
  document.querySelectorAll('.drop-target-valid')
    .forEach(el => el.classList.remove('drop-target-valid'));
}

/* =============================================================
   CLIQUE-CLIQUE LOGIC INTERACTION
============================================================= */

function clickStock() {
  if (stock.length === 0) {
    if (!waste.length) return;
    stock = waste.reverse().map(c => ({ ...c, faceUp: false }));
    waste = [];
    countMove();
  } else {
    const c = stock.pop();
    c.faceUp = true;
    waste.push(c);
    countMove();
  }
  selected = null;
  render();
}

function clickWaste() {
  if (!waste.length) return;
  if (selected && selected.src === 'waste') { selected = null; render(); return; }

  const c = waste[waste.length - 1];
  if (tryAutoFoundation({ src: 'waste', cards: [c] })) return;

  selected = { src: 'waste', cards: [c] };
  render();
}

function clickFoundation(fi) {
  if (!selected) return;
  if (canMoveToFoundation(selected.cards[0], fi)) placeOnFoundation(fi);
}

function clickTableauCard(col, idx) {
  const card = tableau[col][idx];
  if (!card.faceUp) return;

  if (selected) {
    if (selected.src === 'tableau' && selected.col === col) {
      selected = null; render(); return;
    }
    if (canMoveToTableau(selected.cards[0], col)) { placeOnTableau(col); return; }
    selected = null;
  }

  const cardsFromHere = tableau[col].slice(idx);
  if (tryAutoFoundation({ src: 'tableau', col, startIdx: idx, cards: cardsFromHere })) return;

  selected = { src: 'tableau', col, startIdx: idx, cards: cardsFromHere };
  render();
}

function clickTableauEmpty(col) {
  if (!selected) return;
  if (selected.cards[0].value === 'K') placeOnTableau(col);
}

function canMoveToFoundation(card, fi) {
  const f = foundations[fi];
  if (f.length === 0) return card.value === 'A';
  const top = f[f.length - 1];
  return card.suit === top.suit && cardVal(card) === cardVal(top) + 1;
}

function canMoveToTableau(card, col) {
  const tc = tableau[col];
  if (tc.length === 0) return card.value === 'K';
  const top = tc[tc.length - 1];
  if (!top.faceUp) return false;
  return isRed(card.suit) !== isRed(top.suit) && cardVal(card) === cardVal(top) - 1;
}

function tryAutoFoundation(sel) {
  if (sel.cards.length !== 1) return false;
  const c = sel.cards[0];
  for (let fi = 0; fi < 4; fi++) {
    if (canMoveToFoundation(c, fi)) {
      selected = sel;
      placeOnFoundation(fi);
      return true;
    }
  }
  return false;
}

function placeOnFoundation(fi) {
  if (!selected) return;
  const c = selected.cards[0];

  if (selected.src === 'waste') {
    waste.pop();
  } else if (selected.src === 'tableau') {
    tableau[selected.col].pop();
    flipLastCard(selected.col);
  }

  foundations[fi].push(c);
  selected = null;
  countMove();
  render();
  checkWin();
}

function placeOnTableau(col) {
  if (!selected) return;
  const cards = selected.cards;

  if (selected.src === 'waste') {
    waste.pop();
  } else if (selected.src === 'tableau') {
    tableau[selected.col].splice(selected.startIdx);
    flipLastCard(selected.col);
  }

  tableau[col].push(...cards);
  selected = null;
  countMove();
  render();
}

function flipLastCard(col) {
  const tc = tableau[col];
  if (tc.length > 0 && !tc[tc.length - 1].faceUp)
    tc[tc.length - 1].faceUp = true;
}

function countMove() {
  moves++;
  document.getElementById('move-count').textContent = moves;
}

/* =============================================================
   AUTO-COMPLETE / SOLVER SYSTEMS
============================================================= */

function checkWin() {
  if (!foundations.every(f => f.length === 13)) return;

  clearInterval(timerInterval);
  gameWon = true;

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  document.getElementById('win-stats').textContent =
    `Tempo: ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} · ${moves} movimentos`;
  document.getElementById('win-overlay').classList.add('show');
}

function checkAutoComplete() {
  if (gameWon) return;
  const allVisible =
    tableau.every(col => col.every(c => c.faceUp)) &&
    stock.length === 0 &&
    waste.length === 0;

  document.getElementById('auto-btn').style.display = allVisible ? 'block' : 'none';
}

function autoComplete() {
  if (gameWon) return;

  function step() {
    for (let col = 0; col < 7; col++) {
      const tc = tableau[col];
      if (!tc.length) continue;
      const c = tc[tc.length - 1];
      for (let fi = 0; fi < 4; fi++) {
        if (canMoveToFoundation(c, fi)) {
          tc.pop();
          foundations[fi].push(c);
          countMove();
          render();
          checkWin();
          if (!gameWon) setTimeout(step, 60);
          return;
        }
      }
    }
    if (waste.length) {
      const c = waste[waste.length - 1];
      for (let fi = 0; fi < 4; fi++) {
        if (canMoveToFoundation(c, fi)) {
          waste.pop();
          foundations[fi].push(c);
          countMove();
          render();
          checkWin();
          if (!gameWon) setTimeout(step, 60);
          return;
        }
      }
    }
  }
  step();
}

// Inicializa o tabuleiro no carregamento do script
newGame();