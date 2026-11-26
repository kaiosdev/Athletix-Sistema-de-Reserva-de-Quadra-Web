const express = require('express');
const router = express.Router();
const pool = require('../../db');
const { dataBR } = require('../../utils/date');
const { autenticar, exigirAdmin } = require('../../utils/auth');

// Todas as rotas de usuários são restritas ao administrador
router.use(autenticar, exigirAdmin);

function formatar(u) {
    return {
        id: u.id,
        nome: u.nome,
        email: u.email,
        perfil: u.perfil,
        dataCadastro: dataBR(u.data_cadastro)
    };
}

// GET /api/usuarios
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, nome, email, perfil, data_cadastro FROM usuarios ORDER BY nome'
        );
        res.json(rows.map(formatar));
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// POST /api/usuarios
router.post('/', async (req, res) => {
    try {
        const { nome, email, senha, perfil } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
        }
        if (String(senha).length < 6) {
            return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
        }
        if (perfil && !['cliente', 'admin'].includes(perfil)) {
            return res.status(400).json({ erro: 'Perfil inválido.' });
        }
        const { rows } = await pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash, perfil)
             VALUES ($1, $2, crypt($3, gen_salt('bf')), $4)
             RETURNING id, nome, email, perfil, data_cadastro`,
            [nome.trim(), email.trim().toLowerCase(), String(senha), perfil || 'cliente']
        );
        res.status(201).json(formatar(rows[0]));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
        }
        res.status(500).json({ erro: err.message });
    }
});

// PUT /api/usuarios/:id  (senha opcional)
router.put('/:id', async (req, res) => {
    try {
        const { nome, email, senha, perfil } = req.body;
        if (!nome || !email || !perfil) {
            return res.status(400).json({ erro: 'Nome, e-mail e perfil são obrigatórios.' });
        }
        if (!['cliente', 'admin'].includes(perfil)) {
            return res.status(400).json({ erro: 'Perfil inválido.' });
        }
        // Evita que o admin remova o próprio acesso de administrador
        if (Number(req.params.id) === req.usuario.id && perfil !== 'admin') {
            return res.status(400).json({ erro: 'Você não pode remover seu próprio perfil de administrador.' });
        }
        if (senha && String(senha).length < 6) {
            return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
        }
        // Sem nova senha, crypt recebe NULL e o COALESCE mantém o hash atual
        const { rows } = await pool.query(
            `UPDATE usuarios
             SET nome = $1, email = $2, perfil = $3,
                 senha_hash = COALESCE(crypt($4::text, gen_salt('bf')), senha_hash)
             WHERE id = $5
             RETURNING id, nome, email, perfil, data_cadastro`,
            [nome.trim(), email.trim().toLowerCase(), perfil, senha ? String(senha) : null, req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        res.json(formatar(rows[0]));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
        }
        res.status(500).json({ erro: err.message });
    }
});

// DELETE /api/usuarios/:id
router.delete('/:id', async (req, res) => {
    try {
        if (Number(req.params.id) === req.usuario.id) {
            return res.status(400).json({ erro: 'Você não pode excluir a própria conta.' });
        }
        const { rowCount } = await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        if (rowCount === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

module.exports = router;
