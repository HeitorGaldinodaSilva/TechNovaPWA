let atividadeSelecionada = null;

const notificacoesAluno = [
    {
        title: 'Atividade enviada',
        message: 'Sua atividade “Workshop de Front-end” foi enviada para validação.',
        time: 'há 15 minutos'
    },
    {
        title: 'Sua atividade foi aprovada',
        message: 'A atividade “Projeto de Extensão” foi aprovada pelo coordenador.',
        time: 'há 1 hora'
    },
    {
        title: 'Sua atividade foi reprovada',
        message: 'A atividade “Monitoria de Matemática” foi reprovada. Verifique os documentos enviados.',
        time: 'há 2 horas'
    }
];

function mostrarSecao(secaoId) {
    document.querySelectorAll('.secao').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const secao = document.getElementById(secaoId);
    if (secao) secao.style.display = 'block';

    const navItems = document.querySelectorAll('.nav-item');
    const mapa = {
        visaoGeral: 0,
        enviarAtividade: 1,
        minhasAtividades: 2,
        detalhesAtividades: 3,
        progressoCategorias: 4,
        fluxoAluno: 5,
        notificacoes: 6
    };
    if (mapa[secaoId] !== undefined) navItems[mapa[secaoId]].classList.add('active');

    if (secaoId === 'visaoGeral') carregarVisaoGeral();
    if (secaoId === 'enviarAtividade') carregarEnviarAtividade();
    if (secaoId === 'minhasAtividades') carregarMinhasAtividades();
    if (secaoId === 'detalhesAtividades') carregarDetalhesAtividades();
    if (secaoId === 'progressoCategorias') carregarProgressoCategorias();
    if (secaoId === 'notificacoes') carregarNotificacoes();
}

async function carregarVisaoGeral() {
    const cardHoras = document.getElementById('horasConcluidas');
    const cardMeta = document.getElementById('metaHoras');
    const cardPercent = document.getElementById('percentualProgresso');
    const progressLabel = document.getElementById('progressLabel');
    const progressFill = document.getElementById('progressFill');
    const atividadesRecentes = document.getElementById('atividadesRecentes');
    const progressoCategorias = document.getElementById('progressoCategorias');

    try {
        const res = await fetch('/aluno/overview');
        if (!res.ok) throw new Error('Erro ao buscar visão geral');
        const data = await res.json();

        const horas = data.horas_adquiridas || 0;
        const meta = data.meta || 0;
        const percentual = data.progresso_percentual || 0;

        cardHoras.textContent = `${horas}h`;
        cardMeta.textContent = `${meta}h`;
        cardPercent.textContent = `${percentual}%`;
        progressLabel.textContent = `${horas}/${meta}h`;
        progressFill.style.width = `${percentual}%`;

        atividadesRecentes.innerHTML = '';
        if (data.atividades_recentes && data.atividades_recentes.length) {
            data.atividades_recentes.forEach(item => {
                const statusClass = item.submission_status === 'APPROVED'
                    ? 'badge-aprovado'
                    : item.submission_status === 'REJECTED'
                        ? 'badge-reprovado'
                        : 'badge-pendente';
                atividadesRecentes.innerHTML += `
                    <div class="recent-item">
                        <strong>${item.activity_title}</strong>
                        <span>${item.category || 'Sem categoria'} • ${item.requested_hours}h</span>
                        <span>${new Date(item.submission_date).toLocaleDateString('pt-BR')}</span>
                        <span class="badge ${statusClass}">${item.submission_status === 'APPROVED' ? 'Aprovado' : item.submission_status === 'REJECTED' ? 'Reprovado' : 'Pendente'}</span>
                    </div>`;
            });
        } else {
            atividadesRecentes.innerHTML = '<p>Nenhuma atividade recente.</p>';
        }

        progressoCategorias.innerHTML = '';
        if (data.progresso_categoria && data.progresso_categoria.length) {
            data.progresso_categoria.forEach(item => {
                const percentualCategoria = item.total ? Math.round((item.aprovadas / item.total) * 100) : 0;
                progressoCategorias.innerHTML += `
                    <div class="category-item">
                        <strong>${item.category}</strong>
                        <span>${item.aprovadas} de ${item.total} aprovadas (${percentualCategoria}%)</span>
                    </div>`;
            });
        } else {
            progressoCategorias.innerHTML = '<p>Nenhuma categoria encontrada.</p>';
        }
    } catch (err) {
        console.error(err);
        atividadesRecentes.innerHTML = '<p>Erro ao carregar visão geral.</p>';
        progressoCategorias.innerHTML = '<p>Erro ao carregar progresso por categoria.</p>';
    }
}

function carregarEnviarAtividade() {
    document.getElementById('formAtividade').reset();
}

async function enviarAtividade(event) {
    event.preventDefault();

    const titulo = document.getElementById('tituloAtividade').value.trim();
    const categoria = document.getElementById('categoriaAtividade').value.trim();
    const horas = document.getElementById('horasAtividade').value.trim();
    const dataRealizacao = document.getElementById('dataAtividade').value;
    const certificado = document.getElementById('certificadoAtividade').files[0];

    if (!titulo || !categoria || !horas || !dataRealizacao || !certificado) {
        return alert('Preencha todos os campos e anexe o certificado em PDF.');
    }

    const formData = new FormData();
    formData.append('activity_title', titulo);
    formData.append('category', categoria);
    formData.append('requested_hours', horas);
    formData.append('submission_date', dataRealizacao);
    formData.append('certificate', certificado);

    try {
        const res = await fetch('/aluno/atividades', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.msg || 'Falha ao enviar atividade.');
        }

        alert('Atividade enviada com sucesso!');
        document.getElementById('formAtividade').reset();
        carregarVisaoGeral();
        carregarMinhasAtividades();
    } catch (err) {
        console.error(err);
        alert(err.message || 'Erro ao enviar atividade.');
    }
}

async function carregarMinhasAtividades() {
    const tabela = document.getElementById('listaMinhasAtividades');
    try {
        const res = await fetch('/aluno/atividades');
        if (!res.ok) throw new Error('Erro ao buscar atividades');
        const atividades = await res.json();

        if (!atividades.length) {
            tabela.innerHTML = '<tr><td colspan="5">Nenhuma atividade enviada.</td></tr>';
            return;
        }

        tabela.innerHTML = '';
        atividades.forEach(item => {
            const statusClass = item.submission_status === 'APPROVED'
                ? 'badge-aprovado'
                : item.submission_status === 'REJECTED'
                    ? 'badge-reprovado'
                    : 'badge-pendente';
            const dataFormatada = item.submission_date
                ? new Date(item.submission_date).toLocaleDateString('pt-BR')
                : '—';

            tabela.innerHTML += `
                <tr>
                    <td>${item.activity_title}</td>
                    <td>${item.category || '—'}</td>
                    <td>${item.requested_hours}h</td>
                    <td><span class="badge ${statusClass}">${item.submission_status === 'APPROVED' ? 'Aprovado' : item.submission_status === 'REJECTED' ? 'Reprovado' : 'Pendente'}</span></td>
                    <td>${dataFormatada}</td>
                    <td>
                        <button class="btn-icon view" onclick="viewAtividade(${item.submission_id})" title="Visualizar">👁</button>
                    </td>
                </tr>`;
        });
    } catch (err) {
        tabela.innerHTML = '<tr><td colspan="6">Erro ao carregar atividades.</td></tr>';
        console.error(err);
    }
}

async function viewAtividade(id) {
    try {
        const res = await fetch(`/aluno/atividades/${id}`);
        if (!res.ok) throw new Error('Erro ao buscar detalhes da atividade');
        atividadeSelecionada = await res.json();
        mostrarSecao('detalhesAtividades');
    } catch (err) {
        console.error(err);
        alert('Não foi possível carregar os detalhes da atividade.');
    }
}

function carregarDetalhesAtividades() {
    const detalhesBox = document.getElementById('detalhesAtividade');
    const detalhesVazio = document.getElementById('detalhesVazio');

    if (!atividadeSelecionada) {
        detalhesBox.style.display = 'none';
        detalhesVazio.style.display = 'block';
        return;
    }

    detalhesVazio.style.display = 'none';
    detalhesBox.style.display = 'grid';

    document.getElementById('detalheTitulo').textContent = atividadeSelecionada.activity_title;
    document.getElementById('detalheCategoria').textContent = atividadeSelecionada.category || '—';
    document.getElementById('detalheHoras').textContent = `${atividadeSelecionada.requested_hours}h`;
    document.getElementById('detalheData').textContent = atividadeSelecionada.submission_date
        ? new Date(atividadeSelecionada.submission_date).toLocaleDateString('pt-BR')
        : '—';
    document.getElementById('detalheStatus').textContent = atividadeSelecionada.submission_status === 'APPROVED'
        ? 'Aprovada'
        : atividadeSelecionada.submission_status === 'REJECTED'
            ? 'Reprovada'
            : 'Pendente';
    document.getElementById('detalheEnviado').textContent = atividadeSelecionada.submission_uploaded_at
        ? new Date(atividadeSelecionada.submission_uploaded_at).toLocaleDateString('pt-BR')
        : atividadeSelecionada.submission_date
            ? new Date(atividadeSelecionada.submission_date).toLocaleDateString('pt-BR')
            : '—';

    const certificadoAnexo = document.getElementById('certificadoAnexo');
    if (atividadeSelecionada.certificate_file_path) {
        certificadoAnexo.innerHTML = `
            <a href="/uploads/${atividadeSelecionada.certificate_file_path}" target="_blank" class="certificado-link">
                <span>Ver certificado PDF</span>
            </a>`;
    } else {
        certificadoAnexo.textContent = 'Nenhum certificado anexado.';
    }
}

async function carregarProgressoCategorias() {
    const progressoCategoriasDetalhes = document.getElementById('progressoCategoriasDetalhes');
    try {
        const res = await fetch('/aluno/overview');
        if (!res.ok) throw new Error('Erro ao buscar progresso por categoria');
        const data = await res.json();

        const categorias = ['Pesquisa', 'Extensão', 'Ensino', 'Pesquisa IA'];
        const vendas = data.progresso_categoria || [];

        progressoCategoriasDetalhes.innerHTML = '';
        categorias.forEach(nome => {
            const item = vendas.find(c => c.category.toLowerCase() === nome.toLowerCase()) || { total: 0, aprovadas: 0 };
            progressoCategoriasDetalhes.innerHTML += `
                <div class="category-item">
                    <strong>Atividades vinculadas à ${nome}</strong>
                    <span>${item.aprovadas || 0} horas validadas</span>
                </div>`;
        });

        if (!data.progresso_categoria || !data.progresso_categoria.length) {
            progressoCategoriasDetalhes.innerHTML = '<p>Nenhuma categoria encontrada.</p>';
        }
    } catch (err) {
        console.error(err);
        progressoCategoriasDetalhes.innerHTML = '<p>Erro ao carregar progresso por categoria.</p>';
    }
}

function carregarNotificacoes() {
    const lista = document.getElementById('listaNotificacoesAluno');
    lista.innerHTML = notificacoesAluno.map(n => `
        <div class="notification-card">
            <div class="notification-card-title">${n.title}</div>
            <div class="notification-card-message">${n.message}</div>
            <div class="notification-card-time">${n.time}</div>
        </div>
    `).join('');
}

window.onload = () => mostrarSecao('visaoGeral');
