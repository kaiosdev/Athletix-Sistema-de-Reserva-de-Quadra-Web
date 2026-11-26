const express = require('express');
const router = express.Router();
const pool = require('../../db');
const { dataValida } = require('../../utils/date');
const { autenticar, exigirAdmin } = require('../../utils/auth');

function formatar(q) {
    return {
        id: q.id,
        nome: q.nome,
        modalidade: q.modalidade,
        tamanho: q.tamanho,
        valorHora: Number(q.valor_hora),
        descricao: q.descricao
    };
}

// Valida os campos de uma quadra; retorna mensagem de erro ou null
function validar(body) {
    const { nome, modalidade, valorHora } = body;
    if (!nome || !modalidade || valorHora === undefined || valorHora === '') {
        return 'Nome, modalidade e valor por hora são obrigatórios.';
    }
    if (isNaN(Number(valorHora)) || Number(valorHora) < 0) {
        return 'O valor por hora deve ser um número maior ou igual a zero.';
    }
    return null;
}

// GET /api/quadras  (qualquer usuário logado)
router.get('/', autenticar, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM quadras ORDER BY nome');
        res.json(rows.map(formatar));
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// GET /api/quadras/:id/disponibilidade?data=AAAA-MM-DD
// Retorna os períodos já ocupados da quadra na data informada
router.get('/:id/disponibilidade', autenticar, async (req, res) => {
    try {
        const { data } = req.query;
        if (!data || !dataValida(data)) {
            return res.status(400).json({ erro: 'Informe a data no formato AAAA-MM-DD.' });
        }
        const quadra = await pool.query('SELECT id FROM quadras WHERE id = $1', [req.params.id]);
        if (quadra.rows.length === 0) return res.status(404).json({ erro: 'Quadra não encontrada.' });

        const { rows } = await pool.query(
            `SELECT to_char(hora_inicio, 'HH24:MI') AS inicio, to_char(hora_fim, 'HH24:MI') AS fim
             FROM reservas
             WHERE quadra_id = $1 AND data = $2 AND status = 'ativa'
             ORDER BY hora_inicio`,
            [req.params.id, data]
        );
        res.json({ quadraId: Number(req.params.id), data, ocupados: rows });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// GET /api/quadras/:id
router.get('/:id', autenticar, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM quadras WHERE id = $1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ erro: 'Quadra não encontrada.' });
        res.json(formatar(rows[0]));
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// POST /api/quadras  (admin)
router.post('/', autenticar, exigirAdmin, async (req, res) => {
    try {
        const erro = validar(req.body);
        if (erro) return res.status(400).json({ erro });
        const { nome, modalidade, tamanho, valorHora, descricao } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO quadras (nome, modalidade, tamanho, valor_hora, descricao)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [nome.trim(), modalidade.trim(), tamanho || null, valorHora, descricao || null]
        );
        res.status(201).json(formatar(rows[0]));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ erro: 'Já existe uma quadra com este nome.' });
        }
        res.status(500).json({ erro: err.message });
    }
});

// PUT /api/quadras/:id  (admin)
router.put('/:id', autenticar, exigirAdmin, async (req, res) => {
    try {
        const erro = validar(req.body);
        if (erro) return res.status(400).json({ erro });
        const { nome, modalidade, tamanho, valorHora, descricao } = req.body;
        const { rows } = await pool.query(
            `UPDATE quadras SET nome = $1, modalidade = $2, tamanho = $3, valor_hora = $4, descricao = $5
             WHERE id = $6 RETURNING *`,
            [nome.trim(), modalidade.trim(), tamanho || null, valorHora, descricao || null, req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ erro: 'Quadra não encontrada.' });
        res.json(formatar(rows[0]));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ erro: 'Já existe uma quadra com este nome.' });
        }
        res.status(500).json({ erro: err.message });
    }
});

// DELETE /api/quadras/:id  (admin)
router.delete('/:id', autenticar, exigirAdmin, async (req, res) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM quadras WHERE id = $1', [req.params.id]);
        if (rowCount === 0) return res.status(404).json({ erro: 'Quadra não encontrada.' });
        res.json({ ok: true });
    } catch (err) {
        // 23001 = restrict_violation (ON DELETE RESTRICT); 23503 = foreign_key_violation
        if (err.code === '23001' || err.code === '23503') {
            return res.status(409).json({ erro: 'Não é possível excluir: existem reservas para esta quadra.' });
        }
        res.status(500).json({ erro: err.message });
    }
});

module.exports = router;
