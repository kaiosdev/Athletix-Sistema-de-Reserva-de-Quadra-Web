const jwt = require('jsonwebtoken');
const config = require('../config');

// Exige token JWT válido no cabeçalho Authorization: Bearer <token>
function autenticar(req, res, next) {
    const cabecalho = req.headers.authorization || '';
    const [tipo, token] = cabecalho.split(' ');
    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({ erro: 'Autenticação necessária.' });
    }
    try {
        const dados = jwt.verify(token, config.jwtSecret);
        req.usuario = { id: dados.id, perfil: dados.perfil };
        next();
    } catch (err) {
        res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
    }
}

// Exige perfil de administrador (usar depois de autenticar)
function exigirAdmin(req, res, next) {
    if (!req.usuario || req.usuario.perfil !== 'admin') {
        return res.status(403).json({ erro: 'Acesso restrito ao administrador.' });
    }
    next();
}

module.exports = { autenticar, exigirAdmin };
