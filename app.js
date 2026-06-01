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

window.addEventListener('load', () => {
    const temaSalvo = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', temaSalvo);

    if (!localStorage.getItem('gelcifras_db')) {
        localStorage.setItem('gelcifras_db', JSON.stringify(dadosIniciaisVazios));
    }
    appStorage = JSON.parse(localStorage.getItem('gelcifras_db'));

    if (!appStorage.listas["Todas as Músicas"]) {
        appStorage.listas["Todas as Músicas"] = Object.keys(appStorage.musicasGlobais || {});
    }

    sincronizarEAAplicarInterface();

    window.addEventListener('scroll', () => {
        if (intervaloRolagem && !travaTemporariaScroll) verificarMusicaVisivelNaTela();
    });
});

function obterListasOrdenadasChaves() {
    const chaves = Object.keys(appStorage.listas);
    const chavesFiltradas = chaves.filter(c => c !== "Todas as Músicas");
    chavesFiltradas.sort((a, b) => a.localeCompare(b, 'pt-BR', {
        sensitivity: 'base'
    }));
    return ["Todas as Músicas", ...chavesFiltradas];
}

function sincronizarEAAplicarInterface() {
    const seletorLista = document.getElementById("seletor-lista");
    const seletorMusica = document.getElementById("seletor-musica");
    const container = document.getElementById("setlist-container");
    appStorage.listas["Todas as Músicas"] = Object.keys(appStorage.musicasGlobais || {});


    seletorLista.innerHTML = "";
    const chavesOrdenadas = obterListasOrdenadasChaves();
    chavesOrdenadas.forEach(nomeLista => {
        let opt = document.createElement("option");
        opt.value = nomeLista;
        opt.text = nomeLista;
        if (nomeLista === appStorage.listaAtiva) opt.selected = true;
        seletorLista.appendChild(opt);
    });

    seletorMusica.innerHTML = '<option value="">Ir para música…</option>';
    container.innerHTML = "";

    const idsMusicasDaLista = appStorage.listas[appStorage.listaAtiva] || [];

    if (idsMusicasDaLista.length > 0) {
        idsMusicasDaLista.forEach((id, index) => {
            const musica = appStorage.musicasGlobais[id];
            if (!musica) return;

            const tomExibicao = musica.tomCustomizado || musica.tomOriginal || "C";
            const fonteExibicao = musica.fonteCustomizada || 16;
            const velocidadExibicao = musica.velocidadeCustomizada || 10;

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
            bloco.setAttribute('data-tom-index', escalaCromatica.indexOf(tomExibicao));

            bloco.innerHTML = `
                <h2 style="margin:0 0 4px 0;font-size:1.35em;">${escapeHtml(musica.titulo)}</h2>
                <div style="color:var(--text-muted);margin-bottom:12px;font-size:12px;">Por: <strong>${escapeHtml(musica.artista || "Desconhecido")}</strong></div>

                <div class="${classeOcultamentoInicial}">
                    <div class="panel-column" style="min-width:115px;">
                        <span class="sub-txt-label">
                            Tom
                            <button class="btn-reset-tom" onclick="resetarTomOriginalFabrica(${index}, '${escapeHtml(musica.tomOriginal)}')" title="Retornar ao Tom Original">🔄</button>
                        </span>

                        <div class="adjustment-row">
                            <button class="btn-num" onclick="mudarTomIndividual(${index}, -1)">−</button>
                            <span id="tom-txt-${index}" class="num-display">${escapeHtml(tomExibicao)}</span>
                            <button class="btn-num" onclick="mudarTomIndividual(${index}, 1)">+</button>
                        </div>
                    </div>
                    <div class="panel-column">
                        <span class="sub-txt-label">Capo <span id="capo-dica-${index}" class="capo-dica-inline"></span></span>
                        <div class="adjustment-row">
                            <button class="btn-num" onclick="mudarCapoIndividual(${index}, -1)">−</button>
                            <span id="capo-txt-${index}" class="num-display">0</span>
                            <button class="btn-num" onclick="mudarCapoIndividual(${index}, 1)">+</button>
                            <input type="hidden" id="capo-select-${index}" value="0">
                        </div>
                    </div>
                    <div class="panel-column">
                        <span class="sub-txt-label">Fonte</span>
                        <div class="adjustment-row">
                            <button class="btn-num" onclick="mudarFonteIndividual(${index}, -1)">−</button>
                            <span id="fonte-txt-${index}" class="num-display">${fonteExibicao}</span>
                            <button class="btn-num" onclick="mudarFonteIndividual(${index}, 1)">+</button>
                            <input type="hidden" id="fonte-musica-${index}" value="${fonteExibicao}">
                        </div>
                    </div>
                    <div class="panel-column">
                        <span class="sub-txt-label">Velocidade</span>
                        <div class="adjustment-row">
                            <button class="btn-num" onclick="mudarVelocidadeIndividual(${index}, -1)">−</button>
                            <span id="vel-txt-${index}" class="num-display">${velocidadExibicao}</span>
                            <button class="btn-num" onclick="mudarVelocidadeIndividual(${index}, 1)">+</button>
                            <input type="hidden" id="vel-musica-${index}" value="${velocidadExibicao}">
                        </div>
                    </div>
                    <div class="panel-column" style="min-width:90px;">
                        <span class="sub-txt-label">Edição</span>
                        <div class="adjustment-row">
                            <button class="btn-action-card" onclick="abrirPainelVinculacaoLista('${id}', ${index})" title="Listas">📋</button>
                            <button class="btn-action-card" style="border-color: var(--chord-color);" onclick="abrirModalEditarCifra('${id}')" title="Editar">✏️</button>
                            <button class="btn-action-card" style="border-color:#f87171;" onclick="excluirMusicaGeral('${id}')" title="Excluir">🗑️</button>
                        </div>
                    </div>
                </div>

                <div id="inline-panel-${index}" class="inline-playlist-panel">
                    <div style="font-size:11px;font-weight:bold;color:var(--text-muted);margin-bottom:4px;">Exibir esta música em:</div>
                    <div id="inline-grid-${index}" class="inline-check-grid"></div>
                </div>

                <hr style="border:0;border-top:1px solid var(--border-color);margin:0;">
                <pre id="corpo-cifra-${index}" style="font-size: ${fonteExibicao}px;">${processarLinhasTexto(musica.letraCifra)}</pre>
            `;
            container.appendChild(bloco);

            if (musica.tomCustomizado && musica.tomCustomizado !== musica.tomOriginal) {
                const deltaRender = escalaCromatica.indexOf(musica.tomCustomizado) - escalaCromatica.indexOf(musica.tomOriginal);
                bloco.querySelectorAll('.chord').forEach(span => {
                    span.innerText = transporAcorde(span.innerText, deltaRender);
                });
            }

            // Restaurar capo salvo
            const capoSalvo = musica.capoCustomizado || 0;
            bloco.setAttribute('data-capo', capoSalvo);
            const inputCapo = document.getElementById(`capo-select-${index}`);
            const txtCapo = document.getElementById(`capo-txt-${index}`);
            if (inputCapo) inputCapo.value = capoSalvo;
            if (txtCapo) txtCapo.innerText = capoSalvo;
            if (capoSalvo > 0) {
                bloco.querySelectorAll('.chord').forEach(span => {
                    span.innerText = transporAcorde(span.innerText, -capoSalvo);
                });
                exibirDicaCapo(index, escalaCromatica.indexOf(tomExibicao), capoSalvo);
            }
        });
    } else {
        container.innerHTML = "<div style='padding:50px 20px;text-align:center;color:var(--text-muted); font-weight:bold;'>Sua lista está limpa. Clique na engrenagem (⚙️) para adicionar cifras!</div>";
    }
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

function abrirModalAdmin() {
    document.getElementById("modal-admin-container").classList.add("active");
    const lblLista = document.getElementById("txt-nome-lista-backup");
    if (lblLista) lblLista.innerText = `"${appStorage.listaAtiva}"`;
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
    renderizarPainelOrdenacao(seletorOrdem.value);
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
    const linhas = input.split('\n');
    let tit = "Título Desconhecido",
        art = "Artista Desconhecido",
        tom = "C",
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
            tom = l.replace(/tom:/i, '').trim();
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
    document.getElementById("input-cifra-bruta").value = "";
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

function obterIndiceMusicaAtualNaTela() {
    let focado = 0;
    document.querySelectorAll('.cifra-container').forEach(bloco => {
        if (bloco.getBoundingClientRect().top <= 160) focado = parseInt(bloco.getAttribute('data-index'));
    });
    if (intervaloRolagem) atualizarContadorMusica(focado);
    return focado;
}

function atualizarContadorMusica(indexAtual) {
    const placar = document.getElementById('placar-rolagem');
    if (!placar || !intervaloRolagem) return;
    const blocos = document.querySelectorAll('.cifra-container');
    const total = blocos.length;
    if (total === 0) return;
    const bloco = document.getElementById(`musica-bloco-${indexAtual}`);
    const idReal = bloco ? bloco.getAttribute('data-real-id') : null;
    const musica = idReal ? appStorage.musicasGlobais[idReal] : null;
    const nomeMusica = musica ? musica.titulo : '';
    placar.textContent = `${indexAtual + 1} / ${total}  •  ${nomeMusica}`;
}

function navegarEntreMusicas(direcao) {
    const idxAtual = obterIndiceMusicaAtualNaTela();
    const proximoIdx = idxAtual + direcao;
    const totalDeCards = document.querySelectorAll('.cifra-container').length;
    if (proximoIdx < 0) {
        mostrarToast("⏮ Primeira música");
        return;
    }
    if (proximoIdx >= totalDeCards) {
        mostrarToast("⏭ Fim do roteiro");
        return;
    }
    pularParaMusica(`musica-bloco-${proximoIdx}`);
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
    }

    if (intervaloRolagem) verificarMusicaVisivelNaTela();
}

function mudarTomIndividual(indexMusica, semitons) {
    const bloco = document.getElementById(`musica-bloco-${indexMusica}`);
    const idReal = bloco.getAttribute('data-real-id');
    let idx = parseInt(bloco.getAttribute('data-tom-index'));
    if (idx === -1) return;

    idx = (idx + semitons + 12) % 12;
    bloco.setAttribute('data-tom-index', idx);

    const novoTomTexto = escalaCromatica[idx];
    document.getElementById(`tom-txt-${indexMusica}`).innerText = novoTomTexto;
    bloco.querySelectorAll('.chord').forEach(span => {
        span.innerText = transporAcorde(span.innerText, semitons);
    });

    if (appStorage.musicasGlobais[idReal]) {
        appStorage.musicasGlobais[idReal].tomCustomizado = novoTomTexto;
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    }

    // Atualizar dica de capo se houver capo ativo
    const sel = document.getElementById(`capo-select-${indexMusica}`);
    const capoAtivo = sel ? parseInt(sel.value) : 0;
    if (capoAtivo > 0) {
        // Acordes já foram transpostos pelo delta do tom.
        // O capo não muda — os acordes exibidos já estão corretos
        // (sempre "capoAtivo" semitons abaixo do tom real, e o delta foi aplicado igualmente).
        exibirDicaCapo(indexMusica, idx, capoAtivo);
    }
}

function resetarTomOriginalFabrica(indexMusica, tomOriginalFabrica) {
    const bloco = document.getElementById(`musica-bloco-${indexMusica}`);
    const idReal = bloco.getAttribute('data-real-id');
    const idxAtual = parseInt(bloco.getAttribute('data-tom-index'));
    const idxOriginal = escalaCromatica.indexOf(tomOriginalFabrica);

    if (idxAtual === -1 || idxOriginal === -1 || idxAtual === idxOriginal) return;
    const semitonsDiferenca = idxOriginal - idxAtual;

    bloco.setAttribute('data-tom-index', idxOriginal);
    document.getElementById(`tom-txt-${indexMusica}`).innerText = tomOriginalFabrica;
    bloco.querySelectorAll('.chord').forEach(span => {
        span.innerText = transporAcorde(span.innerText, semitonsDiferenca);
    });

    if (appStorage.musicasGlobais[idReal]) {
        appStorage.musicasGlobais[idReal].tomCustomizado = tomOriginalFabrica;
        localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    }
    mostrarToast(`Tom original (${tomOriginalFabrica}) restaurado!`);
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

function exibirDicaCapo(indexMusica, idxTomAtual, casaCapo) {
    const dica = document.getElementById(`capo-dica-${indexMusica}`);
    if (!dica) return;

    if (casaCapo === 0) {
        dica.textContent = "";
        return;
    }

    const { tomAcordes, ehAmigavel } = calcularSugestaoCapo(idxTomAtual, casaCapo);
    const tomSoando = escalaCromatica[idxTomAtual];

    dica.textContent = `(${tomAcordes}→${tomSoando})`;
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
        span.innerText = transporAcorde(span.innerText, deltaAcordes);
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

function verificarMusicaVisivelNaTela() {
    const focado = obterIndiceMusicaAtualNaTela();
    const input = document.getElementById(`vel-musica-${focado}`);
    if (input) {
        const vel = parseInt(input.value);
        if (vel !== velocidadGlobalAtual) {
            velocidadGlobalAtual = vel;
            redefinirMotorRolagem(vel);
        }
    }
}

function toggleRolagemGeral() {
    const btn = document.getElementById("btn-scroll");
    const paineisPalco = document.querySelectorAll('.sub-control-panel');

    if (intervaloRolagem) {
        clearInterval(intervaloRolagem);
        intervaloRolagem = null;
        btn.innerText = "▶";
        btn.classList.remove("active");
        paineisPalco.forEach(p => p.classList.remove('ocultar-dinamico'));
        toggleTelaCheia(false);
        const placarOff = document.getElementById('placar-rolagem');
        if (placarOff) placarOff.style.display = 'none';
    } else {
        btn.innerText = "■";
        btn.classList.add("active");
        velocidadGlobalAtual = -1;
        paineisPalco.forEach(p => p.classList.add('ocultar-dinamico'));
        verificarMusicaVisivelNaTela();
        toggleTelaCheia(true);
        const placar = document.getElementById('placar-rolagem');
        if (placar) placar.style.display = 'block';
        atualizarContadorMusica(obterIndiceMusicaAtualNaTela());
    }
}

function redefinirMotorRolagem(velocidade) {
    if (intervaloRolagem) clearInterval(intervaloRolagem);
    const mapaTempos = [400, 360, 320, 280, 240, 205, 175, 145, 115, 85, 70, 58, 48, 40, 34, 29, 25, 19, 14, 10];
    const tempoEspera = mapaTempos[Math.min(20, Math.max(1, velocidade)) - 1];
    intervaloRolagem = setInterval(() => window.scrollBy(0, 1), tempoEspera);
}

function toggleOcultarAcordesRepertorio() {
    const container = document.getElementById("setlist-container");
    const btn = document.getElementById("btn-ocultar-chords");
    container.classList.toggle("ocultar-acordes");
    if (container.classList.contains("ocultar-acordes")) {
        btn.classList.add("active");
        mostrarToast("Modo Cantar: Letra Pura");
    } else {
        btn.classList.remove("active");
        mostrarToast("Modo Músico: Acordes Visíveis");
    }
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

// Regex central de acorde — usada para detectar e envolver spans
const REGEX_ACORDE = /\b([A-G][#b]?(?:m|maj|min|aug|dim|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:\/[A-G][#b]?)?)\b(?=[^#b]|$)/g;
const REGEX_LINHA_ACORDES = /^(?:[A-G][#b]?(?:m|maj|min|aug|dim|sus|add)?(?:\d+)?(?:\/[A-G][#b]?)?\s+)*[A-G][#b]?(?:m|maj|min|aug|dim|sus|add)?(?:\d+)?(?:\/[A-G][#b]?)?$/;

function envolverAcordesEmSpans(linha) {
    // Substitui de trás para frente para não deslocar índices
    const RE = /([A-G][#b]?(?:maj|min|aug|dim|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:\/[A-G][#b]?)?)/g;
    return linha.replace(RE, (match, p1, offset, str) => {
        // Checar que não é parte de uma palavra (ex: "Domingo" → "D" não é acorde)
        const antes = str[offset - 1] || ' ';
        const depois = str[offset + match.length] || ' ';
        const naoEPalavra = /[\s\(\[\-,]/.test(antes) || offset === 0;
        const naoTerminaEmLetra = !/[a-z]/.test(depois);
        if (naoEPalavra && naoTerminaEmLetra) {
            return `<span class="chord">${match}</span>`;
        }
        return match;
    });
}

function processarLinhasTexto(texto) {
    return texto.split('\n').map(linha => {
        const lim = linha.trim();
        if (!lim) return linha;
        const temMarcadores = lim.includes('[') || lim.includes('(');
        const totalEspacos = (linha.match(/ /g) || []).length;
        const ehEspacada = totalEspacos > lim.length * 0.25;
        const ehLinhaDeAcordes = REGEX_LINHA_ACORDES.test(lim);
        if (temMarcadores || ehEspacada || ehLinhaDeAcordes) {
            return `<div class="chord-line">${envolverAcordesEmSpans(linha)}</div>`;
        }
        return `<div>${linha}</div>`;
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
    brega: '/setlists/brega.txt',
    rockbrasil: '/setlists/rockbrasil.txt',
    pedeserra: '/setlists/pedeserra.txt',
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
    const url = BIBLIOTECA_FIXA[chave];
    if (!url) return;
    const nomes = { brega: 'Brega', rockbrasil: 'Rock Brasil', pedeserra: 'Pé de Serra' };
    mostrarToast(`⏳ Carregando ${nomes[chave]}…`);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const texto = await res.text();
        processarJsonImportado(texto, nomes[chave]);
    } catch (err) {
        mostrarToast(`❌ Não foi possível carregar. Verifique se o arquivo existe no Netlify.`);
    }
}

// =========================================================================
// IMPRESSÃO DA LISTA ATIVA
// =========================================================================
function imprimirListaAtiva() {
    const ids = appStorage.listas[appStorage.listaAtiva] || [];
    if (ids.length === 0) {
        mostrarToast('Nenhuma música na lista para imprimir.');
        return;
    }

    const janela = window.open('', '_blank');
    const fonteBase = 14;

    const musicasHtml = ids.map((id, idx) => {
                const musica = appStorage.musicasGlobais[id];
                if (!musica) return '';

                const tom = musica.tomCustomizado || musica.tomOriginal || 'C';
                const capo = musica.capoCustomizado || 0;
                const capoTexto = capo > 0 ? ` &nbsp;|&nbsp; Capo: ${capo}ª casa` : '';

                // Processar cifra igual ao app (acordes em negrito)
                const corpo = (musica.letraCifra || '').split('\n').map(linha => {
                    const lim = linha.trim();
                    if (!lim) return '<div>&nbsp;</div>';
                    const temMarcadores = lim.includes('[') || lim.includes('(');
                    const totalEspacos = (linha.match(/ /g) || []).length;
                    const ehEspacada = totalEspacos > lim.length * 0.25;
                    const ehLinhaDeAcordes = /^(([A-G][#b]?(m|maj|min|aug|dim|sus|add)?\d*(\/?[A-G][#b]?)?)[\s]+)*([A-G][#b]?(m|maj|min|aug|dim|sus|add)?\d*(\/?[A-G][#b]?)?)$/.test(lim);
                    if (temMarcadores || ehEspacada || ehLinhaDeAcordes) {
                        const marcado = linha.replace(/\b([A-G][#b]?(m|maj|min|aug|dim|sus|add)?(2|4|5|6|7|9|11|13)?(\/?[A-G][#b]?)?)\b/g, '<strong>$1</strong>');
                        return `<div class="chord-line">${marcado}</div>`;
                    }
                    return `<div>${linha}</div>`;
                }).join('');

                const quebra = idx < ids.length - 1 ? 'page-break-after: always;' : '';

                return `
            <div class="musica-pagina" style="${quebra}">
                <div class="musica-cabecalho">
                    <span class="musica-num">${idx + 1}</span>
                    <div>
                        <div class="musica-titulo">${musica.titulo}</div>
                        <div class="musica-meta">${musica.artista || ''}${capoTexto ? ` &nbsp;·&nbsp; Tom: ${tom}${capoTexto}` : ` &nbsp;·&nbsp; Tom: ${tom}`}</div>
                    </div>
                </div>
                <pre class="musica-corpo">${corpo}</pre>
            </div>`;
    }).join('');

    janela.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>GelCifras — ${appStorage.listaAtiva}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            font-size: ${fonteBase}px;
            color: #111;
            background: #fff;
        }

        .cabecalho-impressao {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px 32px 14px 32px;
            border-bottom: 2px solid #111;
        }

        .cabecalho-logo {
            width: 52px;
            height: 52px;
            border-radius: 10px;
            object-fit: cover;
        }

        .cabecalho-textos {
            flex: 1;
        }

        .cabecalho-impressao h1 {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.5px;
            line-height: 1.1;
        }

        .cabecalho-impressao p {
            font-size: 12px;
            color: #555;
            margin-top: 3px;
        }

        .cabecalho-lista {
            font-size: 13px;
            font-weight: 700;
            color: #1a56db;
            margin-top: 1px;
        }

        .musica-pagina {
            padding: 24px 32px 24px 32px;
        }

        .musica-cabecalho {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 14px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ccc;
        }

        .musica-num {
            font-size: 28px;
            font-weight: 900;
            color: #ccc;
            line-height: 1;
            min-width: 32px;
        }

        .musica-titulo {
            font-size: 18px;
            font-weight: 800;
            line-height: 1.2;
        }

        .musica-meta {
            font-size: 12px;
            color: #666;
            margin-top: 3px;
        }

        .musica-corpo {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.85;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .musica-corpo strong {
            color: #1a56db;
            font-weight: 700;
        }

        .chord-line {
            color: #1a56db;
        }

        @media print {
            @page {
                margin: 10mm 12mm;
            }

            .musica-pagina {
                page-break-after: always;
            }

            .musica-pagina:last-child {
                page-break-after: avoid;
            }

            .cabecalho-impressao {
                page-break-after: avoid;
            }

            .musica-corpo strong,
            .chord-line {
                color: #000;
                font-weight: 800;
            }
        }
    </style>
</head>
<body>
    <div class="cabecalho-impressao">
        <img class="cabecalho-logo" src="${window.location.origin}/apple-touch-icon.png" alt="GelCifras" onerror="this.style.display='none'">
        <div class="cabecalho-textos">
            <h1>GelCifras</h1>
            <div class="cabecalho-lista">🎵 ${appStorage.listaAtiva}</div>
            <p>${ids.length} música${ids.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Impresso em ${new Date().toLocaleDateString('pt-BR')} &nbsp;·&nbsp; <strong>gelcifras.netlify.app</strong></p>
        </div>
    </div>
    ${musicasHtml}
    <script>window.onload = () => window.print();<\/script>
</body>
</html>`);

    janela.document.close();
}

// =========================================================================
// DIAGRAMAS DE ACORDE — TOOLTIP FLUTUANTE
// Formato de cada acorde: { frets: [E,A,D,G,B,e], fingers: [E,A,D,G,B,e], barre: {fret, from, to}|null, baseFret: 1 }
// frets: -1 = corda muda (X), 0 = corda solta (O), 1+ = casa pressionada
// =========================================================================
const BANCO_ACORDES = {
    // ── MAIORES ──────────────────────────────────────────────────────────
    "C":    { frets: [-1,3,2,0,1,0],   fingers: [0,3,2,0,1,0],   barre: null,                      baseFret: 1 },
    "D":    { frets: [-1,-1,0,2,3,2],  fingers: [0,0,0,1,3,2],   barre: null,                      baseFret: 1 },
    "E":    { frets: [0,2,2,1,0,0],    fingers: [0,2,3,1,0,0],   barre: null,                      baseFret: 1 },
    "F":    { frets: [1,1,2,3,3,1],    fingers: [1,1,2,3,4,1],   barre: {fret:1,from:0,to:5},      baseFret: 1 },
    "G":    { frets: [3,2,0,0,0,3],    fingers: [2,1,0,0,0,3],   barre: null,                      baseFret: 1 },
    "A":    { frets: [-1,0,2,2,2,0],   fingers: [0,0,1,2,3,0],   barre: null,                      baseFret: 1 },
    "B":    { frets: [-1,2,4,4,4,2],   fingers: [0,1,2,3,4,1],   barre: {fret:2,from:1,to:5},      baseFret: 2 },

    // ── MENORES ──────────────────────────────────────────────────────────
    "Am":   { frets: [-1,0,2,2,1,0],   fingers: [0,0,2,3,1,0],   barre: null,                      baseFret: 1 },
    "Bm":   { frets: [-1,2,4,4,3,2],   fingers: [0,1,3,4,2,1],   barre: {fret:2,from:1,to:5},      baseFret: 2 },
    "Cm":   { frets: [-1,3,5,5,4,3],   fingers: [0,1,3,4,2,1],   barre: {fret:3,from:1,to:5},      baseFret: 3 },
    "Dm":   { frets: [-1,-1,0,2,3,1],  fingers: [0,0,0,2,3,1],   barre: null,                      baseFret: 1 },
    "Em":   { frets: [0,2,2,0,0,0],    fingers: [0,2,3,0,0,0],   barre: null,                      baseFret: 1 },
    "Fm":   { frets: [1,1,3,3,2,1],    fingers: [1,1,3,4,2,1],   barre: {fret:1,from:0,to:5},      baseFret: 1 },
    "Gm":   { frets: [3,5,5,3,3,3],    fingers: [1,3,4,1,1,1],   barre: {fret:3,from:0,to:5},      baseFret: 3 },

    // ── SUSTENIDOS MAIORES ───────────────────────────────────────────────
    "C#":   { frets: [-1,4,6,6,6,4],   fingers: [0,1,3,4,4,1],   barre: {fret:4,from:1,to:5},      baseFret: 4 },
    "D#":   { frets: [-1,-1,1,3,4,3],  fingers: [0,0,1,2,4,3],   barre: null,                      baseFret: 1 },
    "F#":   { frets: [2,2,4,4,4,2],    fingers: [1,1,3,4,4,1],   barre: {fret:2,from:0,to:5},      baseFret: 2 },
    "G#":   { frets: [4,4,6,6,6,4],    fingers: [1,1,3,4,4,1],   barre: {fret:4,from:0,to:5},      baseFret: 4 },
    "A#":   { frets: [-1,1,3,3,3,1],   fingers: [0,1,3,4,4,1],   barre: {fret:1,from:1,to:5},      baseFret: 1 },

    // ── SUSTENIDOS MENORES ───────────────────────────────────────────────
    "C#m":  { frets: [-1,4,6,6,5,4],   fingers: [0,1,3,4,2,1],   barre: {fret:4,from:1,to:5},      baseFret: 4 },
    "D#m":  { frets: [-1,-1,1,3,4,2],  fingers: [0,0,1,3,4,2],   barre: null,                      baseFret: 1 },
    "F#m":  { frets: [2,2,4,4,3,2],    fingers: [1,1,3,4,2,1],   barre: {fret:2,from:0,to:5},      baseFret: 2 },
    "G#m":  { frets: [4,4,6,6,5,4],    fingers: [1,1,3,4,2,1],   barre: {fret:4,from:0,to:5},      baseFret: 4 },
    "A#m":  { frets: [-1,1,3,3,2,1],   fingers: [0,1,3,4,2,1],   barre: {fret:1,from:1,to:5},      baseFret: 1 },

    // ── BEMÓIS (aliases) ─────────────────────────────────────────────────
    "Db":   { frets: [-1,4,6,6,6,4],   fingers: [0,1,3,4,4,1],   barre: {fret:4,from:1,to:5},      baseFret: 4 },
    "Eb":   { frets: [-1,-1,1,3,4,3],  fingers: [0,0,1,2,4,3],   barre: null,                      baseFret: 1 },
    "Gb":   { frets: [2,2,4,4,4,2],    fingers: [1,1,3,4,4,1],   barre: {fret:2,from:0,to:5},      baseFret: 2 },
    "Ab":   { frets: [4,4,6,6,6,4],    fingers: [1,1,3,4,4,1],   barre: {fret:4,from:0,to:5},      baseFret: 4 },
    "Bb":   { frets: [-1,1,3,3,3,1],   fingers: [0,1,3,4,4,1],   barre: {fret:1,from:1,to:5},      baseFret: 1 },
    "Dbm":  { frets: [-1,4,6,6,5,4],   fingers: [0,1,3,4,2,1],   barre: {fret:4,from:1,to:5},      baseFret: 4 },
    "Ebm":  { frets: [-1,-1,1,3,4,2],  fingers: [0,0,1,3,4,2],   barre: null,                      baseFret: 1 },
    "Gbm":  { frets: [2,2,4,4,3,2],    fingers: [1,1,3,4,2,1],   barre: {fret:2,from:0,to:5},      baseFret: 2 },
    "Abm":  { frets: [4,4,6,6,5,4],    fingers: [1,1,3,4,2,1],   barre: {fret:4,from:0,to:5},      baseFret: 4 },
    "Bbm":  { frets: [-1,1,3,3,2,1],   fingers: [0,1,3,4,2,1],   barre: {fret:1,from:1,to:5},      baseFret: 1 },

    // ── DOMINANTES (7) ───────────────────────────────────────────────────
    "C7":   { frets: [-1,3,2,3,1,0],   fingers: [0,3,2,4,1,0],   barre: null,                      baseFret: 1 },
    "D7":   { frets: [-1,-1,0,2,1,2],  fingers: [0,0,0,2,1,3],   barre: null,                      baseFret: 1 },
    "E7":   { frets: [0,2,0,1,0,0],    fingers: [0,2,0,1,0,0],   barre: null,                      baseFret: 1 },
    "F7":   { frets: [1,1,2,1,1,1],    fingers: [1,1,2,1,1,1],   barre: {fret:1,from:0,to:5},      baseFret: 1 },
    "G7":   { frets: [3,2,0,0,0,1],    fingers: [3,2,0,0,0,1],   barre: null,                      baseFret: 1 },
    "A7":   { frets: [-1,0,2,0,2,0],   fingers: [0,0,2,0,3,0],   barre: null,                      baseFret: 1 },
    "B7":   { frets: [-1,2,1,2,0,2],   fingers: [0,2,1,3,0,4],   barre: null,                      baseFret: 1 },
    "C#7":  { frets: [-1,4,3,4,2,4],   fingers: [0,2,1,3,0,4],   barre: null,                      baseFret: 2 },
    "D#7":  { frets: [-1,-1,1,3,2,3],  fingers: [0,0,1,3,2,4],   barre: null,                      baseFret: 1 },
    "F#7":  { frets: [2,2,4,2,4,2],    fingers: [1,1,3,1,4,1],   barre: {fret:2,from:0,to:5},      baseFret: 2 },
    "G#7":  { frets: [4,4,6,4,6,4],    fingers: [1,1,3,1,4,1],   barre: {fret:4,from:0,to:5},      baseFret: 4 },
    "A#7":  { frets: [-1,1,3,1,3,1],   fingers: [0,1,3,1,4,1],   barre: {fret:1,from:1,to:5},      baseFret: 1 },
    "Bb7":  { frets: [-1,1,3,1,3,1],   fingers: [0,1,3,1,4,1],   barre: {fret:1,from:1,to:5},      baseFret: 1 },
    "Eb7":  { frets: [-1,-1,1,3,2,3],  fingers: [0,0,1,3,2,4],   barre: null,                      baseFret: 1 },
    "Ab7":  { frets: [4,4,6,4,6,4],    fingers: [1,1,3,1,4,1],   barre: {fret:4,from:0,to:5},      baseFret: 4 },

    // ── MENORES COM 7 (m7) ────────────────────────────────────────────────
    "Am7":  { frets: [-1,0,2,0,1,0],   fingers: [0,0,2,0,1,0],   barre: null,                      baseFret: 1 },
    "Bm7":  { frets: [-1,2,4,2,3,2],   fingers: [0,1,3,1,2,1],   barre: {fret:2,from:1,to:5},      baseFret: 2 },
    "Cm7":  { frets: [-1,3,5,3,4,3],   fingers: [0,1,3,1,2,1],   barre: {fret:3,from:1,to:5},      baseFret: 3 },
    "Dm7":  { frets: [-1,-1,0,2,1,1],  fingers: [0,0,0,2,1,1],   barre: {fret:1,from:3,to:5},      baseFret: 1 },
    "Em7":  { frets: [0,2,2,0,3,0],    fingers: [0,2,3,0,4,0],   barre: null,                      baseFret: 1 },
    "Fm7":  { frets: [1,1,3,1,2,1],    fingers: [1,1,3,1,2,1],   barre: {fret:1,from:0,to:5},      baseFret: 1 },
    "Gm7":  { frets: [3,5,3,3,3,3],    fingers: [1,3,1,1,1,1],   barre: {fret:3,from:0,to:5},      baseFret: 3 },
    "C#m7": { frets: [-1,4,6,4,5,4],   fingers: [0,1,3,1,2,1],   barre: {fret:4,from:1,to:5},      baseFret: 4 },
    "F#m7": { frets: [2,2,4,2,3,2],    fingers: [1,1,3,1,2,1],   barre: {fret:2,from:0,to:5},      baseFret: 2 },
    "G#m7": { frets: [4,4,6,4,5,4],    fingers: [1,1,3,1,2,1],   barre: {fret:4,from:0,to:5},      baseFret: 4 },
    "A#m7": { frets: [-1,1,3,1,2,1],   fingers: [0,1,3,1,2,1],   barre: {fret:1,from:1,to:5},      baseFret: 1 },
    "Bbm7": { frets: [-1,1,3,1,2,1],   fingers: [0,1,3,1,2,1],   barre: {fret:1,from:1,to:5},      baseFret: 1 },
    "Ebm7": { frets: [-1,-1,1,3,2,2],  fingers: [0,0,1,4,2,3],   barre: null,                      baseFret: 1 },
    "Abm7": { frets: [4,4,6,4,5,4],    fingers: [1,1,3,1,2,1],   barre: {fret:4,from:0,to:5},      baseFret: 4 },

    // ── MAIORES COM 7 (maj7) ──────────────────────────────────────────────
    "Cmaj7":  { frets: [-1,3,2,0,0,0], fingers: [0,3,2,0,0,0],   barre: null,                      baseFret: 1 },
    "Dmaj7":  { frets: [-1,-1,0,2,2,2],fingers: [0,0,0,1,2,3],   barre: null,                      baseFret: 1 },
    "Emaj7":  { frets: [0,2,1,1,0,0],  fingers: [0,2,1,1,0,0],   barre: null,                      baseFret: 1 },
    "Fmaj7":  { frets: [-1,-1,3,2,1,0],fingers: [0,0,3,2,1,0],   barre: null,                      baseFret: 1 },
    "Gmaj7":  { frets: [3,2,0,0,0,2],  fingers: [2,1,0,0,0,3],   barre: null,                      baseFret: 1 },
    "Amaj7":  { frets: [-1,0,2,1,2,0], fingers: [0,0,2,1,3,0],   barre: null,                      baseFret: 1 },
    "Bmaj7":  { frets: [-1,2,4,3,4,2], fingers: [0,1,3,2,4,1],   barre: {fret:2,from:1,to:5},      baseFret: 2 },
    "C#maj7": { frets: [-1,4,3,1,1,1], fingers: [0,4,3,1,1,1],   barre: {fret:1,from:2,to:5},      baseFret: 1 },
    "F#maj7": { frets: [2,4,3,3,2,2],  fingers: [1,4,3,2,1,1],   barre: {fret:2,from:0,to:5},      baseFret: 2 },
    "Bbmaj7": { frets: [-1,1,3,2,3,1], fingers: [0,1,3,2,4,1],   barre: {fret:1,from:1,to:5},      baseFret: 1 },
    "Ebmaj7": { frets: [-1,-1,1,3,3,2],fingers: [0,0,1,3,4,2],   barre: null,                      baseFret: 1 },
    "Abmaj7": { frets: [4,3,1,1,1,0],  fingers: [4,3,1,1,1,0],   barre: {fret:1,from:2,to:4},      baseFret: 1 },

    // ── NONA (9) ──────────────────────────────────────────────────────────
    "C9":   { frets: [-1,3,2,3,3,3],   fingers: [0,2,1,3,3,3],   barre: {fret:3,from:2,to:5},      baseFret: 1 },
    "D9":   { frets: [-1,-1,0,2,1,0],  fingers: [0,0,0,2,1,0],   barre: null,                      baseFret: 1 },
    "E9":   { frets: [0,2,0,1,0,2],    fingers: [0,2,0,1,0,3],   barre: null,                      baseFret: 1 },
    "G9":   { frets: [3,2,0,2,0,1],    fingers: [3,2,0,4,0,1],   barre: null,                      baseFret: 1 },
    "A9":   { frets: [-1,0,2,4,2,3],   fingers: [0,0,1,3,1,2],   barre: {fret:2,from:2,to:4},      baseFret: 1 },
    "B9":   { frets: [-1,2,1,2,2,2],   fingers: [0,2,1,3,3,3],   barre: {fret:2,from:2,to:5},      baseFret: 2 },
    "F9":   { frets: [1,1,2,1,1,3],    fingers: [1,1,2,1,1,4],   barre: {fret:1,from:0,to:5},      baseFret: 1 },
    "F#9":  { frets: [2,2,4,2,2,4],    fingers: [1,1,3,1,1,4],   barre: {fret:2,from:0,to:5},      baseFret: 2 },
    "Bb9":  { frets: [-1,1,3,1,3,3],   fingers: [0,1,3,1,4,4],   barre: {fret:1,from:1,to:5},      baseFret: 1 },
    "Eb9":  { frets: [-1,-1,1,1,2,1],  fingers: [0,0,1,1,2,1],   barre: {fret:1,from:2,to:5},      baseFret: 1 },

    // ── MENORES COM 9 (m9) ────────────────────────────────────────────────
    "Am9":  { frets: [-1,0,2,0,1,3],   fingers: [0,0,2,0,1,4],   barre: null,                      baseFret: 1 },
    "Em9":  { frets: [0,2,0,0,3,0],    fingers: [0,1,0,0,2,0],   barre: null,                      baseFret: 1 },
    "Dm9":  { frets: [-1,-1,0,2,1,3],  fingers: [0,0,0,2,1,4],   barre: null,                      baseFret: 1 },
    "Bm9":  { frets: [-1,2,4,2,3,4],   fingers: [0,1,3,1,2,4],   barre: {fret:2,from:1,to:5},      baseFret: 2 },

    // ── SUSPENSOS ─────────────────────────────────────────────────────────
    "Csus2":  { frets: [-1,3,0,0,1,3], fingers: [0,2,0,0,1,4],   barre: null,                      baseFret: 1 },
    "Dsus2":  { frets: [-1,-1,0,2,3,0],fingers: [0,0,0,1,2,0],   barre: null,                      baseFret: 1 },
    "Asus2":  { frets: [-1,0,2,2,0,0], fingers: [0,0,1,2,0,0],   barre: null,                      baseFret: 1 },
    "Esus2":  { frets: [0,2,4,4,0,0],  fingers: [0,1,2,3,0,0],   barre: null,                      baseFret: 1 },
    "Gsus2":  { frets: [3,0,0,0,3,3],  fingers: [1,0,0,0,2,3],   barre: null,                      baseFret: 1 },
    "Dsus4":  { frets: [-1,-1,0,2,3,3],fingers: [0,0,0,1,2,3],   barre: null,                      baseFret: 1 },
    "Esus4":  { frets: [0,2,2,2,0,0],  fingers: [0,1,2,3,0,0],   barre: null,                      baseFret: 1 },
    "Asus4":  { frets: [-1,0,2,2,3,0], fingers: [0,0,1,2,3,0],   barre: null,                      baseFret: 1 },
    "Gsus4":  { frets: [3,3,0,0,3,3],  fingers: [1,2,0,0,3,4],   barre: null,                      baseFret: 1 },
    "Bsus4":  { frets: [-1,2,4,4,5,2], fingers: [0,1,2,3,4,1],   barre: {fret:2,from:1,to:5},      baseFret: 2 },
    "Csus4":  { frets: [-1,3,3,0,1,1], fingers: [0,3,4,0,1,2],   barre: null,                      baseFret: 1 },
    "F#sus4": { frets: [2,2,4,4,2,2],  fingers: [1,1,3,4,1,1],   barre: {fret:2,from:0,to:5},      baseFret: 2 },

    // ── ADD9 ──────────────────────────────────────────────────────────────
    "Cadd9":  { frets: [-1,3,2,0,3,0], fingers: [0,2,1,0,3,0],   barre: null,                      baseFret: 1 },
    "Gadd9":  { frets: [3,2,0,2,0,3],  fingers: [2,1,0,3,0,4],   barre: null,                      baseFret: 1 },
    "Dadd9":  { frets: [-1,-1,0,2,3,0],fingers: [0,0,0,1,2,0],   barre: null,                      baseFret: 1 },
    "Eadd9":  { frets: [0,2,2,1,0,2],  fingers: [0,2,3,1,0,4],   barre: null,                      baseFret: 1 },
    "Aadd9":  { frets: [-1,0,2,4,2,0], fingers: [0,0,1,3,2,0],   barre: null,                      baseFret: 1 },

    // ── DIMINUTOS E AUMENTADOS ────────────────────────────────────────────
    "Cdim":   { frets: [-1,3,4,5,4,-1],fingers: [0,1,2,4,3,0],   barre: null,                      baseFret: 3 },
    "Ddim":   { frets: [-1,-1,0,1,0,1],fingers: [0,0,0,1,0,2],   barre: null,                      baseFret: 1 },
    "Edim":   { frets: [0,1,2,3,2,-1], fingers: [0,1,2,4,3,0],   barre: null,                      baseFret: 1 },
    "Fdim":   { frets: [-1,-1,3,4,3,4],fingers: [0,0,1,3,2,4],   barre: null,                      baseFret: 1 },
    "Gdim":   { frets: [-1,-1,5,6,5,6],fingers: [0,0,1,3,2,4],   barre: null,                      baseFret: 5 },
    "Bdim":   { frets: [-1,2,3,4,3,-1],fingers: [0,1,2,4,3,0],   barre: null,                      baseFret: 2 },
    "Caug":   { frets: [-1,3,2,1,1,0], fingers: [0,4,3,1,2,0],   barre: null,                      baseFret: 1 },
    "Daug":   { frets: [-1,-1,0,3,3,2],fingers: [0,0,0,2,3,1],   barre: null,                      baseFret: 1 },
    "Eaug":   { frets: [0,3,2,1,1,0],  fingers: [0,4,3,2,1,0],   barre: null,                      baseFret: 1 },
    "Gaug":   { frets: [3,2,1,0,0,-1], fingers: [3,2,1,0,0,0],   barre: null,                      baseFret: 1 },
    "Aaug":   { frets: [-1,0,3,2,2,1], fingers: [0,0,4,2,3,1],   barre: null,                      baseFret: 1 },
    "Baug":   { frets: [-1,2,1,0,0,-1],fingers: [0,3,2,1,0,0],   barre: null,                      baseFret: 1 },
    "F#aug":  { frets: [2,1,0,-1,-1,-1],fingers:[2,1,0,0,0,0],   barre: null,                      baseFret: 1 },

    // ── SEXTA (6) ─────────────────────────────────────────────────────────
    "C6":   { frets: [-1,3,2,2,1,0],   fingers: [0,4,2,3,1,0],   barre: null,                      baseFret: 1 },
    "D6":   { frets: [-1,-1,0,2,0,2],  fingers: [0,0,0,1,0,2],   barre: null,                      baseFret: 1 },
    "E6":   { frets: [0,2,2,1,2,0],    fingers: [0,2,3,1,4,0],   barre: null,                      baseFret: 1 },
    "G6":   { frets: [3,2,0,0,0,0],    fingers: [2,1,0,0,0,0],   barre: null,                      baseFret: 1 },
    "A6":   { frets: [-1,0,2,2,2,2],   fingers: [0,0,1,2,3,4],   barre: null,                      baseFret: 1 },
    "Am6":  { frets: [-1,0,2,2,1,2],   fingers: [0,0,2,3,1,4],   barre: null,                      baseFret: 1 },
    "Em6":  { frets: [0,2,2,0,2,0],    fingers: [0,2,3,0,4,0],   barre: null,                      baseFret: 1 },
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
    const notaBase = nome.match(/^([A-G][#b]?)/)?.[1] || '';
    const sufixo   = nome.slice(notaBase.length);
    const notaNorm = normBemol[notaBase] || notaBase;
    if (notaNorm !== notaBase) tentativas.push(notaNorm + sufixo);

    // 3. Variações de sufixo comuns
    tentativas.push(nome.replace(/maj7/i, 'maj7'));
    tentativas.push(nome.replace(/min/i, 'm'));
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
        if (BANCO_ACORDES[t]) { acorde = BANCO_ACORDES[t]; nomeUsado = t; break; }
    }
    if (!acorde) return null;
    const ehAproximado = nomeUsado !== tentativas[0] || notaBaixo;

    const { frets, fingers, barre, baseFret } = acorde;

    // dimensões
    const W = 140, H = 170;
    const marginLeft = 28, marginTop = 38;
    const colW = 18, rowH = 18;
    const numFrets = 5, numStrings = 6;
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

        const nomeAcorde = span.innerText.trim();
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
        const tw = 148, th = 178;
        let x = e.clientX + 14;
        let y = e.clientY - th / 2;
        if (x + tw > window.innerWidth - 8) x = e.clientX - tw - 14;
        if (y < 8) y = 8;
        if (y + th > window.innerHeight - 8) y = window.innerHeight - th - 8;
        tooltip.style.left = x + 'px';
        tooltip.style.top  = y + 'px';
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
        const tomAtual = document.getElementById(`tom-txt-${index}`)?.innerText || musica.tomCustomizado || musica.tomOriginal;
        const capoAtual = parseInt(document.getElementById(`capo-select-${index}`)?.value || 0);
        const dicaCapo  = document.getElementById(`capo-dica-${index}`)?.textContent || '';

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
<script>window.onload = () => { window.print(); }<\/script>
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
    const btn = document.getElementById('btn-busca');
    const visivel = wrapper.style.display !== 'none';
    if (visivel) {
        wrapper.style.display = 'none';
        campo.value = '';
        filtrarBusca('');
        btn.classList.remove('active');
        document.querySelectorAll('.card-busca-global').forEach(el => el.remove());
    } else {
        wrapper.style.display = 'block';
        campo.focus();
        btn.classList.add('active');
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
        return (m.titulo + ' ' + (m.artista || '')).toLowerCase().includes(t);
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

    // Músicas fora da lista ativa: renderizar temporariamente
    const idsForaDaLista = resultados.filter(id => !idsDaLista.includes(id));
    // Remover cards temporários anteriores
    container.querySelectorAll('.card-busca-global').forEach(el => el.remove());

    idsForaDaLista.forEach(id => {
        const musica = appStorage.musicasGlobais[id];
        if (!musica) return;
        const tomExibicao = musica.tomCustomizado || musica.tomOriginal || 'C';
        const fonteExibicao = musica.fonteCustomizada || 16;
        const div = document.createElement('div');
        div.className = 'cifra-container card-busca-global busca-destaque';
        div.setAttribute('data-real-id', id);
        div.innerHTML = `
            <div style="font-size:10px;font-weight:700;color:var(--chord-color);margin-bottom:4px;text-transform:uppercase;">🔍 Resultado de busca global</div>
            <h2 style="margin:0 0 4px 0;font-size:1.35em;">${escapeHtml(musica.titulo)}</h2>
            <div style="color:var(--text-muted);margin-bottom:12px;font-size:12px;">Por: <strong>${escapeHtml(musica.artista || 'Desconhecido')}</strong> &nbsp;|&nbsp; Tom: ${escapeHtml(tomExibicao)}</div>
            <hr style="border:0;border-top:1px solid var(--border-color);margin:0;">
            <pre style="font-size:${fonteExibicao}px;">${processarLinhasTexto(musica.letraCifra)}</pre>
        `;
        container.appendChild(div);
    });
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

function duplicarLista() {
    const sel = document.getElementById('seletor-lista-gerenciar');
    const nome = sel?.value;
    if (!nome) { mostrarToast('Nenhuma lista selecionada.'); return; }
    let novoNome = nome + ' (cópia)';
    let contador = 2;
    while (appStorage.listas[novoNome]) novoNome = `${nome} (cópia ${contador++})`;
    appStorage.listas[novoNome] = [...appStorage.listas[nome]];
    appStorage.listaAtiva = novoNome;
    localStorage.setItem('gelcifras_db', JSON.stringify(appStorage));
    mostrarToast(`Lista "${novoNome}" criada!`);
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
    abrirModalDiagrama(span.innerText.trim());
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

// Popular seletor de gerenciar listas ao abrir o admin
const _abrirModalAdminOriginal = abrirModalAdmin;
abrirModalAdmin = function() {
    _abrirModalAdminOriginal();
    popularSeletorGerenciarListas();
};