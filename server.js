const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('ချိတ်ဆက်မှု ရရှိပါပြီ ID: ' + socket.id);

    socket.on('passenger-location', (data) => {
        io.emit('update-driver-map', data);
    });

    socket.on('disconnect', () => {
        console.log('ချိတ်ဆက်မှု ပြတ်တောက်သွားပါပြီ');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`ဆာဗာ စတင်အလုပ်လုပ်နေပါပြီ http://localhost:${PORT}`);
});
