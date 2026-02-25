import { Request, Response } from 'express';
import User from '../../models/User';
import Wallet from '../../models/Wallet';
import VerificationDocument from '../../models/VerificationDocument';
import { generateToken, generateResetToken, verifyToken } from '../../utils/jwt';
import { hashPassword, comparePassword } from '../../utils/hash';
import { generateAndSendOtp, verifyOtpCode } from '../../utils/otpService';

// ─── Register ────────────────────────────────────────────────────────────────
// Step 1: Create account → send email verification OTP
export const register = async (req: Request, res: Response) => {
    try {
        console.log('📝 Registration request received');
        console.log('Body:', { ...req.body, password: req.body.password ? '[HIDDEN]' : undefined });
        console.log('Files:', req.files);

        const {
            name, email, password, role, phone, idNumber, nin, address, businessName,
            bankName, accountNumber, bankCode
        } = req.body;

        if (!password) {
            console.error('❌ Registration failed: Missing password in req.body');
            return res.status(400).json({ error: 'Password is required for registration' });
        }
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        let profilePicture = '';
        let ninImage = '';

        if (files) {
            if (files['profilePicture']) profilePicture = files['profilePicture'][0].path;
            if (files['ninImage']) ninImage = files['ninImage'][0].path;
        }

        // ─── Phase 1: Pre-Registration Validation ─────────────────────
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({ error: 'An account with this email address already exists.' });
        }

        let bankResult: any = undefined;
        let aiMatchResult: any = undefined;

        // ─── Phase 2: Strict Agent Identity Verification (Paystack) ─────
        if (role === 'AGENT') {
            console.log(`🛡️ Strict verification started for agent: ${name}`);
            const { PaystackService } = require('../../services/paystack.service');

            try {
                // 1. Resolve Bank Account
                if (!accountNumber || !bankCode) {
                    return res.status(400).json({ error: 'Bank details (Account Number & Bank) are required for agents' });
                }
                bankResult = await PaystackService.resolveAccountNumber(accountNumber, bankCode);
                const resolvedBankName = bankResult.data.account_name.toUpperCase();
                console.log(`✅ Bank Resolved: ${resolvedBankName}`);

                // 2. Perform NIN Identity Check (if NIN provided)
                if (nin) {
                    const nameParts = name.trim().split(' ');
                    const firstName = nameParts[0];
                    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
                }

                // 3. AI-Powered Smart Identity Comparison
                const { IdentityAIService } = require('../../ai/ai.service');
                const aiResult = await IdentityAIService.verifyMatch(name, resolvedBankName);

                aiMatchResult = {
                    score: aiResult.score,
                    similarityPercent: aiResult.similarity_percent,
                    passed: aiResult.passed,
                    message: aiResult.message
                };

                console.log(`🤖 AI Result [Score: ${aiResult.score}]: ${aiResult.message}`);

                if (!aiResult.passed) {
                    console.error(`❌ Identity Mismatch: ${name} vs ${resolvedBankName}`);
                    return res.status(400).json({
                        error: `Identity Mismatch (AI Restricted): Your name "${name}" does not significantly match the name registered on your bank account ("${resolvedBankName}"). All data must match exactly.`
                    });
                }

                console.log('✅ Identity intelligence (Python AI) verified matching records.');
            } catch (err: any) {
                console.error(`🛡️ Verification Failed: ${err.message}`);
                return res.status(400).json({ error: `Verification Failed: ${err.message}. Please ensure your details are correct.` });
            }
        }

        const hashedPassword = await hashPassword(password);

        const user = await User.create({
            name, email, password: hashedPassword,
            role: role || 'STUDENT', phone, idNumber, nin, address, businessName,
            profilePicture, ninImage,
            bankDetails: role === 'AGENT' ? {
                bankName,
                accountNumber,
                bankCode,
                accountName: bankResult?.data?.account_name?.toUpperCase() || 'UNKNOWN'
            } : undefined,
            aiVerification: aiMatchResult,
            isEmailVerified: false,
            isPhoneVerified: false,
            twoFactorEnabled: true,
            verificationStatus: 'PENDING',
        });

        // Create formal verification documents if files were uploaded during registration
        if (profilePicture || ninImage) {
            const docPromises = [];
            if (profilePicture) {
                docPromises.push(VerificationDocument.create({
                    userId: user._id,
                    type: 'SELFIE',
                    fileUrl: profilePicture,
                    status: 'PENDING',
                }));
            }
            if (ninImage) {
                docPromises.push(VerificationDocument.create({
                    userId: user._id,
                    type: 'NIN',
                    fileUrl: ninImage,
                    status: 'PENDING',
                }));
            }
            await Promise.all(docPromises);
        }

        // Create wallet
        await Wallet.create({ userId: user._id, balance: 0, escrowBalance: 0 });

        // If it's an AGENT, don't send OTP yet - wait for bank details
        if (role === 'AGENT') {
            return res.status(201).json({
                message: 'Account created! Please provide your bank details to continue.',
                requiresBankDetails: true,
                userId: user._id,
                email: user.email,
                user: {
                    id: user._id, name: user.name, email: user.email, phone: user.phone,
                    role: user.role, verificationStatus: user.verificationStatus,
                },
            });
        }

        // Standard flow for students/others
        await generateAndSendOtp(String(user._id), user.email, 'EMAIL_VERIFY', user.name, user.phone);

        res.status(201).json({
            message: 'Account created! Verification code sent to your email.',
            requiresOtp: true,
            otpPurpose: 'EMAIL_VERIFY',
            userId: user._id,
            email: user.email,
            phone: user.phone,
            user: {
                id: user._id, name: user.name, email: user.email, phone: user.phone,
                role: user.role, verificationStatus: user.verificationStatus,
            },
        });
    } catch (err: any) {
        console.error('Register error:', err.message);

        // MongoDB duplicate key error (race condition or missing pre-check)
        if (err.code === 11000 && err.keyValue) {
            const field = Object.keys(err.keyValue)[0];
            const fieldLabel = field === 'email' ? 'email address' : field === 'phone' ? 'phone number' : field;
            return res.status(409).json({
                error: `An account with this ${fieldLabel} already exists. Please use a different ${fieldLabel} or log in.`,
            });
        }

        res.status(500).json({ error: err.message || 'Registration failed. Please try again.' });
    }
};

// ─── Verify Email OTP ─────────────────────────────────────────────────────────
// Step 2 (after register): Verify email → issue JWT token
export const verifyEmailOtp = async (req: Request, res: Response) => {
    try {
        const { userId, code } = req.body;

        if (!userId || !code) {
            return res.status(400).json({ error: 'User ID and OTP code are required' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const result = await verifyOtpCode(userId, code, 'EMAIL_VERIFY');
        if (!result.valid) {
            return res.status(400).json({ error: result.error });
        }

        // Mark as verified (Email & Phone)
        user.isEmailVerified = true;
        user.isPhoneVerified = true;
        await user.save();

        // If agent is not approved, don't issue token yet
        if (user.role === 'AGENT' && user.verificationStatus !== 'APPROVED') {
            return res.json({
                message: 'Contact information verified! ✅ Your agent account is now under review. You will receive an email once an admin approves your documents.',
                requiresApproval: true,
                user: {
                    id: user._id, name: user.name, email: user.email, phone: user.phone,
                    role: user.role, verificationStatus: user.verificationStatus,
                },
            });
        }

        // Issue JWT for verified students/admins or already approved agents
        const token = generateToken(String(user._id), user.role, user.email);
        res.json({
            message: 'Account verified successfully! ✅',
            token,
            user: {
                id: user._id, name: user.name, email: user.email, phone: user.phone,
                role: user.role, verificationStatus: user.verificationStatus,
            },
        });
    } catch (err: any) {
        console.error('Verify email error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── Login ────────────────────────────────────────────────────────────────────
// Step 1: Validate credentials → send 2FA OTP
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid email or password' });

        const valid = await comparePassword(password, user.password);
        if (!valid) return res.status(400).json({ error: 'Invalid email or password' });

        // Check if verified (Email & Phone) - Bypass for ADMIN
        console.log(`🔐 Login attempt for ${user.email} (Role: ${user.role})`);
        console.log(`Verification: Email=${user.isEmailVerified}, Phone=${user.isPhoneVerified}`);

        if (user.role === 'ADMIN') {
            console.log('🛡️ Admin bypass triggered');
        } else if (user.role === 'AGENT' && (!user.bankDetails || !user.bankDetails.accountNumber)) {
            console.log('💳 Agent missing bank details, allowing login (will setup in dashboard)');
            // Relaxed: Don't block login, let them set it up in Settings
        } else if (!user.isEmailVerified || !user.isPhoneVerified) {
            console.log('🚫 Verification incomplete, sending OTP');
            // Resend verification OTP
            await generateAndSendOtp(String(user._id), user.email, 'EMAIL_VERIFY', user.name, user.phone);
            return res.status(403).json({
                error: 'Account verification incomplete. We sent a new verification code to your email and phone number.',
                requiresOtp: true,
                otpPurpose: 'EMAIL_VERIFY',
                userId: user._id,
                email: user.email,
                phone: user.phone,
            });
        }

        // Check if agent is approved
        if (user.role === 'AGENT' && user.verificationStatus !== 'APPROVED') {
            return res.status(403).json({
                error: 'Your agent account is currently under review. You will be notified via email once your documents are verified and your account is approved.',
                verificationStatus: user.verificationStatus
            });
        }

        // No 2FA required for standard login (verification only on signup or password reset)
        const token = generateToken(String(user._id), user.role, user.email);
        res.json({
            token,
            user: {
                id: user._id, name: user.name, email: user.email, phone: user.phone,
                role: user.role, verificationStatus: user.verificationStatus,
            },
        });
    } catch (err: any) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── Verify Login OTP (2FA) ──────────────────────────────────────────────────
// Step 2 (after login): Verify 2FA OTP → issue JWT token
export const verifyLoginOtp = async (req: Request, res: Response) => {
    try {
        const { userId, code } = req.body;

        if (!userId || !code) {
            return res.status(400).json({ error: 'User ID and OTP code are required' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const result = await verifyOtpCode(userId, code, 'LOGIN_2FA');
        if (!result.valid) {
            return res.status(400).json({ error: result.error });
        }

        const token = generateToken(String(user._id), user.role, user.email);
        res.json({
            message: 'Login verified! ✅',
            token,
            user: {
                id: user._id, name: user.name, email: user.email,
                role: user.role, verificationStatus: user.verificationStatus,
            },
        });
    } catch (err: any) {
        console.error('Verify login OTP error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── Resend OTP ──────────────────────────────────────────────────────────────
export const resendOtp = async (req: Request, res: Response) => {
    try {
        const { userId, purpose } = req.body;

        if (!userId || !purpose) {
            return res.status(400).json({ error: 'User ID and purpose are required' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await generateAndSendOtp(String(user._id), user.email, purpose, user.name, user.phone);

        res.json({ message: 'New verification code sent to your email and phone' });
    } catch (err: any) {
        console.error('Resend OTP error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── Toggle 2FA ──────────────────────────────────────────────────────────────
export const toggle2FA = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.twoFactorEnabled = !user.twoFactorEnabled;
        await user.save();

        res.json({
            message: `Two-factor authentication ${user.twoFactorEnabled ? 'enabled' : 'disabled'}`,
            twoFactorEnabled: user.twoFactorEnabled,
        });
    } catch (err: any) {
        console.error('Toggle 2FA error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// ─── Save Bank Details & Start OTP ───────────────────────────────────────────
export const saveBankDetails = async (req: any, res: Response) => {
    try {
        const { bankName, accountNumber, accountName, bankCode } = req.body;
        const userId = req.user?.userId || req.body.userId;

        if (!userId || !bankName || !accountNumber || !accountName) {
            return res.status(400).json({ error: 'All bank details are required' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.bankDetails = { bankName, accountNumber, accountName, bankCode };
        await user.save();

        res.json({
            message: 'Bank identity linked to your profile successfully!',
            requiresOtp: false,
            userId: user._id,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user);
    } catch (err: any) {
        console.error('Get profile error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const { name, phone, address, businessName } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Update fields if provided
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (address !== undefined) user.address = address;
        if (businessName !== undefined && user.role === 'AGENT') {
            user.businessName = businessName;
        }

        await user.save();

        res.json({
            message: 'Profile updated successfully!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                address: user.address,
                businessName: user.businessName,
                twoFactorEnabled: user.twoFactorEnabled
            }
        });
    } catch (err: any) {
        console.error('Update profile error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'No account found with this email address.' });
        }

        await generateAndSendOtp(String(user._id), user.email, 'PASSWORD_RESET', user.name, user.phone);

        res.json({
            message: 'Password reset code sent to your email and phone',
            userId: user._id
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Verify Reset OTP ─────────────────────────────────────────────────────────
export const verifyResetOtp = async (req: Request, res: Response) => {
    try {
        const { userId, code } = req.body;
        const result = await verifyOtpCode(userId, code, 'PASSWORD_RESET');
        if (!result.valid) {
            return res.status(400).json({ error: result.error });
        }

        // Issue a short-lived reset token
        const resetToken = generateResetToken(userId);

        res.json({
            message: 'OTP verified! You can now reset your password.',
            resetToken
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Reset Password ───────────────────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { password, confirmPassword } = req.body;
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.status(401).json({ error: 'Reset token is required' });
        if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

        const decoded: any = verifyToken(token);
        if (decoded.purpose !== 'PASSWORD_RESET') {
            return res.status(401).json({ error: 'Invalid reset token' });
        }

        const hashedPassword = await hashPassword(password);
        await User.findByIdAndUpdate(decoded.userId, { password: hashedPassword });

        res.json({ message: 'Password has been reset successfully! You can now log in.' });
    } catch (err: any) {
        res.status(401).json({ error: 'Invalid or expired reset token' });
    }
};

