require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');

const db = require('./db');
const authRoutes = require('./routes/auth');

const {
    authMiddleware,
    adminOnly,
    coordinatorOnly,
    studentOnly
} = require('./middleware/auth');

const app = express();
const PORTA = Number(process.env.PORT || 3000);
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Verificar se SESSION_SECRET está definido
if (!process.env.SESSION_SECRET) {
    console.error('ERRO: SESSION_SECRET não está definido no arquivo .env');
    process.exit(1);
}

// =============================
// MIDDLEWARES
// =============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false
    }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path
            .basename(file.originalname, ext)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 60);

        cb(null, `${Date.now()}-${baseName}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const isPdf = ext === '.pdf' && file.mimetype === 'application/pdf';

        if (!isPdf) {
            return cb(new Error('Arquivo inválido. Envie somente PDF. Arquivos .jpeg, .jpg, .png e outros formatos não são permitidos.'));
        }

        cb(null, true);
    }
});

// =============================
// ROTA PRINCIPAL
// =============================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', async (req, res) => {
    try {
        await queryAsync('SELECT 1 AS ok');
        res.json({
            servidor: 'online',
            banco: 'conectado',
            horario_servidor: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({
            servidor: 'online',
            banco: 'erro',
            codigo: err.code || 'ERRO_DB',
            mensagem: 'Servidor abriu, mas não conseguiu conectar ao MySQL. Confira MySQL ligado, porta 3306 e .env.'
        });
    }
});

// =============================
// ROTAS AUTH
// =============================
app.use('/', authRoutes);

// =============================
// ROTA PROTEGIDA ADMIN
// =============================
app.get('/adm', authMiddleware, adminOnly, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'adm.html'));
});

// =============================
// ROTA PROTEGIDA COORDENADOR
// =============================
app.get('/coordenador', authMiddleware, coordinatorOnly, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'coordenador.html'));
});

// =============================
// ROTA PROTEGIDA ALUNO
// =============================
app.get('/aluno', authMiddleware, studentOnly, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'aluno.html'));
});

app.get('/aluno/overview', authMiddleware, studentOnly, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const students = await queryAsync('SELECT student_id, horas_adquiridas, curso_id FROM students WHERE user_id = ?', [userId]);
        if (!students.length) return res.status(404).json({ msg: 'Perfil de aluno não encontrado.' });

        const student = students[0];
        const course = (await queryAsync('SELECT nome, carga FROM courses WHERE id = ?', [student.curso_id]))[0] || {};

        const atividadesRecentes = await queryAsync(
            `SELECT submission_id, activity_title, category, requested_hours, submission_date, submission_status
             FROM submissions
             WHERE student_id = ?
             ORDER BY submission_date DESC
             LIMIT 5`,
            [student.student_id]
        );

        const progressoCategoria = await queryAsync(
            `SELECT IFNULL(category, 'Sem categoria') AS category,
                    COUNT(*) AS total,
                    SUM(submission_status = 'APPROVED') AS aprovadas
             FROM submissions
             WHERE student_id = ?
             GROUP BY IFNULL(category, 'Sem categoria')`,
            [student.student_id]
        );

        const horasAdquiridas = student.horas_adquiridas || 0;
        const meta = course.carga || 0;
        const percentual = meta ? Math.min(100, Math.round((horasAdquiridas / meta) * 100)) : 0;

        res.json({
            curso: course.nome || '—',
            horas_adquiridas: horasAdquiridas,
            meta,
            progresso_percentual: percentual,
            atividades_recentes: atividadesRecentes,
            progresso_categoria: progressoCategoria
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao carregar visão geral.' });
    }
});

app.get('/aluno/atividades', authMiddleware, studentOnly, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const students = await queryAsync('SELECT student_id FROM students WHERE user_id = ?', [userId]);
        if (!students.length) return res.status(404).json({ msg: 'Perfil de aluno não encontrado.' });

        const activities = await queryAsync(
            `SELECT submission_id, activity_title, category, requested_hours, submission_date, submission_status
             FROM submissions
             WHERE student_id = ?
             ORDER BY submission_date DESC`,
            [students[0].student_id]
        );

        res.json(activities);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao carregar atividades.' });
    }
});

app.get('/aluno/atividades/:id', authMiddleware, studentOnly, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const students = await queryAsync('SELECT student_id FROM students WHERE user_id = ?', [userId]);
        if (!students.length) return res.status(404).json({ msg: 'Perfil de aluno não encontrado.' });

        const activity = await queryAsync(
            `SELECT submission_id, activity_title, category, requested_hours, submission_date, submission_status, certificate_file_path
             FROM submissions
             WHERE submission_id = ? AND student_id = ?`,
            [req.params.id, students[0].student_id]
        );

        if (!activity.length) return res.status(404).json({ msg: 'Atividade não encontrada.' });
        res.json(activity[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao carregar detalhes da atividade.' });
    }
});

app.post('/aluno/atividades', authMiddleware, studentOnly, upload.single('certificate'), async (req, res) => {
    try {
        const userId = req.session.user.id;
        const students = await queryAsync('SELECT student_id, curso_id FROM students WHERE user_id = ?', [userId]);
        if (!students.length) return res.status(404).json({ msg: 'Perfil de aluno não encontrado.' });

        const { activity_title, category, requested_hours, submission_date } = req.body;
        const certificateFile = req.file;

        if (!activity_title || !category || !requested_hours || !submission_date || !certificateFile) {
            return res.status(400).json({ msg: 'Todos os campos são obrigatórios, incluindo o certificado em PDF.' });
        }

        const student = students[0];
        const sql = `
            INSERT INTO submissions (student_id, curso_id, activity_title, category, requested_hours, submission_date, certificate_file_path, submission_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `;

        db.query(sql, [student.student_id, student.curso_id, activity_title, category, parseInt(requested_hours, 10), submission_date, certificateFile.filename], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ msg: 'Erro ao salvar atividade.' });
            }
            res.json({ msg: 'Atividade enviada com sucesso!' });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: err.message || 'Erro ao enviar atividade.' });
    }
});

// =============================
// CRUD COORDENADORES
// =============================

// CRIAR COORDENADOR
app.post('/cadastrar-coordenador', authMiddleware, adminOnly, async (req, res) => {
    const { nome, email, senha } = req.body;
    const curso_id = parseInt(req.body.curso_id);

    if (!nome || !email || !senha || isNaN(curso_id)) {
        return res.status(400).json({ msg: 'Preencha todos os campos!' });
    }

    try {
        const bcrypt = require('bcrypt');
        const hashedSenha = await bcrypt.hash(senha, 10);

        const sqlUser = `
            INSERT INTO users (email, password_hash, role)
            VALUES (?, ?, 'COORDINATOR')
        `;

        db.query(sqlUser, [email, hashedSenha], (err, resultUser) => {
            if (err) {
                console.error('Erro ao criar usuário do coordenador:', err);
                return res.status(500).json({ msg: 'Erro ao salvar no banco.' });
            }

            const novoUserId = resultUser.insertId;

            const sqlCoord = `
                INSERT INTO coordinators (user_id, nome, email, curso_id)
                VALUES (?, ?, ?, ?)
            `;

            db.query(sqlCoord, [novoUserId, nome, email, curso_id], (err2) => {
                if (err2) {
                    console.error('Erro ao criar perfil do coordenador:', err2);
                    return res.status(500).json({ msg: 'Erro ao salvar perfil.' });
                }

                res.status(201).json({ msg: 'Coordenador cadastrado com sucesso!' });
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Erro interno no servidor.' });
    }
});

// LISTAR COORDENADORES (com nome do curso via JOIN)
app.get('/coordenadores', authMiddleware, adminOnly, (req, res) => {
    const sql = `
        SELECT 
            c.id AS id,
            c.nome AS nome,
            c.email AS email,
            co.nome AS curso
        FROM coordinators c
        LEFT JOIN courses co ON co.id = c.curso_id
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// EXCLUIR COORDENADOR
// CORREÇÃO: Usando 'c.id' no lugar de 'coordinator_id'
app.delete('/coordenadores/:id', authMiddleware, adminOnly, (req, res) => {
    const sqlBusca = 'SELECT user_id FROM coordinators WHERE id = ?';

    db.query(sqlBusca, [req.params.id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ msg: 'Coordenador não encontrado.' });
        }

        const userId = results[0].user_id;

        db.query('DELETE FROM coordinators WHERE id = ?', [req.params.id], (err2) => {
            if (err2) return res.status(500).json(err2);

            db.query('DELETE FROM users WHERE user_id = ?', [userId], (err3) => {
                if (err3) return res.status(500).json(err3);
                res.json({ msg: 'Coordenador excluído com sucesso!' });
            });
        });
    });
});

// =============================
// CRUD CURSOS
// =============================

app.post('/cursos', authMiddleware, adminOnly, (req, res) => {
    const { nome, carga } = req.body;

    if (!nome || !carga) {
        return res.status(400).json({ msg: 'Preencha todos os campos!' });
    }

    const sql = `INSERT INTO courses (nome, carga) VALUES (?, ?)`;

    db.query(sql, [nome, carga], (err) => {
        if (err) {
            console.error('Erro detalhado do MySQL:', err);
            return res.status(500).json({ msg: 'Erro ao salvar curso. Verifique a conexão com o banco.' });
        }
        res.status(201).json({ msg: 'Curso cadastrado com sucesso!' });
    });
});

app.get('/cursos', authMiddleware, (req, res) => {
    const sql = `SELECT id, nome, carga FROM courses`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.delete('/cursos/:id', authMiddleware, adminOnly, (req, res) => {
    db.query('DELETE FROM courses WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ msg: 'Curso excluído com sucesso!' });
    });
});

// =============================
// CRUD REGRAS DE ATIVIDADE
// CORREÇÃO: Essas rotas estavam completamente ausentes no backend!
// =============================

// CRIAR REGRA
app.post('/regras', authMiddleware, adminOnly, (req, res) => {
    const { curso_id, categoria, carga_horaria } = req.body;

    if (!curso_id || !categoria || !carga_horaria) {
        return res.status(400).json({ msg: 'Preencha todos os campos da regra!' });
    }

    const sql = `INSERT INTO regras_atividades (curso_id, categoria, carga_horaria) VALUES (?, ?, ?)`;

    db.query(sql, [curso_id, categoria, carga_horaria], (err) => {
        if (err) {
            console.error('Erro ao salvar regra:', err);
            return res.status(500).json({ msg: 'Erro ao salvar regra no banco.' });
        }
        res.status(201).json({ msg: 'Regra cadastrada com sucesso!' });
    });
});

// LISTAR REGRAS (com nome do curso via JOIN)
app.get('/regras', authMiddleware, adminOnly, (req, res) => {
    const sql = `
        SELECT
            r.id,
            c.nome AS nome_curso,
            r.categoria,
            r.carga_horaria
        FROM regras_atividades r
        JOIN courses c ON c.id = r.curso_id
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// EXCLUIR REGRA
app.delete('/regras/:id', authMiddleware, adminOnly, (req, res) => {
    db.query('DELETE FROM regras_atividades WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ msg: 'Regra excluída com sucesso!' });
    });
});

// =============================
// USUÁRIOS E RELATÓRIOS
function queryAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

app.get('/usuarios', authMiddleware, adminOnly, (req, res) => {
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const filterSqlCoordenador = search ? `WHERE (c.nome LIKE ? OR c.email LIKE ? OR co.nome LIKE ? OR u.role LIKE ?)` : '';
    const filterSqlAluno = search ? `WHERE (s.nome LIKE ? OR s.email LIKE ? OR co.nome LIKE ? OR u.role LIKE ?)` : '';
    const sql = `
        SELECT u.user_id AS id, c.nome, c.email, u.role, co.nome AS curso, 'Coordenador' AS tipo
        FROM coordinators c
        JOIN users u ON u.user_id = c.user_id
        LEFT JOIN courses co ON co.id = c.curso_id
        ${filterSqlCoordenador}
        UNION ALL
        SELECT u.user_id AS id, s.nome, s.email, u.role, co.nome AS curso, 'Aluno' AS tipo
        FROM students s
        JOIN users u ON u.user_id = s.user_id
        LEFT JOIN courses co ON co.id = s.curso_id
        ${filterSqlAluno}
        ORDER BY tipo DESC, nome
    `;
    const params = search ? [search, search, search, search, search, search, search, search] : [];

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Erro ao buscar usuários:', err);
            return res.status(500).json({ msg: 'Erro ao buscar usuários.' });
        }
        res.json(results);
    });
});

app.get('/relatorios', authMiddleware, adminOnly, async (req, res) => {
    try {
        const totalAlunos = (await queryAsync('SELECT COUNT(*) AS total_alunos FROM students'))[0].total_alunos || 0;
        const totalCoordenadores = (await queryAsync('SELECT COUNT(*) AS total_coordenadores FROM coordinators'))[0].total_coordenadores || 0;
        const totalCursos = (await queryAsync('SELECT COUNT(*) AS total_cursos FROM courses'))[0].total_cursos || 0;
        const totalAtividades = (await queryAsync('SELECT COUNT(*) AS total_atividades FROM submissions'))[0].total_atividades || 0;

        const resumo = { total_alunos: totalAlunos, total_coordenadores: totalCoordenadores, total_cursos: totalCursos, total_atividades: totalAtividades };
        const cursoId = req.query.curso_id;
        let cursoDetalhe = null;
        let progresso = [];

        if (cursoId) {
            const alunosCurso = (await queryAsync('SELECT COUNT(*) AS alunos FROM students WHERE curso_id = ?', [cursoId]))[0].alunos || 0;
            const enviadas = (await queryAsync('SELECT COUNT(*) AS enviadas FROM submissions WHERE curso_id = ?', [cursoId]))[0].enviadas || 0;
            const aprovadas = (await queryAsync('SELECT COUNT(*) AS aprovadas FROM submissions WHERE curso_id = ? AND submission_status = ?', [cursoId, 'APPROVED']))[0].aprovadas || 0;
            const reprovadas = (await queryAsync('SELECT COUNT(*) AS reprovadas FROM submissions WHERE curso_id = ? AND submission_status = ?', [cursoId, 'REJECTED']))[0].reprovadas || 0;

            cursoDetalhe = { alunos: alunosCurso, enviadas, aprovadas, reprovadas };
            const alunos = await queryAsync(`SELECT s.nome, s.horas_adquiridas, c.carga AS meta FROM students s JOIN courses c ON c.id = s.curso_id WHERE s.curso_id = ?`, [cursoId]);

            progresso = alunos.map(item => {
                const horas = item.horas_adquiridas || 0;
                const meta = item.meta || 0;
                const porcentagem = meta ? Math.min(100, Math.round((horas / meta) * 100)) : 0;
                return { nome: item.nome, horas_adquiridas: horas, meta, porcentagem };
            });
        }

        res.json({ resumo, cursoDetalhe, progresso });
    } catch (err) {
        console.error('Erro no relatório:', err);
        res.status(500).json({ msg: 'Erro ao gerar relatório.' });
    }
});

app.get('/metricas', authMiddleware, coordinatorOnly, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const cursoRow = await queryAsync(
            `SELECT c.curso_id, co.nome AS curso_nome
             FROM coordinators c
             LEFT JOIN courses co ON co.id = c.curso_id
             WHERE c.user_id = ?`,
            [userId]
        );

        if (!cursoRow.length || !cursoRow[0].curso_id) {
            return res.json({});
        }

        const cursoId = cursoRow[0].curso_id;
        const cursoNome = cursoRow[0].curso_nome || 'Sem curso';
        const alunos = (await queryAsync('SELECT COUNT(*) AS quantidade FROM students WHERE curso_id = ?', [cursoId]))[0].quantidade || 0;
        const enviadas = (await queryAsync('SELECT COUNT(*) AS quantidade FROM submissions WHERE curso_id = ?', [cursoId]))[0].quantidade || 0;
        const aprovadas = (await queryAsync('SELECT COUNT(*) AS quantidade FROM submissions WHERE curso_id = ? AND submission_status = ?', [cursoId, 'APPROVED']))[0].quantidade || 0;
        const aprovacoesPercentual = enviadas ? Math.round((aprovadas / enviadas) * 100) : 0;

        res.json({
            curso: cursoNome,
            alunos,
            enviadas,
            aprovadas,
            aprovacoes_percentual: aprovacoesPercentual
        });
    } catch (err) {
        console.error('Erro ao buscar métricas do coordenador:', err);
        res.status(500).json({ msg: 'Erro ao buscar métricas.' });
    }
});

// =============================
// MÉTRICAS POR CURSO (TODOS OS CURSOS)
// =============================
app.get('/metricas-todos', authMiddleware, coordinatorOnly, async (req, res) => {
    try {
        const cursos = await queryAsync('SELECT id, nome FROM courses ORDER BY nome ASC');
        
        const metricasCursos = await Promise.all(
            cursos.map(async (curso) => {
                const alunos = (await queryAsync('SELECT COUNT(*) AS quantidade FROM students WHERE curso_id = ?', [curso.id]))[0].quantidade || 0;
                const enviadas = (await queryAsync('SELECT COUNT(*) AS quantidade FROM submissions WHERE curso_id = ?', [curso.id]))[0].quantidade || 0;
                const aprovadas = (await queryAsync('SELECT COUNT(*) AS quantidade FROM submissions WHERE curso_id = ? AND submission_status = ?', [curso.id, 'APPROVED']))[0].quantidade || 0;
                const aprovacoesPercentual = enviadas ? Math.round((aprovadas / enviadas) * 100) : 0;

                return {
                    id: curso.id,
                    nome: curso.nome,
                    alunos,
                    enviadas,
                    aprovadas,
                    aprovacoes_percentual: aprovacoesPercentual
                };
            })
        );

        res.json(metricasCursos);
    } catch (err) {
        console.error('Erro ao buscar métricas de todos os cursos:', err);
        res.status(500).json({ msg: 'Erro ao buscar métricas.' });
    }
});

// =============================
// MEUS CURSOS
// =============================
app.get('/meus-cursos', authMiddleware, coordinatorOnly, (req, res) => {
    const userId = req.session.user.id;

    // Passo 1: busca o curso_id do coordenador logado
    db.query('SELECT curso_id FROM coordinators WHERE user_id = ?', [userId], (err, rows) => {
        if (err) return res.status(500).json({ msg: 'Erro ao buscar perfil do coordenador.' });
        if (!rows.length || !rows[0].curso_id) {
            // Coordenador sem curso vinculado — retorna lista vazia
            return res.json([]);
        }

        const cursoId = rows[0].curso_id;

        // Passo 2: busca os dados do curso pelo ID
        db.query('SELECT id, nome, carga FROM courses WHERE id = ?', [cursoId], (err2, cursos) => {
            if (err2) return res.status(500).json({ msg: 'Erro ao buscar curso.' });
            res.json(cursos);
        });
    });
});

// =============================
// CRUD ALUNOS
// =============================

app.post('/alunos', authMiddleware, coordinatorOnly, async (req, res) => {
    const { nome, email, curso_id, horas_adquiridas } = req.body;
    const senha = req.body.senha || email;

    if (!nome || !email || !curso_id) {
        return res.status(400).json({ msg: 'Preencha todos os campos!' });
    }

    try {
        const bcrypt = require('bcrypt');
        const hashedSenha = await bcrypt.hash(senha, 10);

        const sqlUser = `INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'STUDENT')`;

        db.query(sqlUser, [email, hashedSenha], (err, resultUser) => {
            if (err) {
                console.error('Erro ao criar usuário do aluno:', err);
                return res.status(500).json({ msg: 'Erro ao salvar no banco.' });
            }

            const novoUserId = resultUser.insertId;
            const horas = parseInt(horas_adquiridas) || 0;

            const sqlAluno = `INSERT INTO students (user_id, nome, email, curso_id, horas_adquiridas) VALUES (?, ?, ?, ?, ?)`;

            db.query(sqlAluno, [novoUserId, nome, email, curso_id, horas], (err2) => {
                if (err2) {
                    console.error('Erro ao criar perfil do aluno:', err2);
                    return res.status(500).json({ msg: 'Erro ao salvar perfil.' });
                }
                res.status(201).json({ msg: 'Aluno cadastrado com sucesso!' });
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Erro interno no servidor.' });
    }
});

// LISTAR ALUNOS (do mesmo curso do coordenador logado)
app.get('/alunos', authMiddleware, coordinatorOnly, (req, res) => {
    const userId = req.session.user.id;

    db.query('SELECT curso_id FROM coordinators WHERE user_id = ?', [userId], (err, rows) => {
        if (err) return res.status(500).json(err);
        if (!rows.length || !rows[0].curso_id) return res.json([]);

        const cursoId = rows[0].curso_id;
        const sql = `
            SELECT
                s.student_id AS id,
                s.nome AS nome,
                s.email AS email,
                co.nome AS curso,
                s.horas_adquiridas
            FROM students s
            LEFT JOIN courses co ON co.id = s.curso_id
            WHERE s.curso_id = ?
        `;
        db.query(sql, [cursoId], (err2, results) => {
            if (err2) return res.status(500).json(err2);
            res.json(results);
        });
    });
});

// EXCLUIR ALUNO
app.delete('/alunos/:id', authMiddleware, coordinatorOnly, (req, res) => {
    const sqlBusca = 'SELECT user_id FROM students WHERE student_id = ?';
    db.query(sqlBusca, [req.params.id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ msg: 'Aluno não encontrado.' });
        }
        const userId = results[0].user_id;
        db.query('DELETE FROM students WHERE student_id = ?', [req.params.id], (err2) => {
            if (err2) return res.status(500).json(err2);
            db.query('DELETE FROM users WHERE user_id = ?', [userId], (err3) => {
                if (err3) return res.status(500).json(err3);
                res.json({ msg: 'Aluno excluído com sucesso!' });
            });
        });
    });
});

// =============================
// ATIVIDADES (submissions)
// =============================

// LISTAR só as PENDENTES
app.get('/atividades/pendentes', authMiddleware, coordinatorOnly, (req, res) => {
    const userId = req.session.user.id;

    db.query('SELECT curso_id FROM coordinators WHERE user_id = ?', [userId], (err, rows) => {
        if (err) return res.status(500).json(err);
        if (!rows.length || !rows[0].curso_id) return res.json([]);

        const cursoId = rows[0].curso_id;
        const sql = `
            SELECT
                sub.submission_id,
                s.nome AS aluno,
                sub.activity_title,
                sub.submission_date,
                sub.requested_hours,
                sub.certificate_file_path
            FROM submissions sub
            INNER JOIN students s ON s.student_id = sub.student_id
            WHERE sub.curso_id = ? AND sub.submission_status = 'PENDING'
            ORDER BY sub.submission_date DESC
        `;
        db.query(sql, [cursoId], (err2, results) => {
            if (err2) return res.status(500).json(err2);
            res.json(results);
        });
    });
});

// LISTAR TODAS as atividades do curso do coordenador
app.get('/atividades', authMiddleware, coordinatorOnly, (req, res) => {
    const userId = req.session.user.id;

    db.query('SELECT curso_id FROM coordinators WHERE user_id = ?', [userId], (err, rows) => {
        if (err) return res.status(500).json(err);
        if (!rows.length || !rows[0].curso_id) return res.json([]);

        const cursoId = rows[0].curso_id;
        const sql = `
            SELECT
                sub.submission_id,
                s.nome AS aluno,
                sub.activity_title,
                sub.submission_status,
                sub.submission_date,
                sub.requested_hours,
                sub.certificate_file_path
            FROM submissions sub
            INNER JOIN students s ON s.student_id = sub.student_id
            WHERE sub.curso_id = ?
            ORDER BY sub.submission_date DESC
        `;
        db.query(sql, [cursoId], (err2, results) => {
            if (err2) return res.status(500).json(err2);
            res.json(results);
        });
    });
});

// APROVAR ou REPROVAR uma atividade
app.patch('/atividades/:id/status', authMiddleware, coordinatorOnly, (req, res) => {
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ msg: 'Status inválido.' });
    }

    db.query(
        `SELECT submission_status, requested_hours, student_id, approved_hours FROM submissions WHERE submission_id = ?`,
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json(err);
            if (!rows.length) return res.status(404).json({ msg: 'Atividade não encontrada.' });

            const submission = rows[0];
            const currentStatus = submission.submission_status;
            const horas = submission.requested_hours || 0;
            const approvedHours = submission.approved_hours || 0;
            const studentId = submission.student_id;

            const needsStudentUpdate = status === 'APPROVED' && currentStatus !== 'APPROVED';
            const needsStudentRevert = status === 'REJECTED' && currentStatus === 'APPROVED';

            const updateSubmission = () => {
                const approvedValue = status === 'APPROVED' ? horas : null;
                const sql = `
                    UPDATE submissions
                    SET submission_status = ?,
                        approved_hours = ?
                    WHERE submission_id = ?
                `;
                db.query(sql, [status, approvedValue, req.params.id], (err2) => {
                    if (err2) return res.status(500).json(err2);
                    res.json({ msg: 'Status atualizado com sucesso!' });
                });
            };

            if (needsStudentUpdate) {
                db.query(
                    'UPDATE students SET horas_adquiridas = horas_adquiridas + ? WHERE student_id = ?',
                    [horas, studentId],
                    (err3) => {
                        if (err3) return res.status(500).json(err3);
                        updateSubmission();
                    }
                );
            } else if (needsStudentRevert) {
                db.query(
                    'UPDATE students SET horas_adquiridas = GREATEST(horas_adquiridas - ?, 0) WHERE student_id = ?',
                    [approvedHours, studentId],
                    (err3) => {
                        if (err3) return res.status(500).json(err3);
                        updateSubmission();
                    }
                );
            } else {
                updateSubmission();
            }
        }
    );
});

// =============================
// LOGOUT
// =============================
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// =============================
// TRATAMENTO DE ERROS DE UPLOAD
// =============================
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message?.includes('Arquivo inválido')) {
        return res.status(400).json({ msg: err.message });
    }

    return next(err);
});

// =============================
// INICIAR SERVIDOR
// =============================
app.listen(PORTA, () => {
    console.log(`Servidor rodando em http://localhost:${PORTA}`);
});