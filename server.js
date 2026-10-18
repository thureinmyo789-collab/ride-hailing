const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.get('/register-driver.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register-driver.html'));
});
app.use(express.json());

const DRIVERS_FILE = path.join(__dirname, 'drivers.json');

// မူရင်း ယာဉ်မောင်းဖိုင် မရှိသေးပါက နမူနာစာရင်းဖြင့် စတင်ဖန်တီးခြင်း
if (!fs.existsSync(DRIVERS_FILE)) {
    const initialDrivers = [
        {
            name: "ဦးကျော်ကျော်",
            phone: "09123456789",
            car: "Toyota Alphard (က-၁၂၃၄)",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"
        },
        {
            name: "ကိုစိုးမိုး",
            phone: "09987654321",
            car: "Toyota Crown (ခ-၅၆၇၈)",
            image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100"
        }
    ];
    fs.writeFileSync(DRIVERS_FILE, JSON.stringify(initialDrivers, null, 2));
}

// ယာဉ်မောင်းစာရင်း ထုတ်ပေးသော API
app.get('/api/drivers', (req, res) => {
    try {
        const data = fs.readFileSync(DRIVERS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: "မအောင်မြင်ပါ" });
    }
});

// ယာဉ်မောင်း အကောင့်ဝင်ခြင်း (Login/Verify) စစ်ဆေးသော API
app.post('/api/driver-login', (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: "ဖုန်းနံပါတ် ထည့်သွင်းရန် လိုအပ်ပါသည်။" });
        }

        const data = fs.readFileSync(DRIVERS_FILE, 'utf8');
        const drivers = JSON.parse(data);

        const driver = drivers.find(d => d.phone === phone);
        if (!driver) {
            return res.status(404).json({ success: false, message: "ဤဖုန်းနံပါတ်ဖြင့် မှတ်ပုံတင်ထားခြင်း မရှိသေးပါ။ ကျေးဇူးပြု၍ အရင် မှတ်ပုံတင်ပါ။" });
        }

        res.json({ success: true, message: "အကောင့်ဝင်ရောက်မှု အောင်မြင်ပါသည်။", driver });
    } catch (err) {
        res.status(500).json({ success: false, message: "ဆာဗာ အမှားအယွင်း ရှိနေပါသည်။" });
    }
});

// ယာဉ်မောင်းအသစ် Register လုပ်သော API
app.post('/api/register-driver', (req, res) => {
    try {
        const { name, phone, car, image } = req.body;
        if (!name || !phone || !car) {
            return res.status(400).json({ success: false, message: "အချက်အလက်များ မပြည့်စုံပါ။" });
        }

        const data = fs.readFileSync(DRIVERS_FILE, 'utf8');
        const drivers = JSON.parse(data);

        const existing = drivers.find(d => d.phone === phone);
        if (existing) {
            return res.status(400).json({ success: false, message: "ဤဖုန်းနံပါတ်ဖြင့် မှတ်ပုံတင်ပြီးသား ဖြစ်ပါသည်။" });
        }

        const newDriver = {
            name,
            phone,
            car,
            image: image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
        };

        drivers.push(newDriver);
        fs.writeFileSync(DRIVERS_FILE, JSON.stringify(drivers, null, 2));

        res.json({ success: true, message: "ယာဉ်မောင်း မှတ်ပုံတင်ခြင်း အောင်မြင်ပါသည်။", driver: newDriver });
    } catch (err) {
        res.status(500).json({ success: false, message: "ဆာဗာ အမှားအယွင်း ရှိနေပါသည်။" });
    }
});

// ယာဉ်မောင်းအား ဖျက်ဆီးသော (Delete) API
app.delete('/api/drivers/:phone', (req, res) => {
    try {
        const phoneToDelete = req.params.phone;
        const data = fs.readFileSync(DRIVERS_FILE, 'utf8');
        let drivers = JSON.parse(data);

        const filteredDrivers = drivers.filter(d => d.phone !== phoneToDelete);

        if (filteredDrivers.length === drivers.length) {
            return res.status(404).json({ success: false, message: "ရှာမတွေ့ပါ။" });
        }

        fs.writeFileSync(DRIVERS_FILE, JSON.stringify(filteredDrivers, null, 2));
        res.json({ success: true, message: "ယာဉ်မောင်းကို အောင်မြင်စွာ ဖယ်ရှားပြီးပါပြီ။" });
    } catch (err) {
        res.status(500).json({ success: false, message: "ဆာဗာ အမှားအယွင်း ရှိနေပါသည်။" });
    }
});

let passengersLocations = {};

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    socket.on('liveLocationUpdate', (data) => {
        passengersLocations[socket.id] = { 
            id: socket.id, 
            lat: data.lat, 
            lng: data.lng,
            destLat: data.destLat,
            destLng: data.destLng,
            driverPhone: data.driverPhone
        };
        io.emit('liveLocationUpdate', passengersLocations[socket.id]);
    });

    socket.on('passengerRequestRide', (data) => {
        io.emit('passengerRequestedRide', {
            passengerId: socket.id,
            lat: data.lat,
            lng: data.lng,
            destLat: data.destLat,
            destLng: data.destLng,
            driverPhone: data.driverPhone,
            driverName: data.driverName,
            carInfo: data.carInfo
        });
    });

    socket.on('acceptRide', (data) => {
        io.to(data.passengerId).emit('rideAccepted', {
            message: data.message,
            driverId: socket.id
        });
    });

    socket.on('driverLocationUpdate', (data) => {
        if (data.passengerId) {
            io.to(data.passengerId).emit('driverLocationUpdate', {
                lat: data.lat,
                lng: data.lng
            });
        }
    });

    socket.on('driverArrived', (data) => {
        if (data.passengerId) {
            io.to(data.passengerId).emit('driverArrived', data);
        }
    });

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

