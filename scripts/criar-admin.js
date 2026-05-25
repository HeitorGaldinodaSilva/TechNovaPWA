require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const db = require('../db');

async function criarAdmin() {
    const admin = {
        nome: 'Administrador TechNova',
        email: process.env.ADMIN_EMAIL || 'admin@technova.com.br',
        senha: process.env.ADMIN_PASSWORD || 'admin123'
    };

    try {
        const hash = await bcrypt.hash(admin.senha, 10);

        const sql = `
            INSERT INTO users (email, password_hash, role)
            VALUES (?, ?, 'ADMIN')
            ON DUPLICATE KEY UPDATE
                password_hash = VALUES(password_hash),
                role = 'ADMIN'
        `;

        db.query(sql, [admin.email, hash], (err) => {
            if (err) {
                console.error('Erro ao criar/atualizar admin:', err.message);
                process.exit(1);
            }

            console.log(`Admin pronto: ${admin.email}`);
            console.log(`Senha definida: ${admin.senha}`);
            process.exit(0);
        });
    } catch (error) {
        console.error('Erro ao gerar hash da senha:', error.message);
        process.exit(1);
    }
}

criarAdmin();
