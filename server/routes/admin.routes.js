import express from 'express';
import { query } from '../db/connection.js';
import roomManager from '../crdt/roomState.js';
import { authenticate } from '../middleware/auth.js';
import { checkIsAdmin } from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * Strict admin authorization check
 */
function requireAdmin(req, res, next) {
  const email = req.user?.email || '';
  if (!checkIsAdmin(email)) {
    return res.status(403).json({
      error: 'Access denied: Admin credentials required to view operations dashboard'
    });
  }
  next();
}

/**
 * GET /api/admin/overview
 * Real-time metrics: all registered users, who is online now, active rooms and active participants
 */
router.get('/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    // 1. Fetch registered users from database (safe SELECT query)
    let users = [];
    try {
      const [rows] = await query(
        'SELECT id, name, email, avatar_color, created_at FROM users ORDER BY created_at DESC'
      );
      users = rows || [];
    } catch (dbErr) {
      console.warn('[Admin] Fallback to in-memory users:', dbErr.message);
    }

    // 2. Fetch rooms from database
    let dbRooms = [];
    try {
      const [rRows] = await query(`
        SELECT r.id, r.name, r.room_code, r.visibility, r.created_at, r.updated_at,
               u.name AS owner_name, u.avatar_color AS owner_avatar
        FROM rooms r
        LEFT JOIN users u ON u.id = r.owner_id
        ORDER BY r.updated_at DESC
        LIMIT 100
      `);
      dbRooms = rRows || [];
    } catch (rErr) {
      console.warn('[Admin] Fallback for rooms query:', rErr.message);
    }

    // 3. Inspect In-Memory Active Real-Time Rooms & Socket Connections
    const activeRooms = [];
    const onlineUsersMap = new Map();

    for (const [roomId, roomState] of roomManager.rooms.entries()) {
      const presenceList = roomState.getPresenceList() || [];
      if (presenceList.length > 0) {
        // Find matching metadata from dbRooms
        const matchedDbRoom = dbRooms.find((r) => r.id === roomId);

        activeRooms.push({
          id: roomId,
          name: matchedDbRoom?.name || 'Collaborative Whiteboard',
          roomCode: matchedDbRoom?.room_code || '---',
          visibility: matchedDbRoom?.visibility || 'public',
          ownerName: matchedDbRoom?.owner_name || 'Collaborator',
          elementCount: roomState.elements?.size || 0,
          serverClock: roomState.clockCounter || 0,
          activeCount: presenceList.length,
          participants: presenceList.map((p) => ({
            userId: p.userId,
            name: p.name,
            avatarColor: p.avatarColor,
            isDrawing: Boolean(p.isDrawing),
            role: p.role || 'editor'
          }))
        });

        // Track online users
        for (const p of presenceList) {
          if (!onlineUsersMap.has(p.userId)) {
            onlineUsersMap.set(p.userId, {
              userId: p.userId,
              name: p.name,
              avatarColor: p.avatarColor,
              activeInRooms: []
            });
          }
          onlineUsersMap.get(p.userId).activeInRooms.push({
            roomId,
            roomName: matchedDbRoom?.name || 'Active Board'
          });
        }
      }
    }

    // 4. Augment registered users with online status
    const augmentedUsers = users.map((u) => {
      const onlineInfo = onlineUsersMap.get(u.id);
      return {
        ...u,
        isOnline: Boolean(onlineInfo),
        activeInRooms: onlineInfo?.activeInRooms || []
      };
    });

    const onlineUsers = Array.from(onlineUsersMap.values());

    res.json({
      success: true,
      stats: {
        totalUsers: users.length,
        onlineUsersCount: onlineUsers.length,
        activeRoomsCount: activeRooms.length,
        totalRoomsCount: dbRooms.length
      },
      onlineUsers,
      activeRooms,
      users: augmentedUsers,
      recentRooms: dbRooms.slice(0, 15)
    });
  } catch (err) {
    console.error('[Admin Overview Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve admin overview metrics' });
  }
});

export default router;
