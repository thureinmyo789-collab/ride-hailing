const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('ချိတ်ဆက်မှု ရရှိပါပြီ ID: ' + socket.id);

    // ခရီးသည်ဘက်မှ ပို့လိုက်သော liveLocationUpdate ကို လက်ခံရယူခြင်း
    socket.on('liveLocationUpdate', (data) => {
        // ယာဉ်မောင်းများနှင့် အခြားချိတ်ဆက်ထားသူများထံသို့ ပြန်လည်ထုတ်လွှင့်ခြင်း
        io.emit('liveLocationUpdate', data);
    });

        socket.on('disconnect', () => {
        console.log('ချိတ်ဆက်မှု ပြတ်တောက်သွားပါပြီ');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`ဆာဗာ စတင်အလုပ်လုပ်နေပါပြီ http://localhost:${PORT}`);
});
