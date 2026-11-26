const express = require('express');
const router = express.Router();
const pool = require('../../db');
const { autenticar, lerToken } = require('../../utils/auth');

function formatarUsuario(u) {
    return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil };
}

// Cria uma sessão no banco e retorna o token gerado
async function criarSessao(usuarioId) {
    const { rows } = await pool.query(
        'INSERT INTO sessoes (usuario_id) VALUES ($1) RETURNING token',
        [usuarioId]
    );
    return rows[0].token;
}

// POST /api/auth/cadastro  (sempre cria perfil "cliente")
router.post('/cadastro', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ erro: 'E-mail inválido.' });
        }
        if (String(senha).length < 6) {
            return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
        }
        // crypt + gen_salt: a senha é gravada como hash, nunca em texto puro
        const { rows } = await pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash)
             VALUES ($1, $2, crypt($3, gen_salt('bf')))
             RETURNING id, nome, email, perfil`,
            [nome.trim(), email.trim().toLowerCase(), String(senha)]
        );
        const token = await criarSessao(rows[0].id);
        res.status(201).json({ token, usuario: formatarUsuario(rows[0]) });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
        }
        res.status(500).json({ erro: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
        }
        // crypt com o hash salvo reproduz o mesmo hash se a senha estiver correta
        const { rows } = await pool.query(
            `SELECT id, nome, email, perfil FROM usuarios
             WHERE email = $1 AND senha_hash = crypt($2, senha_hash)`,
            [email.trim().toLowerCase(), String(senha)]
        );
        if (rows.length === 0) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
        const token = await criarSessao(rows[0].id);
        res.json({ token, usuario: formatarUsuario(rows[0]) });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// POST /api/auth/logout
router.post('/logout', autenticar, async (req, res) => {
    try {
        await pool.query('DELETE FROM sessoes WHERE token = $1', [lerToken(req)]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// GET /api/auth/me
router.get('/me', autenticar, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, nome, email, perfil FROM usuarios WHERE id = $1', [req.usuario.id]);
        if (rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        res.json(formatarUsuario(rows[0]));
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

module.exports = router;
