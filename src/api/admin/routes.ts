import express from 'express';
import { authenticate, authorizeRole } from '../../middleware/auth';
import {
    getStats, getAllUsers, verifyUser, rejectUser,
    getPendingDocuments, adminReviewDocument, getAllBookings, deleteNonAdminUsers,
    getAllHostels, deleteHostel, getAllTransactions, getUserDocuments,
    updateAdminBank, adminWithdraw
} from './controller';

const router = express.Router();

// All admin routes require ADMIN role
router.use(authenticate, authorizeRole('ADMIN'));

router.get('/stats', getStats);
router.get('/users/:id/documents', getUserDocuments);
router.get('/users', getAllUsers);
router.put('/users/:id/verify', verifyUser);
router.put('/users/:id/reject', rejectUser);
router.get('/documents/pending', getPendingDocuments);
router.put('/documents/:id/review', adminReviewDocument);
router.get('/bookings', getAllBookings);
router.get('/hostels', getAllHostels);
router.delete('/hostels/:id', deleteHostel);
router.get('/transactions', getAllTransactions);
router.put('/bank-details', updateAdminBank);
router.post('/withdraw', adminWithdraw);
router.delete('/users/non-admin', deleteNonAdminUsers);

export default router;
