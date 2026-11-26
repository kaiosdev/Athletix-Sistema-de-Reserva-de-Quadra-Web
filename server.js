// importando biblioteca
const express = require('express');
// caminho do diretorio
const path = require('path');
// import do arquivo config.js
const config = require('./config');

const app = express();

// camada de rede
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// servicos
app.use('/api/auth', require('./microservices/auth/routes'));
app.use('/api/quadras', require('./microservices/quadras/routes'));

// inicializacao do sistema
app.listen(config.port, () => {
    console.log('Athletix rodando no endereco http://localhost:' + config.port);
});
