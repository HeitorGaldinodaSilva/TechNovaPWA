const bcrypt = require('bcrypt');
const db = require('./db');

async function criarAdmin() {
    // Definimos os admins que queremos criar
    const admins = [
        { email: 'marcus345@gmail.com', senha: 'senha' },
        { email: 'bruno53@gmail.com', senha: 'senha' } // Agora com hash!
    ];

    const role = 'ADMIN';

    for (const admin of admins) {
        try {
            // Cria o hash da senha (o "segredo" para o login funcionar)
            const hash = await bcrypt.hash(admin.senha, 10);

            const sql = `
                INSERT INTO users 
                (email, password_hash, role) 
                VALUES (?, ?, ?)
            `;

            db.query(sql, [admin.email, hash, role], (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        console.log(`⚠️ O admin ${admin.email} já existe.`);
                    } else {
                        console.log(`❌ Erro ao criar ${admin.email}:`, err.message);
                    }
                    return;
                }
                console.log(`✅ ADMIN ${admin.email} criado com sucesso!`);
            });

        } catch (error) {
            console.log(`Erro ao processar senha de ${admin.email}`);
        }
    }
}

criarAdmin();