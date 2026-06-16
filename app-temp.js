// =========================================================================
// MOTOR E GERENCIAMENTO DE REPERTÓRIO
// =========================================================================
const dadosIniciaisVazios = {
    musicasGlobais: {},
    listas: {
        "Todas as Músicas": []
    },
    listaAtiva: "Todas as Músicas"
};
let appStorage = {};
let intervaloRolagem = null;
let velocidadGlobalAtual = 10;
let travaTemporariaScroll = false;
let backupTemporarioParaProcessar = null;
const escalaCromatica = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
let intervaloMetronomo = null;
let bpmAtual = 0;
let intervaloContagem = null;


window.addEventListener('load', () => {
    const temaSalvo = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', temaSalvo);

    if (!localStorage.getItem('gelcifras_db')) {
        localStorage.setItem('gelcifras_db', JSON.stringify(dadosIniciaisVazios));
    }
    appStorage = JSON.parse(localStorage.getItem('gelcifras_db'));

    if (!appStorage.configGlobais) appStorage.configGlobais = { delayPartida: 0 };

    if (!appStorage.listas["Todas as Músicas"]) {
        appStorage.listas["Todas as Músicas"] = Object.keys(appStorage.musicasGlobais || {});
    }

    sincronizarEAAplicarInterface();

    window.addEventListener('scroll', () => {
        if (intervaloRolagem && !travaTemporariaScroll) verificarMusicaVisivelNaTela();
    });

    // Verificar se veio de um compartilhamento Android
    processarArquivoCompartilhado();
});

function obterListasOrdenadasChaves() {
    const chaves = Object.keys(appStorage.listas);
    const chavesFiltradas = chaves.filter(c => c !== "Todas as Músicas");
    chavesFiltradas.sort((a, b) => a.localeCompare(b, 'pt-BR', {
        sensitivity: 'base'
    }));
    return ["Todas as Músicas", ...chavesFiltradas];
}
// =========================================================================
// FÁBRICA CENTRAL DE COMPONENTES HTML
// =========================================================================
function gerarHtmlCardMusica(musica, idControle, idRealBanco, isBuscaGlobal = false) {
    const tomExibicao = musica.tomCustomizado || musica.tomOriginal || "C";
    const fonteExibicao = musica.fonteCustomizada || 16;
    const velocidadExibicao = musica.velocidadeCustomizada || 10;
    const bpmExibicao = musica.bpmCustomizado || 0;
    const capoSalvo = musica.capoCustomizado || 0;

    // Se for uma busca global, injeta o letreiro de aviso
    const badgeBusca = isBuscaGlobal ?
        `<div style="font-size:10px;font-weight:700;color:var(--chord-color);margin-bottom:4px;text-transform:uppercase;">🔍 Resultado de Busca Global</div>` :
        '';

    return `
        ${badgeBusca}
        <h2 style="margin:0 0 4px 0;font-size:1.35em;">${escapeHtml(musica.titulo)}</h2>
        <div style="color:var(--text-muted);margin-bottom:12px;font-size:12px;">Por: <strong>${escapeHtml(musica.artista || "Desconhecido")}</strong></div>

        <div class="sub-control-panel">
            <div class="panel-column" style="min-width:115px;">
                <span class="sub-txt-label">Tom <button class="btn-reset-tom" onclick="resetarTomOriginalFabrica('${idControle}', '${escapeHtml(musica.tomOriginal)}')" title="Retornar ao Tom Original">🔄</button></span>
                <div class="adjustment-row">
                    <button class="btn-num" onclick="mudarTomIndividual('${idControle}', -1)">−</button>
                    <span id="tom-txt-${idControle}" class="num-display">${escapeHtml(tomExibicao)}</span>
                    <button class="btn-num" onclick="mudarTomIndividual('${idControle}', 1)">+</button>
                </div>
            </div>
            <div class="panel-column">
                <span class="sub-txt-label">Capo <span id="capo-dica-${idControle}" class="capo-dica-inline"></span> <button class="btn-reset-tom" onclick="resetarCapoOriginal('${idControle}', ${musica.capoOriginal || 0})" title="Restaurar Capo Original">🔄</button></span>
                <div class="adjustment-row">
                    <button class="btn-num" onclick="mudarCapoIndividual('${idControle}', -1)">−</button>
                    <span id="capo-txt-${idControle}" class="num-display">${capoSalvo}</span>
                    <button class="btn-num" onclick="mudarCapoIndividual('${idControle}', 1)">+</button>
                    <input type="hidden" id="capo-select-${idControle}" value="${capoSalvo}">
                </div>
            </div>
            <div class="panel-column">
                <span class="sub-txt-label">Fonte</span>
                <div class="adjustment-row">
                    <button class="btn-num" onclick="mudarFonteIndividual('${idControle}', -1)">−</button>
                    <span id="fonte-txt-${idControle}" class="num-display">${fonteExibicao}</span>
                    <button class="btn-num" onclick="mudarFonteIndividual('${idControle}', 1)">+</button>
                    <input type="hidden" id="fonte-musica-${idControle}" value="${fonteExibicao}">
                </div>
            </div>
            <div class="panel-column">
                <span class="sub-txt-label">Velocidade</span>
                <div class="adjustment-row">
                    <button class="btn-num" onclick="mudarVelocidadeIndividual('${idControle}', -1)">−</button>
                    <span id="vel-txt-${idControle}" class="num-display">${velocidadExibicao}</span>
                    <button class="btn-num" onclick="mudarVelocidadeIndividual('${idControle}', 1)">+</button>
                    <input type="hidden" id="vel-musica-${idControle}" value="${velocidadExibicao}">
                </div>
            </div>
            <div class="panel-column">
                <span class="sub-txt-label">BPM <button class="btn-reset-tom" onclick="resetarBpm('${idControle}')" title="Zerar BPM">🔄</button></span>
                <div class="adjustment-row">
                    <button class="btn-num" onclick="mudarBpmIndividual('${idControle}', -1)">−</button>
                    <span id="bpm-txt-${idControle}" class="num-display">${bpmExibicao}</span>
                    <button class="btn-num" onclick="mudarBpmIndividual('${idControle}', 1)">+</button>
                    <button class="btn-num" onclick="mudarBpmIndividual('${idControle}', 10)" style="font-size:9px;" title="Somar 10">+10</button>
                    <input type="hidden" id="bpm-musica-${idControle}" value="${bpmExibicao}">
                </div>
            </div>
            <div class="panel-column" style="min-width:90px;">
                <span class="sub-txt-label">Edição</span>
                <div class="adjustment-row">
                    <button class="btn-action-card" onclick="abrirPainelVinculacaoLista('${idRealBanco}', '${idControle}')" title="Listas">📋</button>
                    <button class="btn-action-card" style="border-color: var(--chord-color);" onclick="abrirModalEditarCifra('${idRealBanco}')" title="Editar">✏️</button>
                    <button class="btn-action-card" style="border-color:#f87171;" onclick="excluirMusicaGeral('${idRealBanco}')" title="Excluir">🗑️</button>
                    <button class="btn-action-card" onclick="abrirModalOrdenacao('${appStorage.listaAtiva}')" 
        title="Reordenar lista atual">
    ↕️
</button>
                </div>
            </div>
        </div>

        <div id="inline-panel-${idControle}" class="inline-playlist-panel">
            <div style="font-size:11px;font-weight:bold;color:var(--text-muted);margin-bottom:4px;">Exibir esta música em:</div>
            <div id="inline-grid-${idControle}" class="inline-check-grid"></div>
        </div>

        <hr style="border:0;border-top:1px solid var(--border-color);margin:0;">
        <pre id="corpo-cifra-${idControle}" style="font-size: ${fonteExibicao}px;">${processarLinhasTexto(musica.letraCifra)}</pre>
    `;
}

function sincronizarEAAplicarInterface() {
    const seletorLista = document.getElementById("seletor-lista");
    const seletorMusica = document.getElementById("seletor-musica");
    const container = document.getElementById("setlist-container");
    appStorage.listas["Todas as Músicas"] = Object.keys(appStorage.musicasGlobais || {});

    // INJEÇÃO TÁTICA: Escreve o nome da lista no cabeçalho
    const headerNomeLista = document.getElementById("header-nome-lista");
    if (headerNomeLista) {
        headerNomeLista.innerText = appStorage.listaAtiva;
    }

    // ALTERAÇÃO DO SELETOR: Cria o placeholder fixo igual ao das músicas
    seletorLista.innerHTML = '<option value="" disabled selected hidden>Ir para lista…</option>';

    const chavesOrdenadas = obterListasOrdenadasChaves();
    chavesOrdenadas.forEach(nomeLista => {
        let opt = document.createElement("option");
        opt.value = nomeLista;
        opt.text = nomeLista;
        // Removemos o 'opt.selected = true' para que o botão sempre volte para "Ir para lista..."
        seletorLista.appendChild(opt);
    });

    seletorMusica.innerHTML = '<option value="">Ir para música…</option>';
    container.innerHTML = "";

    const idsMusicasDaLista = appStorage.listas[appStorage.listaAtiva] || [];

    if (idsMusicasDaLista.length > 0) {
        // Objeto para normalizar bemóis na hora da renderização
        const norm = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };

        idsMusicasDaLista.forEach((id, index) => {
            const musica = appStorage.musicasGlobais[id];
            if (!musica) return;

            const tomExibicao = musica.tomCustomizado || musica.tomOriginal || "C";
            const fonteExibicao = musica.fonteCustomizada || 16;
            const velocidadExibicao = musica.velocidadeCustomizada || 10;
            const bpmExibicao = musica.bpmCustomizado || 0;

            // --- 1. Extrair índice limpo do tom para não quebrar o data-tom-index ---
            let matchTomExib = tomExibicao.match(/^([A-G][#b]?)/);
            let baseExibicao = matchTomExib ? matchTomExib[1] : "C";
            baseExibicao = norm[baseExibicao] || baseExibicao;
            let idxExibicao = escalaCromatica.indexOf(baseExibicao);
            if (idxExibicao === -1) idxExibicao = 0; // Fallback de segurança

            let opt = document.createElement("option");
            opt.value = `musica-bloco-${index}`;
            opt.text = `${index + 1}. ${escapeHtml(musica.titulo)}`;
            seletorMusica.appendChild(opt);

            const classeOcultamentoInicial = intervaloRolagem ? "sub-control-panel ocultar-dinamico" : "sub-control-panel";

            let bloco = document.createElement("div");
            bloco.className = "cifra-container";
            bloco.id = `musica-bloco-${index}`;
            bloco.setAttribute('data-index', index);
            bloco.setAttribute('data-real-id', id);
            bloco.setAttribute('data-tom-index', idxExibicao); // Usa o índice matemático seguro
            // O HTML gigante foi substituído por esta chamada:
            bloco.innerHTML = gerarHtmlCardMusica(musica, index, id, false);

            container.appendChild(bloco); // <- Mantenha essa linha que já existia logo abaixo

            // --- 2. Transposição correta ao reconstruir a tela para tons menores ---
            if (musica.tomCustomizado && musica.tomCustomizado !== musica.tomOriginal) {
                let matchOrig = musica.tomOriginal.match(/^([A-G][#b]?)/);
                let baseOrig = matchOrig ? matchOrig[1] : "C";
                baseOrig = norm[baseOrig] || baseOrig;
                let idxOrig = escalaCromatica.indexOf(baseOrig);

                if (idxExibicao !== -1 && idxOrig !== -1) {
                    const deltaRender = idxExibicao - idxOrig;
                    bloco.querySelectorAll('.chord').forEach(span => {
                        span.textContent = transporAcorde(span.textContent, deltaRender);
                    });
                }
            }

            // Restaurar capo salvo
            const capoSalvo = musica.capoCustomizado || 0;
            if (musica.capoOriginal === undefined) {
                musica.capoOriginal = capoSalvo;
                appStorage.musicasGlobais[musica.id] = musica;
            }
            bloco.setAttribute('data-capo', capoSalvo);
            const inputCapo = document.getElementById(`capo-select-${index}`);
            const txtCapo = document.getElementById(`capo-txt-${index}`);
            if (inputCapo) inputCapo.value = capoSalvo;
            if (txtCapo) txtCapo.innerText = capoSalvo;

            if (capoSalvo > 0) {
                bloco.querySelectorAll('.chord').forEach(span => {
                    span.textContent = transporAcorde(span.textContent, -capoSalvo);
                });
                // Usa o índice limpo que calculamos lá em cima
                exibirDicaCapo(index, idxExibicao, capoSalvo);
            }
        });
    } else {
        container.innerHTML = "<div style='padding:50px 20px;text-align:center;color:var(--text-muted); font-weight:bold;'>Sua lista está limpa. Clique na engrenagem (⚙️) para adicionar cifras!</div>";
    }
    // Inicia a calculadora após meio segundo para dar tempo do navegador desenhar a tela
    setTimeout(calcularTempoTotalShow, 500);
}

function alternarListaAtiva(nomeLista) {
    appStorage.listaAtiva = nomeLista;
    localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    if (intervaloRolagem) toggleRolagemGeral();
    sincronizarEAAplicarInterface();
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function abrirPainelVinculacaoLista(idMusica, indexVisual) {
    const painel = document.getElementById(`inline-panel-${indexVisual}`);
    const grid = document.getElementById(`inline-grid-${indexVisual}`);
    if (painel.classList.contains("active")) {
        painel.classList.remove("active");
        return;
    }
    grid.innerHTML = "";

    const chavesOrdenadas = obterListasOrdenadasChaves();
    chavesOrdenadas.forEach(nomeLista => {
        const label = document.createElement("label");
        label.className = "inline-check-item";
        if (nomeLista === "Todas as Músicas") {
            label.innerHTML = `<input type="checkbox" checked disabled> <span style="color:var(--text-muted);">${escapeHtml(nomeLista)}</span>`;
        } else {
            const pertence = appStorage.listas[nomeLista].includes(idMusica);
            label.innerHTML = `<input type="checkbox" ${pertence ? 'checked' : ''} onchange="atualizarVinculoCheckbox('${idMusica}', '${nomeLista}', this.checked)"> ${escapeHtml(nomeLista)}`;
        }
        grid.appendChild(label);
    });
    painel.classList.add("active");
}

function atualizarVinculoCheckbox(idMusica, nomeLista, estadoMarcado) {
    const lista = appStorage.listas[nomeLista];
    const idx = lista.indexOf(idMusica);
    if (estadoMarcado && idx === -1) lista.push(idMusica);
    else if (!estadoMarcado && idx !== -1) lista.splice(idx, 1);
    localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    mostrarToast(`Lista "${nomeLista}" atualizada!`);
}

function excluirMusicaGeral(idMusica) {
    const musica = appStorage.musicasGlobais[idMusica];
    if (!musica) return;
    if (confirm(`Tem certeza que deseja apagar definitivamente a música "${musica.titulo}" do seu acervo?`)) {
        delete appStorage.musicasGlobais[idMusica];
        Object.keys(appStorage.listas).forEach(nomeLista => {
            appStorage.listas[nomeLista] = appStorage.listas[nomeLista].filter(id => id !== idMusica);
        });
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
        mostrarToast("Cifra excluída do acervo.");
        if (intervaloRolagem) toggleRolagemGeral();
        sincronizarEAAplicarInterface();
    }
}

function abrirModalEditarCifra(idMusica) {
    const musica = appStorage.musicasGlobais[idMusica];
    if (!musica) return;

    document.getElementById("edit-musica-id").value = idMusica;
    document.getElementById("edit-musica-titulo").value = musica.titulo;
    document.getElementById("edit-musica-artista").value = musica.artista || "";
    document.getElementById("edit-musica-tom-original").value = musica.tomOriginal;
    document.getElementById("edit-musica-letra").value = musica.letraCifra;

    document.getElementById("modal-editar-container").classList.add("active");
}

function salvarAlteracoesCifraEditada() {
    const id = document.getElementById("edit-musica-id").value;
    const titulo = document.getElementById("edit-musica-titulo").value.trim();
    const artista = document.getElementById("edit-musica-artista").value.trim();
    const tomOriginal = document.getElementById("edit-musica-tom-original").value;
    const letra = document.getElementById("edit-musica-letra").value;

    if (!titulo || !artista) {
        alert("Título e Artista não podem ficar vazios!");
        return;
    }

    appStorage.musicasGlobais[id].titulo = titulo;
    appStorage.musicasGlobais[id].artista = artista;
    appStorage.musicasGlobais[id].tomOriginal = tomOriginal;
    appStorage.musicasGlobais[id].letraCifra = letra;
    // Preservar capoOriginal se já existir; redetectar do texto se quiser
    if (appStorage.musicasGlobais[id].capoOriginal === undefined) {
        appStorage.musicasGlobais[id].capoOriginal = appStorage.musicasGlobais[id].capoCustomizado || 0;
    }

    localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    fecharModalEditar();
    mostrarToast("✓ Alterações salvas no aparelho!");
    sincronizarEAAplicarInterface();
}

function fecharModalEditar() {
    document.getElementById("modal-editar-container").classList.remove("active");
}

function fecharModalEditarExterno(e) {
    if (e.target.id === "modal-editar-container") fecharModalEditar();
}

function abrirModalTutorial() {
    document.getElementById("modal-tutorial-container").classList.add("active");
}

function fecharModalTutorial() {
    document.getElementById("modal-tutorial-container").classList.remove("active");
}

function fecharModalTutorialExterno(e) {
    if (e.target.id === "modal-tutorial-container") fecharModalTutorial();
}

// --- Limpeza: Remova qualquer código de "hack" antigo no fim do arquivo ---
// Mantenha apenas estas funções de suporte para o Modal Admin:

function abrirModalAdmin() {
    const inputDelay = document.getElementById("input-delay-partida");
    if (inputDelay) inputDelay.value = appStorage.configGlobais.delayPartida || 0;

    document.getElementById("modal-admin-container").classList.add("active");

    const lblLista = document.getElementById("txt-nome-lista-backup");
    if (lblLista) lblLista.innerText = `"${appStorage.listaAtiva}"`;

    // Preencher o select de ordenação antigo (o que funciona para o seu painel de setas)
    const seletorOrdem = document.getElementById("seletor-lista-ordem");
    seletorOrdem.innerHTML = "";
    const chavesOrdenadas = obterListasOrdenadasChaves();
    chavesOrdenadas.forEach(nomeLista => {
        let opt = document.createElement("option");
        opt.value = nomeLista;
        opt.text = nomeLista;
        if (nomeLista === appStorage.listaAtiva) opt.selected = true;
        seletorOrdem.appendChild(opt);
    });

    // Chama o popular para o gerenciamento de exclusão/renomeação
    popularSeletorGerenciarListas();

    // Chama a renderização inicial do painel de ordenação
    renderizarPainelOrdenacao(seletorOrdem.value);
}

function popularSeletorGerenciarListas() {
    const sel = document.getElementById('seletor-lista-gerenciar');
    if (!sel) return;

    sel.innerHTML = '';
    const chaves = obterListasOrdenadasChaves().filter(c => c !== 'Todas as Músicas');

    if (chaves.length === 0) {
        sel.innerHTML = '<option value="">Nenhuma lista criada</option>';
        return;
    }

    chaves.forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome;
        opt.text = nome;
        if (nome === appStorage.listaAtiva) opt.selected = true;
        sel.appendChild(opt);
    });
}

function renderizarPainelOrdenacao(nomeLista) {
    const containerOrdem = document.getElementById("container-lista-ordenacao");
    containerOrdem.innerHTML = "";
    const ids = appStorage.listas[nomeLista] || [];
    if (ids.length === 0) {
        containerOrdem.innerHTML = "<div style='font-size:12px;text-align:center;color:var(--text-muted);padding:10px;'>Nenhuma música nesta lista.</div>";
        return;
    }
    ids.forEach((id, idx) => {
        const musica = appStorage.musicasGlobais[id];
        if (!musica) return;
        const row = document.createElement("div");
        row.className = "order-item-row";
        row.innerHTML = `<span>${idx + 1}. ${escapeHtml(musica.titulo)}</span><div class="order-btn-group"><button class="btn-order-arrow" onclick="moverMusicaNaLista('${nomeLista}', ${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>🔼</button><button class="btn-order-arrow" onclick="moverMusicaNaLista('${nomeLista}', ${idx}, 1)" ${idx === ids.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>🔽</button></div>`;
        containerOrdem.appendChild(row);
    });
}



function moverMusicaNaLista(nomeLista, indexOrigem, direcao) {
    const Math_swap = appStorage.listas[nomeLista];
    const indexDestino = indexOrigem + direcao;
    if (indexDestino >= 0 && indexDestino < Math_swap.length) {
        const temp = Math_swap[indexOrigem];
        Math_swap[indexOrigem] = Math_swap[indexDestino];
        Math_swap[indexDestino] = temp;
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
        renderizarPainelOrdenacao(nomeLista);
        sincronizarEAAplicarInterface();
    }
}

/**
 * Abre o modal de ordenação e renderiza as músicas da lista ativa.
 * @param {string} nomeLista - O nome da lista a ser ordenada.
 */
function abrirModalOrdenacao(nomeLista) {
    if (!nomeLista) {
        mostrarToast("Erro: Lista não encontrada.");
        return;
    }

    // 1. Abre o modal e define o título
    const modal = document.getElementById('modal-ordenar-container');
    if (!modal) {
        console.error("Elemento modal-ordenar-container não encontrado no index.html");
        return;
    }
    modal.classList.add('active');
    document.getElementById('titulo-ordem-lista').innerText = nomeLista;

    // 2. Prepara o container
    const container = document.getElementById("container-lista-ordenacao");
    if (!container) return;
    container.innerHTML = "";

    // 3. Busca a lista de IDs
    const ids = appStorage.listas[nomeLista] || [];

    // 4. Renderiza os itens
    ids.forEach((id, idx) => {
        const musica = appStorage.musicasGlobais[id];
        if (!musica) return;

        const item = document.createElement("div");
        item.className = "order-item-row"; // Classe reutilizada do Admin
        item.draggable = true;
        item.dataset.id = id;
        item.innerHTML = `
            <span>${idx + 1}. ${escapeHtml(musica.titulo)}</span>
            <span style="opacity:0.5; cursor:grab;">≡</span>
        `;

        // --- Lógica de Arrastar (Drag and Drop) ---
        item.addEventListener('dragstart', (e) => {
            item.classList.add('dragging');
            e.dataTransfer.setData('text/plain', idx);
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingItem = document.querySelector('.dragging');
            if (draggingItem && draggingItem !== item) {
                container.insertBefore(draggingItem, item);
            }
        });

        // Ao soltar, atualiza o array de IDs e salva
        item.addEventListener('drop', () => {
            salvarNovaOrdem(nomeLista);
        });

        container.appendChild(item);
    });
}

function salvarNovaOrdem(nomeLista) {
    const itens = document.querySelectorAll('#container-lista-ordenacao .order-item-row');
    const novaOrdem = Array.from(itens).map(it => it.dataset.id);

    appStorage.listas[nomeLista] = novaOrdem;
    localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));

    // Atualiza a interface principal
    sincronizarEAAplicarInterface();

    // Refresh visual no modal para numerar corretamente
    // Nota: Como o DOM já foi alterado pelo drop, apenas re-renderizamos a numeração
    const spans = document.querySelectorAll('#container-lista-ordenacao .order-item-row span:first-child');
    spans.forEach((span, i) => {
        span.textContent = span.textContent.replace(/^\d+\./, `${i + 1}.`);
    });
}

function fecharModalOrdenacao() {
    document.getElementById('modal-ordenar-container').classList.remove('active');
}

function criarNovaListaUsuario() {
    const input = document.getElementById("input-nova-lista");
    const nome = input.value.trim();
    if (!nome) {
        alert("Digite o nome!");
        return;
    }
    if (appStorage.listas[nome]) {
        alert("Esse nome já existe!");
        return;
    }
    appStorage.listas[nome] = [];
    appStorage.listaAtiva = nome;
    localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    input.value = "";
    fecharModalAdmin();
    mostrarToast(`Lista "${nome}" criada!`);
    sincronizarEAAplicarInterface();
}

function processarESalvarNovaMusica() {
    const input = document.getElementById("input-cifra-bruta").value;
    if (!input.trim()) {
        alert("Cole a cifra!");
        return;
    }
    // Limpar links markdown [texto](url), tags HTML e lixo de copiar/colar
    const inputLimpo = input
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [texto](url) → texto
        .replace(/<[^>]+>/g, '') // tags HTML
        .replace(/Favoritar Cifra/gi, '')
        .replace(/Imprimir/gi, '')
        .trim();

    const linhas = inputLimpo.split('\n');
    let tit = "Título Desconhecido",
        art = "Artista Desconhecido",
        tom = "C",
        capo = 0,
        filtradas = [];
    const lixo = ["favoritar", "afinação:", "imprimir"];
    let linesIdentifiedCount = 0;

    for (let i = 0; i < linhas.length; i++) {
        const l = linhas[i].trim();
        if (!l) {
            if (linesIdentifiedCount >= 2) filtradas.push(linhas[i]);
            continue;
        }
        if (linesIdentifiedCount === 0) {
            tit = l;
            linesIdentifiedCount++;
            continue;
        }
        if (linesIdentifiedCount === 1) {
            art = l;
            linesIdentifiedCount++;
            continue;
        }
        if (l.toLowerCase().startsWith("tom:")) {
            // Pega só o tom, desprezando tudo após espaço, parêntese ou colchete
            // Ex: "Tom: Gm (forma dos acordes no tom de Em)" → "Gm"
            const tomRaw = l.replace(/tom:/i, '').trim();
            const tomMatch = tomRaw.match(/^([A-G][#b]?m?)/);
            tom = tomMatch ? tomMatch[1] : tomRaw.split(/[\s\(]/)[0];
            continue;
        }
        if (l.toLowerCase().includes("capo")) {
            // Reconhece: "Capo: 4", "Capo 4", "Capotraste na 4ª casa", "Capo na 4a casa"
            const capoMatch = l.match(/\d+/);
            if (capoMatch) capo = parseInt(capoMatch[0]);
            continue;
        }
        if (lixo.some(p => l.toLowerCase().includes(p))) continue;
        if (/^[0-9xX|\s\-]{5,}$/.test(l) && filtradas.length > 20 && i > linhas.length - 15) break;
        filtradas.push(linhas[i]);
    }

    const novoId = "id_" + Date.now();
    const objetoMusica = {
        id: novoId,
        titulo: tit,
        artista: art,
        tomOriginal: tom,
        tomCustomizado: tom,
        capoOriginal: capo,
        capoCustomizado: capo,
        fonteCustomizada: 16,
        velocidadeCustomizada: 10,
        letraCifra: filtradas.join('\n').trim()
    };
    appStorage.musicasGlobais[novoId] = objetoMusica;
    appStorage.listas["Todas as Músicas"].push(novoId);
    if (appStorage.listaAtiva !== "Todas as Músicas") appStorage.listas[appStorage.listaAtiva].push(novoId);
    localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    fecharModalCadastrar();
    mostrarToast("✓ Cifra cadastrada!");
    sincronizarEAAplicarInterface();
}

// Utilitário: gera download de .txt com o conteúdo JSON
function baixarTxt(nomeArquivo, conteudo) {
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
}

function acionarModalInteracaoBackup() {
    // Exporta o acervo completo direto como .txt
    baixarTxt('gelcifras_acervo_completo.txt', JSON.stringify(appStorage));
    fecharModalAdmin();
    mostrarToast("✓ Download do acervo iniciado!");
}

function exportarListaAtivaTxt() {
    const listaAlvo = appStorage.listaAtiva;
    const idsFiltrados = appStorage.listas[listaAlvo] || [];

    const dadosExportacao = {
        musicasGlobais: {},
        listas: {},
        listaAtiva: listaAlvo,
        isPartialBackup: true
    };

    dadosExportacao.listas[listaAlvo] = idsFiltrados;
    idsFiltrados.forEach(id => {
        if (appStorage.musicasGlobais[id]) {
            dadosExportacao.musicasGlobais[id] = appStorage.musicasGlobais[id];
        }
    });

    const nomeArquivo = listaAlvo
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '') || 'lista';

    baixarTxt(`gelcifras_${nomeArquivo}.txt`, JSON.stringify(dadosExportacao));
    fecharModalAdmin();
    mostrarToast(`✓ Download de "${listaAlvo}" iniciado!`);
}

function acionarModalInteracaoRestore() {
    // Mantido para compatibilidade com importarArquivoLocal / importarBibliotecaFixa
    // que já alimentam backupTemporarioParaProcessar diretamente
    document.getElementById("modal-interacao-restore").classList.add("active");
}

function fecharModalInteracaoRestore() {
    document.getElementById("modal-interacao-restore").classList.remove("active");
    backupTemporarioParaProcessar = null;
}

function ejecutarRestauracaoSubstitutivaGeral() {
    if (!backupTemporarioParaProcessar) return;

    if (backupTemporarioParaProcessar.isPartialBackup) {
        const nomeListaParcial = backupTemporarioParaProcessar.listaAtiva;
        backupTemporarioParaProcessar.listas["Todas as Músicas"] = backupTemporarioParaProcessar.listas[nomeListaParcial] || [];
    }

    localStorage.setItem('gelcifras_db', JSON.stringify(backupTemporarioParaProcessar));
    appStorage = backupTemporarioParaProcessar;

    fecharModalInteracaoRestore();
    fecharModalAdmin();
    mostrarToast("📥 Acervo substituído por completo!");
    sincronizarEAAplicarInterface();
}

function executarRestauracaoMescladaAmigavel() {
    if (!backupTemporarioParaProcessar) return;

    Object.keys(backupTemporarioParaProcessar.musicasGlobais).forEach(id => {
        appStorage.musicasGlobais[id] = backupTemporarioParaProcessar.musicasGlobais[id];
    });

    Object.keys(backupTemporarioParaProcessar.listas).forEach(nomeLista => {
        if (nomeLista === "Todas as Músicas") return;

        if (!appStorage.listas[nomeLista]) {
            appStorage.listas[nomeLista] = backupTemporarioParaProcessar.listas[nomeLista];
        } else {
            backupTemporarioParaProcessar.listas[nomeLista].forEach(id => {
                if (!appStorage.listas[nomeLista].includes(id)) {
                    appStorage.listas[nomeLista].push(id);
                }
            });
        }
    });

    appStorage.listas["Todas as Músicas"] = Object.keys(appStorage.musicasGlobais);
    if (backupTemporarioParaProcessar.listaAtiva) appStorage.listaAtiva = backupTemporarioParaProcessar.listaAtiva;

    localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));

    fecharModalInteracaoRestore();
    fecharModalAdmin();
    mostrarToast("📥 Músicas agregadas ao acervo com sucesso!");
    sincronizarEAAplicarInterface();
}

function fecharModalAdmin() {
    document.getElementById("modal-admin-container").classList.remove("active");
    document.getElementById("input-cifra-bruta").value = ""; // ← campo do modal CADASTRAR, não do admin
}

function fecharModalAdminExterno(e) {
    if (e.target.id === "modal-admin-container") fecharModalAdmin();
}

// =========================================================================
// MECÂNICA DE PALCO E ROLAGEM
// =========================================================================
function alternarTemaFundo() {
    const atual = document.documentElement.getAttribute('data-theme');
    const ciclo = { light: 'dark', dark: 'bege', bege: 'light' };
    const novo = ciclo[atual] || 'light';
    document.documentElement.setAttribute('data-theme', novo);
    localStorage.setItem('theme', novo);
    const nomes = { light: '☀️ Claro', dark: '🌙 Escuro', bege: '🪵 Bege' };
    mostrarToast(`Tema: ${nomes[novo]}`);
}

function obterBlocoMusicaAtualNaTela() {
    let blocoFocado = null;
    // Pega APENAS os blocos visíveis (ignora os que a busca escondeu)
    const blocosVisiveis = document.querySelectorAll('.cifra-container:not(.busca-oculto)');

    if (blocosVisiveis.length === 0) return null;

    blocoFocado = blocosVisiveis[0]; // fallback para o primeiro

    blocosVisiveis.forEach(bloco => {
        // Elementos ocultos têm top === 0. Ignorar a classe .busca-oculto garante a leitura real.
        if (bloco.getBoundingClientRect().top <= 160) {
            blocoFocado = bloco;
        }
    });

    if (intervaloRolagem) atualizarContadorMusica(blocoFocado);
    return blocoFocado;
}

function atualizarContadorMusica(blocoAtual) {
    const placar = document.getElementById('placar-rolagem');
    const barra = document.getElementById('barra-progresso-musica');
    if (!placar || !intervaloRolagem || !blocoAtual) return;

    const blocosVisiveis = Array.from(document.querySelectorAll('.cifra-container:not(.busca-oculto)'));
    const total = blocosVisiveis.length;
    if (total === 0) return;

    // Posição e Título
    const indexRelativo = blocosVisiveis.indexOf(blocoAtual) + 1;
    const idReal = blocoAtual.getAttribute('data-real-id');
    const musica = idReal ? appStorage.musicasGlobais[idReal] : null;
    let nomeMusica = musica ? musica.titulo : '';

    if (nomeMusica.length > 100) {
        nomeMusica = nomeMusica.substring(0, 97) + '...';
    }

    // Cálculo da Barra de Progresso
    const rect = blocoAtual.getBoundingClientRect();
    const totalDistancia = blocoAtual.offsetHeight;
    const percorrido = 160 - rect.top;
    const margemFim = window.innerHeight / 2;
    let distanciaAjustada = totalDistancia - margemFim + 160;
    if (distanciaAjustada < 100) distanciaAjustada = totalDistancia;

    let percentual = (percorrido / distanciaAjustada) * 100;
    if (percentual < 0) percentual = 0;
    if (percentual > 100) percentual = 100;

    if (barra) {
        barra.style.width = `${percentual}%`;
        if (percentual >= 90) barra.classList.add('alerta');
        else barra.classList.remove('alerta');
    }

    // === CÁLCULO DE TEMPO RESTANTE DO SHOW ===
    let tempoRestanteMs = 0;
    const mapaTempos = [400, 360, 320, 280, 240, 205, 175, 145, 115, 85, 70, 58, 48, 40, 34, 29, 25, 19, 14, 10];
    const idxAtual = blocosVisiveis.indexOf(blocoAtual);

    // A MÁGICA TÁTICA AQUI: Identifica se a letra está comprimida
    const containerSetlist = document.getElementById("setlist-container");
    const modoCantarAtivo = containerSetlist && containerSetlist.classList.contains("ocultar-acordes");

    // 1. O que falta rolar da música atual
    let velAtual = 10;
    if (idReal && appStorage.musicasGlobais[idReal]) velAtual = appStorage.musicasGlobais[idReal].velocidadeCustomizada || 10;
    let tempoEsperaAtual = mapaTempos[Math.min(20, Math.max(1, velAtual)) - 1];

    // Compensa a perda de altura da música reduzindo a velocidade pela metade
    if (modoCantarAtivo) tempoEsperaAtual *= 2;

    // Multiplica os pixels que faltam pela velocidade atual
    const pixelsRestantesAtual = Math.max(0, totalDistancia - percorrido);
    tempoRestanteMs += pixelsRestantesAtual * tempoEsperaAtual;

    // 2. Tempo de todas as músicas que ainda vêm pela frente
    for (let i = idxAtual + 1; i < blocosVisiveis.length; i++) {
        const b = blocosVisiveis[i];
        const idB = b.getAttribute('data-real-id');
        const v = (idB && appStorage.musicasGlobais[idB]) ? (appStorage.musicasGlobais[idB].velocidadeCustomizada || 10) : 10;
        let tEspera = mapaTempos[Math.min(20, Math.max(1, v)) - 1];

        // Compensa a perda de altura para o resto da lista também
        if (modoCantarAtivo) tEspera *= 2;

        tempoRestanteMs += (b.offsetHeight * tEspera);
        tempoRestanteMs += 15000;
    }

    // Formata o cronômetro
    const minRestantes = Math.max(1, Math.ceil(tempoRestanteMs / 60000));
    let textoRestante = minRestantes >= 60 ? `${Math.floor(minRestantes/60)}h ${minRestantes%60}m` : `${minRestantes}m`;

    placar.textContent = `${indexRelativo} / ${total}  •  ⏳ ~${textoRestante}  •  ${nomeMusica}`;
}

function navegarEntreMusicas(direcao) {
    const blocoAtual = obterBlocoMusicaAtualNaTela();
    if (!blocoAtual) return;

    const blocosVisiveis = Array.from(document.querySelectorAll('.cifra-container:not(.busca-oculto)'));
    const idxAtual = blocosVisiveis.indexOf(blocoAtual);
    const proximoIdx = idxAtual + direcao;

    if (proximoIdx < 0) {
        mostrarToast("⏮ Primeira música");
        return;
    }
    if (proximoIdx >= blocosVisiveis.length) {
        mostrarToast("⏭ Fim do roteiro");
        return;
    }

    const blocoAlvo = blocosVisiveis[proximoIdx];

    // Se for um bloco temporário de busca global, injetamos um ID de passagem
    if (!blocoAlvo.id) {
        blocoAlvo.id = 'busca-alvo-' + Date.now();
    }

    pularParaMusica(blocoAlvo.id);
}

function mudarFonteIndividual(indexMusica, delta) {
    const bloco = document.getElementById(`musica-bloco-${indexMusica}`);
    const idReal = bloco.getAttribute('data-real-id');
    const inputFonte = document.getElementById(`fonte-musica-${indexMusica}`);

    const novaFonte = Math.min(28, Math.max(10, parseInt(inputFonte.value) + delta));
    inputFonte.value = novaFonte;
    document.getElementById(`fonte-txt-${indexMusica}`).innerText = novaFonte;
    document.getElementById(`corpo-cifra-${indexMusica}`).style.fontSize = novaFonte + 'px';

    if (appStorage.musicasGlobais[idReal]) {
        appStorage.musicasGlobais[idReal].fonteCustomizada = novaFonte;
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    }
}

function mudarVelocidadeIndividual(indexMusica, delta) {
    const bloco = document.getElementById(`musica-bloco-${indexMusica}`);
    const idReal = bloco.getAttribute('data-real-id');
    const input = document.getElementById(`vel-musica-${indexMusica}`);

    const nova = Math.min(20, Math.max(1, parseInt(input.value) + delta));
    input.value = nova;
    document.getElementById(`vel-txt-${indexMusica}`).innerText = nova;

    if (appStorage.musicasGlobais[idReal]) {
        appStorage.musicasGlobais[idReal].velocidadeCustomizada = nova;
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
        setTimeout(calcularTempoTotalShow, 200);
    }

    if (intervaloRolagem) verificarMusicaVisivelNaTela();
}

function mudarTomIndividual(indexMusica, semitons) {
    const bloco = document.getElementById(`musica-bloco-${indexMusica}`);
    const idReal = bloco.getAttribute('data-real-id');

    // 1. Ignoramos o índice quebrado e pegamos o texto real da tela
    const tomAtualTexto = (document.getElementById(`tom-txt-${indexMusica}`) || {}).innerText || "";

    // 2. Separamos a nota (ex: G) do sufixo (ex: m) com a mesma proteção que você usa nos acordes
    const matchTom = tomAtualTexto.match(/^([A-G][#b]?)(.*)/);
    if (!matchTom) return;

    let notaBase = matchTom[1];
    const sufixo = matchTom[2];

    // Normalização de bemóis (Db vira C# etc)
    const norm = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
    notaBase = norm[notaBase] || notaBase;

    // 3. Calculamos a posição da nota limpa
    let idx = escalaCromatica.indexOf(notaBase);
    if (idx === -1) return;

    // Fazemos a matemática dos semitons
    idx = (idx + semitons + 12) % 12;
    bloco.setAttribute('data-tom-index', idx); // Conserta o index no HTML para o Capo não se perder

    // 4. Remontamos o tom colando o sufixo de volta
    const novoTomTexto = escalaCromatica[idx] + sufixo;
    document.getElementById(`tom-txt-${indexMusica}`).innerText = novoTomTexto;

    // Transpõe o corpo da música
    bloco.querySelectorAll('.chord').forEach(span => {
        span.textContent = transporAcorde(span.textContent, semitons);
    });

    if (appStorage.musicasGlobais[idReal]) {
        appStorage.musicasGlobais[idReal].tomCustomizado = novoTomTexto;
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    }

    // Atualiza a dica do capo
    const sel = document.getElementById(`capo-select-${indexMusica}`);
    const capoAtivo = sel ? parseInt(sel.value) : 0;
    if (capoAtivo > 0) {
        exibirDicaCapo(indexMusica, idx, capoAtivo);
    }
}

function resetarTomOriginalFabrica(indexMusica, tomOriginalFabrica) {
    const bloco = document.getElementById(`musica-bloco-${indexMusica}`);
    const idReal = bloco.getAttribute('data-real-id');
    const idxAtual = parseInt(bloco.getAttribute('data-tom-index'));

    // 1. Isola a nota base do tom original de fábrica (ex: tira o "m" do "Gm")
    const matchOrig = tomOriginalFabrica.match(/^([A-G][#b]?)/);
    if (!matchOrig) return;

    let notaOrigBase = matchOrig[1];

    // Normalização para bemóis, caso o tom de fábrica venha como Bb, Eb, etc.
    const norm = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
    notaOrigBase = norm[notaOrigBase] || notaOrigBase;

    // 2. Acha a posição real da nota pura na escala
    const idxOriginal = escalaCromatica.indexOf(notaOrigBase);

    if (idxAtual === -1 || idxOriginal === -1) return;

    // Evita rodar a função se já estiver no tom original exato
    const tomAtualTexto = (document.getElementById(`tom-txt-${indexMusica}`) || {}).innerText || "";
    if (idxAtual === idxOriginal && tomAtualTexto === tomOriginalFabrica) return;

    // 3. Calcula a diferença de semitons para transpor o corpo da música
    const semitonsDiferenca = idxOriginal - idxAtual;

    // 4. Aplica os valores na tela
    bloco.setAttribute('data-tom-index', idxOriginal);
    document.getElementById(`tom-txt-${indexMusica}`).innerText = tomOriginalFabrica;

    bloco.querySelectorAll('.chord').forEach(span => {
        span.textContent = transporAcorde(span.textContent, semitonsDiferenca);
    });

    if (appStorage.musicasGlobais[idReal]) {
        appStorage.musicasGlobais[idReal].tomCustomizado = tomOriginalFabrica;
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    }

    // 5. Atualiza a dica do capo para não ficar dessincronizada após o reset
    const sel = document.getElementById(`capo-select-${indexMusica}`);
    const capoAtivo = sel ? parseInt(sel.value) : 0;
    if (capoAtivo > 0 && typeof exibirDicaCapo !== 'undefined') {
        exibirDicaCapo(indexMusica, idxOriginal, capoAtivo);
    }

    mostrarToast(`Tom original (${tomOriginalFabrica}) restaurado!`);
}

function resetarCapoOriginal(indexMusica, capoOriginal) {
    const bloco = document.getElementById(`musica-bloco-${indexMusica}`);
    const idReal = bloco.getAttribute('data-real-id');
    const input = document.getElementById(`capo-select-${indexMusica}`);
    const txt = document.getElementById(`capo-txt-${indexMusica}`);
    const idxTomAtual = parseInt(bloco.getAttribute('data-tom-index'));
    const capoAtual = parseInt(input.value);

    if (capoAtual === capoOriginal) return;

    // Reverter capo atual e aplicar o original
    const delta = capoAtual - capoOriginal;
    bloco.querySelectorAll('.chord').forEach(span => {
        span.textContent = transporAcorde(span.textContent, delta);
    });

    input.value = capoOriginal;
    txt.innerText = capoOriginal;
    bloco.setAttribute('data-capo', capoOriginal);

    exibirDicaCapo(indexMusica, idxTomAtual, capoOriginal);

    if (appStorage.musicasGlobais[idReal]) {
        appStorage.musicasGlobais[idReal].capoCustomizado = capoOriginal;
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    }
    mostrarToast(`Capo original (${capoOriginal === 0 ? 'sem capo' : capoOriginal + 'ª casa'}) restaurado!`);
}

// ── CAPOTRASTE ────────────────────────────────────────────────────────────
// Tons "amigáveis" (abertos) em ordem de preferência por grau de dificuldade
const TONS_AMIGAVEIS = ["C", "G", "D", "A", "E", "Am", "Em", "Dm"];
const TONS_AMIGAVEIS_BASE = ["C", "G", "D", "A", "E", "A", "E", "D"]; // só a nota base

function calcularSugestaoCapo(idxTomAtual, casaCapo) {
    // Tom resultante após capo: subir "casaCapo" semitons
    // Para tocar nesse tom com o capo, os acordes devem ser do tom "idxTomAtual - casaCapo"
    const idxAcordesAbertos = (idxTomAtual - casaCapo + 12) % 12;
    const tomAcordes = escalaCromatica[idxAcordesAbertos];

    // Verificar se o tom dos acordes abertos é "amigável"
    const ehAmigavel = TONS_AMIGAVEIS_BASE.includes(tomAcordes);

    return { tomAcordes, ehAmigavel };
}

function exibirDicaCapo(indexMusica, idxTomAtualBase, casaCapo) {
    const dica = document.getElementById(`capo-dica-${indexMusica}`);
    if (!dica) return;

    if (casaCapo === 0) {
        dica.textContent = "";
        return;
    }

    // Resgata o sufixo da tela para a dica não perder o "m" ou "7"
    const tomAtualTexto = (document.getElementById(`tom-txt-${indexMusica}`) || {}).innerText || "";
    const matchTom = tomAtualTexto.match(/^([A-G][#b]?)(.*)/) || [, "", ""];
    const sufixo = matchTom[2];

    const { tomAcordes, ehAmigavel } = calcularSugestaoCapo(idxTomAtualBase, casaCapo);
    const tomSoandoBase = escalaCromatica[idxTomAtualBase];

    // Monta a dica colando o sufixo nos dois lados da flecha
    dica.textContent = `(${tomAcordes}${sufixo}→${tomSoandoBase}${sufixo})`;
    dica.className = "capo-dica-inline " + (ehAmigavel ? "capo-dica-ok" : "capo-dica-aviso");
}

function mudarCapoIndividual(indexMusica, delta) {
    const bloco = document.getElementById(`musica-bloco-${indexMusica}`);
    const idReal = bloco.getAttribute('data-real-id');
    const idxTomAtual = parseInt(bloco.getAttribute('data-tom-index'));
    const input = document.getElementById(`capo-select-${indexMusica}`);
    const txt = document.getElementById(`capo-txt-${indexMusica}`);

    const capoAnterior = parseInt(input.value);
    const novoCapo = Math.min(7, Math.max(0, capoAnterior + delta));
    if (novoCapo === capoAnterior) return;

    // Reverter capo anterior e aplicar novo
    const deltaAcordes = capoAnterior - novoCapo;
    bloco.querySelectorAll('.chord').forEach(span => {
        span.textContent = transporAcorde(span.textContent, deltaAcordes);
    });

    input.value = novoCapo;
    txt.innerText = novoCapo;
    bloco.setAttribute('data-capo', novoCapo);

    exibirDicaCapo(indexMusica, idxTomAtual, novoCapo);

    if (appStorage.musicasGlobais[idReal]) {
        appStorage.musicasGlobais[idReal].capoCustomizado = novoCapo;
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    }
}

function transporAcorde(acorde, semitons) {
    const match = acorde.match(/^([A-G][#b]?)(.*)/);
    if (!match) return acorde;
    let notaBase = match[1];
    const resto = match[2];
    const norm = {
        Db: "C#",
        Eb: "D#",
        Gb: "F#",
        Ab: "G#",
        Bb: "A#"
    };
    notaBase = norm[notaBase] || notaBase;
    const idx = escalaCromatica.indexOf(notaBase);
    if (idx === -1) return acorde;
    return escalaCromatica[(idx + semitons + 12) % 12] + resto;
}

function ajustarVelocidadeAtiva(delta) {
    if (!intervaloRolagem) return;

    const bloco = obterBlocoMusicaAtualNaTela();
    if (!bloco) return;

    const idReal = bloco.getAttribute('data-real-id');
    const indexAtributo = bloco.getAttribute('data-index');

    // 1. Descobrir a velocidade atual direto do banco de dados
    let velAtual = 10;
    if (idReal && appStorage.musicasGlobais[idReal]) {
        velAtual = appStorage.musicasGlobais[idReal].velocidadeCustomizada || 10;
    }

    // 2. Calcular nova velocidade (Limites de 1 a 20)
    const novaVel = Math.min(20, Math.max(1, velAtual + delta));

    // 3. Salvar no banco
    if (idReal && appStorage.musicasGlobais[idReal]) {
        appStorage.musicasGlobais[idReal].velocidadeCustomizada = novaVel;
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
        setTimeout(calcularTempoTotalShow, 200);
    }

    // 4. Atualizar os visores na tela (se existirem)
    if (indexAtributo !== null) {
        const input = document.getElementById(`vel-musica-${indexAtributo}`);
        const txt = document.getElementById(`vel-txt-${indexAtributo}`);
        if (input) input.value = novaVel;
        if (txt) txt.innerText = novaVel;
    }

    // 5. Reaplicar motor sem gaguejar
    velocidadGlobalAtual = novaVel;
    redefinirMotorRolagem(novaVel);
    mostrarToast(`Velocidade: ${novaVel}`);
}

function verificarMusicaVisivelNaTela() {
    const bloco = obterBlocoMusicaAtualNaTela();
    if (!bloco) return;

    const idReal = bloco.getAttribute('data-real-id');
    let vel = 10;

    if (idReal && appStorage.musicasGlobais[idReal]) {
        vel = appStorage.musicasGlobais[idReal].velocidadeCustomizada || 10;
    }

    if (vel !== velocidadGlobalAtual) {
        velocidadGlobalAtual = vel;
        redefinirMotorRolagem(vel);
    }
    verificarMetronomo()
}



function toggleRolagemGeral() {
    const btn = document.getElementById("btn-scroll");
    const paineisPalco = document.querySelectorAll('.sub-control-panel');
    const placar = document.getElementById('placar-rolagem');
    const barra = document.getElementById('barra-progresso-musica');

    if (intervaloRolagem || intervaloContagem) {
        // --- PAUSAR ROLAGEM / CANCELAR CONTAGEM ---
        if (intervaloContagem) {
            clearInterval(intervaloContagem);
            intervaloContagem = null;
            const overlay = document.getElementById('overlay-contagem');
            if (overlay) overlay.style.display = 'none';
        }

        clearInterval(intervaloRolagem);
        intervaloRolagem = null;
        pararMetronomo();

        btn.innerText = "▶";
        btn.classList.remove("active");

        // REAPARECER PAINÉIS DE CONFIGURAÇÃO
        paineisPalco.forEach(p => p.style.display = 'flex');

        document.body.classList.remove('rolagem-ativa');
        toggleTelaCheia(false);

        if (placar) placar.style.display = 'none';
        if (barra) {
            barra.style.display = 'none';
            barra.style.width = '0%';
        }
    } else {
        // --- INICIAR ROLAGEM ---
        btn.innerText = "■";
        btn.classList.add("active");

        // OCULTAR PAINÉIS DE CONFIGURAÇÃO MANUALMENTE
        paineisPalco.forEach(p => p.style.display = 'none');

        toggleTelaCheia(true);
        document.body.classList.add('rolagem-ativa');

        if (placar) placar.style.display = 'block';
        if (barra) barra.style.display = 'block';

        const blocoFocado = obterBlocoMusicaAtualNaTela();

        setTimeout(() => {
            if (blocoFocado) {
                // Scroll instantâneo para evitar conflito com a rolagem automática
                const rect = blocoFocado.getBoundingClientRect();
                window.scrollTo({
                    top: window.scrollY + rect.top - (window.innerHeight * 0.15),
                    behavior: 'instant'
                });
            }

            const delay = (appStorage.configGlobais && appStorage.configGlobais.delayPartida) ? appStorage.configGlobais.delayPartida : 0;

            if (delay > 0) {
                iniciarContagemRegressiva(delay, () => {
                    velocidadGlobalAtual = -1;
                    bpmAtual = -1;
                    verificarMetronomo();
                    verificarMusicaVisivelNaTela();
                    if (blocoFocado) atualizarContadorMusica(blocoFocado);
                    redefinirMotorRolagem(velocidadGlobalAtual);
                });
            } else {
                velocidadGlobalAtual = -1;
                bpmAtual = -1;
                verificarMetronomo();
                verificarMusicaVisivelNaTela();
                if (blocoFocado) atualizarContadorMusica(blocoFocado);
                redefinirMotorRolagem(velocidadGlobalAtual);
            }
        }, 300);
    }
}

function redefinirMotorRolagem(velocidade) {
    if (intervaloRolagem) clearInterval(intervaloRolagem);

    const mapaTempos = [400, 360, 320, 280, 240, 205, 175, 145, 115, 85, 70, 58, 48, 40, 34, 29, 25, 19, 14, 10];
    const velIndex = Math.min(19, Math.max(0, parseInt(velocidade) - 1));
    let tempoEspera = mapaTempos[velIndex] || 100;

    const container = document.getElementById("setlist-container");
    if (container && container.classList.contains("ocultar-acordes")) {
        tempoEspera *= 2;
    }

    intervaloRolagem = setInterval(() => {
        window.scrollBy(0, 1);
    }, tempoEspera);
}



function pularParaMusica(idBloco) {
    if (!idBloco) return;
    const elementoAlvo = document.getElementById(idBloco);
    if (elementoAlvo) {
        const estavaRodando = (intervaloRolagem !== null);
        if (estavaRodando) {
            clearInterval(intervaloRolagem);
            travaTemporariaScroll = true;
        }
        elementoAlvo.scrollIntoView({
            behavior: 'smooth'
        });
        setTimeout(() => {
            travaTemporariaScroll = false;
            if (estavaRodando) {
                velocidadGlobalAtual = -1;
                verificarMusicaVisivelNaTela();
            }
        }, 1500);
    }
    document.getElementById("seletor-musica").value = "";
}
// Adicionamos o "\+" no regex para reconhecer acordes como A+
const REGEX_LINHA_ACORDES = /^(?:[A-G][#b]?(?:m(?:aj|in)?|aug|dim|sus|add|º|\+)?(?:\d+)?M?(?:\/[A-G][#b]?)?\s+)*[A-G][#b]?(?:m(?:aj|in)?|aug|dim|sus|add|º|\+)?(?:\d+)?M?(?:\/[A-G][#b]?)?$/;

function envolverAcordesEmSpans(linha) {
    const RE = /([A-G][#b]?(?:m(?:aj|in|7)?|maj7?|aug|dim|sus[24]?|add|º|\+)?(?:2|4|5|6|7|9|11|13)?M?(?:\/[A-G][#b]?)?)/g;

    // 1. Processa a linha original para colocar as SPANS nos acordes
    let linhaProcessada = linha.replace(RE, (match, p1, offset, str) => {
        const antes = offset > 0 ? str[offset - 1] : ' ';
        const depois = str[offset + match.length] || ' ';

        const precedidoPorLetraMinuscula = /[a-záéíóúãõâêîôûàèìòùç]/i.test(antes) && /[a-z]/.test(antes);
        const seguidoPorLetraMinuscula = /[a-záéíóúãõâêîôûàèìòùç]/.test(depois);
        if (precedidoPorLetraMinuscula || seguidoPorLetraMinuscula) return match;

        const separador = /[\s\(\[\-,\/]/.test(antes) || offset === 0;
        if (!separador) return match;

        return `<span class="chord">${match}</span>`;
    });

    // 2. Só agora substituímos espaços múltiplos por &nbsp; para o navegador não colapsar
    // A regex /( {2,})/g pega dois ou mais espaços e converte em &nbsp;
    return linhaProcessada.replace(/( {2,})/g, (match) => '&nbsp;'.repeat(match.length));
}

function processarLinhasTexto(texto) {
    return texto.split('\n').map(linha => {
        // NÃO use .trim() aqui se quiser preservar o recuo inicial
        if (linha.trim() === "") return `<div style="height: 1em;"></div>`;

        // 1. Preserva espaços iniciais transformando em &nbsp;
        // Esta regex pega todos os espaços no início da linha
        let espacosIniciais = linha.match(/^\s*/)[0];
        let linhaSemEspacosIniciais = linha.substring(espacosIniciais.length);
        let prefixo = espacosIniciais.replace(/ /g, "&nbsp;");

        // 2. Aplica negrito
        let linhaFormatada = linhaSemEspacosIniciais.replace(/\*(.*?)\*/g, "<strong>$1</strong>");

        const temMarcadores = linhaSemEspacosIniciais.includes('[') || linhaSemEspacosIniciais.includes('(');
        const ehLinhaDeAcordes = REGEX_LINHA_ACORDES.test(linhaSemEspacosIniciais.trim());

        if (temMarcadores || ehLinhaDeAcordes) {
            return `<div>${prefixo}${envolverAcordesEmSpans(linhaFormatada)}</div>`;
        }

        // Para linhas de texto, também aplicamos o prefixo de &nbsp;
        return `<div>${prefixo}${linhaFormatada}</div>`;
    }).join('');
}

function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function mostrarToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2200);
}

// =========================================================================
// MODAL CADASTRAR MÚSICA
// =========================================================================
function abrirModalCadastrarMusica() {
    document.getElementById('modal-cadastrar-container').classList.add('active');
}

function fecharModalCadastrar() {
    document.getElementById('modal-cadastrar-container').classList.remove('active');
    document.getElementById('input-cifra-bruta').value = '';
}

// =========================================================================
// IMPORTAÇÃO DE REPERTÓRIO (.txt / URL / Biblioteca)
// =========================================================================


const BIBLIOTECA_FIXA = {
    'repertorio_brega': { url: 'setlists/repertorio_brega.txt', nome: 'Brega' },
    'repertorio_missa': { url: 'setlists/repertorio_missa.txt', nome: 'Missa - De pé pela fé' },
    'repertorio_rock_nacional': { url: 'setlists/repertorio_rock_nacional.txt', nome: 'Rock Nacional' },
    'repertorio_forro_pe_de_serra': { url: 'setlists/repertorio_forro_pe_de_serra.txt', nome: 'Forró Pé de Serra' },
};

function processarJsonImportado(jsonTexto, nomeOrigem) {
    let pacote;
    try {
        pacote = JSON.parse(jsonTexto);
    } catch {
        mostrarToast('❌ Arquivo inválido ou corrompido.');
        return;
    }
    if (!pacote.musicasGlobais || !pacote.listas) {
        mostrarToast('❌ Estrutura do arquivo não reconhecida.');
        return;
    }
    backupTemporarioParaProcessar = pacote;
    // Atualiza o label de origem no modal de restore para contexto
    const h3 = document.querySelector('#modal-interacao-restore .modal-header h3');
    if (h3) h3.textContent = `📥 Importar: ${nomeOrigem}`;
    fecharModalAdmin();
    document.getElementById('modal-interacao-restore').classList.add('active');
}

function importarArquivoLocal(input) {
    const arquivo = input.files[0];
    if (!arquivo) return;
    document.getElementById('label-arquivo-escolhido').textContent = arquivo.name;
    const reader = new FileReader();
    reader.onload = e => processarJsonImportado(e.target.result, arquivo.name);
    reader.onerror = () => mostrarToast('❌ Erro ao ler o arquivo.');
    reader.readAsText(arquivo, 'UTF-8');
}



async function importarBibliotecaFixa(chave) {
    const item = BIBLIOTECA_FIXA[chave];

    if (!item) {
        console.error('Chave não encontrada na biblioteca:', chave);
        return;
    }

    mostrarToast(`⏳ Carregando ${item.nome}…`);

    try {
        const res = await fetch(item.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const texto = await res.text();
        processarJsonImportado(texto, item.nome);

    } catch (err) {
        console.error(err);
        mostrarToast(`❌ Não foi possível carregar ${item.nome}. Verifique a conexão.`);
    }
}


// =========================================================================
// DIAGRAMAS DE ACORDE — TOOLTIP FLUTUANTE
// Formato de cada acorde: { frets: [E,A,D,G,B,e], fingers: [E,A,D,G,B,e], barre: {fret, from, to}|null, baseFret: 1 }
// frets: -1 = corda muda (X), 0 = corda solta (O), 1+ = casa pressionada
// =========================================================================

const BANCO_ACORDES = {
    // ── MAIORES ──────────────────────────────────────────────────────────
    "C": { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], barre: null, baseFret: 1 },
    "D": { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], barre: null, baseFret: 1 },
    "E": { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], barre: null, baseFret: 1 },
    "F": { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 }, baseFret: 1 },
    "G": { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], barre: null, baseFret: 1 },
    "A": { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], barre: null, baseFret: 1 },
    "B": { frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], barre: { fret: 2, from: 1, to: 5 }, baseFret: 2 },
    // ── MENORES ──────────────────────────────────────────────────────────
    "Am": { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], barre: null, baseFret: 1 },
    "Bm": { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barre: { fret: 2, from: 1, to: 5 }, baseFret: 2 },
    "Cm": { frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], barre: { fret: 3, from: 1, to: 5 }, baseFret: 3 },
    "Dm": { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], barre: null, baseFret: 1 },
    "Em": { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], barre: null, baseFret: 1 },
    "Fm": { frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], barre: { fret: 1, from: 0, to: 5 }, baseFret: 1 },
    "Gm": { frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], barre: { fret: 3, from: 0, to: 5 }, baseFret: 3 },
    "F#m": { frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], barre: { fret: 2, from: 0, to: 5 }, baseFret: 2 },
    // ── SUSTENIDOS MAIORES/MENORES ───────────────────────────────────────
    "C#": { frets: [-1, 4, 6, 6, 6, 4], fingers: [0, 1, 3, 4, 4, 1], barre: { fret: 4, from: 1, to: 5 }, baseFret: 4 },
    "D#": { frets: [-1, -1, 1, 3, 4, 3], fingers: [0, 0, 1, 2, 4, 3], barre: null, baseFret: 1 },
    "F#": { frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 2, from: 0, to: 5 }, baseFret: 2 },
    "G#": { frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 4, from: 0, to: 5 }, baseFret: 4 },
    "A#": { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 3, 4, 4, 1], barre: { fret: 1, from: 1, to: 5 }, baseFret: 1 },
    "C#m": { frets: [-1, 4, 6, 6, 5, 4], fingers: [0, 1, 3, 4, 2, 1], barre: { fret: 4, from: 1, to: 5 }, baseFret: 4 },
    "D#m": { frets: [-1, -1, 1, 3, 4, 2], fingers: [0, 0, 1, 3, 4, 2], barre: null, baseFret: 1 },
    "G#m": { frets: [4, 6, 6, 4, 4, 4], fingers: [1, 3, 4, 1, 1, 1], barre: { fret: 4, from: 0, to: 5 }, baseFret: 4 },
    "A#m": { frets: [-1, 1, 3, 3, 2, 1], fingers: [0, 1, 3, 4, 2, 1], barre: { fret: 1, from: 1, to: 5 }, baseFret: 1 },
    // ── DOMINANTES (7) ───────────────────────────────────────────────────
    "C7": { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0], barre: null, baseFret: 1 },
    "D7": { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], barre: null, baseFret: 1 },
    "E7": { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], barre: null, baseFret: 1 },
    "G7": { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], barre: null, baseFret: 1 },
    "A7": { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], barre: null, baseFret: 1 },
    "B7": { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], barre: null, baseFret: 1 },
    // ── DOMINANTES (7) SUSTENIDOS ────────────────────────────────────────
    "C#7": { frets: [-1, 4, 3, 4, 2, 4], fingers: [0, 2, 1, 3, 0, 4], barre: null, baseFret: 2 },
    "D#7": { frets: [-1, -1, 1, 3, 2, 3], fingers: [0, 0, 1, 3, 2, 4], barre: null, baseFret: 1 },
    "F#7": { frets: [2, 1, 2, 1, 2, 2], fingers: [2, 1, 3, 1, 4, 1], barre: { fret: 1, from: 0, to: 5 }, baseFret: 2 },
    "G#7": { frets: [4, 4, 6, 4, 6, 4], fingers: [1, 1, 3, 1, 4, 1], barre: { fret: 4, from: 0, to: 5 }, baseFret: 4 },
    "A#7": { frets: [-1, 1, 3, 1, 3, 1], fingers: [0, 1, 3, 1, 4, 1], barre: { fret: 1, from: 1, to: 5 }, baseFret: 1 },
    // ── SÉTIMAS MAIORES (maj7) ──────────────────────────────────────────
    "Cmaj7": { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0], barre: null, baseFret: 1 },
    "Dmaj7": { frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3], barre: null, baseFret: 1 },
    "Fmaj7": { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0], barre: null, baseFret: 1 },
    "Gmaj7": { frets: [3, 2, 0, 0, 0, 2], fingers: [2, 1, 0, 0, 0, 3], barre: null, baseFret: 1 },
    "Amaj7": { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0], barre: null, baseFret: 1 },
    "Bmaj7": { frets: [-1, 2, 4, 3, 4, 2], fingers: [0, 1, 3, 2, 4, 1], barre: { fret: 2, from: 1, to: 5 }, baseFret: 2 },
    // ── MENORES COM 7 (m7) ────────────────────────────────────────────────
    "Am7": { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0], barre: null, baseFret: 1 },
    "Bm7": { frets: [-1, 1, 3, 1, 2, 1], fingers: [0, 1, 3, 1, 2, 1], barre: { fret: 1, from: 1, to: 5 }, baseFret: 2 },
    "Cm7": { frets: [-1, 1, 3, 1, 2, 1], fingers: [0, 1, 3, 1, 2, 1], barre: { fret: 1, from: 1, to: 5 }, baseFret: 3 },
    "Dm7": { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1], barre: { fret: 1, from: 3, to: 5 }, baseFret: 1 },
    "Em7": { frets: [0, 2, 2, 0, 3, 0], fingers: [0, 2, 3, 0, 4, 0], barre: null, baseFret: 1 },
    "Fm7": { frets: [1, 1, 3, 1, 2, 1], fingers: [1, 1, 3, 1, 2, 1], barre: { fret: 1, from: 0, to: 5 }, baseFret: 1 },
    "Gm7": { frets: [1, 3, 1, 1, 1, 1], fingers: [1, 3, 1, 1, 1, 1], barre: { fret: 1, from: 0, to: 5 }, baseFret: 3 },
    // ── MENORES COM 7 (m7) SUSTENIDOS ────────────────────────────────────
    "C#m7": { frets: [-1, 4, 6, 4, 5, 4], fingers: [0, 1, 3, 1, 2, 1], barre: { fret: 4, from: 1, to: 5 }, baseFret: 4 },
    "D#m7": { frets: [-1, -1, 1, 3, 2, 2], fingers: [0, 0, 1, 4, 2, 3], barre: null, baseFret: 1 },
    "F#m7": { frets: [2, 4, 2, 2, 2, 2], fingers: [1, 3, 1, 1, 1, 1], barre: { fret: 2, from: 0, to: 5 }, baseFret: 2 },
    "G#m7": { frets: [4, 6, 4, 4, 4, 4], fingers: [1, 3, 1, 1, 1, 1], barre: { fret: 4, from: 0, to: 5 }, baseFret: 4 },
    "A#m7": { frets: [-1, 1, 3, 1, 2, 1], fingers: [0, 1, 3, 1, 2, 1], barre: { fret: 1, from: 1, to: 5 }, baseFret: 1 },
    // ── NONA (9) ──────────────────────────────────────────────────────────
    "C9": { frets: [-1, 3, 2, 3, 3, 3], fingers: [0, 2, 1, 3, 3, 3], barre: { fret: 3, from: 2, to: 5 }, baseFret: 1 },
    "D9": { frets: [-1, -1, 0, 2, 1, 0], fingers: [0, 0, 0, 1, 2, 0], barre: null, baseFret: 1 },
    "E9": { frets: [0, 2, 0, 1, 0, 2], fingers: [0, 2, 0, 1, 0, 3], barre: null, baseFret: 1 },
    "G9": { frets: [3, 2, 0, 2, 0, 1], fingers: [3, 2, 0, 4, 0, 1], barre: null, baseFret: 1 },
    "A9": { frets: [-1, 0, 2, 4, 2, 3], fingers: [0, 0, 1, 3, 1, 2], barre: { fret: 2, from: 2, to: 4 }, baseFret: 1 },
    "B9": { frets: [-1, 2, 1, 2, 2, 2], fingers: [0, 2, 1, 3, 3, 3], barre: { fret: 2, from: 2, to: 5 }, baseFret: 2 },
    // ── SUSPENSOS (sus2 / sus4) ───────────────────────────────────────────
    "Csus2": { frets: [-1, 3, 0, 0, 1, 3], fingers: [0, 2, 0, 0, 1, 4], barre: null, baseFret: 1 },
    "Dsus2": { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 2, 0], barre: null, baseFret: 1 },
    "Asus2": { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0], barre: null, baseFret: 1 },
    "Dsus4": { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3], barre: null, baseFret: 1 },
    "Esus4": { frets: [0, 2, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 0, 0], barre: null, baseFret: 1 },
    "Asus4": { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0], barre: null, baseFret: 1 },
    // ── ADD9 ──────────────────────────────────────────────────────────────
    "Cadd9": { frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 3, 0], barre: null, baseFret: 1 },
    "Gadd9": { frets: [3, 2, 0, 2, 0, 3], fingers: [2, 1, 0, 3, 0, 4], barre: null, baseFret: 1 },
    "Dadd9": { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 2, 0], barre: null, baseFret: 1 },
    // ── DIMINUTOS (dim) ──────────────────────────────────────────────────
    "Cdim": { frets: [-1, 3, 4, 5, 4, -1], fingers: [0, 1, 2, 4, 3, 0], barre: null, baseFret: 3 },
    "Ddim": { frets: [-1, -1, 0, 1, 0, 1], fingers: [0, 0, 0, 1, 0, 2], barre: null, baseFret: 1 },
    "Edim": { frets: [0, 1, 2, 3, 2, -1], fingers: [0, 1, 2, 4, 3, 0], barre: null, baseFret: 1 },
    "Fdim": { frets: [-1, -1, 3, 4, 3, 4], fingers: [0, 0, 1, 3, 2, 4], barre: null, baseFret: 1 },
    "Gdim": { frets: [-1, -1, 5, 6, 5, 6], fingers: [0, 0, 1, 3, 2, 4], barre: null, baseFret: 5 },
    "Adim": { frets: [-1, 0, 3, 2, 2, 1], fingers: [0, 0, 4, 2, 3, 1], barre: null, baseFret: 1 },
    "Bdim": { frets: [-1, 2, 3, 4, 3, -1], fingers: [0, 1, 2, 4, 3, 0], barre: null, baseFret: 2 },
    "C#dim": { frets: [-1, 4, 5, 3, 5, -1], fingers: [0, 2, 3, 1, 4, 0], barre: null, baseFret: 3 },
    "D#dim": { frets: [-1, -1, 1, 2, 1, 2], fingers: [0, 0, 1, 3, 2, 4], barre: null, baseFret: 1 },
    "F#dim": { frets: [-1, -1, 4, 5, 4, 5], fingers: [0, 0, 1, 3, 2, 4], barre: null, baseFret: 4 },
    "G#dim": { frets: [4, 5, 6, 4, -1, -1], fingers: [1, 2, 4, 1, 0, 0], barre: { fret: 4, from: 0, to: 1 }, baseFret: 4 },
    "A#dim": { frets: [-1, 1, 2, 0, 2, -1], fingers: [0, 1, 2, 0, 3, 0], barre: null, baseFret: 1 },
    // ── AUMENTADOS (aug) ─────────────────────────────────────────────────
    "Caug": { frets: [-1, 3, 2, 1, 1, 0], fingers: [0, 4, 3, 1, 2, 0], barre: null, baseFret: 1 },
    "Daug": { frets: [-1, -1, 0, 3, 3, 2], fingers: [0, 0, 0, 2, 3, 1], barre: null, baseFret: 1 },
    "Eaug": { frets: [0, 3, 2, 1, 1, 0], fingers: [0, 4, 3, 2, 1, 0], barre: null, baseFret: 1 },
    "Gaug": { frets: [3, 2, 1, 0, 0, -1], fingers: [3, 2, 1, 0, 0, 0], barre: null, baseFret: 1 },
    "Baug": { frets: [-1, 2, 1, 0, 0, -1], fingers: [0, 3, 2, 1, 0, 0], barre: null, baseFret: 1 },
    "F#aug": { frets: [2, 1, 0, -1, -1, -1], fingers: [2, 1, 0, 0, 0, 0], barre: null, baseFret: 1 },
    // ── SEXTA (6) ─────────────────────────────────────────────────────────
    "C6": { frets: [-1, 3, 2, 2, 1, 0], fingers: [0, 4, 2, 3, 1, 0], barre: null, baseFret: 1 },
    "A6": { frets: [-1, 0, 2, 2, 2, 2], fingers: [0, 0, 1, 2, 3, 4], barre: null, baseFret: 1 },
    "Am6": { frets: [-1, 0, 2, 2, 1, 2], fingers: [0, 0, 2, 3, 1, 4], barre: null, baseFret: 1 },
    // ── QUINTA (Power Chords) ──────────────────────────────────────────
    "C5": { frets: [-1, 3, 5, 5, -1, -1], fingers: [0, 1, 3, 4, 0, 0], barre: null, baseFret: 1 },
    "D5": { frets: [-1, 5, 7, 7, -1, -1], fingers: [0, 1, 3, 4, 0, 0], barre: null, baseFret: 5 },
    "E5": { frets: [0, 2, 2, -1, -1, -1], fingers: [0, 1, 2, 0, 0, 0], barre: null, baseFret: 1 },
    "F5": { frets: [1, 3, 3, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0], barre: null, baseFret: 1 },
    "G5": { frets: [3, 5, 5, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0], barre: null, baseFret: 3 },
    "A5": { frets: [-1, 0, 2, 2, -1, -1], fingers: [0, 0, 1, 2, 0, 0], barre: null, baseFret: 1 },
    "B5": { frets: [-1, 2, 4, 4, -1, -1], fingers: [0, 1, 3, 4, 0, 0], barre: null, baseFret: 2 },
    "F#5": { frets: [2, 4, 4, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0], barre: null, baseFret: 2 }
};

// Normaliza nome do acorde para bater com o banco (ex: "F#m7" → tenta "F#m", "F#")
function normalizarAcordeParaBusca(nomeOriginal) {
    // Separar nota de baixo (ex: C/E → base="C", baixo="E")
    const partesSlash = nomeOriginal.split('/');
    const nome = partesSlash[0].trim();
    const notaBaixo = partesSlash[1] ? partesSlash[1].trim() : null;

    const tentativas = [];

    // 1. Nome exato (sem o baixo)
    tentativas.push(nome);

    // 2. Normalizar bemóis para equivalentes sustenidos
    const normBemol = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
    const notaBase = (nome.match(/^([A-G][#b]?)/) || [])[1] || '';
    const sufixo = nome.slice(notaBase.length);
    const notaNorm = normBemol[notaBase] || notaBase;
    if (notaNorm !== notaBase) tentativas.push(notaNorm + sufixo);

    // 3. Variações de sufixo comuns
    tentativas.push(nome.replace(/maj7/i, 'maj7'));
    tentativas.push(nome.replace(/min/i, 'm'));
    tentativas.push(nome.replace(/7M/i, 'maj7'));
    tentativas.push(nome.replace(/º/i, 'dim'));
    tentativas.push(nome.replace(/\+/i, 'aug')); // <--- A MÁGICA DO "+"
    tentativas.push(nome.replace(/M$/, 'maj7'));

    // 4. Sem número final (B7 → B, Am9 → Am)
    const semNumero = nome.replace(/\d+$/, '');
    tentativas.push(semNumero);
    if (notaNorm !== notaBase) tentativas.push(notaNorm + semNumero.slice(notaBase.length));

    // 5. Só base + qualidade menor (Am7 → Am, Bm9 → Bm)
    const matchBase = nome.match(/^([A-G][#b]?)(m)?/);
    if (matchBase) {
        const baseComQual = matchBase[1] + (matchBase[2] || '');
        tentativas.push(baseComQual);
        if (notaNorm !== matchBase[1]) tentativas.push(notaNorm + (matchBase[2] || ''));
    }

    return { tentativas: [...new Set(tentativas)], notaBaixo };
}

function gerarSvgAcorde(nomeOriginal) {
    const { tentativas, notaBaixo } = normalizarAcordeParaBusca(nomeOriginal);
    let acorde = null;
    let nomeUsado = null;
    for (const t of tentativas) {
        if (BANCO_ACORDES[t]) {
            acorde = BANCO_ACORDES[t];
            nomeUsado = t;
            break;
        }
    }
    if (!acorde) return null;
    const ehAproximado = nomeUsado !== tentativas[0] || notaBaixo;

    const { frets, fingers, barre, baseFret } = acorde;

    // dimensões
    const W = 140,
        H = 170;
    const marginLeft = 28,
        marginTop = 38;
    const colW = 18,
        rowH = 18;
    const numFrets = 5,
        numStrings = 6;
    const gridW = colW * (numStrings - 1);
    const gridH = rowH * numFrets;
    const nutY = marginTop;

    // cor adaptada via currentColor (herda do tema)
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    svg += `<rect width="${W}" height="${H}" rx="10" fill="var(--card-bg)" stroke="var(--border-color)" stroke-width="1.5"/>`;

    // nome do acorde
    svg += `<text x="${W/2}" y="20" text-anchor="middle" font-family="'Segoe UI',sans-serif" font-size="15" font-weight="800" fill="var(--chord-color)">${escapeHtml(nomeOriginal)}</text>`;

    // Aviso de aproximação ou nota de baixo
    if (ehAproximado) {
        let avisoTexto = '';
        if (notaBaixo && nomeUsado !== tentativas[0]) {
            avisoTexto = `aprox. (${nomeUsado}) baixo: ${notaBaixo}`;
        } else if (notaBaixo) {
            avisoTexto = `baixo: ${notaBaixo}`;
        } else {
            avisoTexto = `aprox.: ${nomeUsado}`;
        }
        svg += `<text x="${W/2}" y="${H - 6}" text-anchor="middle" font-family="'Segoe UI',sans-serif" font-size="8" fill="var(--text-muted)" font-style="italic">${escapeHtml(avisoTexto)}</text>`;
    }

    // indicador de casa base (se > 1)
    if (baseFret > 1) {
        svg += `<text x="${marginLeft - 10}" y="${marginTop + rowH * 0.7}" text-anchor="end" font-family="'Segoe UI',sans-serif" font-size="10" fill="var(--text-muted)">${baseFret}fr</text>`;
    }

    // porca (nut) ou linha dupla se baseFret > 1
    if (baseFret === 1) {
        svg += `<rect x="${marginLeft}" y="${nutY - 4}" width="${gridW}" height="4" rx="1" fill="var(--text-color)"/>`;
    } else {
        svg += `<line x1="${marginLeft}" y1="${nutY}" x2="${marginLeft + gridW}" y2="${nutY}" stroke="var(--border-color)" stroke-width="1.5"/>`;
    }

    // linhas horizontais (trastes)
    for (let f = 0; f <= numFrets; f++) {
        const y = nutY + f * rowH;
        svg += `<line x1="${marginLeft}" y1="${y}" x2="${marginLeft + gridW}" y2="${y}" stroke="var(--border-color)" stroke-width="1"/>`;
    }

    // linhas verticais (cordas)
    for (let s = 0; s < numStrings; s++) {
        const x = marginLeft + s * colW;
        svg += `<line x1="${x}" y1="${nutY}" x2="${x}" y2="${nutY + gridH}" stroke="var(--text-muted)" stroke-width="1"/>`;
    }

    // barra (cejilha)
    if (barre) {
        const by = nutY + (barre.fret - baseFret) * rowH + rowH / 2;
        const bx1 = marginLeft + barre.from * colW;
        const bx2 = marginLeft + barre.to * colW;
        svg += `<rect x="${bx1}" y="${by - 7}" width="${bx2 - bx1}" height="14" rx="7" fill="var(--chord-color)" opacity="0.9"/>`;
    }

    // pontos (dedos) e X/O nas cordas soltas/mudas
    frets.forEach((fret, stringIdx) => {
        const cx = marginLeft + stringIdx * colW;
        if (fret === -1) {
            // corda muda: X
            const oy = nutY - 11;
            svg += `<text x="${cx}" y="${oy}" text-anchor="middle" font-family="'Segoe UI',sans-serif" font-size="11" font-weight="700" fill="var(--text-muted)">×</text>`;
        } else if (fret === 0) {
            // corda solta: O
            const oy = nutY - 11;
            svg += `<circle cx="${cx}" cy="${oy - 2}" r="4" fill="none" stroke="var(--text-muted)" stroke-width="1.5"/>`;
        } else {
            // dedo pressionado
            const relativeFret = fret - baseFret + 1;
            if (relativeFret >= 1 && relativeFret <= numFrets) {
                // só desenha se não é parte de uma barra já desenhada (simplificação: sempre desenha)
                const dotY = nutY + (relativeFret - 1) * rowH + rowH / 2;
                svg += `<circle cx="${cx}" cy="${dotY}" r="7" fill="var(--chord-color)"/>`;
                const fingerNum = fingers[stringIdx];
                if (fingerNum && fingerNum > 0) {
                    svg += `<text x="${cx}" y="${dotY + 4}" text-anchor="middle" font-family="'Segoe UI',sans-serif" font-size="9" font-weight="700" fill="white">${fingerNum}</text>`;
                }
            }
        }
    });

    svg += `</svg>`;
    return svg;
}

// ── TOOLTIP DOM ───────────────────────────────────────────────────────────
(function inicializarTooltipAcorde() {
    const tooltip = document.createElement('div');
    tooltip.id = 'chord-tooltip';
    tooltip.className = 'chord-tooltip';
    document.body.appendChild(tooltip);

    let hideTimer = null;

    document.addEventListener('mouseover', e => {
        const span = e.target.closest('.chord');
        if (!span) return;
        clearTimeout(hideTimer);

        const nomeAcorde = span.textContent.trim();
        const svg = gerarSvgAcorde(nomeAcorde);
        if (!svg) return;

        tooltip.innerHTML = svg;
        tooltip.classList.add('visible');
        posicionarTooltip(e);
    });

    document.addEventListener('mousemove', e => {
        if (!tooltip.classList.contains('visible')) return;
        if (!e.target.closest('.chord')) return;
        posicionarTooltip(e);
    });

    document.addEventListener('mouseout', e => {
        const span = e.target.closest('.chord');
        if (!span) return;
        hideTimer = setTimeout(() => tooltip.classList.remove('visible'), 120);
    });

    function posicionarTooltip(e) {
        const tw = 148,
            th = 178;
        let x = e.clientX + 14;
        let y = e.clientY - th / 2;
        if (x + tw > window.innerWidth - 8) x = e.clientX - tw - 14;
        if (y < 8) y = 8;
        if (y + th > window.innerHeight - 8) y = window.innerHeight - th - 8;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }
})();

// =========================================================================
// IMPRESSÃO
// =========================================================================
function imprimirListaAtiva() {
    const idsDaLista = appStorage.listas[appStorage.listaAtiva] || [];
    if (idsDaLista.length === 0) {
        mostrarToast("Nenhuma música na lista para imprimir.");
        return;
    }

    // Coletar dados atuais da tela (tom transposto + fonte escolhida)
    const musicasParaImprimir = idsDaLista.map((id, index) => {
        const musica = appStorage.musicasGlobais[id];
        if (!musica) return null;

        // Pegar HTML dos acordes já transpostos diretamente do DOM
        const corpoDom = document.getElementById(`corpo-cifra-${index}`);
        const corpoHtml = corpoDom ? corpoDom.innerHTML : processarLinhasTexto(musica.letraCifra);

        // Fonte atual da tela
        const fonteAtual = musica.fonteCustomizada || 16;

        // Tom e capo atuais
        const tomAtual = (document.getElementById(`tom-txt-${index}`) || {}).innerText || musica.tomCustomizado || musica.tomOriginal;
        const capoAtual = parseInt((document.getElementById(`capo-select-${index}`) || {}).value || 0);
        const dicaCapo = (document.getElementById(`capo-dica-${index}`) || {}).textContent || '';

        return { musica, corpoHtml, fonteAtual, tomAtual, capoAtual, dicaCapo };
    }).filter(Boolean);

    const nomeLista = escapeHtml(appStorage.listaAtiva);
    const dataImpressao = new Date().toLocaleDateString('pt-BR');
    const modoLetraPura = document.getElementById('setlist-container').classList.contains('ocultar-acordes');
    const estiloChordLine = modoLetraPura ? '.chord-line { display: none !important; }' : '.chord-line { display: block; }';

    // Montar HTML completo da janela de impressão
    const musicasHtml = musicasParaImprimir.map((item, i) => `
        <div class="pagina-musica">
            <div class="cabecalho-pagina">
                <span class="cabecalho-app">GelCifras</span>
                <span class="cabecalho-lista">${nomeLista}</span>
                <span class="cabecalho-data">${dataImpressao}</span>
            </div>
            <div class="musica-titulo">${i + 1}. ${escapeHtml(item.musica.titulo)}</div>
            <div class="musica-artista">Por: ${escapeHtml(item.musica.artista || 'Desconhecido')} &nbsp;|&nbsp; Tom: <strong>${escapeHtml(item.tomAtual)}</strong>${item.capoAtual > 0 ? ` &nbsp;|&nbsp; Capo: ${item.capoAtual}ª casa &nbsp;<em>(${escapeHtml(item.dicaCapo)})</em>` : ''}</div>
            <pre class="musica-corpo" style="font-size:${item.fonteAtual}px;">${item.corpoHtml}</pre>
        </div>
    `).join('');

    const janela = window.open('', '_blank');
    janela.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>GelCifras — ${nomeLista}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            color: #1a1a1a;
            background: white;
        }

        /* Cabeçalho repetido em toda página via @page + position:running */
        .cabecalho-pagina {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            border-bottom: 2px solid #1d4ed8;
            padding-bottom: 6px;
            margin-bottom: 14px;
        }

        .cabecalho-app {
            font-size: 15px;
            font-weight: 900;
            color: #1d4ed8;
            letter-spacing: -0.5px;
        }

        .cabecalho-lista {
            font-size: 13px;
            font-weight: 700;
            color: #334155;
        }

        .cabecalho-data {
            font-size: 11px;
            color: #94a3b8;
        }

        /* Cada música começa em nova página */
        .pagina-musica {
            page-break-before: always;
            padding: 18px 22px 18px 22px;
        }

        .pagina-musica:first-child {
            page-break-before: avoid;
        }

        .musica-titulo {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 3px;
        }

        .musica-artista {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 10px;
        }

        .musica-artista strong { color: #1d4ed8; }
        .musica-artista em { color: #64748b; font-style: normal; }

        pre.musica-corpo {
            font-family: 'Courier New', Courier, monospace;
            line-height: 1.8;
            white-space: pre-wrap;
            word-wrap: break-word;
            color: #1a1a1a;
        }

        /* Acordes */
        .chord {
            color: #0056b3;
            font-weight: bold;
        }

        /* Linhas de acorde — controlado pelo modo de exibição */
        ${estiloChordLine}

        /* ── MARCA D'ÁGUA ── */
        .marca-dagua {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            opacity: 0.045;
            pointer-events: none;
            z-index: 0;
        }

        .marca-dagua img {
            width: 180px;
            height: 180px;
            object-fit: contain;
        }

        .marca-dagua span {
            font-family: 'Segoe UI', system-ui, sans-serif;
            font-size: 48px;
            font-weight: 900;
            color: #1d4ed8;
            letter-spacing: -2px;
            white-space: nowrap;
        }

        .pagina-musica {
            position: relative;
            z-index: 1;
        }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .marca-dagua { position: fixed; }
        }
    </style>
</head>
<body>
<div class="marca-dagua">
    <img src="apple-touch-icon.png" onerror="this.style.display='none'">
    <span>GelCifras</span>
</div>
${musicasHtml}
<script>window.onload = () => { window.onafterprint = () => window.close(); window.print(); }<\/script>
</body>
</html>`);
    janela.document.close();
}

// =========================================================================
// MENU FLUTUANTE
// =========================================================================
function toggleMenuFlutuante() {
    const menu = document.getElementById('menu-flutuante');
    const aberto = menu.style.display !== 'none';
    if (aberto) {
        fecharMenuFlutuante();
    } else {
        menu.style.display = 'block';
        // Fechar ao clicar fora
        setTimeout(() => {
            document.addEventListener('click', fecharMenuFlutuanteExterno);
        }, 50);
    }
}

function fecharMenuFlutuante() {
    const menu = document.getElementById('menu-flutuante');
    menu.style.display = 'none';
    document.removeEventListener('click', fecharMenuFlutuanteExterno);
}

function fecharMenuFlutuanteExterno(e) {
    if (!e.target.closest('#menu-flutuante') && !e.target.closest('.btn-menu')) {
        fecharMenuFlutuante();
    }
}
// =========================================================================
// BUSCA DE MÚSICA
// =========================================================================
function toggleBusca() {
    const wrapper = document.getElementById('barra-busca-wrapper');
    const campo = document.getElementById('campo-busca');
    const btnBusca = document.querySelector('.btn-busca'); // Encontra o botão da lupa
    const visivel = wrapper.style.display !== 'none';
    
    if (visivel) {
        // Fechando a busca
        wrapper.style.display = 'none';
        document.body.classList.remove('busca-ativa');
        if (btnBusca) btnBusca.classList.remove('active'); // Apaga a luz do botão
        
        campo.value = '';
        filtrarBusca('');
        document.querySelectorAll('.card-busca-global').forEach(el => el.remove());
    } else {
        // Abrindo a busca
        wrapper.style.display = 'block';
        document.body.classList.add('busca-ativa');
        if (btnBusca) btnBusca.classList.add('active'); // Acende a luz do botão verde
        
        campo.focus();
    }
}

function filtrarBusca(termo) {
    const t = termo.trim().toLowerCase();
    const container = document.getElementById('setlist-container');

    if (!t) {
        // Limpar busca: voltar à lista ativa normal
        document.querySelectorAll('.cifra-container').forEach(bloco => {
            bloco.classList.remove('busca-oculto', 'busca-destaque');
        });
        container.removeAttribute('data-modo-busca-global');
        return;
    }

    // Busca global: varrer todo o acervo
    const todosIds = Object.keys(appStorage.musicasGlobais);
    const idsDaLista = appStorage.listas[appStorage.listaAtiva] || [];
    const resultados = todosIds.filter(id => {
        const m = appStorage.musicasGlobais[id];
        if (!m) return false;
        
        const infoBasica = (m.titulo + ' ' + (m.artista || '')).toLowerCase();
        const letra = (m.letraCifra || '').toLowerCase();
        
        return infoBasica.includes(t) || letra.includes(t);
    });

    // Músicas que já estão renderizadas (da lista ativa)
    document.querySelectorAll('.cifra-container').forEach(bloco => {
        const id = bloco.getAttribute('data-real-id');
        if (resultados.includes(id)) {
            bloco.classList.remove('busca-oculto');
            bloco.classList.add('busca-destaque');
        } else {
            bloco.classList.add('busca-oculto');
            bloco.classList.remove('busca-destaque');
        }
    });

    // Músicas fora da lista ativa: renderizar temporariamente COM O PAINEL COMPLETO
    const idsForaDaLista = resultados.filter(id => !idsDaLista.includes(id));
    container.querySelectorAll('.card-busca-global').forEach(el => el.remove());

    if (idsForaDaLista.length > 0) {
        const norm = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };

        idsForaDaLista.forEach(id => {
            const musica = appStorage.musicasGlobais[id];
            if (!musica) return;
            
            const tomExibicao = musica.tomCustomizado || musica.tomOriginal || "C";
            const fonteExibicao = musica.fonteCustomizada || 16;
            const velocidadExibicao = musica.velocidadeCustomizada || 10;
            const bpmExibicao = musica.bpmCustomizado || 0;

            let matchTomExib = tomExibicao.match(/^([A-G][#b]?)/);
            let baseExibicao = matchTomExib ? matchTomExib[1] : "C";
            baseExibicao = norm[baseExibicao] || baseExibicao;
            let idxExibicao = escalaCromatica.indexOf(baseExibicao);
            if (idxExibicao === -1) idxExibicao = 0;

            // Criamos um "ID cego" para os botões não conflitrarem com os da lista real
            const idxBusca = `busca_${id}`;
            const capoSalvo = musica.capoCustomizado || 0;

            const div = document.createElement('div');
            div.className = 'cifra-container card-busca-global busca-destaque';
            div.id = `musica-bloco-${idxBusca}`;
            div.setAttribute('data-real-id', id);
            div.setAttribute('data-index', idxBusca);
            div.setAttribute('data-tom-index', idxExibicao);
            div.setAttribute('data-capo', capoSalvo);

            // O HTML gigante da busca substituído por:
            div.innerHTML = gerarHtmlCardMusica(musica, idxBusca, id, true);
            
            container.appendChild(div); // <- Mantenha essa linha

            // Aplica as transições matemáticas caso a música já estivesse alterada no banco
            if (musica.tomCustomizado && musica.tomCustomizado !== musica.tomOriginal) {
                let matchOrig = musica.tomOriginal.match(/^([A-G][#b]?)/);
                let baseOrig = matchOrig ? matchOrig[1] : "C";
                baseOrig = norm[baseOrig] || baseOrig;
                let idxOrig = escalaCromatica.indexOf(baseOrig);

                if (idxExibicao !== -1 && idxOrig !== -1) {
                    const deltaRender = idxExibicao - idxOrig;
                    div.querySelectorAll('.chord').forEach(span => {
                        span.textContent = transporAcorde(span.textContent, deltaRender);
                    });
                }
            }

            if (capoSalvo > 0) {
                div.querySelectorAll('.chord').forEach(span => {
                    span.textContent = transporAcorde(span.textContent, -capoSalvo);
                });
                exibirDicaCapo(idxBusca, idxExibicao, capoSalvo);
            }
        });
    }
}

// =========================================================================
// TELA CHEIA
// =========================================================================
function toggleTelaCheia(forcar) {
    const ativo = forcar !== undefined ? forcar : !document.body.classList.contains('modo-tela-cheia');
    document.body.classList.toggle('modo-tela-cheia', ativo);
}

// =========================================================================
// GERENCIAR LISTAS (EXCLUIR / DUPLICAR)
// =========================================================================


function excluirLista() {
    const sel = document.getElementById('seletor-lista-gerenciar');
    const nome = sel?.value;
    if (!nome) { mostrarToast('Nenhuma lista selecionada.'); return; }
    if (!confirm(`Excluir a lista "${nome}"? As músicas permanecem no acervo.`)) return;
    delete appStorage.listas[nome];
    if (appStorage.listaAtiva === nome) appStorage.listaAtiva = 'Todas as Músicas';
    localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    mostrarToast(`Lista "${nome}" excluída.`);
    fecharModalAdmin();
    sincronizarEAAplicarInterface();
}

// ── GESTÃO AVANÇADA DE LISTAS (MODAL CUSTOMIZADA) ─────────────────────

function fecharModalPromptLista() {
    document.getElementById('modal-prompt-lista').classList.remove('active');
    document.getElementById('modal-prompt-input').value = '';
}

function duplicarLista() {
    const sel = document.getElementById('seletor-lista-gerenciar');
    const nomeOriginal = sel?.value;
    
    if (!nomeOriginal) { 
        mostrarToast('Nenhuma lista selecionada.'); 
        return; 
    }

    document.getElementById('modal-prompt-titulo').innerText = `Duplicar: ${nomeOriginal}`;
    document.getElementById('modal-prompt-input').value = `${nomeOriginal} (cópia)`;
    document.getElementById('modal-prompt-acao').value = 'duplicar';
    document.getElementById('modal-prompt-lista').classList.add('active');
    
    setTimeout(() => document.getElementById('modal-prompt-input').select(), 100);
}

function abrirModalRenomearLista() {
    const sel = document.getElementById('seletor-lista-gerenciar');
    const nomeOriginal = sel?.value;
    
    if (!nomeOriginal) { 
        mostrarToast('Nenhuma lista selecionada.'); 
        return; 
    }

    document.getElementById('modal-prompt-titulo').innerText = `Renomear: ${nomeOriginal}`;
    document.getElementById('modal-prompt-input').value = nomeOriginal;
    document.getElementById('modal-prompt-acao').value = 'renomear';
    document.getElementById('modal-prompt-lista').classList.add('active');
    
    setTimeout(() => document.getElementById('modal-prompt-input').select(), 100);
}

function confirmarAcaoPromptLista() {
    const acao = document.getElementById('modal-prompt-acao').value;
    const novoNome = document.getElementById('modal-prompt-input').value.trim();
    const sel = document.getElementById('seletor-lista-gerenciar');
    const nomeOriginal = sel?.value;

    if (!novoNome) {
        alert('O nome da lista não pode ficar vazio.');
        return;
    }

    if (novoNome === nomeOriginal) {
        fecharModalPromptLista();
        return;
    }

    // Validação de existência de nome duplicado
    if (appStorage.listas[novoNome]) {
        alert(`Já existe uma lista chamada "${novoNome}". Escolha outro nome.`);
        return;
    }

    if (acao === 'duplicar') {
        // Clona o array de caminhos/IDs para a nova chave
        appStorage.listas[novoNome] = [...appStorage.listas[nomeOriginal]];
        appStorage.listaAtiva = novoNome;
        mostrarToast(`Lista "${novoNome}" criada!`);
    } 
    else if (acao === 'renomear') {
        // Transfere o conteúdo para a nova chave e remove a antiga
        appStorage.listas[novoNome] = appStorage.listas[nomeOriginal];
        delete appStorage.listas[nomeOriginal];
        
        // Atualiza o estado se a lista modificada for a que está ativa no ecrã
        if (appStorage.listaAtiva === nomeOriginal) {
            appStorage.listaAtiva = novoNome;
        }
        mostrarToast('Lista renomeada com sucesso!');
    }

    localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    fecharModalPromptLista();
    fecharModalAdmin();
    sincronizarEAAplicarInterface();
}


// =========================================================================
// DIAGRAMA MOBILE (TAP)
// =========================================================================
function abrirModalDiagrama(nomeAcorde) {
    const svg = gerarSvgAcorde(nomeAcorde);
    if (!svg) { mostrarToast('Diagrama não disponível para ' + nomeAcorde); return; }
    document.getElementById('modal-diagrama-titulo').textContent = nomeAcorde;
    document.getElementById('modal-diagrama-svg').innerHTML = svg;
    document.getElementById('modal-diagrama-container').classList.add('active');
}

function fecharModalDiagrama() {
    document.getElementById('modal-diagrama-container').classList.remove('active');
}

// Tap em acordes no mobile
document.addEventListener('touchend', e => {
    const span = e.target.closest('.chord');
    if (!span) return;
    e.preventDefault();
    abrirModalDiagrama(span.textContent.trim());
}, { passive: false });

// =========================================================================
// MODAL ATALHOS
// =========================================================================
function abrirModalAtalhos() {
    document.getElementById('modal-atalhos-container').classList.add('active');
}

function fecharModalAtalhos() {
    document.getElementById('modal-atalhos-container').classList.remove('active');
}

// =========================================================================
// ATALHOS DE TECLADO
// =========================================================================
document.addEventListener('keydown', e => {
    // Não ativar atalhos quando estiver digitando em campos de texto
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
    }

    // Fechar qualquer modal aberto com Escape
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        const wrapper = document.getElementById('barra-busca-wrapper');
        if (wrapper && wrapper.style.display !== 'none') toggleBusca();
        return;
    }

    switch (e.key) {
        case ' ':
        case 'Spacebar':
            e.preventDefault();
            toggleRolagemGeral();
            break;
        case 'ArrowRight':
        case 'PageDown':
            e.preventDefault();
            navegarEntreMusicas(1);
            break;
        case 'ArrowLeft':
        case 'PageUp':
            e.preventDefault();
            navegarEntreMusicas(-1);
            break;
        case 'l':
        case 'L':
            toggleOcultarAcordesRepertorio();
            break;
        case 't':
        case 'T':
            alternarTemaFundo();
            break;
        case 'b':
        case 'B':
            toggleBusca();
            break;
    }
});



// ── INTEGRAÇÃO COM COMPARTILHAMENTO DO ANDROID (SHARE TARGET API) ──────────
// Executado dentro do load principal do app (ver início do arquivo)
async function processarArquivoCompartilhado() {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('shared')) return;

    // Limpar URL imediatamente para evitar reprocessamento ao recarregar
    window.history.replaceState({}, document.title, window.location.pathname);

    try {
        // Varrer todos os caches disponíveis — não depende do nome hardcoded
        const nomesCaches = await caches.keys();
        let conteudoTexto = null;

        for (const nomecache of nomesCaches) {
            const cache = await caches.open(nomecache);
            const response = await cache.match('/shared-file.txt');
            if (response) {
                conteudoTexto = await response.text();
                await cache.delete('/shared-file.txt');
                break;
            }
        }

        if (!conteudoTexto || !conteudoTexto.trim()) {
            mostrarToast('⚠️ Arquivo compartilhado vazio ou não encontrado.');
            return;
        }

        // Tentar como backup JSON primeiro
        try {
            const pacote = JSON.parse(conteudoTexto);
            if (pacote.musicasGlobais && pacote.listas) {
                backupTemporarioParaProcessar = pacote;
                const h3 = document.querySelector('#modal-interacao-restore .modal-header h3');
                if (h3) h3.textContent = '📥 Importar arquivo compartilhado';
                document.getElementById('modal-interacao-restore').classList.add('active');
                mostrarToast('📂 Repertório recebido — escolha como importar');
                return;
            }
        } catch (e) { /* não é JSON — tratar como cifra */ }

        // É uma cifra em texto — abrir modal de cadastro
        abrirModalCadastrarMusica();
        setTimeout(() => {
            const campo = document.getElementById('input-cifra-bruta');
            if (campo) {
                campo.value = conteudoTexto;
                mostrarToast('🎵 Cifra recebida — revise e salve');
            }
        }, 350);

    } catch (err) {
        console.error('Erro ao ler arquivo compartilhado:', err);
        mostrarToast('❌ Erro ao processar arquivo compartilhado.');
    }
}

// =========================================================================
// PAUSAR ROLAGEM AO CLICAR NA TELA (MECÂNICA DE PALCO)
// =========================================================================
//document.addEventListener('click', (e) => {
   // Verifica se a rolagem está rodando
   //  if (intervaloRolagem) {
   // Evita que o clique nos botões, painéis ou no menu dispare a pausa dupla
   //    const clicouEmControle = e.target.closest('button') || 
   //                           e.target.closest('.sub-control-panel') || 
   //                         e.target.closest('.floating-action-rack') ||
   //                       e.target.closest('.menu-flutuante');
   //                     
   //if (!clicouEmControle) {
   //  toggleRolagemGeral();
   //mostrarToast("⏸ Rolagem Pausada");
   //}
   //}
//});

// =========================================================================
// LEITURA AUTOMÁTICA DE VERSÃO (MANIFEST.JSON)
// =========================================================================
window.addEventListener('load', () => {
    // O { cache: 'no-store' } é a chave mágica que ignora o Service Worker
    fetch('manifest.json', { cache: 'no-store' })
        .then(response => response.json())
        .then(data => {
            if (data.version) {
                const badge = document.getElementById('app-version-badge');
                if (badge) {
                    badge.innerText = 'v' + data.version;
                    badge.style.display = 'inline-block';
                }
            }
        })
        .catch(erro => console.error('Erro ao ler versão do manifest:', erro));
});

// =========================================================================
// METRÔNOMO VISUAL DE PALCO (BPM)
// =========================================================================

function mudarBpmIndividual(indexMusica, delta) {
    const bloco = document.getElementById(`musica-bloco-${indexMusica}`);
    const idReal = bloco.getAttribute('data-real-id');
    const input = document.getElementById(`bpm-musica-${indexMusica}`);

    // Garante que o BPM não fique negativo
    const novoBpm = Math.max(0, parseInt(input.value) + delta);
    
    input.value = novoBpm;
    document.getElementById(`bpm-txt-${indexMusica}`).innerText = novoBpm;

    // Salva no banco de dados local
    if (appStorage.musicasGlobais[idReal]) {
        appStorage.musicasGlobais[idReal].bpmCustomizado = novoBpm;
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    }

    // Se a música estiver rolando, ajusta o metrônomo em tempo real
    if (intervaloRolagem) verificarMetronomo();
}

let contadorBatida = 0;

function iniciarMetronomo(bpm) {
    const container = document.getElementById('visual-metronome');
    if (!container) return;

    if (intervaloMetronomo) clearInterval(intervaloMetronomo);

    if (bpm <= 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    const msPorBatida = 60000 / bpm;
    contadorBatida = 0;

    intervaloMetronomo = setInterval(() => {
        // Remove a classe 'active' de todas
        document.querySelectorAll('.metronome-light').forEach(l => l.classList.remove('active'));
        
        // Incrementa o contador de 1 a 4
        contadorBatida = (contadorBatida % 4) + 1;
        
        // Acende a luz atual
        const luzAtiva = document.getElementById(`light-${contadorBatida}`);
        if (luzAtiva) luzAtiva.classList.add('active');
        
    }, msPorBatida);
}

function pararMetronomo() {
    if (intervaloMetronomo) clearInterval(intervaloMetronomo);
    intervaloMetronomo = null;
    const dot = document.getElementById('visual-metronome');
    if (dot) {
        dot.style.display = 'none';
        dot.classList.remove('beat');
    }
}

function verificarMetronomo() {
    const bloco = obterBlocoMusicaAtualNaTela();
    if (!bloco) return;
    
    const idReal = bloco.getAttribute('data-real-id');
    let bpm = 0;
    
    if (idReal && appStorage.musicasGlobais[idReal]) {
        bpm = appStorage.musicasGlobais[idReal].bpmCustomizado || 0;
    }
    
    if (bpm !== bpmAtual) {
        bpmAtual = bpm;
        iniciarMetronomo(bpm);
    }
}

function resetarBpm(indexMusica) {
    const bloco = document.getElementById(`musica-bloco-${indexMusica}`);
    const idReal = bloco.getAttribute('data-real-id');
    const input = document.getElementById(`bpm-musica-${indexMusica}`);

    input.value = 0;
    document.getElementById(`bpm-txt-${indexMusica}`).innerText = 0;

    if (appStorage.musicasGlobais[idReal]) {
        appStorage.musicasGlobais[idReal].bpmCustomizado = 0;
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    }

    if (intervaloRolagem) verificarMetronomo();
    mostrarToast("BPM zerado!");
}function salvarDelayPartida(valor) {
    if (!appStorage.configGlobais) appStorage.configGlobais = {};
    appStorage.configGlobais.delayPartida = Math.max(0, parseInt(valor) || 0);
    localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    mostrarToast(`Atraso de partida: ${appStorage.configGlobais.delayPartida}s`);
}

function iniciarContagemRegressiva(segundos, callback) {
    const overlay = document.getElementById('overlay-contagem');
    let tempoRestante = segundos;
    overlay.innerText = tempoRestante;
    overlay.style.display = 'block';

    intervaloContagem = setInterval(() => {
        tempoRestante--;
        if (tempoRestante > 0) {
            overlay.innerText = tempoRestante;
        } else {
            clearInterval(intervaloContagem);
            intervaloContagem = null;
            overlay.style.display = 'none';
            callback(); // Acabou o tempo, liga o motor de rolagem!
        }
    }, 1000);
}
// =========================================================================
// MODO CANTAR (OCULTAR ACORDES)
// =========================================================================
function toggleOcultarAcordesRepertorio() {
    const container = document.getElementById("setlist-container");
    const btn = document.getElementById("btn-ocultar-chords");
    
    if (!container || !btn) return;

    container.classList.toggle("ocultar-acordes");
    
    // Recalibra o motor instantaneamente se a música já estiver rodando
    if (intervaloRolagem && velocidadGlobalAtual > 0) {
        redefinirMotorRolagem(velocidadGlobalAtual);
    }

    // FORÇA O RECÁLCULO VISUAL: Pede um milissegundo para o CSS encolher a tela e recalcula os relógios
    setTimeout(() => {
        calcularTempoTotalShow();
        if (intervaloRolagem) verificarMusicaVisivelNaTela();
    }, 150);

    if (container.classList.contains("ocultar-acordes")) {
        btn.classList.add("active");
        mostrarToast("Modo Cantar: Letra Pura (Velocidade adaptada)");
    } else {
        btn.classList.remove("active");
        mostrarToast("Modo Músico: Acordes Visíveis (Velocidade normal)");
    }
}

// =========================================================================
// CALCULADORA DE TEMPO DE SHOW
// =========================================================================
function calcularTempoTotalShow() {
    const badgeTempo = document.getElementById('badge-tempo-show');
    if (!badgeTempo) return;

    const container = document.getElementById('setlist-container');
    if (container && container.hasAttribute('data-modo-busca-global')) return;

    const blocos = document.querySelectorAll('.cifra-container:not(.busca-oculto)');
    if (blocos.length === 0) {
        badgeTempo.style.display = 'none';
        return;
    }

    const mapaTempos = [400, 360, 320, 280, 240, 205, 175, 145, 115, 85, 70, 58, 48, 40, 34, 29, 25, 19, 14, 10];
    let tempoTotalMs = 0;
    
    // Verifica se o painel está no modo comprimido
    const modoCantarAtivo = container && container.classList.contains("ocultar-acordes");

    blocos.forEach(bloco => {
        const idReal = bloco.getAttribute('data-real-id');
        if (!idReal || !appStorage.musicasGlobais[idReal]) return;
        
        const vel = appStorage.musicasGlobais[idReal].velocidadeCustomizada || 10;
        let tempoEspera = mapaTempos[Math.min(20, Math.max(1, vel)) - 1]; // ms por pixel
        
        // COMPENSAÇÃO FÍSICA
        if (modoCantarAtivo) tempoEspera *= 2; 
        
        const altura = bloco.offsetHeight || 0;
        tempoTotalMs += (altura * tempoEspera);
    });

    const tempoPausaMs = blocos.length * 15000; 
    tempoTotalMs += tempoPausaMs;

    const totalMinutos = Math.ceil(tempoTotalMs / 60000);
    
    let textoTempo = '';
    if (totalMinutos >= 60) {
        const horas = Math.floor(totalMinutos / 60);
        const min = totalMinutos % 60;
        textoTempo = `${horas}h ${min}m`;
    } else {
        textoTempo = `${totalMinutos}m`;
    }

    badgeTempo.innerText = `⏱️ ~${textoTempo}`;
    badgeTempo.style.display = 'inline-block';
}