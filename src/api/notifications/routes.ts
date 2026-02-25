import express from 'express';
import { authenticate } from '../../middleware/auth';
import { getMyNotifications, markAsRead, deleteNotification } from './controller';

const router = express.Router();

router.get('/', authenticate, getMyNotifications);
router.put('/read', authenticate, markAsRead);
router.delete('/:id', authenticate, deleteNotification);

export default router;
