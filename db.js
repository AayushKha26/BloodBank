const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabaseConnection() {
    // Check if we are in Vercel (Postgres) or Local (MySQL)
    const isPostgres = process.env.POSTGRES_URL || process.env.DATABASE_URL;

    if (isPostgres) {
        console.log("Detected Cloud Environment: Connecting to Vercel Postgres...");
        const { createPool } = require('@vercel/postgres');
        const pool = createPool();
        
        // Add a compatibility wrapper for .query() to handle '?' -> '$1' conversion
        const originalQuery = pool.query.bind(pool);
        pool.query = async (sql, params = []) => {
            let pgSql = sql;
            
            // Auto-append RETURNING * to INSERT so result.insertId equivalent works
            if (sql.trim().toUpperCase().startsWith('INSERT ')) {
                pgSql += ' RETURNING *';
            }

            if (params.length > 0) {
                let count = 0;
                pgSql = pgSql.replace(/\?/g, () => {
                    count++;
                    return `$${count}`;
                });
            }
            const res = await originalQuery(pgSql, params);
            // In Postgres, the 'insertId' equivalent is the first row's ID
            const rows = res.rows;
            if (sql.trim().toUpperCase().startsWith('INSERT ') && rows.length > 0) {
                // Find any column ending in _id
                const idCol = Object.keys(rows[0]).find(k => k.endsWith('_id')) || 'id';
                rows.insertId = rows[0][idCol];
            }
            return [rows, res.fields];
        };
        return pool;
    }


    // Local Development: MySQL
    const dbName = process.env.DB_NAME || 'bloodbank';
    console.log(`Detected Local Environment: Connecting to MySQL (\`${dbName}\`)...`);

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    return pool;
}

module.exports = createDatabaseConnection;

