module.exports = {
    port: parseInt(process.env.PORT || '3000', 10),
    jwtSecret: process.env.JWT_SECRET || 'troque-este-segredo-em-producao',
    jwtExpiraEm: process.env.JWT_EXPIRA_EM || '8h'
};
