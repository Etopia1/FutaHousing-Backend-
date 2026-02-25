import express from 'express';
import { authenticate, authorizeRole } from '../../middleware/auth';
import { createBooking, confirmBooking, cancelBooking, getMyBookings, getAgentBookings } from './controller';

const router = express.Router();

// General Booking Routes
router.get('/my-bookings', authenticate, getMyBookings);
router.get('/agent-bookings', authenticate, authorizeRole('AGENT'), getAgentBookings);

router.post('/', authenticate, createBooking);
router.post('/:id/confirm', authenticate, confirmBooking);
router.post('/:id/cancel', authenticate, cancelBooking);

export default router;
