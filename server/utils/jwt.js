import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'supersecretaccesstokenkey123456789!@#$';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshtokenkey987654321!@#$';
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate a short-lived JWT access token
 * @param {object} payload - { userId, email, name }
 * @returns {string}
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

/**
 * Generate a long-lived JWT refresh token
 * @param {object} payload - { userId, tokenId }
 * @returns {string}
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

/**
 * Verify JWT access token
 * @param {string} token 
 * @returns {object} decoded payload
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Verify JWT refresh token
 * @param {string} token 
 * @returns {object} decoded payload
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}
