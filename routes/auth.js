const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ msg: 'Email e senha são obrigatórios.' });
    }

    const sql = 'SELECT user_id, email, password_hash, role FROM users WHERE email = ?';

    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error('Erro ao buscar usuário:', err);
            return res.status(500).json({ msg: 'Erro interno ao buscar usuário.' });
        }

        if (!results.length) {
            return res.redirect('/?error=invalid_credentials');
        }

        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.redirect('/?error=invalid_credentials');
        }

        req.session.user = {
            id: user.user_id,
            email: user.email,
            role: user.role
        };

        const role = (user.role || '').toUpperCase();
        if (role === 'ADMIN') {
            return res.redirect('/adm');
        }
        if (role === 'COORDINATOR') {
            return res.redirect('/coordenador');
        }
        if (role === 'STUDENT') {
            return res.redirect('/aluno');
        }

        return res.redirect('/?error=role_invalido');
    });
});

module.exports = router;
