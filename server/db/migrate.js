import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'root';
const dbName = process.env.DB_NAME || 'boardcollab';

function getSSLConfig() {
  const sslEnv = process.env.DB_SSL ? process.env.DB_SSL.trim().toLowerCase() : '';
  if (sslEnv === 'true' || sslEnv === 'require' || sslEnv === '1') {
    const ssl = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
    };
    if (process.env.DB_SSL_CA) {
      ssl.ca = process.env.DB_SSL_CA;
    }
    return ssl;
  }
  return undefined;
}

export async function runMigrations() {
  console.log(`[Migrate] Connecting to MySQL at ${dbHost}:${dbPort} as user '${dbUser}'...`);

  // Connect without DB to create if not exists
  let connection;
  try {
    const connConfig = {
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      multipleStatements: true
    };
    const ssl = getSSLConfig();
    if (ssl) connConfig.ssl = ssl;
    connection = await mysql.createConnection(connConfig);
  } catch (err) {
    console.error(`[Migrate Error] Failed to connect to MySQL: ${err.message}`);
    throw err;
  }

  try {
    console.log(`[Migrate] Ensuring database '${dbName}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${dbName}\`;`);

    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log(`[Migrate] Executing schema.sql definitions...`);
    await connection.query(schemaSql);

    console.log('[Migrate] ✓ Database schema migrated successfully!');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Allow direct CLI execution: node db/migrate.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('[Migrate] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migrate] Migration failed:', err);
      process.exit(1);
    });
}
