const fs = require("fs");
const { tmpdir } = require("os");
const path = require("path");
const Crypto = require("crypto");
const ff = require("fluent-ffmpeg");
const webp = require("node-webpmux");

// Gera arquivo temporário
function getRandomFile(ext) {
    return path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}${ext}`);
}

// Converte Buffer para WebP
async function bufferToWebp(buffer, isVideo = false) {
    const input = getRandomFile(isVideo ? ".mp4" : ".jpg");
    const output = getRandomFile(".webp");

    fs.writeFileSync(input, buffer);

    await new Promise((resolve, reject) => {
        const ffmpegCommand = ff(input)
            .on("error", reject)
            .on("end", () => resolve());

        // Para vídeos, adicionar tempo máximo de 3 segundos ANTES das opções (compatibilidade WhatsApp)
        if (isVideo) {
            ffmpegCommand.duration(3);
        }

        ffmpegCommand
            .addOutputOptions([
                "-vcodec", "libwebp",
                "-vf", "scale='min(320,iw)':'min(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0",
                "-loop", "0",
                "-preset", "default",
                "-an",
                "-vsync", "0"
            ])
            .toFormat("webp")
            .save(output);
    });

    fs.unlinkSync(input);
    return output;
}

// Função writeExif para compatibilidade com index.js
async function writeExif(media, metadata) {
    const { mimetype, data } = media;
    
    // Para comando RENAME: usa EXATAMENTE os valores fornecidos sem fallbacks
    // Para outros comandos: usa fallbacks NEEXT se não houver valores
    let packname, author, categories;
    
    if (metadata._isRename) {
        // Comando rename: usa APENAS os valores fornecidos pelo usuário
        packname = metadata.packname;
        author = metadata.author;
        categories = metadata.categories || ["😎"];
    } else {
        // Outros comandos: pode usar fallbacks NEEXT
        packname = metadata.packname || "NEEXT LTDA";
        author = metadata.author || "NEEXT BOT";
        categories = metadata.categories || ["😎"];
    }
    
    // Detecta se é vídeo/GIF
    const isVideo = mimetype && (
        mimetype.includes('video') || 
        mimetype.includes('gif') ||
        mimetype === 'image/gif'
    );
    
    const webpFile = await bufferToWebp(data, isVideo);
    const img = new webp.Image();
    await img.load(webpFile);

    const json = {
        "sticker-pack-id": `${packname}-${Date.now()}`,
        "sticker-pack-name": packname,
        "sticker-pack-publisher": author,
        "sticker-pack-categories": categories
    };

    const exifAttr = Buffer.from([0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    img.exif = exif;
    await img.save(webpFile);

    return webpFile;
}

// Cria sticker e envia (versão melhorada)
async function createSticker(buffer, sock, from, isVideo = false) {
    try {
        const agora = new Date();
        const dataHora = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR')}`;
        
        const webpFile = await writeExif(
            { mimetype: isVideo ? 'video/mp4' : 'image/jpeg', data: buffer },
            { 
                packname: "NEEXT LTDA", 
                author: `NEEXT BOT - ${dataHora}`, 
                categories: ["🔥"] 
            }
        );
        
        const stickerBuffer = fs.readFileSync(webpFile);
        await sock.sendMessage(from, { sticker: stickerBuffer });
        fs.unlinkSync(webpFile);
        
        console.log("✅ Figurinha criada com sucesso!");
    } catch (err) {
        console.log("❌ Erro ao criar figurinha:", err);
        await sock.sendMessage(from, { text: "❌ Erro ao criar figurinha." });
    }
}

module.exports = { createSticker, writeExif };