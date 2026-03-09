const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const createDatabaseConnection = require('./db.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the current directory
app.use(express.static(__dirname));

let pool;

// Middleware to ensure DB is connected
app.use(async (req, res, next) => {
    if (!pool) {
        try {
            pool = await createDatabaseConnection();
        } catch (err) {
            console.error("Critical DB error:", err);
            return res.status(500).json({ error: "Failed to connect to database" });
        }
    }
    req.db = pool;
    next();
});

// --- API ENDPOINTS ---

// Donor Registration
app.post('/api/donors', async (req, res) => {
    const { name, gender, age, blood_group, phone, last_donation_date, address, password } = req.body;
    try {
        const pwd = password || 'password123';
        const [result] = await req.db.query(
            'INSERT INTO donors (name, gender, age, blood_group, phone, last_donation_date, password) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, gender, age, blood_group, phone, last_donation_date || null, pwd]
        );
        res.status(201).json({ message: 'Donor registered successfully!', donor_id: result.insertId || result[0]?.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Add Donation Record
app.post('/api/donations', async (req, res) => {
    const { donor_id, staff_id, units, donation_date } = req.body;
    try {
        await req.db.query(
            'INSERT INTO donations (donor_id, staff_id, units, donation_date) VALUES (?, ?, ?, ?)',
            [donor_id, staff_id, units, donation_date]
        );
        res.status(201).json({ message: 'Donation record added' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Register Hospital
app.post('/api/hospitals', async (req, res) => {
    const { name, location, email, phone, contact, password } = req.body; 
    try {
        const finalContact = contact || phone;
        const pwd = password || 'password123';
        const [result] = await req.db.query(
            'INSERT INTO hospitals (name, location, contact, password) VALUES (?, ?, ?, ?)',
            [name, location, finalContact, pwd]
        );
        res.status(201).json({ message: 'Hospital registered successfully!', hospital_id: result.insertId || result[0]?.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Request Blood
app.post('/api/requests', async (req, res) => {
    const { hospital_id, blood_group, units, request_date, status } = req.body;
    try {
        await req.db.query(
            'INSERT INTO requests (hospital_id, blood_group, units_required, request_date, status) VALUES (?, ?, ?, ?, ?)',
            [hospital_id, blood_group, units, request_date, status]
        );
        res.status(201).json({ message: 'Blood request submitted' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Manage Blood Stock
app.post('/api/stock', async (req, res) => {
    const { blood_group, units, expiry_date } = req.body;
    try {
        await req.db.query(
            'INSERT INTO blood_stock (blood_group, units_available, expiry_date) VALUES (?, ?, ?)',
            [blood_group, units, expiry_date]
        );
        res.status(201).json({ message: 'Stock updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Staff Registration
app.post('/api/staff', async (req, res) => {
    const { name, role, phone } = req.body;
    try {
        await req.db.query(
            'INSERT INTO staff (name, role, phone) VALUES (?, ?, ?)',
            [name, role, phone]
        );
        res.status(201).json({ message: 'Staff member registered' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Contact Us
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        await req.db.query(
            'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)',
            [name, email, message]
        );
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Get Stock Summary
app.get('/api/stock/summary', async (req, res) => {
    try {
        const [rows] = await req.db.query(
            'SELECT blood_group, SUM(units_available) as total_units FROM blood_stock GROUP BY blood_group'
        );
        const summary = {};
        const groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
        groups.forEach(g => summary[g] = 0);
        
        rows.forEach(row => {
            summary[row.blood_group] = parseInt(row.total_units);
        });
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin Login
app.post('/api/login', async (req, res) => {
    const { name, password } = req.body;
    try {
        const [rows] = await req.db.query('SELECT * FROM staff WHERE name = ? AND password = ? LIMIT 1', [name, password]);
        if (rows.length > 0) {
            res.json({ message: 'Login successful', token: 'secure-staff-token-123' });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

const requireAdmin = (req, res, next) => {
    if (req.headers.authorization === 'secure-staff-token-123') next();
    else res.status(401).json({ error: 'Unauthorized' });
};

app.get('/api/admin/donors', requireAdmin, async (req, res) => {
    try {
        const [rows] = await req.db.query('SELECT donor_id, name, blood_group, phone FROM donors ORDER BY donor_id DESC');
        res.json(rows);
    } catch(e) { res.status(500).json({ error: 'DB Error' }); }
});

app.get('/api/admin/requests', requireAdmin, async (req, res) => {
    try {
        const [rows] = await req.db.query('SELECT request_id, hospital_id, blood_group, units_required, status FROM requests ORDER BY request_date DESC, request_id DESC');
        res.json(rows);
    } catch(e) { res.status(500).json({ error: 'DB Error' }); }
});

app.put('/api/admin/requests/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await req.db.query('UPDATE requests SET status = ? WHERE request_id = ?', [status, id]);
        res.json({ message: `Request marked as ${status}` });
    } catch(e) { res.status(500).json({ error: 'DB Error' }); }
});

// Portal Login
app.post('/api/portal/login', async (req, res) => {
    const { type, identifier, password } = req.body;
    try {
        if(type === 'donor') {
            const [rows] = await req.db.query('SELECT donor_id FROM donors WHERE phone = ? AND password = ? LIMIT 1', [identifier, password]);
            if(rows.length > 0) res.json({ token: `donor-${rows[0].donor_id}`, id: rows[0].donor_id });
            else res.status(401).json({ error: 'Invalid donor credentials' });
        } else if(type === 'hospital') {
            const [rows] = await req.db.query('SELECT hospital_id FROM hospitals WHERE contact = ? AND password = ? LIMIT 1', [identifier, password]);
            if(rows.length > 0) res.json({ token: `hospital-${rows[0].hospital_id}`, id: rows[0].hospital_id });
            else res.status(401).json({ error: 'Invalid hospital credentials' });
        }
    } catch (err) { res.status(500).json({ error: 'Login error' }); }
});

app.get('/api/portal/donor/me', async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith('donor-')) return res.status(401).json({ error: 'Unauthorized' });
    const id = auth.split('-')[1];
    try {
        const [rows] = await req.db.query('SELECT name, blood_group, phone, last_donation_date FROM donors WHERE donor_id = ?', [id]);
        res.json(rows[0] || {});
    } catch(e) { res.status(500).json({ error: 'DB Error' }); }
});

app.get('/api/portal/hospital/requests', async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith('hospital-')) return res.status(401).json({ error: 'Unauthorized' });
    const id = auth.split('-')[1];
    try {
        const [hosp] = await req.db.query('SELECT name FROM hospitals WHERE hospital_id = ?', [id]);
        const [reqs] = await req.db.query('SELECT blood_group, units_required, request_date, status FROM requests WHERE hospital_id = ? ORDER BY request_date DESC', [id]);
        res.json({ hospitalName: hosp[0]?.name, requests: reqs });
    } catch(e) { res.status(500).json({ error: 'DB Error' }); }
});

// Fallback for local dev
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running locally on: http://localhost:${PORT}`);
    });
}

module.exports = app;

