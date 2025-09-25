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

await conn.sendMessage(jid, {sticker: {url: buffer}, ...options}, {quoted})
return buffer;
};



const sendVideoAsSticker = async (conn, jid, path, quoted, options = {}) => {
let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
 let buffer;
 // SEMPRE usa writeExifVid para preservar metadados personalizados
 buffer = await writeExifVid(buff, options);

await conn.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
return buffer;
}

module.exports = {
sendVideoAsSticker,
sendImageAsSticker
};