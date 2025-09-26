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
const { sendImageAsSticker, sendVideoAsSticker } = require("./arquivos/rename.js");
const Jimp = require("jimp");
const pinterest = require('./Pinterest.js');
const { igdl } = require('./Instagram.js');
const settings = require('./settings/settings.json');
const { Aki } = require('aki-api');
const cloudscraper = require('cloudscraper');
const UserAgent = require('user-agents');
const moment = require('moment-timezone');

const antilinkFile = path.join(__dirname, "antilink.json");
const akinatorFile = path.join(__dirname, "database/grupos/games/akinator.json");

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
    message: { contactMessage: { displayName: 'NEEXT LTDA', vcard: `BEGIN:VCARD\nVERSION:3.0\nN:un;Flh;;;\nFN:Kuun\nitem1.TEL;waid=553176011100:553176011100\nitem1.X-ABLabel:Mobile\nEND:VCARD`, sendEphemeral: true } }
};
const quotedCarrinho = {
    key: { participant: "0@s.whatsapp.net", remoteJid: "0@s.whatsapp.net" },
    message: { documentMessage: { title: "🛒 Neext Ltda", fileName: "Neext.pdf", mimetype: "application/pdf", fileLength: 999999, pageCount: 1 } }
};

// ContextInfo para fazer mensagens aparecerem como "enviada via anúncio"
const contextAnuncio = {
    externalAdReply: {
        title: "© NEEXT LTDA",
        body: "📱 Instagram: @neet.tk",
        thumbnailUrl: "https://i.ibb.co/nqgG6z6w/IMG-20250720-WA0041-2.jpg",
        mediaType: 1,
        sourceUrl: "https://www.neext.online",
        showAdAttribution: true
    }
};

// Mensagens já processadas (evita duplicadas)
const processedMessages = new Set();
setInterval(() => processedMessages.clear(), 5 * 60 * 1000);

// Variáveis do jogo Akinator
let akinator = [];
let jogo = { now: true, jogador: "" };

// Classe para bypass do Cloudflare no Akinator
class AkinatorCloudflareBypass {
    constructor() {
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    async createAkinator(region = 'en', retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`🧞‍♂️ Tentando conectar ao Akinator (tentativa ${attempt}/${retries})...`);
                
                // Configura cloudscraper para contornar Cloudflare
                const userAgent = this.getRandomUserAgent();
                
                // Cria instância do Akinator
                const aki = new Aki({ 
                    region: region, 
                    childMode: false,
                    // Configurações para bypass
                    requestOptions: {
                        headers: {
                            'User-Agent': userAgent,
                            'Accept': 'application/json, text/plain, */*',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Connection': 'keep-alive',
                            'Upgrade-Insecure-Requests': '1',
                            'Sec-Fetch-Dest': 'document',
                            'Sec-Fetch-Mode': 'navigate',
                            'Sec-Fetch-Site': 'none',
                            'Cache-Control': 'max-age=0'
                        },
                        timeout: 30000
                    }
                });

                // Aguarda um pouco antes de tentar
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                
                await aki.start();
                console.log(`✅ Conectado ao Akinator com sucesso! Região: ${region}`);
                return aki;
                
            } catch (error) {
                console.error(`❌ Tentativa ${attempt} falhou:`, error.message);
                
                if (attempt === retries) {
                    throw new Error(`Falha após ${retries} tentativas. Akinator temporariamente indisponível.`);
                }
                
                // Aguarda mais tempo a cada tentativa
                await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
            }
        }
    }
}

// Carrega dados do Akinator
function carregarAkinator() {
    try {
        if (!fs.existsSync(akinatorFile)) {
            const dir = path.dirname(akinatorFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(akinatorFile, "[]");
        }
        const data = fs.readFileSync(akinatorFile, "utf-8");
        akinator = JSON.parse(data);
        return akinator;
    } catch (err) {
        console.error("❌ Erro ao carregar akinator.json:", err);
        akinator = [];
        return [];
    }
}

// Salva dados do Akinator
function salvarAkinator() {
    try {
        fs.writeFileSync(akinatorFile, JSON.stringify(akinator, null, 2));
    } catch (err) {
        console.error("❌ Erro ao salvar akinator.json:", err);
    }
}

// Inicializa dados do Akinator
carregarAkinator();




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
            }, { quoted: selinho });
        }
        break;

        case "hora":
            await sock.sendMessage(from, { 
                text: `⏰ Agora é: ${new Date().toLocaleTimeString()}`,
                contextInfo: contextAnuncio
            });
            break;
            
            case 'dono':
    // garante que 'sender' está definido no escopo correto
    const sender = message.key.participant || from;
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
                // Obtém hora atual para metadados
                const agora = new Date();
                const dataHora = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR')}`;
                
                // Tenta detectar mídia de diferentes formas
                let mediaMessage = null;

                // 1. Verifica se é uma mensagem marcada (quotada)
                let quotedMsg = message.message.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quotedMsg) {
                    // Unwrap ephemeral/viewOnce wrappers para mensagens quotadas (todas as versões)
                    if (quotedMsg.ephemeralMessage) quotedMsg = quotedMsg.ephemeralMessage.message;
                    if (quotedMsg.viewOnceMessage) quotedMsg = quotedMsg.viewOnceMessage.message;
                    if (quotedMsg.viewOnceMessageV2) quotedMsg = quotedMsg.viewOnceMessageV2.message;
                    if (quotedMsg.viewOnceMessageV2Extension) quotedMsg = quotedMsg.viewOnceMessageV2Extension.message;
                    
                    if (quotedMsg.imageMessage || quotedMsg.videoMessage) {
                        mediaMessage = quotedMsg;
                    }
                }
                
                // 2. Se não tem quotada, verifica se a própria mensagem tem mídia (enviada diretamente)
                if (!mediaMessage && (message.message.imageMessage || message.message.videoMessage)) {
                    mediaMessage = message.message;
                }

                // Se não encontrou nenhuma mídia
                if (!mediaMessage) {
                    await reagirMensagem(sock, message, "❌");
                    return await sock.sendMessage(from, { 
                        text: "❌ Para criar figurinha:\n• Marque uma imagem/vídeo e digite .s\n• Ou envie uma imagem/vídeo com legenda .s" 
                    }, { quoted: message });
                }

                // Determina o tipo de mídia
                const isImage = !!mediaMessage.imageMessage;
                const isVideo = !!mediaMessage.videoMessage;
                const type = isImage ? "image" : isVideo ? "video" : null;

                if (!type) {
                    await reagirMensagem(sock, message, "❌");
                    return await sock.sendMessage(from, { 
                        text: "❌ Apenas imagens, vídeos e GIFs são suportados para figurinhas" 
                    }, { quoted: message });
                }

                // Reage indicando que está processando
                await reagirMensagem(sock, message, "⏳");

                // Faz download da mídia - CORRIGIDO para usar o nó específico
                const mediaNode = isImage ? mediaMessage.imageMessage : mediaMessage.videoMessage;
                
                // Verifica se o mediaNode tem as chaves necessárias para download (incluindo Buffer/string vazios)
                const hasValidMediaKey = mediaNode.mediaKey && 
                    !(Buffer.isBuffer(mediaNode.mediaKey) && mediaNode.mediaKey.length === 0) && 
                    !(typeof mediaNode.mediaKey === 'string' && mediaNode.mediaKey.length === 0);
                    
                const hasValidPath = mediaNode.directPath || mediaNode.url;

                if (!hasValidMediaKey || !hasValidPath) {
                    await reagirMensagem(sock, message, "❌");
                    return await sock.sendMessage(from, { 
                        text: "❌ Não foi possível acessar esta mídia marcada.\nTente:\n• Enviar a imagem/vídeo diretamente com legenda .s\n• Marcar uma mídia mais recente" 
                    }, { quoted: message });
                }

                const stream = await downloadContentFromMessage(mediaNode, type);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                // Obtém o mimetype correto
                const mimeType = isImage 
                    ? mediaMessage.imageMessage.mimetype 
                    : mediaMessage.videoMessage.mimetype;

                console.log(`📄 Criando figurinha - Tipo: ${type}, Mimetype: ${mimeType}, Tamanho: ${buffer.length} bytes`);

                // Cria figurinha com metadados da NEEXT
                const stickerPath = await writeExif(
                    { 
                        mimetype: mimeType, 
                        data: buffer 
                    }, 
                    { 
                        packname: "NEEXT LTDA", 
                        author: `NEEXT BOT - ${dataHora}`, 
                        categories: ["🔥", "😎", "✨"] 
                    }
                );

                // Envia a figurinha com contextInfo de anúncio
                const stickerBuffer = fs.readFileSync(stickerPath);
                await sock.sendMessage(from, { 
                    sticker: stickerBuffer,
                    contextInfo: {
                        forwardingScore: 100000,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363289739581116@newsletter",
                            newsletterName: "🐦‍🔥⃝ 𝆅࿙⵿ׂ𝆆𝝢𝝣𝝣𝝬𝗧𓋌𝗟𝗧𝗗𝗔⦙⦙ꜣྀ"
                        },
                        externalAdReply: {
                            title: "© NEEXT LTDA",
                            body: "🐦‍🔥 Instagram: @neet.tk",
                            thumbnailUrl: "https://i.ibb.co/nqgG6z6w/IMG-20250720-WA0041-2.jpg",
                            mediaType: 1,
                            sourceUrl: "www.neext.online"
                        }
                    }
                }, { quoted: message });

                // Limpa arquivo temporário
                fs.unlinkSync(stickerPath);

                // Reage com sucesso
                await reagirMensagem(sock, message, "✅");
                
                console.log("✅ Figurinha NEEXT criada e enviada com sucesso!");

            } catch (err) {
                console.log("❌ Erro ao criar figurinha:", err);
                await reagirMensagem(sock, message, "❌");
                await sock.sendMessage(from, { 
                    text: "❌ Erro ao processar sua figurinha. Tente novamente ou use uma imagem/vídeo menor." 
                }, { quoted: message });
            }
            break;

        case 'brat': {
            const text = args.join(' ');
            if (!text) {
                await sock.sendMessage(from, { text: '❌ Digite um texto!\n\nExemplo: *.brat neext*' }, { quoted: message });
                break;
            }

            console.log(`🎨 Gerando imagem BRAT: "${text}"`);
            await reagirMensagem(sock, message, "⏳");

            try {
                // Faz requisição para API BRAT
                const apiUrl = `https://api.ypnk.dpdns.org/api/image/brat?text=${encodeURIComponent(text)}`;
                console.log(`🔗 Chamando API: ${apiUrl}`);
                const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
                
                if (!response.data) {
                    throw new Error('API retornou dados vazios');
                }

                console.log(`📥 Imagem BRAT baixada: ${response.data.length} bytes`);

                // Obtém hora atual para metadados
                const agora = new Date();
                const dataHora = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR')}`;

                // Converte para sticker usando writeExif do sticker.js
                const stickerPath = await writeExif(
                    { 
                        mimetype: 'image/png', 
                        data: Buffer.from(response.data) 
                    }, 
                    { 
                        packname: "© NEEXT LTDA\n🐦‍🔥 Instagram: @neet.tk", 
                        author: `NEEXT BOT - ${dataHora}`, 
                        categories: ["🎨", "💚", "🔥"] 
                    }
                );

                // Envia a figurinha BRAT com contextInfo de anúncio
                const stickerBuffer = fs.readFileSync(stickerPath);
                await sock.sendMessage(from, { 
                    sticker: stickerBuffer,
                    contextInfo: {
                        forwardingScore: 100000,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363289739581116@newsletter",
                            newsletterName: "🐦‍🔥⃝ 𝆅࿙⵿ׂ𝆆𝝢𝝣𝝣𝝬𝗧𓋌𝗟𝗧𝗗𝗔⦙⦙ꜣྀ"
                        },
                        externalAdReply: {
                            title: "© NEEXT LTDA - BRAT",
                            body: "🎨 Figurinha BRAT criada • Instagram: @neet.tk",
                            thumbnailUrl: "https://i.ibb.co/nqgG6z6w/IMG-20250720-WA0041-2.jpg",
                            mediaType: 1,
                            sourceUrl: "www.neext.online"
                        }
                    }
                }, { quoted: message });

                // Limpa arquivo temporário
                fs.unlinkSync(stickerPath);

                await reagirMensagem(sock, message, "✅");
                console.log('✅ Figurinha BRAT criada e enviada com sucesso!');

            } catch (error) {
                console.error('❌ Erro ao gerar BRAT:', error.message);
                await sock.sendMessage(from, { 
                    text: '❌ Erro ao gerar imagem BRAT. Tente novamente!' 
                }, { quoted: message });
                await reagirMensagem(sock, message, "❌");
            }
            break;
        }

        case 'pinterest': {
            const query = args.join(' ');
            if (!query) {
                await sock.sendMessage(from, { text: '❌ Digite uma palavra-chave para buscar!\n\nExemplo: *.pinterest gatos*' }, { quoted: message });
                break;
            }

            console.log(`📌 Buscando imagens no Pinterest: "${query}"`);
            await reagirMensagem(sock, message, "⏳");

            try {
                // Busca imagens no Pinterest
                const results = await pinterest(query);
                
                if (!results || results.length === 0) {
                    await reagirMensagem(sock, message, "❌");
                    await sock.sendMessage(from, { 
                        text: '❌ Nenhuma imagem encontrada para essa busca. Tente uma palavra-chave diferente.' 
                    }, { quoted: message });
                    break;
                }

                // Pega até 5 imagens dos resultados
                const imagesToSend = results.slice(0, 5);
                console.log(`📥 Encontradas ${results.length} imagens, enviando ${imagesToSend.length}`);

                await reagirMensagem(sock, message, "✅");

                // Envia cada imagem encontrada
                for (let i = 0; i < imagesToSend.length; i++) {
                    const result = imagesToSend[i];
                    
                    // Prepara a legenda da imagem
                    const caption = `📌 *Pinterest Search Result ${i + 1}*\n\n` +
                                  `👤 *Por:* ${result.fullname || result.upload_by || 'Anônimo'}\n` +
                                  `📝 *Descrição:* ${result.caption || 'Sem descrição'}\n` +
                                  `👥 *Seguidores:* ${result.followers || 0}\n\n` +
                                  `🔗 *Link:* ${result.source}\n\n` +
                                  `© NEEXT LTDA - Pinterest Search`;

                    // Envia a imagem
                    await sock.sendMessage(from, {
                        image: { url: result.image },
                        caption: caption,
                        contextInfo: {
                            forwardingScore: 100000,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: "120363289739581116@newsletter",
                                newsletterName: "🐦‍🔥⃝ 𝆅࿙⵿ׂ𝆆𝝢𝝣𝝣𝝬𝗧𓋌𝗟𝗧𝗗𝗔⦙⦙ꜣྀ"
                            },
                            externalAdReply: {
                                title: "© NEEXT LTDA - Pinterest Search",
                                body: `📌 Resultado ${i + 1} de ${imagesToSend.length} • Instagram: @neet.tk`,
                                thumbnailUrl: "https://i.ibb.co/nqgG6z6w/IMG-20250720-WA0041-2.jpg",
                                mediaType: 1,
                                sourceUrl: "www.neext.online"
                            }
                        }
                    }, { quoted: message });

                    // Aguarda um pouco entre os envios para evitar spam
                    if (i < imagesToSend.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                console.log(`✅ ${imagesToSend.length} imagens do Pinterest enviadas com sucesso!`);

            } catch (error) {
                console.error('❌ Erro ao buscar no Pinterest:', error.message);
                await reagirMensagem(sock, message, "❌");
                await sock.sendMessage(from, { 
                    text: '❌ Erro ao buscar imagens no Pinterest. Tente novamente mais tarde!' 
                }, { quoted: message });
            }
            break;
        }

        case 'rename': {
            if (!args.length) {
                await sock.sendMessage(from, {
                    text: '🏷️ *Como usar o comando rename:*\n\n' +
                          '📝 *.rename Pack Nome | Autor Nome*\n\n' +
                          '💡 *Exemplo:*\n' +
                          '*.rename Meus Stickers | João*\n\n' +
                          '📌 Responda uma figurinha existente com este comando para renomeá-la!'
                }, { quoted: message });
                break;
            }

            // Verifica se tem figurinha citada
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg || !quotedMsg.stickerMessage) {
                await sock.sendMessage(from, {
                    text: '❌ Você precisa responder a uma figurinha para usar este comando!'
                }, { quoted: message });
                break;
            }

            await reagirMensagem(sock, message, "⏳");

            try {
                // Parse dos argumentos (packname | author) fornecidos pelo usuário
                const fullText = args.join(' ');
                const [userPackname, userAuthor] = fullText.split('|').map(s => s.trim());
                
                if (!userPackname || !userAuthor) {
                    await reagirMensagem(sock, message, "❌");
                    await sock.sendMessage(from, {
                        text: '❌ Use o formato: *.rename Pack Nome | Autor Nome*'
                    }, { quoted: message });
                    break;
                }

                // Usa APENAS os dados fornecidos pelo usuário
                const packname = userPackname;
                const author = userAuthor;

                console.log(`🏷️ Renomeando figurinha: Pack="${packname}", Autor="${author}"`);

                // Baixa a figurinha original
                const stickerBuffer = await downloadContentFromMessage(
                    quotedMsg.stickerMessage,
                    'sticker'
                );

                let buffer = Buffer.concat([]);
                for await (const chunk of stickerBuffer) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                // Opções personalizadas com dados do usuário + NEEXT
                const options = {
                    packname: packname,
                    author: author
                };

                // Detecta se é animada de forma mais precisa
                let isAnimated = false;
                
                // Primeiro verifica se está marcada como animada no metadado
                if (quotedMsg.stickerMessage.isAnimated === true) {
                    isAnimated = true;
                } else {
                    // Verifica headers WebP para detectar animação
                    const hexString = buffer.toString('hex').toUpperCase();
                    // WebP animado contém 'WEBPVP8X' ou 'WEBPVP8L' com flag de animação
                    if (hexString.includes('5745425056503858') || // WEBPVP8X
                        hexString.includes('5745425056503841')) {   // WEBPVP8A (com alpha/animação)
                        isAnimated = true;
                    }
                }

                console.log(`📊 Tipo de figurinha detectado: ${isAnimated ? 'Animada' : 'Estática'}`);

                // Reenvia a figurinha com novos metadados
                try {
                    if (isAnimated) {
                        await sendVideoAsSticker(sock, from, buffer, message, options);
                    } else {
                        await sendImageAsSticker(sock, from, buffer, message, options);
                    }
                } catch (stickerError) {
                    console.log(`⚠️ Erro ao processar como ${isAnimated ? 'animada' : 'estática'}, tentando método alternativo...`);
                    // Se falhar, tenta o método alternativo
                    try {
                        if (isAnimated) {
                            await sendImageAsSticker(sock, from, buffer, message, options);
                        } else {
                            await sendVideoAsSticker(sock, from, buffer, message, options);
                        }
                    } catch (fallbackError) {
                        console.error('❌ Ambos os métodos falharam:', fallbackError.message);
                        throw new Error('Não foi possível processar a figurinha');
                    }
                }

                await reagirMensagem(sock, message, "✅");
                console.log('✅ Figurinha renomeada com sucesso!');

            } catch (error) {
                console.error('❌ Erro no comando rename:', error.message);
                await reagirMensagem(sock, message, "❌");
                await sock.sendMessage(from, {
                    text: '❌ Erro ao renomear figurinha. Tente novamente!'
                }, { quoted: message });
            }
            break;
        }

        case 'akinator': {
            // Só funciona em grupos
            if (!from.endsWith('@g.us') && !from.endsWith('@lid')) {
                await reply(sock, from, "❌ Este comando só pode ser usado em grupos.");
                break;
            }

            const sender = message.key.participant || from;
            const pushname = sock.user?.verifiedName || sock.user?.name || "Usuário";

            // Verifica se o jogador já iniciou o jogo e se a data é a mesma
            if (!akinator.some(game => game.id === from) && akinator.length > 0 && Number(akinator[0].dia) === Number(moment.tz('America/Sao_Paulo').format('DD'))) {
                await reply(sock, from, "Volte mais tarde...");
                break;
            }

            // Se o dia mudou, reinicia o jogo
            if (!akinator.some(game => game.id === from) && akinator.length > 0 && Number(akinator[0].dia) !== Number(moment.tz('America/Sao_Paulo').format('DD'))) {
                jogo.now = true;
                akinator.splice(0, 1); // Limpa os jogos antigos
                salvarAkinator();
            }

            // Se o jogador não estiver participando de um jogo
            if (!akinator.some(game => game.id === from)) {
                await reply(sock, from, `Atenção ${pushname}, irei iniciar o jogo do Akinator.\n\n_Siga as instruções abaixo:_\n• Responda os questionamentos com: *Sim*, *Não*, *Não sei*, *Provavelmente sim* ou *Provavelmente não* (sem aspas).\n\nBoa sorte!`);
                await reagirMensagem(sock, message, "⏳");

                const dateAKI = moment.tz('America/Sao_Paulo').format('DD');
                
                try {
                    const bypass = new AkinatorCloudflareBypass();
                    let aki;

                    // Tenta primeiro com português, depois inglês
                    try {
                        aki = await bypass.createAkinator('pt');
                    } catch (e) {
                        console.log("Região 'pt' falhou. Tentando com 'en'...");
                        aki = await bypass.createAkinator('en');
                    }

                    jogo.now = false;
                    jogo.jogador = sender;

                    // Adiciona o jogador à lista de jogadores ativos
                    akinator.push({
                        id: from,
                        jogador: sender,
                        finish: 0,
                        dia: dateAKI,
                        aki: aki, // Salva a instância real do Akinator
                        step: 0
                    });

                    salvarAkinator();

                    await reply(sock, from, `🧞‍♂️ *𝐀𝐊𝐈𝐍𝐀𝐓𝐎𝐑 𝐐𝐔𝐄𝐒𝐓𝐈𝐎𝐍𝐒:*\n• Questão: *${aki.question}*`);
                    await reagirMensagem(sock, message, "🧞‍♂️");
                    
                } catch (err) {
                    console.error("❌ Erro ao iniciar Akinator:", err);
                    await reagirMensagem(sock, message, "❌");
                    await reply(sock, from, "❌ Erro ao conectar com o Akinator. O serviço pode estar temporariamente indisponível. Tente novamente em alguns minutos.");
                }
            } else {
                // Informa se alguém já está jogando
                const jogadorAtual = akinator.find(game => game.id === from).jogador.split('@')[0];
                await reply(sock, from, `@${jogadorAtual} já iniciou uma partida. Aguarde ele(a) finalizar para começar uma nova.`, [akinator.find(game => game.id === from).jogador]);
            }
        }
        break;

        case 'resetaki': {
            // Só funciona em grupos
            if (!from.endsWith('@g.us') && !from.endsWith('@lid')) {
                await reply(sock, from, "❌ Este comando só pode ser usado em grupos.");
                break;
            }

            const sender = message.key.participant || from;

            if (!JSON.stringify(akinator).includes(from) && !isDono(sender)) {
                await reply(sock, from, "Não existe nenhuma sessão ainda em andamento no grupo.");
                break;
            }

            const gameIndex = isDono(sender) ? 0 : akinator.map(i => i.id).indexOf(from);
            const gameData = akinator[gameIndex];

            if (!gameData) {
                await reply(sock, from, "Não existe nenhuma sessão ainda em andamento no grupo.");
                break;
            }

            // Verifica se é admin ou dono
            const ehAdmin = await isAdmin(sock, from, sender);
            const ehDono = isDono(sender);

            if (gameData.jogador === sender || ehAdmin || ehDono) {
                jogo.now = true;
                akinator.splice(gameIndex, 1);
                salvarAkinator();
                await reply(sock, from, `O akinator foi resetado com sucesso, a sessão foi deletada.`);
                await reagirMensagem(sock, message, "✅");
            } else {
                await reply(sock, from, "Somente o(s) adm(s) ou a pessoa que iniciou o jogo podem resetar.");
            }
        }
        break;

        case "instagram":
        case "ig": {
            try {
                // Verifica se foi fornecido um link
                if (!args[0]) {
                    await reply(sock, from, "❌ Por favor, forneça um link do Instagram.\n\nExemplo: `.ig https://instagram.com/p/xxxxx`");
                    break;
                }

                const url = args[0];
                
                // Verifica se é um link válido do Instagram
                if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
                    await reply(sock, from, "❌ Link inválido! Use um link do Instagram.");
                    break;
                }

                await reagirMensagem(sock, message, "⏳");
                await reply(sock, from, "📥 Baixando vídeo do Instagram, aguarde...");

                // Chama a API do Instagram
                const result = await igdl(url);
                
                if (!result.status || !result.data || result.data.length === 0) {
                    await reagirMensagem(sock, message, "❌");
                    await reply(sock, from, "❌ Não foi possível baixar este vídeo. Verifique se o link está correto e se o post é público.");
                    break;
                }

                const videoData = result.data[0];
                
                if (!videoData.url) {
                    await reagirMensagem(sock, message, "❌");
                    await reply(sock, from, "❌ Vídeo não encontrado neste post.");
                    break;
                }

                // Baixa o vídeo usando axios
                const videoResponse = await axios({
                    method: 'GET',
                    url: videoData.url,
                    responseType: 'arraybuffer'
                });

                const videoBuffer = Buffer.from(videoResponse.data);

                // Baixa a thumbnail se existir
                let thumbnailBuffer = null;
                if (videoData.thumbnail) {
                    try {
                        const thumbnailResponse = await axios({
                            method: 'GET',
                            url: videoData.thumbnail,
                            responseType: 'arraybuffer'
                        });
                        thumbnailBuffer = Buffer.from(thumbnailResponse.data);
                    } catch (err) {
                        console.log("❌ Erro ao baixar thumbnail:", err.message);
                    }
                }

                // Prepara a caption simples
                const caption = "📹 *Vídeo do Instagram baixado com sucesso!*\n\n© NEEXT LTDA";

                // Envia o vídeo com a thumbnail como caption (se disponível)
                await sock.sendMessage(from, {
                    video: videoBuffer,
                    caption: caption,
                    jpegThumbnail: thumbnailBuffer,
                    contextInfo: {
                        isForwarded: true,
                        forwardingScore: 100000,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363289739581116@newsletter",
                            newsletterName: "🐦‍🔥⃝ 𝆅࿙⵿ׂ𝆆𝝢𝝣𝝣𝝬𝗧𓋌𝗟𝗧𝗗𝗔⦙⦙ꜣྀ"
                        },
                        externalAdReply: {
                            title: "© NEEXT LTDA - Instagram Downloader",
                            body: "📱 Instagram: @neet.tk",
                            thumbnailUrl: videoData.thumbnail || "https://i.ibb.co/nqgG6z6w/IMG-20250720-WA0041-2.jpg",
                            mediaType: 1,
                            sourceUrl: "https://www.neext.online",
                            showAdAttribution: true
                        }
                    }
                }, { quoted: selinho2 });

                await reagirMensagem(sock, message, "✅");
                
            } catch (error) {
                console.error("❌ Erro no comando Instagram:", error);
                await reagirMensagem(sock, message, "❌");
                await reply(sock, from, "❌ Erro ao baixar vídeo do Instagram. Tente novamente mais tarde.");
            }
        }
        break;

        default:
            await sock.sendMessage(from, { text: `❌ Comando "${command}" não encontrado.\n\nDigite "prefixo" para ver meu prefixo ou "${prefix}ping" para testar.` }, { quoted: message });
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

// Processa respostas do jogo Akinator
async function processarRespostaAkinator(sock, text, from, normalized) {
    try {
        // Só funciona em grupos
        if (!from.endsWith('@g.us') && !from.endsWith('@lid')) return false;
        
        // Verifica se há um jogo ativo neste grupo
        const gameData = akinator.find(game => game.id === from);
        if (!gameData || gameData.finish === 1 || !gameData.aki) return false;
        
        const sender = normalized.key.participant || from;
        
        // Verifica se é a pessoa que iniciou o jogo
        if (gameData.jogador !== sender) return false;
        
        // Normaliza a resposta do usuário
        const resposta = text.toLowerCase().trim();
        let answer = null;
        
        // Mapeia as respostas para os valores aceitos pela API do Akinator
        switch (resposta) {
            case 'sim':
            case 's':
                answer = 0; // Yes
                break;
            case 'não':
            case 'nao':
            case 'n':
                answer = 1; // No
                break;
            case 'não sei':
            case 'nao sei':
            case 'ns':
                answer = 2; // Don't know
                break;
            case 'provavelmente sim':
            case 'provavel sim':
            case 'ps':
                answer = 3; // Probably
                break;
            case 'provavelmente não':
            case 'provavelmente nao':
            case 'provavel não':
            case 'provavel nao':
            case 'pn':
                answer = 4; // Probably not
                break;
            default:
                return false; // Não é uma resposta válida
        }
        
        await reagirMensagem(sock, normalized, "⏳");
        
        try {
            const aki = gameData.aki;
            
            // Envia a resposta para o Akinator
            await aki.step(answer);
            gameData.step++;
            
            // Verifica se o Akinator tem uma resposta/personagem (progresso > 80 ou mais de 78 perguntas)
            if (aki.progress >= 80 || aki.currentStep >= 78) {
                await aki.win();
                
                if (aki.answers && aki.answers.length > 0) {
                    const personagem = aki.answers[0];
                    
                    // Marca o jogo como finalizado
                    gameData.finish = 1;
                    salvarAkinator();
                    
                    // Envia a resposta do Akinator com imagem se disponível
                    const imagemPersonagem = personagem.absolute_picture_path || personagem.picture_path;
                    
                    if (imagemPersonagem && imagemPersonagem !== 'none') {
                        await sock.sendMessage(from, {
                            image: { url: imagemPersonagem },
                            caption: `🧞‍♂️ *AKINATOR DESCOBRIU!*\n\n` +
                                    `🎯 **${personagem.name}**\n` +
                                    `📝 *Descrição:* ${personagem.description || 'Personagem descoberto pelo Akinator'}\n` +
                                    `🎮 *Acurácia:* ${Math.round(aki.progress)}%\n\n` +
                                    `✨ O Akinator descobriu em ${aki.currentStep} perguntas!\n` +
                                    `🎉 Parabéns! Digite *.akinator* para jogar novamente.`,
                            contextInfo: {
                                forwardingScore: 100000,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: "120363289739581116@newsletter",
                                    newsletterName: "🐦‍🔥⃝ 𝆅࿙⵿ׂ𝆆𝝢𝝣𝝣𝝬𝗧𓋌𝗟𝗧𝗗𝗔⦙⦙ꜣྀ"
                                },
                                externalAdReply: {
                                    title: "© NEEXT LTDA - Akinator",
                                    body: "🧞‍♂️ O gênio descobriu!",
                                    thumbnailUrl: "https://i.ibb.co/nqgG6z6w/IMG-20250720-WA0041-2.jpg",
                                    mediaType: 1,
                                    sourceUrl: "www.neext.online"
                                }
                            }
                        }, { quoted: normalized });
                    } else {
                        await reply(sock, from, `🧞‍♂️ *AKINATOR DESCOBRIU!*\n\n` +
                                              `🎯 **${personagem.name}**\n` +
                                              `📝 *Descrição:* ${personagem.description || 'Personagem descoberto pelo Akinator'}\n` +
                                              `🎮 *Acurácia:* ${Math.round(aki.progress)}%\n\n` +
                                              `✨ O Akinator descobriu em ${aki.currentStep} perguntas!\n` +
                                              `🎉 Parabéns! Digite *.akinator* para jogar novamente.`);
                    }
                    
                    await reagirMensagem(sock, normalized, "🎉");
                    
                    // Remove o jogo da lista
                    const gameIndex = akinator.indexOf(gameData);
                    akinator.splice(gameIndex, 1);
                    salvarAkinator();
                    
                } else {
                    await reply(sock, from, "🧞‍♂️ O Akinator não conseguiu descobrir desta vez! Digite *.resetaki* para tentar novamente.");
                    gameData.finish = 1;
                    salvarAkinator();
                }
            } else {
                // Continua o jogo com a próxima pergunta
                await reply(sock, from, `🧞‍♂️ *AKINATOR QUESTIONS:*\n• Questão ${aki.currentStep + 1}: *${aki.question}*\n\n💭 *Progresso:* ${Math.round(aki.progress)}%`);
                await reagirMensagem(sock, normalized, "🧞‍♂️");
                
                salvarAkinator();
            }
        } catch (akinatorError) {
            console.error("❌ Erro na API do Akinator:", akinatorError);
            await reagirMensagem(sock, normalized, "❌");
            await reply(sock, from, "❌ Erro na conexão com o Akinator. Digite *.resetaki* para reiniciar o jogo.");
            
            // Remove o jogo da lista em caso de erro
            const gameIndex = akinator.findIndex(game => game.id === from);
            if (gameIndex !== -1) {
                akinator.splice(gameIndex, 1);
                salvarAkinator();
            }
        }
        
        return true;
        
    } catch (err) {
        console.error("❌ Erro ao processar resposta do Akinator:", err);
        await reagirMensagem(sock, normalized, "❌");
        await reply(sock, from, "❌ Erro ao processar sua resposta. Digite *.resetaki* para reiniciar o jogo.");
        return true;
    }
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

            // 🔹 Processamento do jogo Akinator
            const akinatorProcessed = await processarRespostaAkinator(sock, text, from, normalized);
            if (akinatorProcessed) continue; // se processou resposta do Akinator, não processa mais nada

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

            // 🔹 /s sem prefixo (comando especial)
            else if (text.startsWith("/s")) {
                try {
                    // Verifica se tem mídia marcada ou na própria mensagem
                    const quotedMsg = normalized.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    const hasQuotedMedia = quotedMsg && (quotedMsg.imageMessage || quotedMsg.videoMessage);
                    const hasDirectMedia = normalized.message.imageMessage || normalized.message.videoMessage;
                    
                    if (hasQuotedMedia || hasDirectMedia) {
                        await handleCommand(sock, normalized, "s", [], from, quoted);
                    } else {
                        await reagirMensagem(sock, normalized, "❌");
                        await reply(sock, from, "❌ Para usar /s você precisa:\n• Marcar uma imagem/vídeo e digitar /s\n• Ou enviar uma imagem/vídeo com legenda /s");
                    }
                } catch (err) {
                    console.error("❌ Erro no comando /s:", err);
                    await reply(sock, from, "❌ Erro ao processar comando /s");
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