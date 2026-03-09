const mysql = require('mysql2/promise');
require('dotenv').config();

async function patch() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bloodbank'
    });

    try {
        await pool.query('ALTER TABLE donors ADD COLUMN gender VARCHAR(50) NOT NULL AFTER name;');
        console.log("Added gender column to donors.");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Gender column already exists.");
        } else {
            console.error("Error adding gender:", e);
        }
    }
    await pool.end();
}

patch();
