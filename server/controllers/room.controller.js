import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { renderElementsToPng } from '../utils/canvasRenderer.js';

/**
 * Generate a friendly 8-character uppercase room code
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new room
 */
export async function createRoom(req, res, next) {
  try {
    const { name, visibility = 'public' } = req.body;
    const userId = req.user.userId;
    const roomId = uuidv4();
    let roomCode = generateRoomCode();

    // Ensure room_code uniqueness
    let attempts = 0;
    while (attempts < 5) {
      const [existing] = await query('SELECT id FROM rooms WHERE room_code = ? LIMIT 1', [roomCode]);
      if (existing.length === 0) break;
      roomCode = generateRoomCode();
      attempts++;
    }

    // Insert room
    await query(
      'INSERT INTO rooms (id, room_code, name, owner_id, visibility) VALUES (?, ?, ?, ?, ?)',
      [roomId, roomCode, name.trim(), userId, visibility]
    );

    // Add creator as owner member
    await query(
      'INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?)',
      [roomId, userId, 'owner']
    );

    const [created] = await query(
      `SELECT r.id, r.room_code, r.name, r.visibility, r.created_at, r.last_updated,
              u.name as owner_name, u.email as owner_email
       FROM rooms r
       JOIN users u ON r.owner_id = u.id
       WHERE r.id = ?`,
      [roomId]
    );

    return res.status(201).json({
      room: {
        ...created[0],
        myRole: 'owner'
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List rooms accessible to the authenticated user (owned, joined, or public)
 */
export async function getRooms(req, res, next) {
  try {
    const userId = req.user.userId;

    const [rooms] = await query(
      `SELECT r.id, r.room_code, r.name, r.visibility, r.created_at, r.last_updated,
              u.name as owner_name, u.avatar_color as owner_avatar,
              rm.role as my_role,
              (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count,
              (SELECT COUNT(*) FROM elements WHERE room_id = r.id AND is_deleted = 0) as element_count
       FROM rooms r
       JOIN users u ON r.owner_id = u.id
       LEFT JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = ?
       WHERE r.visibility = 'public' OR rm.user_id IS NOT NULL
       ORDER BY r.last_updated DESC`,
      [userId]
    );

    return res.json({
      rooms: rooms.map(r => ({
        id: r.id,
        roomCode: r.room_code,
        name: r.name,
        visibility: r.visibility,
        createdAt: r.created_at,
        lastUpdated: r.last_updated,
        ownerName: r.owner_name,
        ownerAvatar: r.owner_avatar,
        myRole: r.my_role || (r.visibility === 'public' ? 'viewer' : null),
        memberCount: Number(r.member_count),
        elementCount: Number(r.element_count)
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get room details by ID (with auto-join for public rooms)
 */
export async function getRoomById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const [rows] = await query(
      `SELECT r.id, r.room_code, r.name, r.visibility, r.created_at, r.last_updated,
              r.owner_id, u.name as owner_name, u.avatar_color as owner_avatar
       FROM rooms r
       JOIN users u ON r.owner_id = u.id
       WHERE r.id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const room = rows[0];

    // Check membership
    const [membership] = await query(
      'SELECT role FROM room_members WHERE room_id = ? AND user_id = ? LIMIT 1',
      [id, userId]
    );

    let myRole = membership.length > 0 ? membership[0].role : null;

    if (!myRole) {
      if (room.visibility === 'public') {
        // Automatically join public room as editor
        await query(
          'INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?)',
          [id, userId, 'editor']
        );
        myRole = 'editor';
      } else {
        return res.status(403).json({ message: 'Access denied to private room. Use invite code to join.' });
      }
    }

    // Fetch members
    const [members] = await query(
      `SELECT u.id, u.name, u.email, u.avatar_color, rm.role, rm.joined_at
       FROM room_members rm
       JOIN users u ON rm.user_id = u.id
       WHERE rm.room_id = ?
       ORDER BY rm.joined_at ASC`,
      [id]
    );

    return res.json({
      room: {
        id: room.id,
        roomCode: room.room_code,
        name: room.name,
        visibility: room.visibility,
        ownerId: room.owner_id,
        ownerName: room.owner_name,
        ownerAvatar: room.owner_avatar,
        createdAt: room.created_at,
        lastUpdated: room.last_updated,
        myRole
      },
      members: members.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        avatarColor: m.avatar_color,
        role: m.role,
        joinedAt: m.joined_at
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Join a room using its unique invite room_code
 */
export async function joinRoomByCode(req, res, next) {
  try {
    const { roomCode } = req.body;
    const userId = req.user.userId;

    if (!roomCode) {
      return res.status(400).json({ message: 'Room code is required' });
    }

    const [rooms] = await query(
      'SELECT id, name, visibility, owner_id FROM rooms WHERE room_code = ? LIMIT 1',
      [roomCode.trim().toUpperCase()]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ message: 'No room found with this invite code' });
    }

    const room = rooms[0];

    // Check if already a member
    const [existingMember] = await query(
      'SELECT role FROM room_members WHERE room_id = ? AND user_id = ? LIMIT 1',
      [room.id, userId]
    );

    if (existingMember.length === 0) {
      await query(
        'INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?)',
        [room.id, userId, 'editor']
      );
    }

    return res.json({
      message: 'Successfully joined room',
      roomId: room.id,
      roomCode: roomCode.trim().toUpperCase(),
      role: existingMember.length > 0 ? existingMember[0].role : 'editor'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a room (owner only)
 */
export async function deleteRoom(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const [rooms] = await query('SELECT owner_id FROM rooms WHERE id = ? LIMIT 1', [id]);
    if (rooms.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (rooms[0].owner_id !== userId) {
      return res.status(403).json({ message: 'Only the room owner can delete this room' });
    }

    await query('DELETE FROM rooms WHERE id = ?', [id]);

    return res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * Export room canvas as server-rendered PNG using node-canvas
 */
export async function exportRoomPng(req, res, next) {
  try {
    const { id } = req.params;

    // Fetch active (non-deleted) elements
    const [elements] = await query(
      'SELECT id, type, props FROM elements WHERE room_id = ? AND is_deleted = 0 ORDER BY created_at ASC',
      [id]
    );

    const parsedElements = elements.map(el => ({
      id: el.id,
      type: el.type,
      props: typeof el.props === 'string' ? JSON.parse(el.props) : el.props
    }));

    const pngBuffer = await renderElementsToPng(parsedElements, {
      width: req.body?.width || 1920,
      height: req.body?.height || 1080,
      backgroundColor: req.body?.backgroundColor || '#12131a'
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="board-${id}.png"`);
    return res.send(pngBuffer);
  } catch (error) {
    next(error);
  }
}
