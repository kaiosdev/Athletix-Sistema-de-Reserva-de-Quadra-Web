const pool = require('../db');

// Lê o token do cabeçalho Authorization: Bearer <token>
// Retorna null se não existir ou não tiver o formato de um UUID
function lerToken(req) {
    const [tipo, token] = (req.headers.authorization || '').split(' ');
    const formatoUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (tipo !== 'Bearer' || !formatoUUID.test(token || '')) return null;
    return token;
}

// Exige uma sessão válida (não expirada) na tabela sessoes
async function autenticar(req, res, next) {
    try {
        const token = lerToken(req);
        if (!token) return res.status(401).json({ erro: 'Autenticação necessária.' });

        const { rows } = await pool.query(
            `SELECT u.id, u.perfil
             FROM sessoes s
             JOIN usuarios u ON u.id = s.usuario_id
             WHERE s.token = $1 AND s.expira_em > NOW()`,
            [token]
        );
        if (rows.length === 0) {
            return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
        }
        req.usuario = { id: rows[0].id, perfil: rows[0].perfil };
        next();
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
}

// Exige perfil de administrador (usar depois de autenticar)
function exigirAdmin(req, res, next) {
    if (!req.usuario || req.usuario.perfil !== 'admin') {
        return res.status(403).json({ erro: 'Acesso restrito ao administrador.' });
    }
    next();
}

module.exports = { autenticar, exigirAdmin, lerToken };
