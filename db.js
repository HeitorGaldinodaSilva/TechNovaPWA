require('dotenv').config();
const mysql = require('mysql2');

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'TechNova',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

pool.getConnection((err, connection) => {
    if (err) {
        console.error('\n[DB] Não foi possível conectar ao MySQL.');
        console.error(`[DB] Host: ${dbConfig.host} | Porta: ${dbConfig.port} | Banco: ${dbConfig.database}`);
        console.error('[DB] Confira se o MySQL está ligado e se o arquivo .env está correto.');
        console.error(`[DB] Erro original: ${err.code || err.message}\n`);
        return;
    }

    console.log(`[DB] Conectado ao banco ${dbConfig.database} em ${dbConfig.host}:${dbConfig.port}`);
    connection.release();
});

module.exports = pool;
