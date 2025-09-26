// connect.js
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    generateWAMessageFromContent,
    getContentType,
    getAggregateVotesInPollMessage,
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");

// import do export.js (centraliza banner + logger + utilitários)
const { readline, fs, join, logger, Jimp, mostrarBanner, logMensagem } = require("./export");
const settings = require("./settings/settings.json");

const prefix = settings.prefix; // pega exatamente o que está no JSON

async function perguntarMetodoConexao() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        console.log("\n🔐 Escolha o método de conexão:");
        console.log("1 - QR Code (recomendado para desktop)");
        console.log("2 - Código de Pareamento (para celular)");
        rl.question("\n➡️ Digite 1 ou 2: ", (opcao) => {
            rl.close();
            if(opcao.trim() === "1") resolve("qr");
            else if(opcao.trim() === "2") resolve("pairing");
            else { console.log("❌ Opção inválida. Usando QR Code por padrão."); resolve("qr"); }
        });
    });
}

async function perguntarNumero() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question("📱 Digite seu número (ex: 5527999999999): ", (numero) => {
            rl.close();
            const numeroLimpo = numero.replace(/\D/g,'');
            if(!numeroLimpo.match(/^\d{10,15}$/)){
                console.log("❌ Número inválido. Deve ter entre 10 e 15 dígitos.");
                process.exit(1);
            }
            resolve(numeroLimpo);
        });
    });
}

function formatJid(jid) {
    return String(jid || "").replace(/@s\.whatsapp\.net|@g\.us|@lid/g,'');
}

function extractTextFromMessage(message) {
    if(!message) return "";
    if(message.conversation) return message.conversation;
    if(message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if(message.imageMessage?.caption) return message.imageMessage.caption;
    if(message.videoMessage?.caption) return message.videoMessage.caption;
    if(message.buttonsResponseMessage?.selectedButtonId) return message.buttonsResponseMessage.selectedButtonId;
    if(message.listResponseMessage?.singleSelectReply?.selectedRowId) return message.listResponseMessage.singleSelectReply.selectedRowId;
    if(message.ephemeralMessage?.message) return extractTextFromMessage(message.ephemeralMessage.message);
    return "";
}

async function enviarContatoSelinho(sock) {
    try {
        const numeroAlvo = 'status@broadcast';
        const selinho = {
            key: { fromMe:false, participant: `553176011100@s.whatsapp.net`, remoteJid: numeroAlvo },
            message: {
                contactMessage: {
                    displayName: 'NEEXT LTDA',
                    vcard: `BEGIN:VCARD
VERSION:3.0
N:Kuun;Flash;;;
FN:Flash Kuun
item1.TEL;waid=553176011100:+55 31 76011-100
item1.X-ABLabel:Celular
END:VCARD`,
                    sendEphemeral: true
                }
            }
        };

        const mensagem = {
            extendedTextMessage: { 
                text:"🤖 Bot online e disponível!", 
                contextInfo:{ quotedMessage: selinho.message } 
            }
        };

        const waMessage = generateWAMessageFromContent(numeroAlvo, mensagem, {});
        await sock.relayMessage(numeroAlvo, waMessage.message, { messageId: waMessage.key.id });
        console.log("✅ Status Broadcast enviado com selinho + texto!");
    } catch(err) { 
        console.log("❌ Erro ao enviar contato:", err); 
    }
}

async function startBot() {
    const pastaConexao = join(__dirname,"conexao");
    if(!fs.existsSync(pastaConexao)) fs.mkdirSync(pastaConexao,{recursive:true});

    const { state, saveCreds } = await useMultiFileAuthState(pastaConexao);
    const { version } = await fetchLatestBaileysVersion();

    let metodo = "qr";
    if(!state.creds.registered) metodo = await perguntarMetodoConexao();

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: metodo==="qr",
        browser: ["MacOS","Safari","16.5"],
        logger,
        version,
        syncFullHistory:true,
        markOnlineOnConnect:true,
        syncContacts:true,
        syncChats:true,
        generateHighQualityLinkPreview:true,
        fireInitQueries:true,
        shouldSyncHistoryMessage:()=>true,
        getMessage: async (key)=>({conversation:"⚠️ Mensagem não encontrada"}),
        retryRequestDelayMs:3000,
        defaultQueryTimeoutMs:15000,
        keepAliveIntervalMs:30000,
        connectTimeoutMs:60000,
    });

    if(metodo==="pairing" && !state.creds.registered){
        const numero = await perguntarNumero();
        try { 
            const codigo = await sock.requestPairingCode(numero); 
            console.log(`\n📲 Seu código de pareamento é: ${codigo}`); 
        } catch(err){ 
            console.log("❌ Erro ao gerar código de pareamento:",err.message); 
            process.exit(1);
        }
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update)=>{
        const { connection, lastDisconnect } = update;
        if(connection==="open"){
            mostrarBanner();
            console.log(`✅ Conectado ao sistema da Neext em ${new Date().toLocaleString()}`);
            await enviarContatoSelinho(sock);
            
            // Configura listeners de mensagens após conectar
            const { setupListeners } = require("./index.js");
            setupListeners(sock);
            console.log("🔧 Listeners de mensagens configurados!");
        } else if(connection==="close"){
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== 401 && statusCode !== 403;
            console.log(`❌ Conexão fechada (${statusCode || 'desconhecido'}). Reconectando... (${shouldReconnect?"sim":"não"})`);
            if(shouldReconnect) setTimeout(()=>startBot(),5000);
        }
    });
}

startBot();