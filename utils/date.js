// Formata datas para dd/mm/aaaa
function dataBR(data) {
    if (!data) return '';
    const d = new Date(data);
    if (isNaN(d.getTime())) return String(data);
    const dia = String(d.getUTCDate()).padStart(2, '0');
    const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
    return dia + '/' + mes + '/' + d.getUTCFullYear();
}

// Converte "HH:MM" (ou "HH:MM:SS") em minutos desde 00:00
function paraMinutos(hora) {
    const [h, m] = String(hora).split(':');
    return parseInt(h, 10) * 60 + parseInt(m, 10);
}

// Valida formato HH:MM (24h)
function horaValida(hora) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(hora));
}

// Valida formato AAAA-MM-DD e se a data existe
function dataValida(data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data))) return false;
    const d = new Date(data + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === data;
}

// Data de hoje no formato AAAA-MM-DD (horário local do servidor)
function hoje() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

module.exports = { dataBR, paraMinutos, horaValida, dataValida, hoje };
