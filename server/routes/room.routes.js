import { Router } from 'express';
import { z } from 'zod';
import {
  createRoom,
  getRooms,
  getRoomById,
  joinRoomByCode,
  deleteRoom,
  exportRoomPng
} from '../controllers/room.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// All room routes require authentication
router.use(authenticate);

const createRoomSchema = z.object({
  name: z.string().trim().min(2, 'Room name must be at least 2 characters').max(100),
  visibility: z.enum(['public', 'private']).default('public')
});

const joinRoomSchema = z.object({
  roomCode: z.string().trim().min(4, 'Room code must be at least 4 characters').max(12)
});

router.post('/', validate({ body: createRoomSchema }), createRoom);
router.get('/', getRooms);
router.get('/:id', getRoomById);
router.post('/join', validate({ body: joinRoomSchema }), joinRoomByCode);
router.delete('/:id', deleteRoom);
router.post('/:id/export', exportRoomPng);

export default router;
