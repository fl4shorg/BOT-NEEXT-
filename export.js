// --------------------
// Pacotes Nativos
// --------------------
const readline = require("readline");
const fs = require("fs");
const { join } = require("path");
const settings = require("./settings/settings.json"); // caminho correto

// --------------------
// Pacotes de Terceiros
// --------------------
const pino = require("pino");
const logger = pino({ level: "silent" });
const Jimp = require("jimp");

// --------------------
// Configurações do Bot
// --------------------
const prefix = settings.prefix || ".";
const botNome = settings.nomeDoBot || "NEEXT BOT";

// --------------------
// Arquivos Locais
// --------------------
const { mostrarBanner, logMensagem, formatJid } = require("./arquivos/funcoes/function.js");

// --------------------
// Exportações
// --------------------
module.exports = {
    // Nativos
    readline,
    fs,
    join,

    // Terceiros
    pino,
    logger,
    Jimp,

    // Configurações do Bot
    prefix,
    botNome,

    // Funções locais
    mostrarBanner,
    logMensagem,
    formatJid,
};

// Para debug
console.log("Export.js carregado ✅", { prefix, botNome });