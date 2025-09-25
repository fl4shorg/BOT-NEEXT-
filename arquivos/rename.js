const fs = require('fs-extra');
const {
imageToWebp,
videoToWebp,
writeExifImg,
writeExifVid
} = require('./exif');
const {
getBuffer
} = require('./funcoes/function.js');

const sendImageAsSticker = async (conn, jid, path, quoted, options = {}) => {
let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
 let buffer;
 // SEMPRE usa writeExifImg para preservar metadados personalizados
 buffer = await writeExifImg(buff, options);

// ContextInfo para fazer aparecer como "enviada via anúncio"
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

await conn.sendMessage(jid, {
    sticker: {url: buffer}, 
    contextInfo: contextAnuncio,
    ...options
}, {quoted})
return buffer;
};



const sendVideoAsSticker = async (conn, jid, path, quoted, options = {}) => {
let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
 let buffer;
 // SEMPRE usa writeExifVid para preservar metadados personalizados
 buffer = await writeExifVid(buff, options);

// ContextInfo para fazer aparecer como "enviada via anúncio"
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

await conn.sendMessage(jid, { 
    sticker: { url: buffer }, 
    contextInfo: contextAnuncio,
    ...options 
}, { quoted })
return buffer;
}

module.exports = {
sendVideoAsSticker,
sendImageAsSticker
};