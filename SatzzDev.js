require("./config");
const { Markup, Telegraf } = require("telegraf");
const fs = require("fs");
const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const { addResponList, delResponList, isAlreadyResponList, sendResponList } = require("./lib/list");
const chalk = require('chalk');
const moment = require("moment-timezone");
const BodyForm = require('form-data')


// Ucapan Waktu  
const timeWib = moment().tz('Asia/Jakarta').format('HH:mm:ss');
let ucapan = 'Selamat malam';
if (timeWib < "19:00:00") ucapan = 'Selamat malam';
if (timeWib < "18:00:00") ucapan = 'Selamat sore';
if (timeWib < "15:00:00") ucapan = 'Selamat siang';
if (timeWib < "11:00:00") ucapan = 'Selamat pagi';
if (timeWib < "06:00:00") ucapan = 'Selamat pagi';



const app = express();
const bot = new Telegraf(global.token);
let db = JSON.parse(fs.readFileSync("./src/list.json"));



function TelegraPh(Path) {
return new Promise (async (resolve, reject) => {
if (!fs.existsSync(Path)) return reject(new Error("File not Found"))
try {
const form = new BodyForm();
form.append("file", fs.createReadStream(Path))
const data = await axios({ url: "https://telegra.ph/upload",method: "POST", headers: { ...form.getHeaders() }, data: form })
return resolve("https://telegra.ph" + data.data[0].src)
} catch (err) {
return reject(new Error(String(err)))
}
})
}



const sleep = async (ms) => {
return new Promise((resolve) => setTimeout(resolve, ms));
};



const isOwner = (ctx, next) => {
if (ctx.from.id.toString() === global.owner) {
return next();
} else {
ctx.reply("Maaf, Anda tidak memiliki izin untuk menggunakan perintah ini.");
}
};






// STARTED
bot.start(async (ctx) => {
try {
const thumbs = await axios.get(global.thumbnail, { responseType: 'arraybuffer' });
const thumb = Buffer.from(thumbs.data).toString('base64');
await ctx.deleteMessage().catch(() => {});
if (db.length === 0) {
return ctx.reply("Tidak ada item dalam database.");
}
const buttons = db.map((item) => [{ text: item.name, callback_data: `show_${item.key}` }]);
await ctx.replyWithPhoto({ source: Buffer.from(thumb, 'base64') }, {
caption: `Halo @${ctx.from.username}!, Selamat datang di ${bot_name}!\n\nApa yang kamu butuhkan? Berikut daftar item kami:`,
parse_mode: 'Markdown',
reply_markup: {
inline_keyboard: buttons
}
});
} catch (error) {
console.error(error);
ctx.reply("Terjadi kesalahan saat menampilkan daftar.");
}
});





// ADDLIST COMMAND
bot.command("addlist", async (ctx) => {
try {
const args = ctx.message.text.split(" ").slice(1);
if (args.length < 1 && !ctx.message.reply_to_message) {
return ctx.reply("Penggunaan: /addlist <name>|<key>|<response> atau reply gambar dengan /addlist <name>|<key>|<response>", { reply_to_message_id: ctx.message.message_id });
}
const [name, key, response] = args.join(" ").split("|");
const isImage = ctx.message.reply_to_message && ctx.message.reply_to_message.photo ? true : false;
let image_buffer = null;
if (isImage) {
const photo = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1];
const img = photo.file_id;
const fileResponse = await axios.get(`https://api.telegram.org/bot${bot.token}/getFile?file_id=${img}`);
const filePath = fileResponse.data.result.file_path;
const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${filePath}`;
const buffer = await axios.get(fileUrl, { responseType: 'arraybuffer' });
image_buffer = Buffer.from(buffer.data).toString('base64');
}
if (db.some(item => item.key === key)) {
return ctx.reply("Key sudah ada di dalam database.", { reply_to_message_id: ctx.message.message_id });
}
addResponList(key, name, response || "", isImage, image_buffer, db);
fs.writeFileSync("./src/list.json", JSON.stringify(db, null, 2));
ctx.reply(`Respons untuk key "${key}" telah ditambahkan.`, { reply_to_message_id: ctx.message.message_id });
} catch (error) {
console.error(error);
ctx.reply("Terjadi kesalahan saat menambahkan list.");
}
});





// DELLLIST COMMAND
bot.command("dellist", isOwner, async (ctx) => {
try {
const args = ctx.message.text.split(" ").slice(1);
if (args.length < 1) {
return ctx.reply("Penggunaan: /dellist <key>", { reply_to_message_id: ctx.message.message_id });
}
const key = args[0];
if (!isAlreadyResponList(key, db)) {
return ctx.reply("Key tidak ditemukan di dalam database.", { reply_to_message_id: ctx.message.message_id });
}
delResponList(key, db);
fs.writeFileSync("./src/list.json", JSON.stringify(db, null, 2));
ctx.reply(`Respons untuk key "${key}" telah dihapus.`, { reply_to_message_id: ctx.message.message_id });
} catch (error) {
console.error(error);
ctx.reply("Terjadi kesalahan saat menghapus list.");
}
});





bot.command('tourl', async (ctx) => {
if (!ctx.message.reply_to_message) return ctx.reply('Reply to message');
if (!ctx.message.reply_to_message.photo) return ctx.reply('Reply message is not a photo');
const processingMessage = await ctx.reply('Uploading your image...', {reply_to_message_id: ctx.message.message_id});
const photo = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1];
const imageData = photo.file_id;
try {
const fileResponse = await axios.get(`https://api.telegram.org/bot${global.token}/getFile?file_id=${imageData}`);
const filePath = fileResponse.data.result.file_path;
const fileUrl = `https://api.telegram.org/file/bot${global.token}/${filePath}`;
const fileBufferResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
const fileBuffer = Buffer.from(fileBufferResponse.data);
const tempFilePath = 'temp_photo.jpg';
fs.writeFileSync(tempFilePath, fileBuffer);
const telegraPhUrl = await TelegraPh(tempFilePath);
await ctx.reply(telegraPhUrl,{reply_to_message_id: ctx.message.reply_to_message.message_id});
await ctx.deleteMessage(processingMessage.message_id);
fs.unlinkSync(tempFilePath);
} catch (err) {
console.error('Error uploading file:', err);
ctx.reply('Failed to upload file.');
}
})





// Perintah SENDLIST pada klik tombol
bot.action("list", async (ctx) => {
try {
const thumbs = await axios.get(global.thumbnail, { responseType: 'arraybuffer' });
const thumb = Buffer.from(thumbs.data).toString('base64');
await ctx.deleteMessage().catch(() => {});
if (db.length === 0) {
return ctx.reply("Tidak ada item dalam database.");
}
db = JSON.parse(fs.readFileSync("./src/list.json")); // Memuat ulang database
const buttons = db.map((item) => [{ text: item.name, callback_data: `show_${item.key}` }]);
await ctx.replyWithPhoto({ source: Buffer.from(thumb, 'base64') }, {
caption: `Halo @${ctx.from.username}!, Selamat datang di ${bot_name}!\n\nApa yang kamu butuhkan? Berikut daftar item kami:`,
parse_mode: 'Markdown',
reply_markup: {
inline_keyboard: buttons
}
});
} catch (error) {
console.error(error);
ctx.reply("Terjadi kesalahan saat menampilkan daftar.");
}
});





// SHOW LIST COMMAND on slash command
bot.command("list", async (ctx) => {
try {
const thumbs = await axios.get(global.thumbnail, { responseType: 'arraybuffer' });
const thumb = Buffer.from(thumbs.data).toString('base64');
await ctx.deleteMessage().catch(() => {});
if (db.length === 0) {
return ctx.reply("Tidak ada item dalam database.");
}
db = JSON.parse(fs.readFileSync("./src/list.json")); // Memuat ulang database
const buttons = db.map((item) => [{ text: item.name, callback_data: `show_${item.key}` }]);
await ctx.replyWithPhoto({ source: Buffer.from(thumb, 'base64') }, {
caption: `Halo @${ctx.from.username}!, Selamat datang di ${bot_name}!\n\nApa yang kamu butuhkan? Berikut daftar item kami:`,
parse_mode: 'Markdown',
reply_markup: {
inline_keyboard: buttons
}
});
} catch (error) {
console.error(error);
ctx.reply("Terjadi kesalahan saat menampilkan daftar.");
}
});





// SHOW LIST COMMAND on button click
bot.action(/^show_/, async (ctx) => {
try {
ctx.deleteMessage().catch(() => {});
db = JSON.parse(fs.readFileSync("./src/list.json")); // Memuat ulang database
const key = ctx.match.input.split("_")[1];
const item = db.find((item) => item.key === key);
if (item) {
if (item.isImage) {
const imageBuffer = Buffer.from(item.image_buffer, 'base64');
await ctx.replyWithPhoto({ source: imageBuffer }, {
caption: item.response,
reply_markup: {
inline_keyboard: [[{ text: 'Kembali', callback_data: 'list' }]]
}
});
} else {
ctx.reply(item.response, Markup.inlineKeyboard([[Markup.button.callback("Kembali", "list")]]));
}
} else {
ctx.reply(`Tidak ada respons yang ditemukan untuk key "${key}".`);
}
} catch (error) {
console.error(error);
ctx.reply("Terjadi kesalahan saat menampilkan respons.");
}
});








// RESPONSE TEXT 
bot.on("text", (ctx) => {
ctx.reply("Maaf, saya tidak mengerti perintah Anda. Ketik /list untuk melihat menu.");
});

// FAKE WEB
app.get("/", (req, res) => {
res.sendFile("./src/index.html", { root: __dirname });
});

// FAKE WEB
app.listen(3000, () => {
console.log(chalk.greenBright("Bot launched successfully!"));
});

// START THE BOT
bot.launch().then(() => {
console.log(chalk.greenBright("Bot launched successfully!"));
}).catch((error) => {
console.error("Error launching bot:", error);
});

// Schedule a check every minute to ensure bot is running
cron.schedule('* * * * *', () => {
console.log(chalk.yellowBright('Checking bot status...'));
if (!bot.isPolling()) {
console.error('Bot is not polling, restarting...');
process.exit(1); // Force exit to trigger Railway restart
}
});
