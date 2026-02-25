import { Response } from 'express';
import Booking from '../../models/Booking';
import Hostel from '../../models/Hostel';
import { EscrowService } from '../../services/escrow.service';
import { NotificationService } from '../../services/notification.service';

// ─── Create Booking ──────────────────────────────────────────────────────────
export const createBooking = async (req: any, res: Response) => {
    try {
        const { hostelId, amount } = req.body;
        const userId = req.user.userId;

        const hostel = await Hostel.findById(hostelId);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        // Create the booking record (pending)
        const booking = await Booking.create({
            studentId: userId,
            agentId: hostel.agentId,
            propertyId: hostelId,
            amount,
            inspectionFee: hostel.inspectionFee || 0,
            status: 'pending',
            escrowStatus: 'held' // Will be finalized after pay
        });

        // Notify Agent
        await NotificationService.create({
            recipient: hostel.agentId,
            sender: userId,
            type: 'booking',
            title: 'New Booking Request',
            message: `A student has requested to book "${hostel.title}".`,
            link: `/dashboard?tab=bookings`
        });

        // Move funds to escrow
        try {
            await EscrowService.hold(userId, String(booking._id));
            res.status(201).json(booking);
        } catch (escrowErr: any) {
            // If escrow fails (insufficient funds etc), delete booking
            await Booking.findByIdAndDelete(booking._id);
            return res.status(400).json({ error: escrowErr.message });
        }
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to create booking' });
    }
};

// ─── Confirm Booking (releases funds to agent) ────────────────────────────────
export const confirmBooking = async (req: any, res: Response) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('propertyId');
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        // Ensure student is the one confirming
        if (String(booking.studentId) !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized: Only the student can confirm move-in' });
        }

        if (booking.status !== 'paid') {
            return res.status(400).json({ error: 'Booking must be paid before confirmation' });
        }

        await EscrowService.release(String(booking._id));

        // Notify Agent
        await NotificationService.create({
            recipient: booking.agentId,
            sender: booking.studentId,
            type: 'payment',
            title: 'Payment Released',
            message: `The student has confirmed move-in for "${(booking.propertyId as any)?.title}". Funds have been released to your wallet.`,
            link: `/dashboard?tab=wallet`
        });

        // Notify Student
        await NotificationService.create({
            recipient: booking.studentId,
            type: 'booking',
            title: 'Booking Confirmed',
            message: `Your booking for "${(booking.propertyId as any)?.title}" has been confirmed and funds released.`,
            link: `/dashboard?tab=bookings`
        });

        res.json({ message: 'Move-in confirmed. Funds released to agent.' });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to confirm booking' });
    }
};

// ─── Cancel Booking (refund to student) ──────────────────────────────────────
export const cancelBooking = async (req: any, res: Response) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('propertyId');
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        // Only student or admin can cancel
        if (String(booking.studentId) !== req.user.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await EscrowService.refund(String(booking._id));

        // Notify Agent
        await NotificationService.create({
            recipient: booking.agentId,
            sender: booking.studentId,
            type: 'booking',
            title: 'Booking Cancelled',
            message: `A student has cancelled their booking for "${(booking.propertyId as any)?.title}".`,
            link: `/dashboard?tab=bookings`
        });

        // Notify Student
        await NotificationService.create({
            recipient: booking.studentId,
            type: 'booking',
            title: 'Booking Cancelled',
            message: `Your booking for "${(booking.propertyId as any)?.title}" was cancelled and funds refunded.`,
            link: `/dashboard?tab=bookings`
        });

        res.json({ message: 'Booking cancelled and refund processed' });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
};

// ─── Get My Bookings (Student) ──────────────────────────────────────────────
export const getMyBookings = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId;
        const bookings = await Booking.find({ studentId: userId })
            .populate('propertyId')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
};

// ─── Get Agent Bookings (Coming to the Agent) ─────────────────────────────────
export const getAgentBookings = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId;
        const bookings = await Booking.find({ agentId: userId })
            .populate('propertyId')
            .populate('studentId', 'name email phone')
            .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch agent bookings' });
    }
};
