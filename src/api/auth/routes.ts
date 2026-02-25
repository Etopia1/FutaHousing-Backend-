import express from 'express';
import {
    register, login, verifyEmailOtp, verifyLoginOtp, resendOtp,
    toggle2FA, getProfile, saveBankDetails, updateProfile,
    forgotPassword, verifyResetOtp, resetPassword
} from './controller';
import { authenticate } from '../../middleware/auth';

import multer from 'multer';
import { storage } from '../../config/cloudinary';

const router = express.Router();
const upload = multer({ storage });

// Public routes
router.post('/register', upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'ninImage', maxCount: 1 }
]), register);
router.post('/login', login);
router.post('/verify-email', verifyEmailOtp);
router.post('/verify-login', verifyLoginOtp);
router.post('/resend-otp', resendOtp);

// Forgot Password flow
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

// Protected routes
router.put('/toggle-2fa', authenticate, toggle2FA);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/save-bank-details', authenticate, saveBankDetails);

export default router;
