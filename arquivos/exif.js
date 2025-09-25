const fs = require('fs');
const { writeExif } = require('./sticker.js');

// Função para converter imagem para WebP
async function imageToWebp(buffer) {
    try {
        // Usa a função existente do sticker.js
        const media = { data: buffer, mimetype: 'image/jpeg' };
        const metadata = { packname: "NEEXT LTDA", author: "NEEXT BOT" };
        return await writeExif(media, metadata);
    } catch (error) {
        console.error('Erro ao converter imagem para WebP:', error);
        throw error;
    }
}

// Função para converter vídeo para WebP
async function videoToWebp(buffer) {
    try {
        // Usa a função existente do sticker.js para vídeos
        const media = { data: buffer, mimetype: 'video/mp4' };
        const metadata = { packname: "NEEXT LTDA", author: "NEEXT BOT" };
        return await writeExif(media, metadata);
    } catch (error) {
        console.error('Erro ao converter vídeo para WebP:', error);
        throw error;
    }
}

// Função para escrever EXIF em imagens com dados personalizados
async function writeExifImg(buffer, options = {}) {
    try {
        const { packname = "NEEXT LTDA", author = "NEEXT BOT" } = options;
        const media = { data: buffer, mimetype: 'image/jpeg' };
        const metadata = { packname, author };
        return await writeExif(media, metadata);
    } catch (error) {
        console.error('Erro ao escrever EXIF na imagem:', error);
        throw error;
    }
}

// Função para escrever EXIF em vídeos com dados personalizados
async function writeExifVid(buffer, options = {}) {
    try {
        const { packname = "NEEXT LTDA", author = "NEEXT BOT" } = options;
        const media = { data: buffer, mimetype: 'video/mp4' };
        const metadata = { packname, author };
        return await writeExif(media, metadata);
    } catch (error) {
        console.error('Erro ao escrever EXIF no vídeo:', error);
        console.log('🔄 Tentando processar como imagem estática...');
        
        // Fallback: tenta processar como imagem se falhar como vídeo
        try {
            const media = { data: buffer, mimetype: 'image/webp' };
            const metadata = { packname, author };
            return await writeExif(media, metadata);
        } catch (fallbackError) {
            console.error('❌ Fallback também falhou:', fallbackError);
            throw error; // Lança o erro original
        }
    }
}

module.exports = {
    imageToWebp,
    videoToWebp,
    writeExifImg,
    writeExifVid
};