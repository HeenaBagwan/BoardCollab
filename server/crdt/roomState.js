import { query } from '../db/connection.js';
import { applyOperation } from './engine.js';
import { advanceClock } from './lamport.js';

class RoomState {
  constructor(roomId) {
    this.roomId = roomId;
    this.elements = new Map(); // elementId -> CRDT element
    this.clockCounter = 0;     // Authoritative server Lamport counter for this room
    this.presence = new Map(); // socketId -> { userId, name, avatarColor, cursor, isDrawing, lastActive }
    this.undoStacks = new Map(); // userId -> Array<op>
    this.redoStacks = new Map(); // userId -> Array<op>
    this.opsLog = [];            // Array<{ id, clock, userId, opType, payload, createdAt }>
    this.comments = new Map();   // commentId -> comment object
    this.lastActive = Date.now();
    this.isLoaded = false;
    this.loadingPromise = null;
  }

  /**
   * Hydrate room state from MySQL
   */
  async loadFromDb() {
    if (this.isLoaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      const [rows] = await query(
        'SELECT id, type, props, prop_clocks, author_id, is_deleted, created_at, updated_at FROM elements WHERE room_id = ?',
        [this.roomId]
      );

      let maxCounter = 0;

      for (const row of rows) {
        const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;
        const propClocks = typeof row.prop_clocks === 'string' ? JSON.parse(row.prop_clocks) : row.prop_clocks;

        // Compute highest clock counter
        for (const clk of Object.values(propClocks || {})) {
          if (clk?.counter && clk.counter > maxCounter) {
            maxCounter = clk.counter;
          }
        }

        this.elements.set(row.id, {
          id: row.id,
          roomId: this.roomId,
          type: row.type,
          props,
          propClocks: propClocks || {},
          authorId: row.author_id,
          isDeleted: Boolean(row.is_deleted),
          deleteClock: null,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      }

      // Try loading past ops from ops_log if table exists
      try {
        const [opsRows] = await query(
          'SELECT id, clock, user_id, op_type, payload, created_at FROM ops_log WHERE room_id = ? ORDER BY clock ASC LIMIT 2000',
          [this.roomId]
        );
        for (const row of opsRows) {
          const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
          this.opsLog.push({
            id: row.id,
            clock: row.clock,
            userId: row.user_id,
            opType: row.op_type,
            payload,
            createdAt: row.created_at
          });
        }
      } catch (err) {
        // Table may not yet exist in development; graceful fallback to in-memory log
      }

      // Try loading comments if table exists
      try {
        const [commentRows] = await query(
          'SELECT id, user_id, user_name, user_avatar, element_id, x, y, text, parent_id, is_resolved, created_at FROM comments WHERE room_id = ? ORDER BY created_at ASC',
          [this.roomId]
        );
        for (const c of commentRows) {
          this.comments.set(c.id, {
            id: c.id,
            roomId: this.roomId,
            userId: c.user_id,
            userName: c.user_name,
            userAvatar: c.user_avatar,
            elementId: c.element_id,
            x: Number(c.x),
            y: Number(c.y),
            text: c.text,
            parentId: c.parent_id,
            isResolved: Boolean(c.is_resolved),
            createdAt: c.created_at
          });
        }
      } catch (err) {}

      this.clockCounter = maxCounter;
      this.isLoaded = true;
      this.lastActive = Date.now();
    })();

    return this.loadingPromise;
  }

  /**
   * Apply an op to in-memory state and update room clock
   */
  applyOp(op) {
    this.lastActive = Date.now();
    const opCounter = Number(op.clock?.counter || 0);
    this.clockCounter = Math.max(this.clockCounter, opCounter) + 1;

    const current = this.elements.get(op.elementId) || null;
    const { mergedElement, changed, previousProps } = applyOperation(current, op);

    this.elements.set(op.elementId, mergedElement);

    // Record in in-memory opsLog (for timeline scrubber & replay)
    this.opsLog.push({
      id: op.opId || crypto.randomUUID(),
      clock: op.clock?.counter || this.clockCounter,
      userId: op.userId,
      opType: op.type,
      payload: op,
      createdAt: new Date().toISOString()
    });

    if (this.opsLog.length > 5000) {
      this.opsLog.shift(); // Bound memory
    }

    return { mergedElement, changed, previousProps };
  }

  /**
   * Return paginated opsLog for history replay
   */
  getOpsLog(sinceClock = 0, limit = 500) {
    return this.opsLog
      .filter((entry) => entry.clock >= sinceClock)
      .slice(0, limit);
  }

  /**
   * Comments helpers
   */
  addComment(comment) {
    this.lastActive = Date.now();
    this.comments.set(comment.id, comment);
    return comment;
  }

  resolveComment(commentId, isResolved = true) {
    this.lastActive = Date.now();
    const c = this.comments.get(commentId);
    if (c) {
      c.isResolved = isResolved;
      return c;
    }
    return null;
  }

  deleteComment(commentId) {
    this.lastActive = Date.now();
    const existed = this.comments.delete(commentId);
    return existed;
  }

  getCommentsList() {
    return Array.from(this.comments.values());
  }

  /**
   * Return paginated chunks of 1000 elements for snapshot delivery
   */
  getSnapshotChunks(chunkSize = 1000) {
    // Only return non-deleted elements in the initial snapshot
    const activeElements = Array.from(this.elements.values()).filter(el => !el.isDeleted);
    const chunks = [];
    for (let i = 0; i < activeElements.length; i += chunkSize) {
      chunks.push(activeElements.slice(i, i + chunkSize));
    }
    return chunks.length > 0 ? chunks : [[]];
  }

  /**
   * Presence helpers
   */
  setPresence(socketId, userState) {
    this.lastActive = Date.now();
    this.presence.set(socketId, {
      ...userState,
      lastActive: Date.now()
    });
  }

  removePresence(socketId) {
    this.lastActive = Date.now();
    this.presence.delete(socketId);
  }

  getPresenceList() {
    return Array.from(this.presence.values());
  }

  hasUsers() {
    return this.presence.size > 0;
  }

  /**
   * Per-user Undo/Redo stack management
   */
  pushUndo(userId, op) {
    if (!this.undoStacks.has(userId)) {
      this.undoStacks.set(userId, []);
    }
    const stack = this.undoStacks.get(userId);
    stack.push(op);
    if (stack.length > 100) stack.shift(); // Limit to 100 steps
    // Clear redo on new action
    this.redoStacks.delete(userId);
  }

  popUndo(userId) {
    const stack = this.undoStacks.get(userId);
    if (!stack || stack.length === 0) return null;
    return stack.pop();
  }

  pushRedo(userId, op) {
    if (!this.redoStacks.has(userId)) {
      this.redoStacks.set(userId, []);
    }
    const stack = this.redoStacks.get(userId);
    stack.push(op);
    if (stack.length > 100) stack.shift();
  }

  popRedo(userId) {
    const stack = this.redoStacks.get(userId);
    if (!stack || stack.length === 0) return null;
    return stack.pop();
  }
}

/**
 * Singleton Room Manager with lazy loading and 10-minute idle eviction
 */
class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> RoomState

    // Periodically evict rooms that have been idle for > 10 minutes with 0 users
    this.evictionInterval = setInterval(() => {
      this.cleanupIdleRooms();
    }, 60 * 1000); // Check every minute
  }

  /**
   * Get or load room state
   */
  async getRoom(roomId) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new RoomState(roomId);
      this.rooms.set(roomId, room);
    }
    if (!room.isLoaded) {
      await room.loadFromDb();
    }
    return room;
  }

  cleanupIdleRooms() {
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const now = Date.now();

    for (const [roomId, room] of this.rooms.entries()) {
      if (!room.hasUsers() && now - room.lastActive > TEN_MINUTES_MS) {
        console.log(`[RoomManager] Evicting idle room ${roomId} from memory`);
        this.rooms.delete(roomId);
      }
    }
  }

  destroy() {
    if (this.evictionInterval) {
      clearInterval(this.evictionInterval);
    }
  }
}

export const roomManager = new RoomManager();
export default roomManager;
