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
        ff(input)
            .on("error", reject)
            .on("end", () => resolve())
            .addOutputOptions([
                "-vcodec", "libwebp",
                "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0",
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

// Cria sticker e envia
async function createSticker(buffer, sock, from) {
    try {
        const webpFile = await bufferToWebp(buffer);
        const img = new webp.Image();
        await img.load(webpFile);

        const json = {
            "sticker-pack-id": "bot",
            "sticker-pack-name": "AutoFig",
            "sticker-pack-publisher": "Bot"
        };

        const exifAttr = Buffer.from([0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);

        img.exif = exif;
        await img.save(webpFile);

        await sock.sendMessage(from, { sticker: fs.readFileSync(webpFile) });
        fs.unlinkSync(webpFile);
    } catch (err) {
        console.log("❌ Erro ao criar figurinha:", err);
        await sock.sendMessage(from, { text: "❌ Erro ao criar figurinha." });
    }
}

module.exports = { createSticker };