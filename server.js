const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('ချိတ်ဆက်မှု ရရှိပါပြီ ID: ' + socket.id);

    // ခရီးသည်မှ liveLocationUpdate ပို့လာလျှင် ယာဉ်မောင်းများထံသို့ socket.id နှင့်တကွ ပို့ပေးခြင်း
    socket.on('liveLocationUpdate', (data) => {
        io.emit('liveLocationUpdate', {
            id: socket.id,
            lat: data.lat,
            lng: data.lng
        });
    });

    // ယာဉ်မောင်းမှ ခရီးစဉ်ကို လက်ခံလိုက်သည့်အခါ သက်ဆိုင်ရာ ခရီးသည်ထံသို့ အကြောင်းကြားခြင်း
    socket.on('acceptRide', (data) => {
        if (data.passengerId) {
            io.to(data.passengerId).emit('rideAccepted', { message: 'ယာဉ်မောင်းမှ သင့်ခရီးစဉ်ကို လက်ခံလိုက်ပါပြီ။' });
        } else {
            io.emit('rideAccepted', { message: 'ယာဉ်မောင်းမှ ခရီးစဉ်ကို လက်ခံလိုက်ပါပြီ။' });
        }
        io.emit('driverAssigned', data);
    });

    // ယာဉ်မောင်း၏ တည်နေရာကို ခရီးသည်များထံသို့ Real-time ပို့ပေးခြင်း
    socket.on('driverLocationUpdate', (data) => {
        io.emit('driverLocationUpdate', data);
    });

    socket.on('disconnect', () => {
        console.log('ချိတ်ဆက်မှု ပြတ်တောက်သွားပါပြီ ID: ' + socket.id);
        io.emit('userDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

