const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());
// ယာဉ်မောင်း မှတ်ပုံတင်စာမျက်နှာအတွက် သီးသန့် Route
app.get('/register-driver.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register-driver.html'));
});

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

// ယာဉ်မောင်းအသစ် Register လုပ်သော API
app.post('/api/register-driver', (req, res) => {
    try {
        const { name, phone, car, image } = req.body;
        if (!name || !phone || !car) {
            return res.status(400).json({ success: false, message: "အချက်အလက်များ မပြည့်စုံပါ။" });
        }

        const data = fs.readFileSync(DRIVERS_FILE, 'utf8');
        const drivers = JSON.parse(data);

        // ဖုန်းနံပါတ်တူ စာရင်းရှိမရှိ စစ်ဆေးခြင်း
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

        res.json({ success: true, message: "ယာဉ်မောင်း မှတ်ပုံတင်ခြင်း အောင်မြင်ပါသည်။" });
    } catch (err) {
        res.status(500).json({ success: false, message: "ဆာဗာ အမှားအယွင်း ရှိနေပါသည်။" });
    }
});

let passengersLocations = {};

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    // ခရီးသည် တည်နေရာ အပ်ဒိတ်လုပ်ခြင်း
    socket.on('liveLocationUpdate', (data) => {
        passengersLocations[socket.id] = { 
            id: socket.id, 
            lat: data.lat, 
            lng: data.lng,
            destLat: data.destLat,
            destLng: data.destLng,
            driverPhone: data.driverPhone
        };
        // ယာဉ်မောင်းအားလုံးထံသို့ ခရီးသည် တည်နေရာ ပို့ပေးခြင်း
        io.emit('liveLocationUpdate', passengersLocations[socket.id]);
    });

    // ခရီးသည်မှ သီးသန့် ယာဉ်မောင်းကို ရွေးချယ်၍ တည်နေရာ/ခရီးစဉ် တောင်းဆိုခြင်း
    socket.on('passengerRequestRide', (data) => {
        // data ထဲတွင် driverPhone ပါလာမည်၊ ၎င်းကို ယာဉ်မောင်း sockets များဆီသို့ (သို့မဟုတ် broadcast) ပို့ပေးနိုင်သည်
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

