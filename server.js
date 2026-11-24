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
// (os modulos da API serao registrados aqui)

// inicializacao do sistema
app.listen(config.port, () => {
    console.log('Athletix rodando no endereco http://localhost:' + config.port);
});
