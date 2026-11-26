const express = require('express');
const router = express.Router();
const pool = require('../../db');
const { dataBR, paraMinutos, horaValida, dataValida, hoje } = require('../../utils/date');
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

// Valida data/horários; retorna mensagem de erro ou null
function validarPeriodo({ data, horaInicio, horaFim }) {
    if (!data || !horaInicio || !horaFim) {
        return 'Data, horário de início e horário de fim são obrigatórios.';
    }
    if (!dataValida(data)) return 'Data inválida. Use o formato AAAA-MM-DD.';
    if (!horaValida(horaInicio) || !horaValida(horaFim)) return 'Horário inválido. Use o formato HH:MM.';
    if (paraMinutos(horaFim) <= paraMinutos(horaInicio)) {
        return 'O horário de fim deve ser posterior ao horário de início.';
    }
    if (data < hoje()) return 'Não é possível reservar em uma data passada.';
    return null;
}

// Regra de negócio: existe reserva ativa na mesma quadra/data com horário sobreposto?
async function existeConflito(quadraId, data, horaInicio, horaFim, ignorarId) {
    const { rows } = await pool.query(
        `SELECT 1 FROM reservas
         WHERE quadra_id = $1 AND data = $2 AND status = 'ativa'
           AND id <> $3
           AND $4::time < hora_fim AND $5::time > hora_inicio
         LIMIT 1`,
        [quadraId, data, ignorarId || -1, horaInicio, horaFim]
    );
    return rows.length > 0;
}

// Valor total = horas reservadas x valor por hora da quadra
function calcularValor(valorHora, horaInicio, horaFim) {
    const horas = (paraMinutos(horaFim) - paraMinutos(horaInicio)) / 60;
    return Math.round(Number(valorHora) * horas * 100) / 100;
}

const MSG_CONFLITO = 'Choque de horário: a quadra já está reservada neste período.';

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

// POST /api/reservas  (admin pode informar usuarioId; cliente reserva para si)
router.post('/', async (req, res) => {
    try {
        const { quadraId, data, horaInicio, horaFim } = req.body;
        if (!quadraId) return res.status(400).json({ erro: 'Informe a quadra.' });
        const erro = validarPeriodo({ data, horaInicio, horaFim });
        if (erro) return res.status(400).json({ erro });

        const usuarioId = req.usuario.perfil === 'admin' && req.body.usuarioId
            ? req.body.usuarioId
            : req.usuario.id;

        const quadra = await pool.query('SELECT valor_hora FROM quadras WHERE id = $1', [quadraId]);
        if (quadra.rows.length === 0) return res.status(404).json({ erro: 'Quadra não encontrada.' });

        if (await existeConflito(quadraId, data, horaInicio, horaFim)) {
            return res.status(409).json({ erro: MSG_CONFLITO });
        }

        const valorTotal = calcularValor(quadra.rows[0].valor_hora, horaInicio, horaFim);
        const inserida = await pool.query(
            `INSERT INTO reservas (usuario_id, quadra_id, data, hora_inicio, hora_fim, valor_total)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [usuarioId, quadraId, data, horaInicio, horaFim, valorTotal]
        );
        const { rows } = await pool.query(SELECT_RESERVAS + ' WHERE r.id = $1', [inserida.rows[0].id]);
        res.status(201).json(formatar(rows[0]));
    } catch (err) {
        if (err.code === 'P0001') return res.status(409).json({ erro: MSG_CONFLITO });
        if (err.code === '23503') return res.status(400).json({ erro: 'Usuário ou quadra inexistente.' });
        res.status(500).json({ erro: err.message });
    }
});

module.exports = router;
