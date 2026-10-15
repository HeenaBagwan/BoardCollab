import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { hashPassword, comparePassword, hashToken } from '../utils/hash.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

const AVATAR_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#14b8a6'  // Teal
];

function getRandomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

const COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
};

/**
 * Register a new user
 */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const [existing] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    const avatarColor = getRandomColor();

    await query(
      'INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)',
      [userId, name.trim(), normalizedEmail, passwordHash, avatarColor]
    );

    // Generate tokens
    const accessToken = generateAccessToken({ userId, email: normalizedEmail, name: name.trim() });
    const tokenId = uuidv4();
    const rawRefreshToken = generateRefreshToken({ userId, tokenId });
    const hashedRefresh = hashToken(rawRefreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, userId, hashedRefresh, expiresAt]
    );

    // Set refresh token cookie
    res.cookie(COOKIE_NAME, rawRefreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(201).json({
      message: 'Registration successful',
      accessToken,
      user: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        avatarColor
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login existing user
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const [rows] = await query(
      'SELECT id, name, email, password_hash, avatar_color FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    const tokenId = uuidv4();
    const rawRefreshToken = generateRefreshToken({ userId: user.id, tokenId });
    const hashedRefresh = hashToken(rawRefreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, user.id, hashedRefresh, expiresAt]
    );

    res.cookie(COOKIE_NAME, rawRefreshToken, REFRESH_COOKIE_OPTIONS);

    return res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatar_color
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token and rotate refresh token
 */
export async function refresh(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.[COOKIE_NAME] || req.body?.refreshToken;

    if (!rawRefreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const hashedIncoming = hashToken(rawRefreshToken);

    // Look up token in database
    const [tokenRows] = await query(
      'SELECT id, user_id, revoked_at, expires_at FROM refresh_tokens WHERE token_hash = ? LIMIT 1',
      [hashedIncoming]
    );

    if (tokenRows.length === 0) {
      return res.status(401).json({ message: 'Refresh token not recognized' });
    }

    const storedToken = tokenRows[0];

    // Detect reuse of revoked token (Breach detection: revoke all tokens for this user)
    if (storedToken.revoked_at !== null) {
      console.warn(`[Security Alert] Replay attempt detected on revoked refresh token for user ${storedToken.user_id}`);
      await query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
        [storedToken.user_id]
      );
      res.clearCookie(COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
      return res.status(401).json({ message: 'Token reuse detected. All sessions revoked for security.' });
    }

    // Check expiration
    if (new Date(storedToken.expires_at) < new Date()) {
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    // Fetch user details
    const [userRows] = await query(
      'SELECT id, name, email, avatar_color FROM users WHERE id = ? LIMIT 1',
      [storedToken.user_id]
    );

    if (userRows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = userRows[0];

    // Token Rotation: Revoke current refresh token
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [storedToken.id]);

    // Issue new access & refresh tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    const newTokenId = uuidv4();
    const newRawRefreshToken = generateRefreshToken({ userId: user.id, tokenId: newTokenId });
    const newHashedRefresh = hashToken(newRawRefreshToken);

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [newTokenId, user.id, newHashedRefresh, newExpiresAt]
    );

    res.cookie(COOKIE_NAME, newRawRefreshToken, REFRESH_COOKIE_OPTIONS);

    return res.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatar_color
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout and revoke current refresh token
 */
export async function logout(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.[COOKIE_NAME] || req.body?.refreshToken;

    if (rawRefreshToken) {
      const hashed = hashToken(rawRefreshToken);
      await query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL',
        [hashed]
      );
    }

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * Get currently authenticated user profile
 */
export async function getMe(req, res, next) {
  try {
    const [rows] = await query(
      'SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatar_color,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
}
