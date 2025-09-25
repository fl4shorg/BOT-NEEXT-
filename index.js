// index.js — Bot completo com eventos e comandos unificados

const { 
    makeWASocket, 
    fetchLatestBaileysVersion, 
    generateWAMessageFromContent,
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");


const path = require("path"); // <<< ESSENCIAL PARA path.joinv
const fs = require("fs");
const axios = require("axios");
const os = require("os");
const { writeExif } = require("./arquivos/sticker.js");
const Jimp = require("jimp");
const settings = require('./settings/settings.json');

const antilinkFile = path.join(__dirname, "antilink.json");

// importa banner + logger centralizados
const { mostrarBanner, logMensagem } = require("./export");

// Config do Bot
const { prefix, nomeDoBot, nickDoDono, idDoCanal, fotoDoBot } = settings;

// Selinhos e quoted fake (mantive seu conteúdo)
const selinho = {
    key: { fromMe: false, participant: `13135550002@s.whatsapp.net`, remoteJid: 'status@broadcast' },
    message: { contactMessage: { displayName: 'NEEXT LTDA', vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Kuun;Flash;;;\nFN:Flash Kuun\nitem1.TEL;waid=13135550002:+1 (313) 555-0002\nitem1.X-ABLabel:Mobile\nEND:VCARD`, sendEphemeral: true } }
};
const selinho2 = {
    key: { fromMe: false, participant: `553176011100@s.whatsapp.net`, remoteJid: 'status@broadcast' },
    message: { contactMessage: { displayName: 'NEEXT LTDA', vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Kuun;Flash;;;\nFN:Flash Kuun\nitem1.TEL;waid=13135550002:+1 (313) 555-0002\nitem1.X-ABLabel:Mobile\nEND:VCARD`, sendEphemeral: true } }
};
const quotedCarrinho = {
    key: { participant: "0@s.whatsapp.net", remoteJid: "0@s.whatsapp.net" },
    message: { documentMessage: { title: "🛒 Neext Ltda", fileName: "Neext.pdf", mimetype: "application/pdf", fileLength: 999999, pageCount: 1 } }
};

// Mensagens já processadas (evita duplicadas)
const processedMessages = new Set();
setInterval(() => processedMessages.clear(), 5 * 60 * 1000);




function carregarAntilink() {
    try {
        if (!fs.existsSync(antilinkFile)) fs.writeFileSync(antilinkFile, "{}");
        const data = fs.readFileSync(antilinkFile, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        console.error("❌ Erro ao carregar antilink.json:", err);
        return {};
    }
}

// Salva no JSON
function salvarAntilink(data) {
    try {
        fs.writeFileSync(antilinkFile, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("❌ Erro ao salvar antilink.json:", err);
    }
}

// Função utilitária: extrai texto da mensagem
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

// Normaliza mensagem e retorna quoted
function normalizeMessage(m) {
    if (!m?.message) return { normalized: m, quoted: null };
    let message = m.message;
    if (message.ephemeralMessage) message = message.ephemeralMessage.message;
    if (message.viewOnceMessage) message = message.viewOnceMessage.message;
    const contextInfo = message.extendedTextMessage?.contextInfo || {};
    const quoted = contextInfo.quotedMessage || null;
    return { normalized: { ...m, message }, quoted };
}

// Função reply genérica
async function reply(sock, from, text, mentions = []) {
    try { await sock.sendMessage(from, { 
        text,
        contextInfo: {
            forwardingScore: 100000,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363289739581116@newsletter",
                newsletterName: "🐦‍🔥⃝ 𝆅࿙⵿ׂ𝆆𝝢𝝣𝝣𝝬𝗧𓋌𝗟𝗧𝗗𝗔⦙⦙ꜣྀ"
            }
        },
        mentions
    }); }
    catch (err) { console.error("❌ Erro ao enviar reply:", err); }
}

// Reage a qualquer mensagem com emoji
async function reagirMensagem(sock, normalized, emoji = "🤖") {
    if (!normalized?.key) return false;
    try {
        await sock.sendMessage(normalized.key.remoteJid, {
            react: {
                text: emoji,
                key: normalized.key
            }
        });
        return true;
    } catch (err) {
        console.error("❌ Erro ao reagir:", err);
        return false;
    }
}

// Detecta links na mensagem
function detectarLinks(texto) {
    if (!texto) return false;
    const linkRegex = /((https?:\/\/)|(www\.))[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)|wa\.me\/|whatsapp\.com\/|t\.me\/|chat\.whatsapp\.com\/|instagram\.com\/|facebook\.com\/|twitter\.com\/|tiktok\.com\/|youtube\.com\/|discord\.gg\//i;
    return linkRegex.test(texto);
}

// Verifica se usuário é admin do grupo
async function isAdmin(sock, groupId, userId) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        const participant = groupMetadata.participants.find(p => p.id === userId);
        return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
    } catch (err) {
        console.error("❌ Erro ao verificar admin:", err);
        return false;
    }
}

// Verifica se usuário é o dono do bot
function isDono(userId) {
    const numeroDono = settings.numeroDoDono + "@s.whatsapp.net";
    return userId === numeroDono;
}

// Remove mensagem do grupo
async function removerMensagem(sock, messageKey) {
    try {
        await sock.sendMessage(messageKey.remoteJid, { delete: messageKey });
        return true;
    } catch (err) {
        console.error("❌ Erro ao remover mensagem:", err);
        return false;
    }
}

// Verifica se bot é admin do grupo
async function botEhAdmin(sock, groupId) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        const botId = sock.user?.id?.replace(/:.*@s.whatsapp.net/, '@s.whatsapp.net') || sock.user?.id;
        const botParticipant = groupMetadata.participants.find(p => p.id === botId);
        return botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');
    } catch (err) {
        console.error("❌ Erro ao verificar se bot é admin:", err);
        return false;
    }
}

// Bane usuário do grupo
async function banirUsuario(sock, groupId, userId) {
    try {
        // Verifica se bot tem permissão de admin
        const botAdmin = await botEhAdmin(sock, groupId);
        if (!botAdmin) {
            console.log(`⚠️ Bot não é admin no grupo ${groupId} - não pode banir`);
            return { success: false, reason: "bot_nao_admin" };
        }
        
        console.log(`⚔️ Tentando banir usuário ${userId} do grupo ${groupId}`);
        await sock.groupParticipantsUpdate(groupId, [userId], "remove");
        console.log(`✅ Usuário ${userId} banido com sucesso!`);
        return { success: true, reason: "banido" };
    } catch (err) {
        console.error(`❌ Erro ao banir usuário ${userId}:`, err);
        if (err.message?.includes('forbidden')) {
            return { success: false, reason: "sem_permissao" };
        }
        return { success: false, reason: "erro_tecnico" };
    }
}

// Processa antilink
async function processarAntilink(sock, normalized) {
    try {
        const from = normalized.key.remoteJid;
        const sender = normalized.key.participant || from;
        const text = getMessageText(normalized.message);
        
        // Só funciona em grupos
        if (!from.endsWith('@g.us') && !from.endsWith('@lid')) return false;
        
        // Carrega configuração do antilink
        const antilinkData = carregarAntilink();
        if (!antilinkData[from]) return false; // Grupo não tem antilink ativo
        
        // Verifica se tem links
        if (!detectarLinks(text)) return false;
        
        // Não remove se for o dono
        if (isDono(sender)) {
            await reply(sock, from, "🛡️ Dono detectado com link, mas não será removido!");
            return false;
        }
        
        // Não remove se for admin
        const ehAdmin = await isAdmin(sock, from, sender);
        if (ehAdmin) {
            await reply(sock, from, "👮‍♂️ Admin detectado com link, mas não será removido!");
            return false;
        }
        
        // Remove a mensagem
        const removido = await removerMensagem(sock, normalized.key);
        
        if (removido) {
            const senderNumber = sender.split('@')[0];
            console.log(`🚫 Mensagem com link removida de ${senderNumber}`);
            
            // Aguarda um pouco antes de tentar banir
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Tenta banir o usuário
            const resultadoBan = await banirUsuario(sock, from, sender);
            
            if (resultadoBan.success) {
                await reagirMensagem(sock, normalized, "⚔️");
                await reply(sock, from, `⚔️ *ANTILINK - USUÁRIO BANIDO!*\n\n@${senderNumber} foi removido do grupo por enviar link!\n\n🚫 Links não são permitidos aqui.\n⚡ Ação: Delete + Ban automático`, [sender]);
                console.log(`⚔️ SUCESSO: ${senderNumber} banido do grupo ${from}`);
            } else {
                await reagirMensagem(sock, normalized, "🚫");
                let motivo = "";
                switch(resultadoBan.reason) {
                    case "bot_nao_admin":
                        motivo = "Bot não é admin do grupo";
                        break;
                    case "sem_permissao":
                        motivo = "Bot sem permissão para banir";
                        break;
                    default:
                        motivo = "Erro técnico no banimento";
                }
                
                await reply(sock, from, `🚫 *ANTILINK ATIVO*\n\n@${senderNumber} sua mensagem foi deletada por conter link!\n\n⚠️ **Não foi possível banir:** ${motivo}\n💡 **Solução:** Torne o bot admin do grupo`, [sender]);
                console.log(`⚠️ FALHA: Não foi possível banir ${senderNumber} - ${motivo}`);
            }
        }
        
        return true;
    } catch (err) {
        console.error("❌ Erro no processamento antilink:", err);
        return false;
    }
}



// Função principal de comandos
async function handleCommand(sock, message, command, args, from, quoted) {
    const msg = message.message;
    if (!msg) return;

    switch (command) {
        case "ping": {
            const now = new Date();
            const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
            const freeMem = (os.freemem() / 1024 / 1024).toFixed(2);
            let uptimeSec = process.uptime();
            const days = Math.floor(uptimeSec / 86400);
            uptimeSec %= 86400;
            const hours = Math.floor(uptimeSec / 3600);
            uptimeSec %= 3600;
            const minutes = Math.floor(uptimeSec / 60);
            const seconds = Math.floor(uptimeSec % 60);
            const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

            const pingMessage = `
┏━━━━━━━━━━━━━━━┓
┃ 📅 Data: ${now.toLocaleDateString()}  
┃ ⏰ Hora: ${now.toLocaleTimeString()}  
┃ 🟢 Uptime: ${uptime}  
┃ 💾 Memória Total: ${totalMem} MB  
┃ 💾 Memória Livre: ${freeMem} MB
┗━━━━━━━━━━━━━━━┛`;

            await sock.sendMessage(from, {
                image: { url: "https://i.ibb.co/xqddxGC6/d75ddb6631f10a0eff0b227c5b7617f2.jpg" },
                caption: pingMessage,
                contextInfo: {
                    mentionedJid: [from],
                    isForwarded: true,
                    forwardingScore: 100000,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363289739581116@newsletter",
                        newsletterName: "🐦‍🔥⃝ 𝆅࿙⵿ׂ𝆆𝝢𝝣𝝣𝝬𝗧𓋌𝗟𝗧𝗗𝗔⦙⦙ꜣྀ"
                    },
                    externalAdReply: {
                        title: `© NEEXT LTDA`,
                        thumbnailUrl: "https://i.ibb.co/nqgG6z6w/IMG-20250720-WA0041-2.jpg",
                        mediaType: 1,
                        sourceUrl: "www.neext.online"
                    }
                }
            }, { quoted: { key: message.key, message: message.message } });
        }
        break;

        case "hora":
            await sock.sendMessage(from, { text: `⏰ Agora é: ${new Date().toLocaleTimeString()}` }, { quoted: message });
            break;
            
            case 'dono':
    // garante que 'm' está definido no escopo da função que chama o switch
    const sender = m?.key?.participant || from;
    await reply(sock, from, "🛡️ Esse é o dono do bot!", [sender]);
    break;
    
    

        case "marca":
            if (!from.endsWith("@g.us") && !from.endsWith("@lid")) {
                await reply(sock, from, "❌ Este comando só pode ser usado em grupos.");
                break;
            }
            try {
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants.map(p => p.id);
                const mensagem = `📢 Marcação geral:\n` + participants.map((p, i) => `${i+1}. @${p.split("@")[0]}`).join("\n");
                await reply(sock, from, mensagem);
            } catch(err) {
                console.error("❌ Erro ao marcar participantes:", err);
                await reply(sock, from, "❌ Falha ao marcar todos no grupo.");
            }
            break;

        case "recado":
            await sock.sendMessage(from, { text: "📌 Bot está ativo e conectado!" }, { quoted: message });
            break;
            
        case "antilink": {
            // Só funciona em grupos
            if (!from.endsWith('@g.us') && !from.endsWith('@lid')) {
                await reply(sock, from, "❌ Este comando só pode ser usado em grupos.");
                break;
            }
            
            const sender = message.key.participant || from;
            
            // Verifica se é admin ou dono
            const ehAdmin = await isAdmin(sock, from, sender);
            const ehDono = isDono(sender);
            
            if (!ehAdmin && !ehDono) {
                await reply(sock, from, "❌ Apenas admins podem usar este comando.");
                break;
            }
            
            const antilinkData = carregarAntilink();
            const acao = args[0]?.toLowerCase();
            
            if (acao === "on" || acao === "ativar" || acao === "1") {
                antilinkData[from] = true;
                salvarAntilink(antilinkData);
                await reagirMensagem(sock, message, "✅");
                await reply(sock, from, "✅ *ANTILINK ATIVADO*\n\n⚔️ Links serão removidos e usuário será BANIDO\n🛡️ Admins e dono são protegidos\n🚫 Ação dupla: Delete + Ban");
            } 
            else if (acao === "off" || acao === "desativar" || acao === "0") {
                delete antilinkData[from];
                salvarAntilink(antilinkData);
                await reagirMensagem(sock, message, "❌");
                await reply(sock, from, "❌ *ANTILINK DESATIVADO*\n\n✅ Links agora são permitidos");
            }
            else {
                const status = antilinkData[from] ? "🟢 ATIVO" : "🔴 INATIVO";
                await reply(sock, from, `🔗 *STATUS ANTILINK*\n\nStatus: ${status}\n\n📝 *Como usar:*\n• \`${prefix}antilink on\` - Ativar\n• \`${prefix}antilink off\` - Desativar\n\n⚔️ *Quando ativo:*\n• Deleta mensagem com link\n• Bane o usuário automaticamente\n• Protege admins e dono\n\n⚠️ Apenas admins podem usar`);
            }
        }
        break;

        case "s":
            try {
                const quotedMsg = message.message.extendedTextMessage?.contextInfo?.quotedMessage || message.message.imageMessage || message.message.videoMessage;
                if (!quotedMsg) return await sock.sendMessage(from, { text: "❌ Marque uma imagem ou vídeo para criar figurinha" }, { quoted: message });

                const type = quotedMsg.imageMessage ? "image" : quotedMsg.videoMessage ? "video" : null;
                if (!type) return await sock.sendMessage(from, { text: "❌ Apenas imagens ou vídeos suportados" }, { quoted: message });

                const stream = await downloadContentFromMessage(quotedMsg, type);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                const stickerPath = await writeExif({ mimetype: quotedMsg[type + "Message"].mimetype, data: buffer }, { packname: "NEEXT", author: "NEEXT BOT", categories: ["😎"] });
                const stickerBuffer = fs.readFileSync(stickerPath);
                await sock.sendMessage(from, { sticker: stickerBuffer });
                fs.unlinkSync(stickerPath);

            } catch (err) {
                console.log("❌ Erro ao criar figurinha:", err);
                await sock.sendMessage(from, { text: "❌ Erro ao criar figurinha" }, { quoted: message });
            }
            break;

        default:
            await sock.sendMessage(from, { text: `❌ Comando "${command}" não encontrado.\n\nDigite /oi para ajuda.` }, { quoted: message });
            break;
    }
}

// Função para responder palavras-chave sem prefixo
async function responderPalavrasChave(sock, text, from, normalized) {
    const msg = text.toLowerCase();

    if (msg === "prefixo") {
    // Reage à mensagem
    await reagirMensagem(sock, normalized, "🏮");

    // Envia reply QUOTANDO a mensagem original
    await reply(sock, from, `🤖 Olá! Meu prefixo é: ${prefix}`, normalized);

    return true;
}

  

    // você pode adicionar mais palavras-chave aqui
    // ex: if(msg === "ajuda") { ... }

    return false;
}
// Listener de mensagens
function setupListeners(sock) {
    sock.ev.on("messages.upsert", async (msgUpdate) => {
    const messages = msgUpdate?.messages;
    if (!messages || !Array.isArray(messages)) return;

    for (const m of messages) {
        try {
            if (!m.message) continue;
            const messageId = `${m.key.remoteJid}-${m.key.id}`;
            if (processedMessages.has(messageId)) continue;
            processedMessages.add(messageId);

            const { normalized, quoted } = normalizeMessage(m);
            const text = getMessageText(normalized.message).trim();
            normalized.text = text;

            const from = normalized.key.remoteJid;

            // logger central
            const isCmd = text.startsWith(prefix);
            logMensagem(normalized, text, isCmd);

            // 🔹 Verificação de ANTILINK (antes de tudo)
            const linkRemovido = await processarAntilink(sock, normalized);
            if (linkRemovido) continue; // se removeu link, não processa mais nada

            // 🔹 Palavras-chave sem prefixo
            const respondeu = await responderPalavrasChave(sock, text, from, normalized);
            if (respondeu) continue; // se respondeu, não processa comandos

            // 🔹 Comandos com prefixo
            if (isCmd) {
                const [cmd, ...args] = text.slice(prefix.length).trim().split(/ +/);
                const command = cmd.toLowerCase();
                try {
                    await handleCommand(sock, normalized, command, args, from, quoted);
                } catch (err) {
                    console.error(`❌ Erro no comando "${command}":`, err);
                    await reply(sock, from, "❌ Comando falhou. Tente novamente.");
                }
            }

            // 🔹 /s sem prefixo
            else if (text.startsWith("/s")) {
                if (quoted?.imageMessage || quoted?.videoMessage) {
                    await handleCommand(sock, normalized, "s", [], from, quoted);
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
}

// Exporta para iniciar no arquivo principal de conexão
module.exports = { handleCommand, setupListeners };