import { getConnection, query } from './connection.js';

class BatchWriter {
  constructor() {
    // Map<roomId, Map<elementId, elementData>>
    this.buffers = new Map();
    this.timer = null;
    this.isFlushing = false;
    this.FLUSH_INTERVAL_MS = 5000;
    this.MAX_BUFFER_SIZE = 100;

    this.startPeriodicFlush();
  }

  startPeriodicFlush() {
    this.timer = setInterval(() => {
      this.flushAll();
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Queue a mutated element for persistence
   * @param {string} roomId 
   * @param {object} element - Authoritative CRDT element from roomState
   */
  queue(roomId, element) {
    if (!this.buffers.has(roomId)) {
      this.buffers.set(roomId, new Map());
    }

    const roomBuffer = this.buffers.get(roomId);
    roomBuffer.set(element.id, element);

    // If buffer threshold reached (>= 100 ops), flush immediately
    if (roomBuffer.size >= this.MAX_BUFFER_SIZE) {
      this.flushRoom(roomId);
    }
  }

  /**
   * Flush all active room buffers
   */
  async flushAll() {
    const roomIds = Array.from(this.buffers.keys());
    for (const roomId of roomIds) {
      await this.flushRoom(roomId);
    }
  }

  /**
   * Flush a single room's buffer within a MySQL transaction with deadlock retry
   */
  async flushRoom(roomId) {
    const roomBuffer = this.buffers.get(roomId);
    if (!roomBuffer || roomBuffer.size === 0) return;

    // Snapshot buffered items and clear buffer
    const itemsToSave = Array.from(roomBuffer.values());
    this.buffers.delete(roomId);

    let attempts = 0;
    const maxRetries = 3;

    while (attempts < maxRetries) {
      attempts++;
      let connection = null;

      try {
        connection = await getConnection();
        await connection.beginTransaction();

        // Build bulk INSERT ... ON DUPLICATE KEY UPDATE
        // MySQL 8 format
        const valuePlaceholders = itemsToSave.map(() => '(?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(', ');
        const flatParams = [];

        for (const el of itemsToSave) {
          flatParams.push(
            el.id,
            el.roomId,
            el.type,
            JSON.stringify(el.props || {}),
            JSON.stringify(el.propClocks || {}),
            el.authorId,
            el.isDeleted ? 1 : 0
          );
        }

        const sql = `
          INSERT INTO elements (id, room_id, type, props, prop_clocks, author_id, is_deleted, created_at, updated_at)
          VALUES ${valuePlaceholders}
          ON DUPLICATE KEY UPDATE
            props = VALUES(props),
            prop_clocks = VALUES(prop_clocks),
            is_deleted = VALUES(is_deleted),
            updated_at = NOW();
        `;

        await connection.query(sql, flatParams);

        // Update room's last_updated timestamp
        await connection.query('UPDATE rooms SET last_updated = NOW() WHERE id = ?', [roomId]);

        await connection.commit();
        return; // Success
      } catch (error) {
        if (connection) {
          try { await connection.rollback(); } catch {}
        }

        // Deadlock or lock wait timeout: retry with backoff
        if (error.code === 'ER_LOCK_DEADLOCK' || error.code === 'ER_LOCK_WAIT_TIMEOUT') {
          console.warn(`[BatchWriter] Lock contention in room ${roomId} (attempt ${attempts}/${maxRetries}), retrying...`);
          await new Promise(res => setTimeout(res, attempts * 50));
          continue;
        }

        console.error(`[BatchWriter Error] Failed to flush room ${roomId}:`, error.message);
        // Put items back into buffer to never lose data
        this.requeue(roomId, itemsToSave);
        break;
      } finally {
        if (connection) {
          connection.release();
        }
      }
    }
  }

  /**
   * Requeue items back into the buffer if save failed
   */
  requeue(roomId, items) {
    if (!this.buffers.has(roomId)) {
      this.buffers.set(roomId, new Map());
    }
    const buf = this.buffers.get(roomId);
    for (const item of items) {
      if (!buf.has(item.id)) {
        buf.set(item.id, item);
      }
    }
  }

  /**
   * Flush everything on graceful shutdown
   */
  async shutdown() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    console.log('[BatchWriter] Graceful shutdown: flushing all pending write buffers...');
    await this.flushAll();
    console.log('[BatchWriter] All write buffers flushed to MySQL.');
  }
}

export const batchWriter = new BatchWriter();
export default batchWriter;
