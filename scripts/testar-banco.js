require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

const tabelas = ['users', 'courses', 'coordinators', 'students', 'regras_atividades', 'submissions'];

async function testarBanco() {
    try {
        db.query('SELECT DATABASE() AS banco, NOW() AS horario_servidor', (err, rows) => {
            if (err) {
                console.error('Erro ao conectar no banco:', err.message);
                process.exit(1);
            }

            console.log('Banco conectado:', rows[0].banco);
            console.log('Horário do servidor MySQL:', rows[0].horario_servidor);

            let pendentes = tabelas.length;
            tabelas.forEach((tabela) => {
                db.query(`SELECT COUNT(*) AS total FROM ${tabela}`, (erroTabela, resultado) => {
                    if (erroTabela) {
                        console.error(`Tabela ${tabela}: ERRO - ${erroTabela.message}`);
                    } else {
                        console.log(`Tabela ${tabela}: ${resultado[0].total} registro(s)`);
                    }

                    pendentes -= 1;
                    if (pendentes === 0) process.exit(0);
                });
            });
        });
    } catch (error) {
        console.error('Erro inesperado:', error.message);
        process.exit(1);
    }
}

testarBanco();
