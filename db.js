const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabaseConnection() {
    const dbName = process.env.DB_NAME || 'bloodbank';

    console.log(`Database \`${dbName}\` ensured.`);

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    console.log("Connected to existing database.");
    return pool;
}

module.exports = createDatabaseConnection;
