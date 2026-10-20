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
// ယာဉ်မောင်း မှတ်ပုံတင်ခြင်းနှင့် လော့ဂ်အင်စစ်ဆေးခြင်း API များ
app.post('/api/register-driver', (req, res) => {
    const { phone, name, passcode } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, message: "ဖုန်းနံပါတ် လိုအပ်ပါသည်။" });
    }
    
    // 6-digit passcode သို့မဟုတ် Admin သတ်မှတ်ပေးသည့် passcode
    const code = passcode || Math.floor(100000 + Math.random() * 900000).toString();

    // drivers.json ဖိုင်ထဲသို့ သိမ်းဆည်းရန် စီစဉ်ခြင်း
    let drivers = [];
    if (fs.existsSync(DRIVERS_FILE)) {
        try {
            drivers = JSON.parse(fs.readFileSync(DRIVERS_FILE, 'utf8'));
        } catch (e) {
            drivers = [];
        }
    }

    let existing = drivers.find(d => d.phone === phone);
    if (existing) {
        existing.passcode = code;
        existing.name = name || existing.name;
    } else {
        drivers.push({
            phone: phone,
            name: name || "Driver",
            passcode: code,
            approved: true,
            registeredAt: new Date()
        });
    }

    fs.writeFileSync(DRIVERS_FILE, JSON.stringify(drivers, null, 2));

    console.log(`Driver registered: ${phone} with code: ${code}`);
    res.json({ success: true, message: "ယာဉ်မောင်း စာရင်းသွင်းမှု အောင်မြင်ပါသည်", passcode: code });
});

app.post('/api/driver-login', (req, res) => {
    const { phone, passcode } = req.body;
    
    let drivers = [];
    if (fs.existsSync(DRIVERS_FILE)) {
        try {
            drivers = JSON.parse(fs.readFileSync(DRIVERS_FILE, 'utf8'));
        } catch (e) {
            drivers = [];
        }
    }

    let driver = drivers.find(d => d.phone === phone);

    if (!driver) {
        return res.json({ 
            success: false, 
            message: "ဤဖုန်းနံပါတ်ဖြင့် ယာဉ်မောင်းစာရင်းသွင်းထားခြင်း မရှိပါ။ Admin ထံတွင် ကိုယ်တိုင် စာရင်းသွင်းပါ။" 
        });
    }

    if (driver.passcode !== passcode) {
        return res.json({ 
            success: false, 
            message: "Admin ထံမှ ရရှိသော ၆ လုံးပါ လျှို့ဝှက်နံပါတ် (Passcode) မှားယွင်းနေပါသည်။" 
        });
    }

    res.json({ 
        success: true, 
        message: "ဝင်ရောက်မှု အောင်မြင်ပါသည်", 
        driverName: driver.name 
    });
});

// Explicit route for register-driver.html
app.get('/register-driver.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register-driver.html'));
});

const DRIVERS_FILE = path.join(__dirname, 'drivers.json');

// မူရင်း ယာဉ်မောင်းဖိုင် မရှိသေးပါက နမူနာစာရင်းဖြင့် စတင်ဖန်တီးခြင်း
if (!fs.existsSync(DRIVERS_FILE)) {
    const initialDrivers = [
        {
            name: "‌‌ေမာင်သူရိန်မျိုး",
            phone: "09405005672",
            car: "Toyota Alphard (SHAN38-7890)",
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
// အွန်လိုင်းပေါ်ရှိ ယာဉ်မောင်းများကို မှတ်သားရန် (phone -> socket.id)
let onlineDrivers = {}; 

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    // ယာဉ်မောင်း Online ဝင်ရောက်လာမှုကို မှတ်သားခြင်း
    socket.on('driverOnline', (data) => {
        if (data && data.phone) {
            onlineDrivers[data.phone] = socket.id;
            socket.driverPhone = data.phone;
            // အခြားသူများ (ခရီးသည်ဘက်) ထံသို့ ယာဉ်မောင်း အွန်လိုင်းဖြစ်ကြောင်း အသိပေးခြင်း
            io.emit('updateDriverStatus', { phone: data.phone, status: 'online' });
        }
    });

    // လက်ရှိ Online ဖြစ်နေသော ယာဉ်မောင်းစာရင်းကို တောင်းဆိုသည့်အခါ ပို့ပေးခြင်း
    app.get('/api/online-drivers', (req, res) => {
        res.json(onlineDrivers);
    });

    socket.on('passengerRequestRide', (data) => {
    let targetPhone = data.targetDriverPhone || data.driverPhone;
    if (targetPhone && onlineDrivers[targetPhone]) {
        io.to(onlineDrivers[targetPhone]).emit('passengerRequested', {
            passengerId: socket.id,
            lat: data.lat,
            lng: data.lng,
            destLat: data.destLat,
            destLng: data.destLng,
            passengerName: data.passengerName || "အမည်မသိ",
            passengerPhone: data.passengerPhone
        });
     }
});

// ခရီးသည်မှ ယာဉ်မောင်းကို ရွေးချယ်လိုက်သောအခါ
socket.on('selectDriver', (data) => {
    if (data.driverSocketId) {
        io.to(data.driverSocketId).emit('rideAssigned', {
            pickupLat: data.passengerLat,
            pickupLng: data.passengerLng,
            destLat: data.destLat,
            destLng: data.destLng,
            passengerName: data.passengerName,
            passengerPhone: data.passengerPhone
        });
    }
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
        
        // ယာဉ်မောင်း disconnect ဖြစ်သွားပါက Offline အဖြစ်သို့ ပြောင်းလဲခြင်း
        if (socket.driverPhone) {
            delete onlineDrivers[socket.driverPhone];
            io.emit('updateDriverStatus', { phone: socket.driverPhone, status: 'offline' });
        }

        delete passengersLocations[socket.id];
        io.emit('removePassengerMarker', { passengerId: socket.id });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

