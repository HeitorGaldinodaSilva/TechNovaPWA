/**
 * Alterna entre as seções da Dashboard e carrega os dados necessários
 */
function mostrarSecao(secaoId) {
    document.querySelectorAll('.secao').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const secaoAtiva = document.getElementById(secaoId);
    if (secaoAtiva) secaoAtiva.style.display = 'block';

    // Destaca o item ativo no menu
    const mapa = { usuarios: 0, cursos: 1, coordenadores: 2, regras: 3, relatorios: 4, notificacoes: 5 };
    const navItems = document.querySelectorAll('.nav-item');
    if (mapa[secaoId] !== undefined) navItems[mapa[secaoId]].classList.add('active');

    // Carrega dados da seção
    if (secaoId === 'usuarios') carregarUsuarios();
    if (secaoId === 'cursos') carregarCursos();
    if (secaoId === 'coordenadores') carregarCoords();
    if (secaoId === 'regras') carregarRegras();
    if (secaoId === 'relatorios') carregarRelatorios();
    if (secaoId === 'notificacoes') carregarNotificacoes();
}

// =============================
// FUNÇÕES DE APOIO
// =============================

/**
 * Preenche menus de seleção (select) com os cursos existentes no banco
 */
async function atualizarSelectCursos(idSelect) {
    const select = document.getElementById(idSelect);
    try {
        const res = await fetch("/cursos");
        if (!res.ok) throw new Error("Falha ao buscar cursos");
        
        const cursos = await res.json();
        select.innerHTML = '<option value="">Selecione o Curso...</option>';
        
        cursos.forEach(c => {
            const option = document.createElement("option");
            option.value = c.id; // Vincula o ID do banco ao valor da opção
            option.textContent = c.nome;
            select.appendChild(option);
        });
    } catch (erro) {
        console.error("Erro ao carregar lista de cursos:", erro);
    }
}

// =============================
// GESTÃO DE CURSOS
// =============================

async function carregarCursos() {
    const tabela = document.getElementById("listaCursos");
    try {
        const res = await fetch("/cursos");
        const cursos = await res.json();

        tabela.innerHTML = "";
        cursos.forEach(c => {
            tabela.innerHTML += `
                <tr>
                    <td>#${c.id}</td>
                    <td><strong>${c.nome}</strong></td>
                    <td><span class="badge">${c.carga}h</span></td>
                    <td>
                        <button class="btn-icon delete" onclick="excluirCurso('${c.id}')">🗑</button>
                    </td>
                </tr>`;
        });
    } catch (erro) {
        tabela.innerHTML = "<tr><td colspan='4'>Erro ao carregar cursos.</td></tr>";
    }
}

async function cadastrarCurso() {
    const nome = document.getElementById("nomeCurso").value.trim();
    const cargaInput = document.getElementById("cargaCurso").value.trim();

    if(!nome || !cargaInput) return alert("Preencha todos os campos do curso!");

    // Convertemos para número para evitar erros de tipo no banco[cite: 1]
    const carga = parseInt(cargaInput);

    try {
        const res = await fetch("/cursos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Enviamos apenas nome e carga; o MySQL gera o ID automaticamente
            body: JSON.stringify({ nome, carga })
        });

        if (res.ok) {
            alert("Curso cadastrado com sucesso!");
            document.getElementById("nomeCurso").value = "";
            document.getElementById("cargaCurso").value = "";
            mostrarFormulario(); // Fecha o formulário
            carregarCursos();    // Atualiza a lista na tela
        } else {
            const erroJson = await res.json();
            // Mostra a mensagem de erro vinda do seu servidor (ex: "Código já existe")[cite: 1]
            alert("Erro ao salvar: " + (erroJson.msg || "Erro desconhecido"));
        }
    } catch (err) {
        console.error("Erro na requisição:", err);
        alert("Erro de conexão com o servidor.");
    }
}

async function excluirCurso(id) {
    if (confirm("Deseja realmente excluir este curso?")) {
        await fetch(`/cursos/${id}`, { method: "DELETE" });
        carregarCursos();
    }
}

// =============================
// GESTÃO DE COORDENADORES
// =============================

async function carregarCoords() {
    const tabela = document.getElementById("listaCoords");
    try {
        const res = await fetch('/coordenadores');
        const coords = await res.json();

        tabela.innerHTML = "";
        coords.forEach(c => {
            const iniciais = c.nome ? c.nome.substring(0, 2).toUpperCase() : "??";
            tabela.innerHTML += `
                <tr>
                    <td>
                        <div class="profile">
                            <div class="avatar blue">${iniciais}</div>
                            <div>
                                <div class="name">${c.nome}</div>
                                <div class="role">Coordenador</div>
                            </div>
                        </div>
                    </td>
                    <td>${c.email}</td>
                    <td>${c.curso || '<em>Não informado</em>'}</td>
                    <td><span class="badge">Ativo</span></td>
                    <td>
                        <button class="btn-icon delete" onclick="excluirCoord(${c.id})">🗑</button>
                    </td>
                </tr>`;
        });
    } catch (erro) {
        tabela.innerHTML = "<tr><td colspan='4'>Erro ao carregar coordenadores.</td></tr>";
    }
}

async function cadastrarCoord() {
    const nome = document.getElementById("nomeCoord").value.trim();
    const email = document.getElementById("emailCoord").value.trim();
    const senha = document.getElementById("senhaCoord").value;
    const cursoId = document.getElementById("cursoCoord").value;

    if (!nome || !email || !senha || !cursoId) return alert("Preencha todos os campos!");

    try {
        const res = await fetch('/cadastrar-coordenador', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nome,
                email,
                senha,
                curso_id: parseInt(cursoId)
            })
        });

        if (res.ok) {
            alert("Coordenador cadastrado!");
            document.getElementById("nomeCoord").value = "";
            document.getElementById("emailCoord").value = "";
            document.getElementById("senhaCoord").value = "";
            document.getElementById("cursoCoord").value = "";
            mostrarFormCoord();
            carregarCoords();
        } else {
            const erroJson = await res.json();
            alert("Erro: " + (erroJson.msg || "Falha no cadastro"));
        }
    } catch (err) {
        console.error("Erro ao cadastrar coordenador:", err);
    }
}

async function excluirCoord(id) {
    if (confirm("Deseja excluir este coordenador?")) {
        await fetch(`/coordenadores/${id}`, { method: "DELETE" });
        carregarCoords();
    }
}

// =============================
// GESTÃO DE REGRAS DE ATIVIDADE
// =============================

async function carregarRegras() {
    const tabela = document.getElementById("listaRegras");
    try {
        const res = await fetch("/regras");
        if (!res.ok) throw new Error("Erro na API de regras");
        
        const regras = await res.json();
        tabela.innerHTML = "";
        
        regras.forEach(r => {
            tabela.innerHTML += `
                <tr>
                    <td><strong>${r.nome_curso || 'N/A'}</strong></td>
                    <td>${r.categoria}</td>
                    <td><span class="badge">${r.carga_horaria}h</span></td>
                    <td>
                        <button class="btn-icon delete" onclick="excluirRegra('${r.id}')">🗑</button>
                    </td>
                </tr>`;
        });
    } catch (erro) {
        tabela.innerHTML = "<tr><td colspan='4'>Erro ao carregar regras do banco.</td></tr>";
        console.error(erro);
    }
}

function carregarNotificacoes() {
    const lista = document.getElementById('listaNotificacoesAdmin');
    const notificacoes = [
        {
            title: 'Novo curso cadastrado',
            message: 'O curso de Engenharia de Software foi cadastrado com sucesso.',
            time: 'há 12 minutos'
        },
        {
            title: 'Novo coordenador cadastrado',
            message: 'O coordenador Maria Alves foi adicionado ao time de Gestão.',
            time: 'há 1 hora'
        },
        {
            title: 'Nova regra de atividade criada',
            message: 'A nova regra “Projeto de Extensão” foi registrada com carga de 15h.',
            time: 'há 2 horas'
        }
    ];

    lista.innerHTML = notificacoes.map(n => `
        <div class="notification-card">
            <div class="notification-card-title">${n.title}</div>
            <div class="notification-card-message">${n.message}</div>
            <div class="notification-card-time">${n.time}</div>
        </div>
    `).join('');
}

async function cadastrarRegra() {
    const cursoId = document.getElementById("cursoRegra").value;
    const categoria = document.getElementById("categoriaRegra").value.trim();
    const cargaInput = document.getElementById("cargaRegra").value.trim();

    if(!cursoId || !categoria || !cargaInput) return alert("Preencha todos os campos da regra!");

    try {
        const res = await fetch("/regras", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                curso_id: parseInt(cursoId), 
                categoria: categoria, 
                carga_horaria: parseInt(cargaInput) 
            })
        });

        if (res.ok) {
            alert("Regra salva com sucesso!");
            document.getElementById("categoriaRegra").value = "";
            document.getElementById("cargaRegra").value = "";
            mostrarFormRegra();
            carregarRegras();
        } else {
            const erroJson = await res.json();
            alert("Erro ao salvar regra: " + (erroJson.msg || "Erro no servidor"));
        }
    } catch (err) {
        console.error("Erro de conexão ao salvar regra:", err);
    }
}

async function excluirRegra(id) {
    if (confirm("Deseja excluir esta regra?")) {
        await fetch(`/regras/${id}`, { method: "DELETE" });
        carregarRegras();
    }
}

async function carregarUsuarios(search = '') {
    const tabela = document.getElementById("listaUsuarios");
    try {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await fetch(`/usuarios${query}`);
        const usuarios = await res.json();

        tabela.innerHTML = "";
        if (!usuarios.length) {
            tabela.innerHTML = `<tr><td colspan='5'>Nenhum usuário encontrado.</td></tr>`;
            return;
        }

        usuarios.forEach(u => {
            tabela.innerHTML += `
                <tr>
                    <td>${u.nome || '-'}</td>
                    <td>${u.email || '-'}</td>
                    <td>${u.tipo || (u.role === 'COORDINATOR' ? 'Coordenador' : u.role === 'STUDENT' ? 'Aluno' : 'Admin')}</td>
                    <td>${u.curso || '<em>Não informado</em>'}</td>
                    <td><span class="badge">${u.role === 'ADMIN' ? 'Administrador' : u.role === 'COORDINATOR' ? 'Coordenador' : 'Aluno'}</span></td>
                </tr>`;
        });
    } catch (erro) {
        tabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar usuários.</td></tr>";
        console.error("Erro ao carregar usuários:", erro);
    }
}

function buscarUsuarios() {
    const busca = document.getElementById("buscaUsuario").value.trim();
    carregarUsuarios(busca);
}

function limparBuscaUsuarios() {
    document.getElementById("buscaUsuario").value = '';
    carregarUsuarios();
}

async function carregarRelatorios() {
    const cursoId = document.getElementById("cursoRelatorio").value;
    const url = cursoId ? `/relatorios?curso_id=${encodeURIComponent(cursoId)}` : '/relatorios';

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Falha ao carregar relatórios');
        const data = await res.json();

        document.getElementById("totalAlunos").textContent = data.resumo.total_alunos;
        document.getElementById("totalCoordenadores").textContent = data.resumo.total_coordenadores;
        document.getElementById("totalCursos").textContent = data.resumo.total_cursos;
        document.getElementById("totalAtividades").textContent = data.resumo.total_atividades;

        document.getElementById("cursoAlunos").textContent = data.cursoDetalhe ? data.cursoDetalhe.alunos : '-';
        document.getElementById("cursoAtividades").textContent = data.cursoDetalhe ? data.cursoDetalhe.enviadas : '-';
        document.getElementById("cursoAprovadas").textContent = data.cursoDetalhe ? data.cursoDetalhe.aprovadas : '-';
        document.getElementById("cursoReprovadas").textContent = data.cursoDetalhe ? data.cursoDetalhe.reprovadas : '-';

        const progresso = document.getElementById("listaProgresso");
        progresso.innerHTML = "";

        if (data.progresso && data.progresso.length) {
            data.progresso.forEach(item => {
                progresso.innerHTML += `
                    <tr>
                        <td>${item.nome}</td>
                        <td>${item.horas_adquiridas || 0}h</td>
                        <td>${item.meta || 0}h</td>
                        <td>${item.porcentagem}%</td>
                    </tr>`;
            });
        } else {
            progresso.innerHTML = `<tr><td colspan='4'>${cursoId ? 'Nenhum aluno encontrado para este curso.' : 'Selecione um curso para ver o progresso dos alunos.'}</td></tr>`;
        }
    } catch (erro) {
        console.error('Erro ao carregar relatórios:', erro);
        document.getElementById("listaProgresso").innerHTML = "<tr><td colspan='4'>Erro ao carregar relatórios.</td></tr>";
    }
}

// =============================
// CONTROLE VISUAL (INTERAÇÃO)
// =============================

function mostrarFormulario() {
    const f = document.getElementById("formContainer");
    f.style.display = f.style.display === "none" ? "block" : "none";
}

function mostrarFormCoord() {
    const f = document.getElementById("formCoord");
    const abrindo = (f.style.display === "none" || f.style.display === "");
    f.style.display = abrindo ? "block" : "none";
    if (abrindo) atualizarSelectCursos("cursoCoord");
}

function mostrarFormRegra() {
    const f = document.getElementById("formRegra");
    const abrindo = (f.style.display === "none" || f.style.display === "");
    f.style.display = abrindo ? "block" : "none";
    if (abrindo) atualizarSelectCursos("cursoRegra");
}

// Inicia a dashboard na seção de Usuários por padrão ao carregar a página
window.onload = () => {
    atualizarSelectCursos('cursoCoord');
    atualizarSelectCursos('cursoRegra');
    atualizarSelectCursos('cursoRelatorio');
    mostrarSecao('usuarios');
    carregarRelatorios();
};