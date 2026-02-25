import crypto from 'crypto';
import Otp from '../models/Otp';
import { sendOtpEmail } from './email';
import mongoose from 'mongoose';

/**
 * Generate a 6-digit OTP, save it, and deliver via email
 */
export const generateAndSendOtp = async (
    userId: string,
    email: string,
    purpose: 'EMAIL_VERIFY' | 'LOGIN_2FA' | 'PASSWORD_RESET',
    userName: string = 'User',
    _phone?: string
): Promise<boolean> => {
    // Delete any existing OTP for this user + purpose
    await Otp.deleteMany({ userId: new mongoose.Types.ObjectId(userId), purpose });

    // Generate secure 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();

    // Save OTP (expires in 10 minutes)
    await Otp.create({
        userId: new mongoose.Types.ObjectId(userId),
        email,
        code,
        purpose,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Always log the code (visible in backend terminal for dev/testing)
    console.log(`🔑 OTP for ${email} (${purpose}): ${code}`);

    // Send email
    const emailSent = await sendOtpEmail(email, code, purpose, userName);
    if (!emailSent) {
        console.warn(`⚠️  Email delivery failed for ${email}. Check EMAIL_USER / EMAIL_PASS in .env`);
    }

    return emailSent;
};


/**
 * Verify an OTP code
 */
export const verifyOtpCode = async (
    userId: string,
    code: string,
    purpose: 'EMAIL_VERIFY' | 'LOGIN_2FA' | 'PASSWORD_RESET'
): Promise<{ valid: boolean; error?: string }> => {
    const otp = await Otp.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        purpose,
    }).sort({ createdAt: -1 });

    if (!otp) {
        return { valid: false, error: 'No OTP found. Please request a new one.' };
    }

    // Check expiry
    if (otp.expiresAt < new Date()) {
        await Otp.deleteOne({ _id: otp._id });
        return { valid: false, error: 'OTP has expired. Please request a new one.' };
    }

    // Check attempts (max 5)
    if (otp.attempts >= 5) {
        await Otp.deleteOne({ _id: otp._id });
        return { valid: false, error: 'Too many attempts. Please request a new OTP.' };
    }

    // Increment attempts
    otp.attempts += 1;
    await otp.save();

    // Check code
    if (otp.code !== code) {
        return { valid: false, error: `Invalid code. ${5 - otp.attempts} attempts remaining.` };
    }

    // Valid — delete OTP
    await Otp.deleteOne({ _id: otp._id });
    return { valid: true };
};
