const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let passengersLocations = {};

io.on('connection', (socket) => {
    console.log('ချိတ်ဆက်မှု ရရှိပါပြီ ID: ' + socket.id);

    for (let id in passengersLocations) {
        socket.emit('liveLocationUpdate', {
            id: id,
            lat: passengersLocations[id].lat,
            lng: passengersLocations[id].lng
        });
    }

    socket.on('liveLocationUpdate', (data) => {
        passengersLocations[socket.id] = { lat: data.lat, lng: data.lng };
        io.emit('liveLocationUpdate', {
            id: socket.id,
            lat: data.lat,
            lng: data.lng
        });
    });

    socket.on('acceptRide', (data) => {
        if (data.passengerId) {
            io.to(data.passengerId).emit('rideAccepted', { message: 'ယာဉ်မောင်းမှ သင့်ခရီးစဉ်ကို လက်ခံလိုက်ပါပြီ။' });
        } else {
            io.emit('rideAccepted', { message: 'ယာဉ်မောင်းမှ သင့်ခရီးစဉ်ကို လက်ခံလိုက်ပါပြီ။' });
        }
        io.emit('driverAssigned', data);
    });

    socket.on('driverLocationUpdate', (data) => {
        io.emit('driverLocationUpdate', data);
    });

    // ခရီးစဉ်ပြီးဆုံးပါက ထိုခရီးသည်၏ တည်နေရာကိုသာ ဖျက်ပြီး ယာဉ်မောင်းမားကာ ဆက်ရှိစေရန်
    socket.on('finishRide', (data) => {
        if (data.passengerId && passengersLocations[data.passengerId]) {
            delete passengersLocations[data.passengerId];
        }
        // သက်ဆိုင်ရာ ခရီးသည်ဘက်သို့ ပြီးဆုံးကြောင်း အသိပေးခြင်း
        io.to(data.passengerId).emit('rideFinished', data);
        // ယာဉ်မောင်းဘက်တွင်လည်း ထိုခရီးသည်မားကာ ဖျက်ရန် အချက်ပြခြင်း
        io.emit('removePassengerMarker', { passengerId: data.passengerId });
    });

    socket.on('disconnect', () => {
        console.log('ချိတ်ဆက်မှု ပြတ်တောက်သွားပါပြီ ID: ' + socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

