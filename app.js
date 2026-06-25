/* =============================================================
   KLONDIKE SOLITAIRE PWA ENGINE — COM AUTO-SAVE 
============================================================= */

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RED_SUITS = new Set(['♥', '♦']);

const OFFSET_DOWN = 22;
const OFFSET_UP = 30;
const DRAG_THRESHOLD = 6;

let stock = [];
let waste = [];
let foundations = [
    [],
    [],
    [],
    []
];
let tableau = Array.from({ length: 7 }, () => []);

let selected = null;
let moves = 0;
let seconds = 0;
let timerInterval = null;
let gameWon = false;
let score = 0;
let historyStack = [];
let hasMixed = false; // NOVA VARIÁVEL


let drag = {
    active: false,
    pointerId: null,
    src: null,
    col: null,
    startIdx: null,
    cards: [],
    sourceEl: null,
    ghostOffX: 0,
    ghostOffY: 0,
    startX: 0,
    startY: 0,
    moved: false
};


const ghostEl = document.getElementById('drag-ghost');
const isRed = suit => RED_SUITS.has(suit);
const cardVal = c => VALUES.indexOf(c.value);

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// =================================================================
// MOTOR DE AUTO-SAVE (IMPEDE A TRAPAÇA DO F5)
// =================================================================
function salvarEstadoAtual() {
    if (gameWon) return;
    const state = {
        stock,
        waste,
        foundations,
        tableau,
        moves,
        seconds,
        score,
        historyStack,
        gameWon,
        hasMixed
    };
    localStorage.setItem('solitaire_saved_game', JSON.stringify(state));
}

function carregarOuIniciarJogo() {
    const saved = localStorage.getItem('solitaire_saved_game');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            stock = state.stock;
            waste = state.waste;
            foundations = state.foundations;
            tableau = state.tableau;
            moves = state.moves;
            seconds = state.seconds;
            score = state.score || 0;
            historyStack = state.historyStack || [];
            gameWon = state.gameWon || false;
            hasMixed = state.hasMixed || false; // Carrega a "ficha suja" se houver

            atualizarDisplayEstatisticas();
            document.getElementById('move-count').textContent = moves;

            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                seconds++;
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                document.getElementById('timer').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
                salvarEstadoAtual();
            }, 1000);

            render();
            return;
        } catch (e) {
            console.error("Erro ao recuperar jogo salvo", e);
        }
    }
    newGame();
}

function saveState() {
    const state = {
        stock: stock.map(c => ({...c })),
        waste: waste.map(c => ({...c })),
        foundations: foundations.map(f => f.map(c => ({...c }))),
        tableau: tableau.map(t => t.map(c => ({...c }))),
        moves: moves,
        score: score
    };
    historyStack.push(state);
}

function desfazerJogada() {
    if (historyStack.length === 0) return;
    const prevState = historyStack.pop();
    stock = prevState.stock;
    waste = prevState.waste;
    foundations = prevState.foundations;
    tableau = prevState.tableau;
    moves = prevState.moves;
    score = prevState.score;
    selected = null;
    document.getElementById('move-count').textContent = moves;

    salvarEstadoAtual(); // Salva após voltar a jogada
    render();
}

// =================================================================
// GERENCIAMENTO DE MODAIS E DERROTAS
// =================================================================

let acaoConfirmada = null;

function abrirConfirmacao(titulo, mensagem, callbackAcao) {
    document.getElementById('confirm-title').textContent = titulo;
    document.getElementById('confirm-msg').textContent = mensagem;
    acaoConfirmada = callbackAcao;
    document.getElementById('confirm-overlay').classList.add('show');
}

function fecharConfirmacao() {
    document.getElementById('confirm-overlay').classList.remove('show');
    acaoConfirmada = null;
}

function executarConfirmacao() {
    if (acaoConfirmada) {
        const acao = acaoConfirmada;
        acaoConfirmada = null; // Esvazia a ação imediatamente para evitar cliques duplos
        acao();
    }
    fecharConfirmacao();
}

function obterEstatistica(chave) { return parseInt(localStorage.getItem(chave) || '0'); }

function salvarNovaDerrota() {
    const total = obterEstatistica('solitaire_loss_count') + 1;
    localStorage.setItem('solitaire_loss_count', total.toString());
    atualizarDisplayEstatisticas();
}

function atualizarDisplayEstatisticas() {
    const elWin = document.getElementById('win-count');
    if (elWin) elWin.textContent = obterEstatistica('solitaire_win_count');

    const elLoss = document.getElementById('loss-count');
    if (elLoss) elLoss.textContent = obterEstatistica('solitaire_loss_count');
}

function pedirNovoJogo() {
    if (moves === 0 || gameWon) {
        // Se o jogo nem começou direito ou já foi vencido, recomeça direto sem perguntar
        newGame();
    } else if (hasMixed) {
        // Se a derrota já foi cobrada no botão de Misturar, apenas confirma se quer sair
        abrirConfirmacao('Novo Jogo', 'Deseja abandonar esta partida e começar uma nova?', () => {
            newGame(); // Inicia o jogo sem rodar o salvarNovaDerrota()
        });
    } else {
        // Se a ficha está limpa, avisa que o abandono custará uma derrota
        abrirConfirmacao('Atenção', 'O jogo atual ainda não terminou. Deseja abandoná-lo? Isso contará como uma derrota.', () => {
            salvarNovaDerrota();
            newGame();
        });
    }
}

// =================================================================
// NOVO JOGO E RENDERIZAÇÃO
// =================================================================

function newGame() {
    clearInterval(timerInterval);
    resetDragState();
    seconds = 0;
    moves = 0;
    score = 0;
    selected = null;
    gameWon = false;
    historyStack = [];
    hasMixed = false;

    // A MÁGICA: Garante que os botões do topo SEMPRE iniciem destravados
    document.getElementById('controls').style.pointerEvents = 'auto';

    document.getElementById('timer').textContent = '00:00';
    document.getElementById('move-count').textContent = '0';
    document.getElementById('win-overlay').classList.remove('show');
    document.getElementById('auto-btn').style.display = 'none';

    atualizarDisplayEstatisticas();

    let deck = [];
    for (const suit of SUITS)
        for (const value of VALUES)
            deck.push({ suit, value, faceUp: false });

    shuffle(deck);
    foundations = [
        [],
        [],
        [],
        []
    ];
    tableau = Array.from({ length: 7 }, () => []);
    waste = [];
    stock = [];

    for (let col = 0; col < 7; col++) {
        for (let row = 0; row <= col; row++) {
            const card = deck.pop();
            card.faceUp = (row === col);
            tableau[col].push(card);
        }
    }

    stock = deck.map(c => ({...c, faceUp: false }));

    salvarEstadoAtual();
    render();

    timerInterval = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        document.getElementById('timer').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        salvarEstadoAtual();
    }, 1000);
}

function render() {
    renderStock();
    renderWaste();
    for (let i = 0; i < 4; i++) renderFoundation(i);
    for (let i = 0; i < 7; i++) renderTableau(i);
    checkAutoComplete();

    // Atualiza os contadores no topo
    const elStockCount = document.getElementById('stock-count');
    const elWasteCount = document.getElementById('waste-count');
    if (elStockCount) elStockCount.textContent = stock.length;
    if (elWasteCount) elWasteCount.textContent = waste.length;
}

function renderStock() {
    const el = document.getElementById('stock');
    if (!el) return;
    el.innerHTML = stock.length > 0 ? '<div class="card face-down" style="pointer-events:none"></div>' : '';
}

function renderWaste() {
    const el = document.getElementById('waste');
    if (!el) return;
    el.innerHTML = '';
    if (!waste.length) return;

    const c = waste[waste.length - 1];
    const cls = isRed(c.suit) ? 'red' : 'black';
    const isSel = selected && selected.src === 'waste';

    const div = document.createElement('div');
    div.id = 'card-waste-top';
    div.className = `card face-up ${cls}${isSel ? ' selected' : ''}`;
    div.innerHTML = faceHTML(c);
    div.addEventListener('click', e => {
        e.stopPropagation();
        tratarCliqueCard('waste', null, null);
    });
    attachDragHandlers(div, { src: 'waste', cards: [c] });
    el.appendChild(div);
}

function renderFoundation(i) {
    const el = document.getElementById(`f${i}`);
    if (!el) return;
    const cards = foundations[i];
    el.innerHTML = `<span class="foundation-label">${SUITS[i]}</span>`;

    if (!cards.length) return;

    const c = cards[cards.length - 1];
    const cls = isRed(c.suit) ? 'red' : 'black';
    const div = document.createElement('div');
    div.id = `card-foundation-${i}`;
    div.className = `card face-up ${cls}`;
    div.addEventListener('click', e => {
        e.stopPropagation();
        tratarCliqueCard('foundation', i, null);
    });
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
        const isSel = selected && selected.src === 'tableau' && selected.col === col && selected.startIdx <= idx;

        const div = document.createElement('div');
        const clickHeight = isLast ? 'auto' : (card.faceUp ? OFFSET_UP : OFFSET_DOWN) + 'px';
        div.style.cssText = `position:absolute;left:0;right:0;top:${top}px;z-index:${idx + 1};height:${clickHeight};overflow:visible;`;

        const cardDiv = document.createElement('div');
        if (!card.faceUp) {
            cardDiv.className = 'card face-down';
            cardDiv.style.height = '100%';
        } else {
            const cls = isRed(card.suit) ? 'red' : 'black';
            cardDiv.id = `card-tableau-${col}-${idx}`;
            const stackedClass = isLast ? '' : ' card-stacked-hidden';

            cardDiv.className = `card face-up ${cls}${isSel ? ' selected' : ''}${stackedClass}`;
            cardDiv.style.height = isLast ? '100%' : '115px';
            cardDiv.innerHTML = faceHTML(card);

            cardDiv.addEventListener('click', e => {
                e.stopPropagation();
                tratarCliqueCard('tableau', col, idx);
            });
            attachDragHandlers(cardDiv, { src: 'tableau', col, startIdx: idx, cards: tableau[col].slice(idx) });
        }

        div.appendChild(cardDiv);
        el.appendChild(div);
        top += card.faceUp ? OFFSET_UP : OFFSET_DOWN;
    });

    el.onclick = () => { if (!cards.length) clickTableauEmpty(col); };
}

function faceHTML(card) {
    const valorCentral = card.value === '10' ? '10' : card.value;
    return `
    <div class="card-corner-top"><div>${card.value}</div><div>${card.suit}</div></div>
    <div class="card-center-large"><div class="card-center-value">${valorCentral}</div><div class="card-center-suit">${card.suit}</div></div>
    <div class="card-corner-bottom"><div>${card.value}</div><div>${card.suit}</div></div>`;
}

// =================================================================
// RECURSOS EXTRAS: REDISTRIBUIR, TOAST E DICA DINÂMICA
// =================================================================

let toastTimeout;

function mostrarToast(msg) {
    const toast = document.getElementById('toast-msg');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

function pedirRedistribuicao() {
    // 1. TRAVA INTELIGENTE: Impede a mistura inútil
    if (stock.length === 0 && waste.length === 0) {
        mostrarToast("Não adianta misturar! Sem cartas no maço ou descarte, nenhuma carta nova seria revelada.");
        return; // Interrompe a função aqui e não faz a mistura
    }

    // 2. Isolamos toda a mágica do redemoinho nesta função interna
    const executarMistura = () => {
        document.getElementById('controls').style.pointerEvents = 'none';

        const todasAsCartas = document.querySelectorAll('.card');
        todasAsCartas.forEach(carta => carta.classList.add('anim-recolher'));

        setTimeout(() => {
            if (!hasMixed) {
                salvarNovaDerrota();
                hasMixed = true;
            }

            let pool = [];
            pool.push(...waste);
            waste = [];
            pool.push(...stock);
            stock = [];

            let colFaceDownCounts = [0, 0, 0, 0, 0, 0, 0];
            for (let i = 0; i < 7; i++) {
                let faceDowns = tableau[i].filter(c => !c.faceUp);
                colFaceDownCounts[i] = faceDowns.length;
                pool.push(...faceDowns);
                tableau[i] = tableau[i].filter(c => c.faceUp);
            }

            shuffle(pool);

            for (let i = 0; i < 7; i++) {
                let newFaceDowns = [];
                for (let j = 0; j < colFaceDownCounts[i]; j++) {
                    let c = pool.pop();
                    c.faceUp = false;
                    newFaceDowns.push(c);
                }
                tableau[i] = [...newFaceDowns, ...tableau[i]];
            }

            stock = pool.map(c => ({...c, faceUp: false }));

            moves++;
            historyStack = [];
            document.getElementById('move-count').textContent = moves;
            salvarEstadoAtual();

            render();

            const novasCartas = document.querySelectorAll('.card');
            novasCartas.forEach(carta => carta.classList.add('anim-distribuir'));

            setTimeout(() => {
                novasCartas.forEach(carta => carta.classList.remove('anim-distribuir'));
                document.getElementById('controls').style.pointerEvents = 'auto';
            }, 600);

            mostrarToast("Cartas redistribuídas com sucesso!");

        }, 600);
    };

    // 3. A Lógica do Alerta (A Gangorra)
    if (!hasMixed) {
        abrirConfirmacao(
            'Misturar Cartas',
            'Deseja redistribuir todas as cartas fechadas e o maço? Isso contará como uma DERROTA.',
            executarMistura
        );
    } else {
        executarMistura();
    }
}

let hintState = { moves: -1, index: 0, list: [] };

function obterDica() {
    if (hintState.moves !== moves) {
        let list = new Set();

        for (let col = 0; col < 7; col++) {
            if (!tableau[col].length) continue;
            const c = tableau[col][tableau[col].length - 1];
            for (let fi = 0; fi < 4; fi++)
                if (canMoveToFoundation(c, fi)) { list.add(`card-tableau-${col}-${tableau[col].length - 1}`); break; }
        }

        if (waste.length) {
            const c = waste[waste.length - 1];
            for (let fi = 0; fi < 4; fi++)
                if (canMoveToFoundation(c, fi)) { list.add('card-waste-top'); break; }
        }

        for (let colOrigem = 0; colOrigem < 7; colOrigem++) {
            const tc = tableau[colOrigem];
            for (let idx = 0; idx < tc.length; idx++) {
                if (!tc[idx].faceUp) continue;
                if (idx === 0 && tc[idx].value === 'K') continue;
                for (let colDestino = 0; colDestino < 7; colDestino++) {
                    if (colOrigem === colDestino) continue;
                    if (canMoveToTableau(tc[idx], colDestino)) { list.add(`card-tableau-${colOrigem}-${idx}`); break; }
                }
            }
        }

        if (waste.length) {
            const c = waste[waste.length - 1];
            for (let col = 0; col < 7; col++)
                if (canMoveToTableau(c, col)) { list.add('card-waste-top'); break; }
        }

        let temCartaUtilNoMaco = false;
        const cartasOcultas = [...stock];
        if (waste.length > 1) cartasOcultas.push(...waste.slice(0, -1));

        for (const c of cartasOcultas) {
            for (let fi = 0; fi < 4; fi++) { if (canMoveToFoundation(c, fi)) { temCartaUtilNoMaco = true; break; } }
            if (temCartaUtilNoMaco) break;
            for (let col = 0; col < 7; col++) { if (canMoveToTableau(c, col)) { temCartaUtilNoMaco = true; break; } }
            if (temCartaUtilNoMaco) break;
        }

        if (temCartaUtilNoMaco) list.add('stock');

        hintState.list = Array.from(list);
        hintState.moves = moves;
        hintState.index = 0;
    }

    if (hintState.list.length === 0) {
        mostrarToast("Sem jogadas possíveis. Tente redistribuir as cartas (🔀).");
        return;
    }
    if (hintState.index >= hintState.list.length) {
        mostrarToast("Não há novas dicas! Faça um movimento para reavaliar.");
        return;
    }

    destacarElementoDica(hintState.list[hintState.index]);
    hintState.index++;
}

function destacarElementoDica(idElemento) {
    const el = document.getElementById(idElemento);
    if (!el) return;
    el.classList.remove('hint-highlight');
    void el.offsetWidth;
    el.classList.add('hint-highlight');
    setTimeout(() => el.classList.remove('hint-highlight'), 1600);
}

// =================================================================
// LÓGICAS NUCLEARES DE MOVIMENTO E DRAG
// =================================================================

function tratarCliqueCard(src, identifier, idx) {
    let cardMover = null;
    let packMover = [];
    if (src === 'waste') {
        if (!waste.length) return;
        cardMover = waste[waste.length - 1];
        packMover = [cardMover];
    } else if (src === 'foundation') {
        if (!foundations[identifier].length) return;
        cardMover = foundations[identifier][foundations[identifier].length - 1];
        packMover = [cardMover];
    } else if (src === 'tableau') {
        cardMover = tableau[identifier][idx];
        packMover = tableau[identifier].slice(idx);
    }

    if (packMover.length === 1) {
        for (let fi = 0; fi < 4; fi++) {
            if (canMoveToFoundation(cardMover, fi)) {
                saveState();
                executarRemocaoOrigem(src, identifier, idx);
                foundations[fi].push(cardMover);
                finalizarAcaoMovimento();
                return;
            }
        }
    }
    for (let col = 0; col < 7; col++) {
        if (src === 'tableau' && identifier === col) continue;
        if (canMoveToTableau(cardMover, col)) {
            saveState();
            executarRemocaoOrigem(src, identifier, idx);
            tableau[col].push(...packMover);
            finalizarAcaoMovimento();
            return;
        }
    }
}

function executarRemocaoOrigem(src, identifier, idx) {
    if (src === 'waste') waste.pop();
    else if (src === 'foundation') foundations[identifier].pop();
    else if (src === 'tableau') {
        tableau[identifier].splice(idx);
        flipLastCard(identifier);
    }
}

function finalizarAcaoMovimento() {
    selected = null;
    countMove();
    salvarEstadoAtual();
    render();
    checkWin();
}

function clickStock() {
    saveState();
    if (stock.length === 0) {
        if (!waste.length) return;
        stock = waste.reverse().map(c => ({...c, faceUp: false }));
        waste = [];
        countMove();
    } else {
        const c = stock.pop();
        c.faceUp = true;
        waste.push(c);
        countMove();
    }
    selected = null;
    salvarEstadoAtual();
    render();
}

function clickTableauEmpty(col) {
    if (!selected) return;
    if (selected.cards[0].value === 'K') {
        saveState();
        placeOnTableau(col);
    }
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

function placeOnFoundation(fi) {
    if (!selected) return;
    const c = selected.cards[0];
    executarRemocaoOrigem(selected.src, selected.col, selected.startIdx);
    foundations[fi].push(c);
    finalizarAcaoMovimento();
}

function placeOnTableau(col) {
    if (!selected) return;
    const cards = selected.cards;
    executarRemocaoOrigem(selected.src, selected.col, selected.startIdx);
    tableau[col].push(...cards);
    finalizarAcaoMovimento();
}

function flipLastCard(col) {
    const tc = tableau[col];
    if (tc.length > 0 && !tc[tc.length - 1].faceUp) tc[tc.length - 1].faceUp = true;
}

function countMove() {
    moves++;
    document.getElementById('move-count').textContent = moves;
}

function checkWin() {
    if (!foundations.every(f => f.length === 13)) return;
    clearInterval(timerInterval);
    gameWon = true;

    // Só dá a vitória se o jogador não tiver apelado pro botão de misturar
    if (!hasMixed) {
        const totalVitorias = obterEstatistica('solitaire_win_count') + 1;
        localStorage.setItem('solitaire_win_count', totalVitorias.toString());
        atualizarDisplayEstatisticas();
    }

    localStorage.removeItem('solitaire_saved_game');

    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    // Monta a mensagem de vitória
    let winMsg = `Tempo: ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} · ${moves} movimentos`;
    if (hasMixed) {
        winMsg += "<br><br><span style='color: #e11d48; font-size: 12px;'><em>(Esta vitória não contou no placar porque as cartas foram misturadas)</em></span>";
    }

    document.getElementById('win-stats').innerHTML = winMsg;
    document.getElementById('win-overlay').classList.add('show');
}

/* =============================================================
   POINTER EVENTS / DRAG
============================================================= */

function attachDragHandlers(el, meta) {
    el.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.stopPropagation();
        drag.active = true;
        drag.pointerId = e.pointerId;
        drag.src = meta.src;
        drag.col = meta.col;
        drag.startIdx = meta.startIdx;
        drag.cards = meta.cards;
        drag.sourceEl = el;
        drag.startX = e.clientX;
        drag.startY = e.clientY;
        drag.moved = false;
        const rect = el.getBoundingClientRect();
        drag.ghostOffX = e.clientX - rect.left;
        drag.ghostOffY = e.clientY - rect.top;
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
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
            ghostEl.style.top = (e.clientY - drag.ghostOffY) + 'px';
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
    const dragData = { src: drag.src, col: drag.col, startIdx: drag.startIdx, cards: drag.cards };
    resetDragState();

    if (wasMoved && target) {
        saveState();
        selected = dragData;
        if (target.type === 'foundation') placeOnFoundation(target.fi);
        else if (target.type === 'tableau') placeOnTableau(target.col);
    } else if (wasMoved) { render(); }
}

function resetDragState() {
    drag.active = false;
    drag.pointerId = null;
    drag.src = null;
    drag.col = null;
    drag.startIdx = null;
    drag.cards = [];
    drag.sourceEl = null;
    drag.moved = false;
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
            if (el && pointInRect(el, cx, cy) && canMoveToFoundation(drag.cards[0], fi)) return { type: 'foundation', fi };
        }
    }
    for (let col = 0; col < 7; col++) {
        const el = document.getElementById(`col${col}`);
        if (el && pointInRect(el, cx, cy) && canMoveToTableau(drag.cards[0], col)) return { type: 'tableau', col };
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
            if (el && pointInRect(el, cx, cy) && canMoveToFoundation(drag.cards[0], fi)) el.classList.add('drop-target-valid');
        }
    }
    for (let col = 0; col < 7; col++) {
        const el = document.getElementById(`col${col}`);
        if (el && pointInRect(el, cx, cy) && canMoveToTableau(drag.cards[0], col)) el.classList.add('drop-target-valid');
    }
}

function clearDropHighlights() { document.querySelectorAll('.drop-target-valid').forEach(el => el.classList.remove('drop-target-valid')); }
/* =============================================================
   AUTO-COMPLETE AUTO RESOLVER (ATUALIZADO)
============================================================= */
/* =============================================================
   AUTO-COMPLETE AUTO RESOLVER (ATUALIZADO)
============================================================= */
function checkAutoComplete() {
    if (gameWon) return;

    // Checa se todas as cartas do Tableau estão viradas para cima
    const allVisible = tableau.every(col => col.every(c => c.faceUp));

    const btnAuto = document.getElementById('auto-btn');
    const btnMix = document.getElementById('mix-btn');

    // Gangorra de exibição: se um aparece, o outro some para poupar espaço
    if (allVisible) {
        if (btnAuto) btnAuto.style.display = 'block';
        if (btnMix) btnMix.style.display = 'none';
    } else {
        if (btnAuto) btnAuto.style.display = 'none';
        if (btnMix) btnMix.style.display = 'block';
    }
}

function autoComplete() {
    if (gameWon) return;

    // Desativa os controles manuais para o jogador não atrapalhar o robô
    document.getElementById('controls').style.pointerEvents = 'none';

    function step() {
        if (gameWon) {
            document.getElementById('controls').style.pointerEvents = 'auto';
            return;
        }

        let moveu = false;

        // 1. Tenta mandar cartas das COLUNAS para a Fundação
        for (let col = 0; col < 7; col++) {
            const tc = tableau[col];
            if (!tc.length) continue;
            const c = tc[tc.length - 1];

            for (let fi = 0; fi < 4; fi++) {
                if (canMoveToFoundation(c, fi)) {
                    tc.pop();
                    foundations[fi].push(c);
                    countMove();
                    salvarEstadoAtual();
                    render();
                    checkWin();
                    moveu = true;
                    break;
                }
            }
            if (moveu) break; // Interrompe para rodar o próximo frame da animação
        }

        // 2. Tenta mandar a carta do DESCARTE para a Fundação
        if (!moveu && waste.length) {
            const c = waste[waste.length - 1];
            for (let fi = 0; fi < 4; fi++) {
                if (canMoveToFoundation(c, fi)) {
                    waste.pop();
                    foundations[fi].push(c);
                    countMove();
                    salvarEstadoAtual();
                    render();
                    checkWin();
                    moveu = true;
                    break;
                }
            }
        }

        // 3. O SEGREDO: Se não encontrou jogada na mesa, ele GIRA O MAÇO automaticamente!
        if (!moveu && (stock.length > 0 || waste.length > 0)) {
            if (stock.length === 0) {
                // Reseta o maço
                stock = waste.reverse().map(c => ({...c, faceUp: false }));
                waste = [];
            } else {
                // Puxa uma carta nova
                const c = stock.pop();
                c.faceUp = true;
                waste.push(c);
            }
            countMove();
            salvarEstadoAtual();
            render();
        }

        // Roda o próximo passo do robô a cada 60 milissegundos
        if (!gameWon) setTimeout(step, 60);
    }

    step();
}
// INICIALIZADOR: Checa se tem jogo salvo antes de criar um novo
carregarOuIniciarJogo();