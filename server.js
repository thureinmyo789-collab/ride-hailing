const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let passengersLocations = {};

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    // ခရီးသည် တည်နေရာ အပ်ဒိတ်လုပ်ခြင်း
    socket.on('liveLocationUpdate', (data) => {
        passengersLocations[socket.id] = { 
            id: socket.id, 
            lat: data.lat, 
            lng: data.lng 
        };
        // ယာဉ်မောင်းအားလုံးထံသို့ ခရီးသည် တည်နေရာ ပို့ပေးခြင်း
        io.emit('liveLocationUpdate', passengersLocations[socket.id]);
    });

    // ယာဉ်မောင်းမှ ခရီးစဉ်ကို လက်ခံခြင်း (ခရီးသည်ဘက်သို့ ယာဉ်မောင်း တည်နေရာနှင့် စာ ပို့မည်)
    socket.on('acceptRide', (data) => {
        io.to(data.passengerId).emit('rideAccepted', {
            message: data.message,
            driverId: socket.id
        });
    });

    // ယာဉ်မောင်း တည်နေရာ ရွေ့လျားမှုကို သက်ဆိုင်ရာ ခရီးသည်ဆီ ပို့ပေးခြင်း
    socket.on('driverLocationUpdate', (data) => {
        if (data.passengerId) {
            io.to(data.passengerId).emit('driverLocationUpdate', {
                lat: data.lat,
                lng: data.lng
            });
        }
    });

    // ယာဉ်မောင်း ရောက်ရှိကြောင်း အကြောင်းကြားခြင်း
    socket.on('driverArrived', (data) => {
        if (data.passengerId) {
            io.to(data.passengerId).emit('driverArrived', data);
        }
    });

    // ခရီးစဉ် ပြီးဆုံးကြောင်း
    socket.on('finishRide', (data) => {
        if (data.passengerId) {
            io.to(data.passengerId).emit('rideFinished', data);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id);
        delete passengersLocations[socket.id];
        io.emit('removePassengerMarker', { passengerId: socket.id });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

