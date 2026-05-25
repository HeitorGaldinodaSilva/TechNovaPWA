// ============================================================
// CONTROLE DE SEÇÕES — destaca o item ativo no menu
// ============================================================
function mostrarSecao(secaoId) {
    document.querySelectorAll('.secao').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const secao = document.getElementById(secaoId);
    if (secao) secao.style.display = 'block';

    // Ativa o item do menu correspondente
    const navItems = document.querySelectorAll('.nav-item');
    const mapa = {
        meusCursos : 0,
        alunos     : 1,
        atividades : 2,
        validacao  : 3,
        metricas   : 4
    };
    if (mapa[secaoId] !== undefined) navItems[mapa[secaoId]].classList.add('active');

    // Carrega os dados da seção
    if (secaoId === 'meusCursos') carregarMeusCursos();
    if (secaoId === 'alunos')     carregarAlunos();
    if (secaoId === 'atividades') carregarAtividades();
    if (secaoId === 'validacao')  carregarValidacao();
    if (secaoId === 'metricas')   carregarMetricas();
    if (secaoId === 'notificacoes') carregarNotificacoes();
}

// ============================================================
// MEUS CURSOS — busca o curso vinculado ao coordenador logado
// ============================================================
async function carregarMeusCursos() {
    const tabela = document.getElementById('listaMeusCursos');
    try {
        const res = await fetch('/meus-cursos');
        if (!res.ok) throw new Error('Erro ao buscar cursos');
        const cursos = await res.json();

        if (cursos.length === 0) {
            tabela.innerHTML = "<tr><td colspan='3'>Nenhum curso vinculado.</td></tr>";
            return;
        }

        tabela.innerHTML = '';
        cursos.forEach(c => {
            tabela.innerHTML += `
                <tr>
                    <td><strong>${c.nome}</strong></td>
                    <td><span class="badge badge-ativo">${c.carga}h</span></td>
                    <td><span class="badge badge-ativo">Ativo</span></td>
                </tr>`;
        });
    } catch (err) {
        tabela.innerHTML = "<tr><td colspan='3'>Erro ao carregar cursos.</td></tr>";
        console.error(err);
    }
}

// ============================================================
// GERENCIAR ALUNOS
// ============================================================
async function carregarAlunos() {
    const tabela = document.getElementById('listaAlunos');
    try {
        const res = await fetch('/alunos');
        if (!res.ok) throw new Error('Erro ao buscar alunos');
        const alunos = await res.json();

        if (alunos.length === 0) {
            tabela.innerHTML = "<tr><td colspan='5'>Nenhum aluno cadastrado.</td></tr>";
            return;
        }

        tabela.innerHTML = '';
        alunos.forEach(a => {
            const iniciais = a.nome ? a.nome.substring(0, 2).toUpperCase() : '??';
            tabela.innerHTML += `
                <tr>
                    <td>
                        <div class="profile">
                            <div class="avatar avatar-blue">${iniciais}</div>
                            <div>${a.nome}</div>
                        </div>
                    </td>
                    <td>${a.email}</td>
                    <td>${a.curso || '<em>—</em>'}</td>
                    <td><span class="badge badge-ativo">${a.horas_adquiridas || 0}h</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon delete" onclick="excluirAluno(${a.id})" title="Excluir">🗑</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (err) {
        tabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar alunos.</td></tr>";
        console.error(err);
    }
}

function mostrarFormAluno() {
    const f = document.getElementById('formAluno');
    const abrindo = (f.style.display === 'none' || f.style.display === '');
    f.style.display = abrindo ? 'block' : 'none';
    if (abrindo) preencherSelectCursos('cursoAluno');
}

async function preencherSelectCursos(idSelect) {
    const select = document.getElementById(idSelect);
    select.innerHTML = '<option value="">Carregando cursos...</option>';
    try {
        const res = await fetch('/meus-cursos');
        if (!res.ok) throw new Error('Falha ao buscar cursos - status: ' + res.status);
        const cursos = await res.json();

        if (cursos.length === 0) {
            select.innerHTML = '<option value="">Nenhum curso vinculado ao seu perfil</option>';
            console.warn('Nenhum curso retornado por /meus-cursos. Verifique se o curso_id do coordenador está preenchido no banco.');
            return;
        }

        select.innerHTML = '<option value="">Selecione o Curso...</option>';
        cursos.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nome;
            select.appendChild(opt);
        });
    } catch (err) {
        select.innerHTML = '<option value="">Erro ao carregar cursos</option>';
        console.error('Erro ao carregar cursos no select:', err);
    }
}

async function cadastrarAluno() {
    const nome   = document.getElementById('nomeAluno').value.trim();
    const email  = document.getElementById('emailAluno').value.trim();
    const senha  = document.getElementById('senhaAluno').value;
    const cursoId = document.getElementById('cursoAluno').value;
    const horas  = document.getElementById('horasAluno').value || '0';

    if (!nome || !email || !senha || !cursoId) return alert('Preencha todos os campos!');

    try {
        const res = await fetch('/alunos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome,
                email,
                senha,
                curso_id: parseInt(cursoId),
                horas_adquiridas: parseInt(horas)
            })
        });

        if (res.ok) {
            alert('Aluno cadastrado com sucesso!');
            document.getElementById('nomeAluno').value  = '';
            document.getElementById('emailAluno').value = '';
            document.getElementById('senhaAluno').value = '';
            document.getElementById('cursoAluno').value = '';
            document.getElementById('horasAluno').value = '';
            document.getElementById('formAluno').style.display = 'none';
            carregarAlunos();
        } else {
            const err = await res.json();
            alert('Erro: ' + (err.msg || 'Falha no cadastro'));
        }
    } catch (err) {
        console.error(err);
        alert('Erro de conexão com o servidor.');
    }
}

async function excluirAluno(id) {
    if (confirm('Deseja excluir este aluno?')) {
        await fetch(`/alunos/${id}`, { method: 'DELETE' });
        carregarAlunos();
    }
}

// ============================================================
// ATIVIDADES — visão geral das submissões dos alunos
// ============================================================
async function carregarAtividades() {
    const tabela = document.getElementById('listaAtividades');
    try {
        const res = await fetch('/atividades');
        if (!res.ok) throw new Error('Erro ao buscar atividades');
        const atividades = await res.json();

        if (atividades.length === 0) {
            tabela.innerHTML = "<tr><td colspan='5'>Nenhuma atividade enviada.</td></tr>";
            return;
        }

        tabela.innerHTML = '';
        atividades.forEach(a => {
            const statusMap = {
                PENDING:  { classe: 'badge-pending',  texto: 'Pendente'  },
                APPROVED: { classe: 'badge-approved', texto: 'Aprovado'  },
                REJECTED: { classe: 'badge-rejected', texto: 'Reprovado' }
            };
            const status = statusMap[a.submission_status] || statusMap['PENDING'];
            const dataFormatada = a.submission_date
                ? new Date(a.submission_date).toLocaleDateString('pt-BR')
                : '—';

            tabela.innerHTML += `
                <tr>
                    <td>${a.submission_id}</td>
                    <td>${a.aluno}</td>
                    <td>${a.activity_title}</td>
                    <td>${dataFormatada}</td>
                    <td><span class="badge ${status.classe}">${status.texto}</span></td>
                </tr>`;
        });
    } catch (err) {
        tabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar atividades.</td></tr>";
        console.error(err);
    }
}

// ============================================================
// VALIDAÇÃO DE ATIVIDADES — aprovar ou reprovar pendentes
// ============================================================
async function carregarValidacao() {
    const tabela = document.getElementById('listaValidacao');
    try {
        const res = await fetch('/atividades/pendentes');
        if (!res.ok) throw new Error('Erro ao buscar atividades pendentes');
        const atividades = await res.json();

        if (atividades.length === 0) {
            tabela.innerHTML = "<tr><td colspan='6'>Nenhuma atividade pendente.</td></tr>";
            return;
        }

        tabela.innerHTML = '';
        atividades.forEach(a => {
            const dataFormatada = a.submission_date
                ? new Date(a.submission_date).toLocaleDateString('pt-BR')
                : '—';
            const certLink = a.certificate_file_path
                ? `<a href="/uploads/${a.certificate_file_path}" target="_blank" class="btn-primary" style="font-size:12px;padding:6px 12px;">Visualizar Certificado</a>`
                : '<em>Sem certificado</em>';

            tabela.innerHTML += `
                <tr>
                    <td>${a.aluno}</td>
                    <td>${a.activity_title}</td>
                    <td>${dataFormatada}</td>
                    <td><span class="badge badge-pending">${a.requested_hours}h</span></td>
                    <td>${certLink}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon approve" onclick="validarAtividade(${a.submission_id}, 'APPROVED')" title="Aprovar">✔</button>
                            <button class="btn-icon reject"  onclick="validarAtividade(${a.submission_id}, 'REJECTED')" title="Reprovar">✖</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (err) {
        tabela.innerHTML = "<tr><td colspan='6'>Erro ao carregar validações.</td></tr>";
        console.error(err);
    }
}

async function validarAtividade(id, status) {
    const acao = status === 'APPROVED' ? 'aprovar' : 'reprovar';
    if (!confirm(`Deseja ${acao} esta atividade?`)) return;

    try {
        const res = await fetch(`/atividades/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (res.ok) {
            alert(`Atividade ${status === 'APPROVED' ? 'aprovada' : 'reprovada'} com sucesso!`);
            carregarValidacao();
            carregarAtividades();
            carregarMetricas();
        } else {
            alert('Erro ao atualizar status.');
        }
    } catch (err) {
        console.error(err);
        alert('Erro de conexão.');
    }
}

async function carregarMetricas() {
    const grid = document.getElementById('metricasGrid');
    try {
        const res = await fetch('/metricas');
        if (!res.ok) throw new Error('Erro ao buscar métricas');
        const data = await res.json();

        if (!data || Object.keys(data).length === 0) {
            grid.innerHTML = '<div class="metric-card"><p>Nenhuma métrica disponível.</p></div>';
            return;
        }

        const aprovacoesTexto = data.aprovacoes_percentual !== undefined
            ? `${data.aprovacoes_percentual}%`
            : '0%';

        grid.innerHTML = `
            <div class="metric-card">
                <p>Curso</p>
                <strong class="metric-value">${data.curso || '—'}</strong>
            </div>
            <div class="metric-card">
                <p>Total de Alunos</p>
                <strong class="metric-value">${data.alunos || 0}</strong>
            </div>
            <div class="metric-card">
                <p>Atividades Enviadas</p>
                <strong class="metric-value">${data.enviadas || 0}</strong>
            </div>
            <div class="metric-card">
                <p>Aprovações</p>
                <strong class="metric-value">${aprovacoesTexto}</strong>
            </div>
        `;
    } catch (err) {
        grid.innerHTML = '<div class="metric-card"><p>Erro ao carregar métricas.</p></div>';
        console.error(err);
    }
}

function carregarNotificacoes() {
    const lista = document.getElementById('listaNotificacoesCoordenador');
    const notificacoes = [
        {
            title: 'Novo aluno cadastrado',
            message: 'O aluno Rafael Souza foi registrado no curso de Design.',
            time: 'há 20 minutos'
        },
        {
            title: 'Você tem uma nova atribuição',
            message: 'Foi atribuída a validação de 3 atividades do curso de Engenharia.',
            time: 'há 45 minutos'
        },
        {
            title: 'Você validou uma atividade',
            message: 'Atividade “Projeto de Pesquisa” do aluno Ana Clara foi aprovada.',
            time: 'há 1 hora'
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

// ============================================================
// INÍCIO: abre "Meus Cursos" por padrão
// ============================================================
window.onload = () => mostrarSecao('meusCursos');