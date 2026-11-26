// Cria (ou promove) um usuário administrador.
// Uso: npm run criar-admin -- "Nome" email@exemplo.com senha123
const pool = require('../db');

async function main() {
    const [nome, email, senha] = process.argv.slice(2);
    if (!nome || !email || !senha) {
        console.error('Uso: npm run criar-admin -- "Nome" email@exemplo.com senha');
        process.exit(1);
    }
    await pool.query(
        `INSERT INTO usuarios (nome, email, senha_hash, perfil)
         VALUES ($1, $2, crypt($3, gen_salt('bf')), 'admin')
         ON CONFLICT (email) DO UPDATE SET perfil = 'admin', senha_hash = EXCLUDED.senha_hash, nome = EXCLUDED.nome`,
        [nome, email.toLowerCase(), senha]
    );
    console.log('Administrador criado/atualizado: ' + email);
    await pool.end();
}

main().catch(err => {
    console.error('Erro:', err.message);
    process.exit(1);
});
