import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import { setupSocketIO } from './socket/index.js';
import { pool, testConnection } from './db/connection.js';
import batchWriter from './db/batchWriter.js';
import roomManager from './crdt/roomState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    // Test database connection on startup
    console.log('[Server] Connecting to MySQL database...');
    await testConnection();
    console.log('[Server] ✓ MySQL connected successfully');

    const app = createApp();
    const server = http.createServer(app);

    // Initialize Socket.IO hub
    const io = setupSocketIO(server);

    server.listen(PORT, () => {
      console.log(`[Server] ✓ BoardCollab backend running on http://localhost:${PORT}`);
      console.log(`[Server] Socket.IO hub active and ready for collaborative sessions`);
    });

    // Graceful Shutdown Handling (SIGTERM & SIGINT)
    const handleShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

      // 1. Stop accepting new HTTP / Socket requests
      server.close(() => {
        console.log('[Server] HTTP server closed.');
      });

      try {
        // 2. Destroy room eviction timers
        roomManager.destroy();

        // 3. Flush all in-memory write buffers to MySQL
        await batchWriter.shutdown();

        // 4. Close database pool connections
        await pool.end();
        console.log('[Server] MySQL pool closed.');

        console.log('[Server] Graceful shutdown complete. Exiting.');
        process.exit(0);
      } catch (err) {
        console.error('[Server Error] Error during graceful shutdown:', err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    return { server, io, app };
  } catch (error) {
    console.error('[Server Fatal Error] Failed to start server:', error);
    process.exit(1);
  }
}

// Start if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

export default startServer;
