const handleCommand = require("../index");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { createSticker } = require("../arquivos/sticker");
const Jimp = require("jimp");
const settings = require("../settings/settings.json");

const processedMessages = new Set();
const prefix = settings.prefix || "/";
setInterval(() => processedMessages.clear(), 5 * 60 * 1000);

// Extrai o texto principal da mensagem
function getMessageText(message) {
    if (!message) return "";
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    if (message.buttonsResponseMessage?.selectedButtonId) return message.buttonsResponseMessage.selectedButtonId;
    if (message.listResponseMessage?.singleSelectReply?.selectedRowId) return message.listResponseMessage.singleSelectReply.selectedRowId;
    if (message.ephemeralMessage?.message) return getMessageText(message.ephemeralMessage.message);
    return "";
}

// Log de mensagens no terminal (adaptado para @lid)
function logMensagem(m, text) {
    const fromMe = m.key.fromMe;
    const jid = m.key.remoteJid || "";
    const isGroup = jid.endsWith("@g.us") || jid.endsWith("@lid");
    const sender = (m.key.participant || jid)?.split("@")[0] || "desconhecido";
    const pushName = m.pushName || "Sem nome";
    const hora = new Date().toLocaleTimeString();

    console.log(`\n📩 [${hora}] ${isGroup ? "👥 GRUPO" : "👤 PV"} ${isGroup ? "(" + sender + ")" : ""}`);
    console.log(`   👤 ${pushName} (${sender}) ${fromMe ? "[EU]" : ""}`);
    console.log(`   💬 ${text || "[sem texto]"}`);
    console.log("──────────────────────────────────────");
}

// Normaliza mensagem e retorna quoted completo
function normalizeMessage(m) {
    if (!m?.message) return { normalized: m, quoted: null };

    let message = m.message;
    if (message.ephemeralMessage) message = message.ephemeralMessage.message;
    if (message.viewOnceMessage) message = message.viewOnceMessage.message;

    const contextInfo = message.extendedTextMessage?.contextInfo || {};
    const quoted = contextInfo.quotedMessage || null;

    return { normalized: { ...m, message }, quoted };
}

module.exports = (sock) => {
    sock.ev.on("messages.upsert", async (msgUpdate) => {
        const messages = msgUpdate?.messages;
        if (!messages || !Array.isArray(messages)) return;

        for (const m of messages) {
            try {
                if (!m.message) continue;

                // Evita mensagens duplicadas
                const messageId = `${m.key.remoteJid}-${m.key.id}`;
                if (processedMessages.has(messageId)) continue;
                processedMessages.add(messageId);

                // Normaliza a mensagem
                const { normalized, quoted } = normalizeMessage(m);
                const text = getMessageText(normalized.message).trim();
                normalized.text = text;

                // 'from' declarado apenas uma vez por mensagem
                const from = normalized.key.remoteJid;
                const sender = (normalized.key.participant || from)?.split("@")[0] || "desconhecido";

                // Função reply dentro do escopo correto
                const reply = async (texto, mentions = []) => {
                    try {
                        await sock.sendMessage(from, { text: texto, mentions });
                    } catch (err) {
                        console.error("❌ Erro ao enviar reply:", err);
                    }
                };

                // Log
                logMensagem(normalized, text);

                // ===== /s =====
                if (text.startsWith("/s")) {
                    let media;
                    if (quoted?.imageMessage) media = quoted.imageMessage;
                    else if (quoted?.videoMessage && quoted.videoMessage.seconds <= 10) media = quoted.videoMessage;

                    if (!media) {
                        await reply("❌ Responda uma *imagem* ou *vídeo de até 10s* com /s");
                        continue;
                    }

                    const stream = await downloadContentFromMessage(
                        media,
                        media.mimetype?.includes("video") ? "video" : "image"
                    );

                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                    if (!buffer.length) throw new Error("Buffer vazio");

                    await createSticker(buffer, sock, from, normalized);
                    continue;
                }

                // ===== /status =====
                if (text.startsWith("/status ")) {
                    const statusText = text.replace("/status ", "").trim();
                    if (!statusText) {
                        await reply("❌ Use: /status Seu novo status aqui");
                        continue;
                    }

                    try {
                        await sock.updateProfileStatus(statusText);
                        await reply(`✅ Status atualizado para:\n> _${statusText}_`);
                    } catch (err) {
                        console.error("Erro ao atualizar status:", err);
                        await reply("❌ Falha ao atualizar status.");
                    }
                    continue;
                }

                // ===== Auto-respostas =====
                const lowerText = text.toLowerCase();
                if (lowerText === "prefixo") {
                    await reply(`O prefixo atual do bot é: ${prefix}`);
                    continue;
                }
                if (lowerText === "ola") {
                    await reply("Olá! Como posso ajudar?");
                    continue;
                }

                // ===== Comandos do bot =====
                if (text.startsWith(prefix)) {
                    const [cmd, ...args] = text.slice(prefix.length).trim().split(/ +/);
                    const command = cmd.toLowerCase();
                    try {
                        await handleCommand(sock, normalized, command, args, from, quoted);
                    } catch (cmdErr) {
                        console.error(`❌ Erro no comando "${command}":`, cmdErr);
                        await reply("❌ Comando falhou. Tente novamente.");
                    }
                }

            } catch (err) {
                console.error(`❌ Erro ao processar ${m.key.id}:`, err);
                try {
                    await sock.sendMessage(m.key.remoteJid, { text: "❌ Erro interno. Tente novamente." }, { quoted: m });
                } catch (e) {
                    console.error("Falha ao enviar erro:", e);
                }
            }
        }
    });

    console.log("✅ Listener de mensagens ATIVADO — processando TUDO (inclusive fromMe).");
};