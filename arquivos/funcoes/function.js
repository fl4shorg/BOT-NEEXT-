// ---------------------------
// Pacotes
// ---------------------------
const cfonts = require("cfonts");

// ---------------------------
// Configurações do Bot
// ---------------------------
const { prefix, botNome } = require("../../export.js"); // ainda importa, mas não mostra

// ---------------------------
// Banner do bot
// ---------------------------
function mostrarBanner() {
    console.clear();

    // NEEXT em roxo sólido
    cfonts.say("NEEXT", {
        font: "block",
        align: "center",
        colors: ["#800080"], // roxo real
        background: "transparent",
        letterSpacing: 1,
        space: true
    });

    // LTDA em roxo sólido
    cfonts.say("LTDA", {
        font: "block",
        align: "center",
        colors: ["#800080"], // roxo real
        background: "transparent",
        letterSpacing: 1,
        space: true
    });

    console.log("\n");
}

// ---------------------------
// Logs simples (sem duplicação e sem criar arquivos)
// ---------------------------
const mensagensRegistradas = new Set();

function logMensagem(m, text = "", isCommand = false) {
    const fromMe = m?.key?.fromMe || false;
    const jid = m?.key?.remoteJid || "";
    const isGroup = jid.endsWith("@g.us") || jid.endsWith("@lid");
    const sender = (m?.key?.participant || jid)?.split("@")[0] || "desconhecido";
    const pushName = m?.pushName || "Sem nome";

    const conteudo = text || (() => {
        if (m?.message?.conversation) return m.message.conversation;
        if (m?.message?.extendedTextMessage?.text) return m.message.extendedTextMessage.text;
        if (m?.message?.imageMessage?.caption) return m.message.imageMessage.caption;
        if (m?.message?.videoMessage?.caption) return m.message.videoMessage.caption;
        return "[conteúdo não suportado]";
    })();

    // Evita duplicação
    const logKey = `${fromMe}-${jid}-${conteudo}`;
    if (mensagensRegistradas.has(logKey)) return;
    mensagensRegistradas.add(logKey);

    const tipo = isCommand || (conteudo.startsWith(prefix)) ? "[COMANDO]" : "[MENSAGEM]";
    const local = isGroup ? "GRUPO" : "PV";
    const remetente = `${pushName} (${sender})${fromMe ? " [EU]" : ""}`;

    const logText = `
───────────────────────────────
${tipo} ${local}
De: ${remetente}
Conteúdo: ${conteudo}
───────────────────────────────`;

    console.log(logText);
}

// ---------------------------
// Função para buscar buffer de URL
// ---------------------------
async function getBuffer(url) {
    try {
        const response = await require('axios').get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Erro ao buscar buffer da URL:', error);
        throw error;
    }
}

// Função para formatar JID
function formatJid(jid) {
    return String(jid || "").replace(/@s\.whatsapp\.net|@g\.us|@lid/g,'');
}

// ---------------------------
// Exportações
// ---------------------------
module.exports = {
    mostrarBanner,
    logMensagem,
    formatJid,
    getBuffer
};