require("./config");
const { Markup, Telegraf } = require("telegraf");
const fs = require("fs");
const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const chalk = require('chalk');
const moment = require("moment-timezone");
const BodyForm = require('form-data')



const app = express();
const bot = new Telegraf(global.token);




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

function reSize(buffer, ukur1, ukur2) {
const jimp = require('jimp')
return new Promise(async(resolve, reject) => {
var baper = await jimp.read(buffer);
var ab = await baper.resize(ukur1, ukur2).getBufferAsync(jimp.MIME_JPEG)
resolve(ab)
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
await ctx.replyWithPhoto({ source: Buffer.from(thumb, 'base64') }, {
caption: `Halo @${ctx.from.username}!, Selamat datang di ${bot_name}!\n\nApa yang kamu butuhkan? Berikut daftar item kami:`,
parse_mode: 'Markdown',
reply_markup: {
inline_keyboard: [{ text: 'Website', url: `https://satganzdevs.tech` }]
}
});
} catch (error) {
console.error(error);
ctx.reply("Terjadi kesalahan saat menampilkan daftar.");
}
});


//wellcome
bot.on('new_chat_members', (ctx) => {
const newUser = ctx.message.new_chat_member;
ctx.replyWithPhoto('https://telegra.ph/file/f89890cc5f9f0f5098f22.jpg',{caption: `Halo ${newUser.first_name}, selamat datang di ${ctx.chat.title}! Jangan lupa baca deskripsi ya.`,parse_mode: 'Markdown',reply_markup: {inline_keyboard: [[{text: 'WhatsApp Group', url: 'https://chat.whatsapp.com/G6W25LQb4Ce2i8r4Z0du1q'}]]}});
}); 

//leave
bot.on('left_chat_member', (ctx) => {
const leftUser = ctx.message.left_chat_member;
bot.telegram.sendPhoto(leftUser.id,'https://telegra.ph/file/85d17018c69db96f618b7.jpg',{caption: `Jangan lupain kita ya, ${leftUser.first_name}. Nanti kalo mau join lagi, klik tombol di bawah ini.`,parse_mode: 'Markdown',reply_markup: {inline_keyboard: [[{text: 'Join', url: 'https://t.me/satzzcode'}]]}});
});



// Command: /tourl
bot.command('tourl', async (ctx) => {
    if (!ctx.message.reply_to_message) return ctx.reply('Reply to a message with an image');
    if (!ctx.message.reply_to_message.photo) return ctx.reply('Reply message is not a photo');
    const processingMessage = await ctx.reply('Uploading your image...', { reply_to_message_id: ctx.message.message_id });
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
        await ctx.deleteMessage(processingMessage.message_id);
        await ctx.reply(telegraPhUrl, { reply_to_message_id: ctx.message.reply_to_message.message_id });
        fs.unlinkSync(tempFilePath);
    } catch (err) {
        console.error('Error uploading file:', err);
        ctx.reply('Failed to upload file.');
    }
});

// Command: /resize
bot.command('resize', async (ctx) => {
    if (!ctx.message.reply_to_message) return ctx.reply('Reply to a message with an image');
    if (!ctx.message.reply_to_message.photo) return ctx.reply('Reply message is not a photo');
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) return ctx.reply('Usage: /resize <width> <height>');
    const width = parseInt(args[0]);
    const height = parseInt(args[1]);
    if (isNaN(width) || isNaN(height)) return ctx.reply('Invalid width or height');
    const photo = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1];
    const imageData = photo.file_id;
    const processingMessage = await ctx.reply('Uploading your image...', { reply_to_message_id: ctx.message.message_id });
    try {
        const fileResponse = await axios.get(`https://api.telegram.org/bot${global.token}/getFile?file_id=${imageData}`);
        const filePath = fileResponse.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${global.token}/${filePath}`;
        const fileBufferResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const fileBuffer = Buffer.from(fileBufferResponse.data);
        const resizedImage = await reSize(fileBuffer, width, height);
        await ctx.deleteMessage(processingMessage.message_id);
        await ctx.replyWithPhoto({ source: resizedImage }, { reply_to_message_id: ctx.message.reply_to_message.message_id });
    } catch (err) {
        console.error('Error resizing image:', err);
        ctx.reply('Failed to resize image.');
    }
});




app.get('/', async (req, res) => {
let ip = req.ip;
const forwardedFor = req.headers['x-forwarded-for'];
const cloudflareIp = req.headers['cf-connecting-ip'];
if (forwardedFor) {
ip = forwardedFor.split(',')[0].trim();
} else if (cloudflareIp) {
ip = cloudflareIp;
}
try {
const response = await axios.get(`https://api.ipbase.com/v1/json/${ip}`);
const data = response.data;
console.log(data)
// Extract the relevant information
const visitorInfo = {
ip: data.ip,
country: data.country_name,
region: data.region_name,
city: data.city,
zipCode: data.zip_code,
timezone: data.timezone,
latitude: data.latitude,
longitude: data.longitude,
metroCode: data.metro_code,
};
const message = `*New Visitor*

_IP:_ ||${visitorInfo.ip}||
_COUNTRY:_ ${visitorInfo.country}
_REGION:_ ${visitorInfo.region}
_CITY:_ ${visitorInfo.city}
_ZIP CODE:_ ${visitorInfo.zipCode}
_TIMEZONE:_ ${visitorInfo.timezone}
_LATITUDE:_ ${visitorInfo.latitude}
_LONGITUDE:_ ${visitorInfo.longitude}
_METRO CODE:_ ${visitorInfo.metroCode}
`;
bot.telegram.sendMessage(global.owner, message, {protect_content: true, parse_mode: 'MarkdownV2'});
res.sendFile('./src/index.html', { root: __dirname });
} catch (error) {
console.error(error);
res.status(500).send('Error processing request');
}
});
function formatVisitorInfo(visitorInfo) {
return `
IP: ${visitorInfo.ip}
COUNTRY: ${visitorInfo.country}
REGION: ${visitorInfo.region}
CITY: ${visitorInfo.city}
ZIP CODE: ${visitorInfo.zipCode}
TIMEZONE: ${visitorInfo.timezone}
LATITUDE: ${visitorInfo.latitude}
LONGITUDE: ${visitorInfo.longitude}
METRO CODE: ${visitorInfo.metroCode}
`;
}

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
