import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensure .env is loaded from server or project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

// Configure SSL for managed MySQL providers (such as Aiven)
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

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'root',
  database: process.env.DB_NAME || 'boardcollab',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  decimalNumbers: true
};

const ssl = getSSLConfig();
if (ssl) {
  poolConfig.ssl = ssl;
}

export const pool = mysql.createPool(poolConfig);

/**
 * Execute parameterized query with automatic connection management
 * @param {string} sql - Parameterized SQL query
 * @param {Array} params - Array of parameters
 * @returns {Promise<[any, any]>} [rows, fields]
 */
export async function query(sql, params = []) {
  return pool.query(sql, params);
}

/**
 * Acquire a connection from the pool for multi-statement transactions
 * @returns {Promise<import('mysql2/promise').PoolConnection>}
 */
export async function getConnection() {
  return pool.getConnection();
}

/**
 * Test database connectivity
 */
export async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    return true;
  } finally {
    conn.release();
  }
}

export default pool;
