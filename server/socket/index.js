import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { verifyAccessToken } from '../utils/jwt.js';
import { query } from '../db/connection.js';
import roomManager from '../crdt/roomState.js';
import batchWriter from '../db/batchWriter.js';
import { compareClocks } from '../crdt/lamport.js';
import { checkIsAdmin } from '../controllers/auth.controller.js';

export function setupSocketIO(httpServer) {
  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 30000,
    transports: ['websocket', 'polling']
  });

  // 1. Optional Redis Adapter (multi-instance horizontal scale)
  if (process.env.REDIS_URL) {
    try {
      const pubClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => {
        console.warn('[Redis Adapter Warning] Redis pub connection error:', err.message);
      });
      subClient.on('error', (err) => {
        console.warn('[Redis Adapter Warning] Redis sub connection error:', err.message);
      });

      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Socket.IO] Using Redis Adapter for horizontal scalability');
    } catch (err) {
      console.warn('[Socket.IO Warning] Failed to initialize Redis Adapter, using in-memory adapter:', err.message);
    }
  }

  // 2. Outgoing Op Batching (~16ms interval per room)
  // Map<roomId, Array<op>>
  const pendingOpBatches = new Map();

  setInterval(() => {
    for (const [roomId, ops] of pendingOpBatches.entries()) {
      if (ops.length > 0) {
        io.to(roomId).emit('op-batch', { ops });
        pendingOpBatches.set(roomId, []);
      }
    }
  }, 16);

  function queueBroadcastOp(roomId, op) {
    if (!pendingOpBatches.has(roomId)) {
      pendingOpBatches.set(roomId, []);
    }
    pendingOpBatches.get(roomId).push(op);
  }

  // 3. Socket Auth Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = verifyAccessToken(token);
      socket.user = decoded; // { userId, email, name }
      next();
    } catch (err) {
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  // 4. Connection Handler
  io.on('connection', (socket) => {
    const user = socket.user;
    let currentRoomId = null;

    // Per-socket rate limiter (max 60 events/sec)
    let eventCount = 0;
    const rateWindow = setInterval(() => {
      eventCount = 0;
    }, 1000);

    function checkRateLimit() {
      eventCount++;
      return eventCount <= 60;
    }

    // --- EVENT: join-room ---
    socket.on('join-room', async ({ roomId, lastSeenClock }, callback) => {
      try {
        if (!roomId) return;

        // Verify room access in MySQL
        const [roomRows] = await query(
          `SELECT r.id, r.visibility, r.owner_id, rm.role
           FROM rooms r
           LEFT JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = ?
           WHERE r.id = ? LIMIT 1`,
          [user.userId, roomId]
        );

        if (roomRows.length === 0) {
          if (callback) callback({ error: 'Room not found' });
          return;
        }

        const roomInfo = roomRows[0];
        const isAdmin = checkIsAdmin(user.email);
        if (roomInfo.visibility === 'private' && !roomInfo.role && !isAdmin) {
          if (callback) callback({ error: 'Access denied to private room' });
          return;
        }

        // Store active role for this socket connection (enforces Feature 7: Sharing roles)
        socket.roomRole = roomInfo.role || (isAdmin ? 'owner' : (roomInfo.visibility === 'public' ? 'editor' : 'viewer'));

        // Leave previous room if any
        if (currentRoomId) {
          socket.leave(currentRoomId);
          const prevRoom = await roomManager.getRoom(currentRoomId);
          prevRoom.removePresence(socket.id);
          io.to(currentRoomId).emit('presence-update', { users: prevRoom.getPresenceList() });
        }

        currentRoomId = roomId;
        socket.join(roomId);

        const roomState = await roomManager.getRoom(roomId);

        // Fetch user avatar color
        const [u] = await query('SELECT avatar_color FROM users WHERE id = ? LIMIT 1', [user.userId]);
        const avatarColor = u.length > 0 ? u[0].avatar_color : '#6366f1';
        socket.userAvatar = avatarColor;

        // Add user presence
        roomState.setPresence(socket.id, {
          socketId: socket.id,
          userId: user.userId,
          name: user.name,
          avatarColor,
          role: socket.roomRole,
          cursor: null,
          isDrawing: false
        });

        // Send initial state snapshot in paginated chunks of 1000 elements
        const chunks = roomState.getSnapshotChunks(1000);
        chunks.forEach((chunk, index) => {
          socket.emit('room-state', {
            chunkIndex: index,
            totalChunks: chunks.length,
            elements: chunk,
            serverClock: roomState.clockCounter,
            role: socket.roomRole
          });
        });

        // Broadcast presence list to all room members
        io.to(roomId).emit('presence-update', { users: roomState.getPresenceList() });

        // Emit active comments
        socket.emit('comments-sync', { comments: roomState.getCommentsList() });

        if (callback) callback({ success: true, serverClock: roomState.clockCounter, role: socket.roomRole });
      } catch (err) {
        console.error('[Socket Error] join-room failed:', err);
        if (callback) callback({ error: err.message });
      }
    });

    // --- EVENT: op (client -> server) ---
    socket.on('op', async (opData, callback) => {
      if (!checkRateLimit()) return;
      if (!currentRoomId || !opData) return;

      // Feature 7: Role enforcement — viewers cannot mutate whiteboard
      if (socket.roomRole === 'viewer') {
        if (callback) callback({ error: 'Viewers have read-only permissions and cannot edit canvas' });
        return;
      }

      try {
        const roomState = await roomManager.getRoom(currentRoomId);

        const op = {
          ...opData,
          roomId: currentRoomId,
          userId: user.userId,
          clock: {
            counter: Number(opData.clock?.counter || roomState.clockCounter + 1),
            userId: user.userId
          }
        };

        const { mergedElement, changed, previousProps } = roomState.applyOp(op);

        if (changed) {
          // Push to MySQL write buffer
          batchWriter.queue(currentRoomId, mergedElement);
          // Feature 1: Queue op into ops_log buffer (saved in same batched transaction)
          batchWriter.queueOp(currentRoomId, op);

          // Push to undo stack
          roomState.pushUndo(user.userId, {
            ...op,
            previousProps
          });

          // Queue for outgoing ~16ms batch broadcast to other clients in room
          socket.to(currentRoomId).emit('op', op);
        }

        // Always acknowledge sender
        socket.emit('op-ack', {
          opId: op.opId,
          elementId: op.elementId,
          serverClock: roomState.clockCounter
        });

        // If merged element differs from client's submitted patch (loser in conflict), send reconcile event
        if (op.type === 'update' && mergedElement) {
          const patchKeys = Object.keys(op.patch || {});
          let differs = false;
          for (const k of patchKeys) {
            if (mergedElement.props[k] !== op.patch[k]) {
              differs = true;
              break;
            }
          }
          if (differs) {
            socket.emit('reconcile', { element: mergedElement });
          }
        }

        if (callback) callback({ success: true, serverClock: roomState.clockCounter });
      } catch (err) {
        console.error('[Socket Error] op handling failed:', err);
        if (callback) callback({ error: err.message });
      }
    });

    // --- EVENT: stroke-progress (ephemeral, not persisted) ---
    socket.on('stroke-progress', (data) => {
      if (!checkRateLimit()) return;
      if (!currentRoomId) return;

      // Volatile broadcast to other clients in room
      socket.to(currentRoomId).volatile.emit('stroke-progress', {
        ...data,
        userId: user.userId
      });
    });

    // --- EVENT: cursor-move (ephemeral, throttled ~30ms) ---
    socket.on('cursor-move', async (data) => {
      if (!currentRoomId) return;

      const roomState = await roomManager.getRoom(currentRoomId);
      const currentPresence = roomState.presence.get(socket.id);
      if (currentPresence) {
        currentPresence.cursor = data.cursor;
        currentPresence.isDrawing = Boolean(data.isDrawing);
      }

      // Volatile broadcast
      socket.to(currentRoomId).volatile.emit('cursor-move', {
        userId: user.userId,
        socketId: socket.id,
        cursor: data.cursor,
        isDrawing: Boolean(data.isDrawing)
      });
    });

    // --- EVENT: viewport-move (Feature 2: Follow Mode sync) ---
    socket.on('viewport-move', (data) => {
      if (!currentRoomId || !data) return;
      socket.to(currentRoomId).volatile.emit('viewport-move', {
        userId: user.userId,
        socketId: socket.id,
        x: data.x,
        y: data.y,
        scale: data.scale
      });
    });

    // --- EVENT: presenter-start / presenter-stop (Feature 2: Presentation Mode) ---
    socket.on('presenter-start', () => {
      if (!currentRoomId) return;
      io.to(currentRoomId).emit('presenter-state', {
        isPresenting: true,
        presenterId: user.userId,
        presenterName: user.name,
        socketId: socket.id
      });
    });

    socket.on('presenter-stop', () => {
      if (!currentRoomId) return;
      io.to(currentRoomId).emit('presenter-state', {
        isPresenting: false
      });
    });

    // --- EVENT: laser-point (Feature 2: Laser Pointer) ---
    socket.on('laser-point', (data) => {
      if (!currentRoomId || !data) return;
      socket.to(currentRoomId).volatile.emit('laser-point', {
        userId: user.userId,
        socketId: socket.id,
        x: data.x,
        y: data.y,
        color: data.color || '#D4FF3A',
        isDone: Boolean(data.isDone)
      });
    });

    // --- EVENT: cursor-chat (Feature 3: Cursor Chat) ---
    socket.on('cursor-chat', (data) => {
      if (!currentRoomId || !data) return;
      socket.to(currentRoomId).volatile.emit('cursor-chat', {
        userId: user.userId,
        socketId: socket.id,
        text: String(data.text || '').slice(0, 80),
        x: data.x,
        y: data.y
      });
    });

    // --- EVENT: reaction (Feature 3: Reactions) ---
    let lastReactionTime = 0;
    socket.on('reaction', (data) => {
      if (!currentRoomId || !data?.emoji) return;
      const now = Date.now();
      // Rate limit: max 6 reactions per second
      if (now - lastReactionTime < 150) return;
      lastReactionTime = now;

      socket.to(currentRoomId).volatile.emit('reaction', {
        userId: user.userId,
        userName: user.name,
        socketId: socket.id,
        emoji: data.emoji,
        x: data.x,
        y: data.y
      });
    });

    // --- EVENT: comment-add (Feature 6: Comments) ---
    socket.on('comment-add', async (commentData, callback) => {
      if (!currentRoomId || !commentData) return;
      try {
        const roomState = await roomManager.getRoom(currentRoomId);
        const comment = {
          id: commentData.id || crypto.randomUUID(),
          roomId: currentRoomId,
          userId: user.userId,
          userName: user.name,
          userAvatar: socket.userAvatar || '#FFE98A',
          elementId: commentData.elementId || null,
          x: Number(commentData.x || 0),
          y: Number(commentData.y || 0),
          text: String(commentData.text || '').trim(),
          parentId: commentData.parentId || null,
          isResolved: false,
          createdAt: new Date().toISOString()
        };

        roomState.addComment(comment);

        // Async MySQL write (best effort)
        try {
          await query(
            'INSERT INTO comments (id, room_id, user_id, user_name, user_avatar, element_id, x, y, text, parent_id, is_resolved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [comment.id, comment.roomId, comment.userId, comment.userName, comment.userAvatar, comment.elementId, comment.x, comment.y, comment.text, comment.parentId, 0]
          );
        } catch {}

        io.to(currentRoomId).emit('comment-added', comment);
        if (callback) callback({ success: true, comment });
      } catch (err) {
        if (callback) callback({ error: err.message });
      }
    });

    // --- EVENT: comment-resolve (Feature 6: Comments) ---
    socket.on('comment-resolve', async ({ commentId, isResolved }, callback) => {
      if (!currentRoomId || !commentId) return;
      try {
        const roomState = await roomManager.getRoom(currentRoomId);
        roomState.resolveComment(commentId, isResolved);

        try {
          await query('UPDATE comments SET is_resolved = ? WHERE id = ?', [isResolved ? 1 : 0, commentId]);
        } catch {}

        io.to(currentRoomId).emit('comment-resolved', { commentId, isResolved });
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ error: err.message });
      }
    });

    // --- EVENT: comment-delete (Feature 6: Comments) ---
    socket.on('comment-delete', async ({ commentId }, callback) => {
      if (!currentRoomId || !commentId) return;
      try {
        const roomState = await roomManager.getRoom(currentRoomId);
        roomState.deleteComment(commentId);

        try {
          await query('DELETE FROM comments WHERE id = ?', [commentId]);
        } catch {}

        io.to(currentRoomId).emit('comment-deleted', { commentId });
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ error: err.message });
      }
    });

    // --- EVENT: undo (per-user action reversal) ---
    socket.on('undo', async (callback) => {
      if (!currentRoomId) return;

      try {
        const roomState = await roomManager.getRoom(currentRoomId);
        const lastOp = roomState.popUndo(user.userId);
        if (!lastOp) {
          if (callback) callback({ success: false, message: 'Nothing to undo' });
          return;
        }

        // Generate inverse op with bumped Lamport clock
        const nextClock = {
          counter: roomState.clockCounter + 1,
          userId: user.userId
        };

        let inverseOp = null;

        if (lastOp.type === 'add') {
          // Inverse of Add is Delete
          inverseOp = {
            opId: `undo-${Date.now()}`,
            elementId: lastOp.elementId,
            type: 'delete',
            clock: nextClock,
            userId: user.userId,
            roomId: currentRoomId
          };
        } else if (lastOp.type === 'update') {
          // Inverse of Update is restoring previousProps
          inverseOp = {
            opId: `undo-${Date.now()}`,
            elementId: lastOp.elementId,
            type: 'update',
            patch: lastOp.previousProps || {},
            clock: nextClock,
            userId: user.userId,
            roomId: currentRoomId
          };
        } else if (lastOp.type === 'delete') {
          // Inverse of Delete is restoring props
          inverseOp = {
            opId: `undo-${Date.now()}`,
            elementId: lastOp.elementId,
            type: 'add',
            props: lastOp.previousProps || {},
            clock: nextClock,
            userId: user.userId,
            roomId: currentRoomId
          };
        }

        if (inverseOp) {
          const { mergedElement } = roomState.applyOp(inverseOp);
          batchWriter.queue(currentRoomId, mergedElement);
          roomState.pushRedo(user.userId, lastOp);

          // Broadcast inverse op to everyone including sender
          io.to(currentRoomId).emit('op', inverseOp);
        }

        if (callback) callback({ success: true });
      } catch (err) {
        console.error('[Socket Error] undo failed:', err);
        if (callback) callback({ error: err.message });
      }
    });

    // --- EVENT: redo ---
    socket.on('redo', async (callback) => {
      if (!currentRoomId) return;

      try {
        const roomState = await roomManager.getRoom(currentRoomId);
        const redoOp = roomState.popRedo(user.userId);
        if (!redoOp) {
          if (callback) callback({ success: false, message: 'Nothing to redo' });
          return;
        }

        const nextClock = {
          counter: roomState.clockCounter + 1,
          userId: user.userId
        };

        const replayedOp = {
          ...redoOp,
          opId: `redo-${Date.now()}`,
          clock: nextClock
        };

        const { mergedElement, previousProps } = roomState.applyOp(replayedOp);
        batchWriter.queue(currentRoomId, mergedElement);
        roomState.pushUndo(user.userId, { ...replayedOp, previousProps });

        io.to(currentRoomId).emit('op', replayedOp);

        if (callback) callback({ success: true });
      } catch (err) {
        console.error('[Socket Error] redo failed:', err);
        if (callback) callback({ error: err.message });
      }
    });

    // --- EVENT: clear-canvas (owner only) ---
    socket.on('clear-canvas', async (callback) => {
      if (!currentRoomId) return;

      try {
        // Verify owner permissions
        const [rooms] = await query('SELECT owner_id FROM rooms WHERE id = ? LIMIT 1', [currentRoomId]);
        if (rooms.length === 0 || rooms[0].owner_id !== user.userId) {
          if (callback) callback({ error: 'Only the room owner can clear the canvas' });
          return;
        }

        const roomState = await roomManager.getRoom(currentRoomId);
        const nextClock = {
          counter: roomState.clockCounter + 1,
          userId: user.userId
        };

        // Soft-delete all elements
        for (const [id, element] of roomState.elements.entries()) {
          if (!element.isDeleted) {
            element.isDeleted = true;
            element.deleteClock = nextClock;
            element.updatedAt = new Date().toISOString();
            batchWriter.queue(currentRoomId, element);
          }
        }

        io.to(currentRoomId).emit('canvas-cleared', { clearedBy: user.userId });
        if (callback) callback({ success: true });
      } catch (err) {
        console.error('[Socket Error] clear-canvas failed:', err);
        if (callback) callback({ error: err.message });
      }
    });

    // --- EVENT: heartbeat (ping / pong) ---
    socket.on('heartbeat', (data, callback) => {
      if (callback) callback({ time: Date.now(), ok: true });
      else socket.emit('heartbeat-ack', { time: Date.now() });
    });

    // --- DISCONNECT ---
    socket.on('disconnect', async () => {
      clearInterval(rateWindow);

      if (currentRoomId) {
        try {
          const roomState = await roomManager.getRoom(currentRoomId);
          roomState.removePresence(socket.id);

          // Broadcast updated presence
          io.to(currentRoomId).emit('presence-update', {
            users: roomState.getPresenceList()
          });

          // If last user left room, flush MySQL buffer immediately
          if (!roomState.hasUsers()) {
            await batchWriter.flushRoom(currentRoomId);
          }
        } catch (err) {
          console.error('[Socket Error] Disconnect cleanup failed:', err);
        }
      }
    });
  });

  return io;
}

export default setupSocketIO;
