const express = require('express');
const router = express.Router();
const pool = require('../../db');
const { dataBR, dataValida } = require('../../utils/date');
const { autenticar } = require('../../utils/auth');

// Todas as rotas de reservas exigem login
router.use(autenticar);

const SELECT_RESERVAS = `
    SELECT r.id, r.usuario_id, u.nome AS usuario_nome,
           r.quadra_id, q.nome AS quadra_nome, q.modalidade,
           to_char(r.data, 'YYYY-MM-DD') AS data_iso, r.data,
           to_char(r.hora_inicio, 'HH24:MI') AS hora_inicio,
           to_char(r.hora_fim, 'HH24:MI') AS hora_fim,
           r.status, r.valor_total
    FROM reservas r
    JOIN usuarios u ON u.id = r.usuario_id
    JOIN quadras q ON q.id = r.quadra_id`;

function formatar(r) {
    return {
        id: r.id,
        usuarioId: r.usuario_id,
        usuarioNome: r.usuario_nome,
        quadraId: r.quadra_id,
        quadraNome: r.quadra_nome,
        modalidade: r.modalidade,
        data: r.data_iso,
        dataBR: dataBR(r.data),
        horaInicio: r.hora_inicio,
        horaFim: r.hora_fim,
        status: r.status,
        valorTotal: Number(r.valor_total)
    };
}

// Busca uma reserva e confere se o usuário logado pode mexer nela
async function buscarPermitida(req, res) {
    const { rows } = await pool.query(SELECT_RESERVAS + ' WHERE r.id = $1', [req.params.id]);
    if (rows.length === 0) {
        res.status(404).json({ erro: 'Reserva não encontrada.' });
        return null;
    }
    if (req.usuario.perfil !== 'admin' && rows[0].usuario_id !== req.usuario.id) {
        res.status(403).json({ erro: 'Você não tem permissão para acessar esta reserva.' });
        return null;
    }
    return rows[0];
}

// GET /api/reservas?data=&quadraId=&usuarioId=&status=
// Admin vê todas; cliente vê apenas as próprias.
router.get('/', async (req, res) => {
    try {
        const condicoes = [];
        const valores = [];
        const { data, quadraId, usuarioId, status } = req.query;

        if (req.usuario.perfil !== 'admin') {
            valores.push(req.usuario.id);
            condicoes.push('r.usuario_id = $' + valores.length);
        } else if (usuarioId) {
            valores.push(usuarioId);
            condicoes.push('r.usuario_id = $' + valores.length);
        }
        if (data) {
            if (!dataValida(data)) return res.status(400).json({ erro: 'Data inválida. Use AAAA-MM-DD.' });
            valores.push(data);
            condicoes.push('r.data = $' + valores.length);
        }
        if (quadraId) {
            valores.push(quadraId);
            condicoes.push('r.quadra_id = $' + valores.length);
        }
        if (status) {
            if (!['ativa', 'cancelada'].includes(status)) return res.status(400).json({ erro: 'Status inválido.' });
            valores.push(status);
            condicoes.push('r.status = $' + valores.length);
        }

        const where = condicoes.length ? ' WHERE ' + condicoes.join(' AND ') : '';
        const { rows } = await pool.query(
            SELECT_RESERVAS + where + ' ORDER BY r.data DESC, r.hora_inicio DESC',
            valores
        );
        res.json(rows.map(formatar));
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// GET /api/reservas/minhas  (histórico do próprio usuário)
router.get('/minhas', async (req, res) => {
    try {
        const { rows } = await pool.query(
            SELECT_RESERVAS + ' WHERE r.usuario_id = $1 ORDER BY r.data DESC, r.hora_inicio DESC',
            [req.usuario.id]
        );
        res.json(rows.map(formatar));
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// GET /api/reservas/:id
router.get('/:id', async (req, res) => {
    try {
        const reserva = await buscarPermitida(req, res);
        if (reserva) res.json(formatar(reserva));
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

module.exports = router;
