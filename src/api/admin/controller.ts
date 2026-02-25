import { Response } from 'express';
import User from '../../models/User';
import Hostel from '../../models/Hostel';
import Booking from '../../models/Booking';
import Wallet from '../../models/Wallet';
import Transaction from '../../models/Transaction';
import VerificationDocument from '../../models/VerificationDocument';
import Otp from '../../models/Otp';
import { sendVerificationEmail } from '../../utils/email';

// ─── Platform Statistics ──────────────────────────────────────────────────────
export const getStats = async (req: any, res: Response) => {
    try {
        const [totalUsers, totalStudents, totalAgents, totalHostels, totalBookings, pendingDocs] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'STUDENT' }),
            User.countDocuments({ role: 'AGENT' }),
            Hostel.countDocuments(),
            Booking.countDocuments(),
            VerificationDocument.countDocuments({ status: 'PENDING' }),
        ]);

        // ─── Financial Intelligence ───────────────────────────────────

        // 1. Settled Revenue (Confirmed/Completed)
        const revenueAgg = await Booking.aggregate([
            { $match: { status: { $in: ['confirmed', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$amount' }, inspection: { $sum: '$inspectionFee' } } },
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;
        const totalInspectionRevenue = revenueAgg[0]?.inspection || 0;
        const commissionRevenue = totalRevenue * 0.10; // Updated to 10% for system consistency

        // 2. Escrow (Paid but Held)
        const escrowAgg = await Booking.aggregate([
            { $match: { status: 'paid', escrowStatus: 'held' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const escrowBalance = escrowAgg[0]?.total || 0;

        // 2. Admin Wallet & Actual Balance
        const adminUser = await User.findById(req.user.userId);
        let adminWallet = await Wallet.findOne({ userId: req.user.userId });
        if (!adminWallet) {
            adminWallet = await Wallet.create({ userId: req.user.userId, balance: 0 });
        }

        // 3. Daily Revenue Trend (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dailyRevenue = await Booking.aggregate([
            { $match: { status: 'confirmed', createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, amount: { $sum: '$amount' } } },
            { $sort: { _id: 1 } }
        ]);

        // 4. Identity Health (AI Verification Stats)
        const identityStats = await User.aggregate([
            { $match: { role: 'AGENT' } },
            { $group: { _id: '$aiVerification.passed', count: { $sum: 1 } } }
        ]);

        // 5. User Growth (6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const userGrowth = await User.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        res.json({
            totalUsers, totalStudents, totalAgents, totalHostels,
            totalBookings, pendingDocs,
            totalRevenue,
            commissionRevenue,
            escrowBalance,
            totalInspectionRevenue,
            adminBalance: adminWallet.balance,
            adminBankDetails: adminUser?.bankDetails,
            bookingsByStatus: await Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            userGrowth, dailyRevenue, identityStats
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── All Users ────────────────────────────────────────────────────────────────
export const getAllUsers = async (req: any, res: Response) => {
    try {
        const { role, status, search, page = 1, limit = 20 } = req.query;
        const query: any = {};
        if (role) query.role = role;
        if (status) query.verificationStatus = status;
        if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];

        const skip = (Number(page) - 1) * Number(limit);
        const total = await User.countDocuments(query);
        const users = await User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

        res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Verify User ──────────────────────────────────────────────────────────────
export const verifyUser = async (req: any, res: Response) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { verificationStatus: 'APPROVED' }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Notify user via email
        await sendVerificationEmail(user.email, 'APPROVED', user.name);

        res.json({ message: `${user.name} has been verified`, user });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Reject User (Permanent Deletion) ──────────────────────────────────────────
export const rejectUser = async (req: any, res: Response) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // ── Wallet Guard ──────────────────────────────────────────────────────────
        // Block deletion if the user still has funds in their wallet or escrow
        const wallet = await Wallet.findOne({ userId });
        if (wallet && (wallet.balance > 0 || wallet.escrowBalance > 0)) {
            return res.status(400).json({
                error: `Cannot delete ${user.name}: they still have ₦${wallet.balance.toLocaleString()} in their wallet and ₦${wallet.escrowBalance.toLocaleString()} in escrow. Ensure both balances are ₦0 before deleting.`
            });
        }

        // Notify user via email BEFORE deletion while we still have their data
        await sendVerificationEmail(user.email, 'REJECTED', user.name);

        // Permanently wipe user and their verification docs from the system
        await Promise.all([
            User.findByIdAndDelete(userId),
            Wallet.deleteMany({ userId }),
            VerificationDocument.deleteMany({ userId }),
            Otp.deleteMany({ userId }) // Clean up any stale OTPs too
        ]);

        console.log(`🗑️ User ${user.name} (${userId}) permanently deleted after rejection.`);
        res.json({ message: `${user.name} has been rejected and permanently removed from the system` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Pending Verification Documents ──────────────────────────────────────────
export const getPendingDocuments = async (_req: any, res: Response) => {
    try {
        const docs = await VerificationDocument.find({ status: 'PENDING' })
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 });
        res.json(docs);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Admin Review Document ────────────────────────────────────────────────────
export const adminReviewDocument = async (req: any, res: Response) => {
    try {
        const { status } = req.body;
        const { id } = req.params;
        if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

        let doc;
        let userId;

        if (id.startsWith('virtual-') || id.startsWith('reg-')) {
            // Handle virtual/registration documents
            userId = id.split('-').pop();
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            doc = {
                _id: id,
                userId: userId,
                status,
                type: id.includes('profile') ? 'SELFIE' : 'NIN',
                fileUrl: id.includes('profile') ? user.profilePicture : user.ninImage,
                isVirtual: true
            };
        } else {
            doc = await VerificationDocument.findByIdAndUpdate(id, { status }, { new: true });
            if (!doc) return res.status(404).json({ error: 'Document not found' });
            userId = doc.userId;
        }

        if (status === 'APPROVED' || status === 'REJECTED') {
            const [user, userDocs] = await Promise.all([
                User.findById(userId),
                VerificationDocument.find({ userId })
            ]);

            if (user) {
                // Determine new status
                const requiredTypes = user.role === 'AGENT' ? ['AGENT_NIN', 'AGENT_FACE'] : ['STUDENT_ID'];
                const approvedDocs = userDocs.filter(d => d.status === 'APPROVED').map(d => d.type);
                const hasRejection = userDocs.some(d => d.status === 'REJECTED');

                let newStatus: 'APPROVED' | 'REJECTED' | 'PENDING' = 'PENDING';
                if (hasRejection) newStatus = 'REJECTED';
                else if (requiredTypes.every(type => approvedDocs.includes(type as any))) newStatus = 'APPROVED';

                user.verificationStatus = newStatus;
                await user.save();

                // Notify user
                await sendVerificationEmail(user.email, newStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED', user.name);
            }
        }

        res.json({ message: `Document ${status.toLowerCase()}`, doc });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── All Bookings ─────────────────────────────────────────────────────────────
export const getAllBookings = async (_req: any, res: Response) => {
    try {
        const bookings = await Booking.find()
            .populate('studentId', 'name email')
            .populate('hostelId', 'title location price')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(bookings);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── User Documents ──────────────────────────────────────────────────────────
export const getUserDocuments = async (req: any, res: Response) => {
    try {
        const userId = req.params.id;
        console.log(`[Admin] Fetching docs for user: ${userId}`);

        const [user, docs] = await Promise.all([
            User.findById(userId).select('profilePicture ninImage name'),
            VerificationDocument.find({ userId }).sort({ createdAt: -1 })
        ]);

        if (!user) {
            console.error(`[Admin] User not found: ${userId}`);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`[Admin] User data: ${JSON.stringify({
            name: user.name,
            hasProfile: !!user.profilePicture,
            hasNinImage: !!user.ninImage
        })}`);
        console.log(`[Admin] DB Documents found: ${docs.length}`);

        // Synthesize virtual documents from User profile if they don't exist in docs
        const finalDocs: any[] = docs.map(d => {
            const obj = d.toObject();
            if (obj.fileUrl) obj.fileUrl = obj.fileUrl.replace(/\\/g, '/');
            return obj;
        });

        if (user.profilePicture && !docs.some(d => d.type === 'SELFIE')) {
            finalDocs.push({
                _id: 'reg-profile-' + userId,
                userId: userId,
                type: 'SELFIE',
                fileUrl: user.profilePicture.replace(/\\/g, '/'),
                status: 'PENDING',
                isVirtual: true
            });
        }

        if (user.ninImage && !docs.some(d => d.type === 'AGENT_NIN' || d.type === 'NIN')) {
            finalDocs.push({
                _id: 'reg-nin-' + userId,
                userId: userId,
                type: 'NIN',
                fileUrl: user.ninImage.replace(/\\/g, '/'),
                status: 'PENDING',
                isVirtual: true
            });
        }

        res.json(finalDocs);
    } catch (err: any) {
        console.error(`[Admin] Error in getUserDocuments: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// ─── All Hostels ──────────────────────────────────────────────────────────────
export const getAllHostels = async (req: any, res: Response) => {
    try {
        const { agentId } = req.query;
        const query: any = {};
        if (agentId) query.agentId = agentId;

        const hostels = await Hostel.find(query)
            .populate('agentId', 'name email')
            .sort({ createdAt: -1 });
        res.json(hostels);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Delete Hostel ────────────────────────────────────────────────────────────
export const deleteHostel = async (req: any, res: Response) => {
    try {
        const hostel = await Hostel.findByIdAndDelete(req.params.id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });
        res.json({ message: 'Hostel deleted from registry' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── All Transactions ────────────────────────────────────────────────────────
export const getAllTransactions = async (_req: any, res: Response) => {
    try {
        const transactions = await Transaction.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(transactions);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Delete All Non-Admin Users ───────────────────────────────────────────────
export const deleteNonAdminUsers = async (_req: any, res: Response) => {
    try {
        // Find all non-admin user IDs
        const nonAdmins = await User.find({ role: { $in: ['STUDENT', 'AGENT'] } }).select('_id');
        const ids = nonAdmins.map((u) => u._id);

        if (ids.length === 0) {
            return res.json({ message: 'No non-admin users found to delete.', deleted: 0 });
        }

        // ── Wallet Guard ──────────────────────────────────────────────────────────
        // Find users who still have funds in their wallet or escrow — skip them
        const walletsWithFunds = await Wallet.find({
            userId: { $in: ids },
            $or: [{ balance: { $gt: 0 } }, { escrowBalance: { $gt: 0 } }]
        }).select('userId');
        const blockedIdSet = new Set(walletsWithFunds.map((w) => w.userId.toString()));
        const safeIds = ids.filter((id) => !blockedIdSet.has(id.toString()));

        if (safeIds.length === 0) {
            return res.status(400).json({
                error: `All ${ids.length} user(s) still have funds in their wallet or escrow. No users were deleted.`,
                skipped: ids.length,
                deleted: 0
            });
        }

        // Delete cascade for safe users only: wallets, documents, OTPs, bookings, transactions, hostels
        await Promise.all([
            Wallet.deleteMany({ userId: { $in: safeIds } }),
            VerificationDocument.deleteMany({ userId: { $in: safeIds } }),
            Otp.deleteMany({ userId: { $in: safeIds } }),
            Booking.deleteMany({ $or: [{ studentId: { $in: safeIds } }, { agentId: { $in: safeIds } }] }),
            Transaction.deleteMany({ userId: { $in: safeIds } }),
            Hostel.deleteMany({ agentId: { $in: safeIds } }),
        ]);

        const result = await User.deleteMany({ _id: { $in: safeIds } });

        const skippedCount = blockedIdSet.size;
        const skippedMsg = skippedCount > 0
            ? ` Skipped ${skippedCount} user(s) who still have funds in their wallet or escrow.`
            : '';

        res.json({
            message: `Successfully deleted ${result.deletedCount} non-admin user(s) and all associated data.${skippedMsg}`,
            deleted: result.deletedCount,
            skipped: skippedCount
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
// ─── Update Admin Bank Details ───────────────────────────────────────────────
export const updateAdminBank = async (req: any, res: Response) => {
    try {
        const { accountNumber, bankCode, bankName } = req.body;
        const { PaystackService } = require('../../services/paystack.service');

        const bankResult = await PaystackService.resolveAccountNumber(accountNumber, bankCode);
        const accountName = bankResult.data.account_name.toUpperCase();

        const user = await User.findByIdAndUpdate(req.user.userId, {
            bankDetails: {
                accountNumber,
                bankCode,
                bankName,
                accountName
            }
        }, { new: true });

        res.json({ message: 'Corporate bank details updated', bankDetails: user?.bankDetails });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

// ─── Admin Withdrawal ─────────────────────────────────────────────────────────
export const adminWithdraw = async (req: any, res: Response) => {
    try {
        const { amount } = req.body;
        const userId = req.user.userId;

        const wallet = await Wallet.findOne({ userId });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient funds in corporate wallet' });
        }

        const user = await User.findById(userId);
        if (!user?.bankDetails?.accountNumber) {
            return res.status(400).json({ error: 'Please set your corporate bank details first' });
        }

        // Subtract from wallet
        wallet.balance -= amount;
        await wallet.save();

        // Create transaction record
        await Transaction.create({
            userId,
            reference: `ADMIN-WD-${Date.now()}`,
            amount,
            type: 'withdrawal',
            status: 'success', // In production, this would be 'pending' until Paystack transfer completes
            paymentMethod: 'wallet',
            metadata: {
                note: 'Corporate profit withdrawal',
                bank: user.bankDetails.bankName,
                account: user.bankDetails.accountNumber
            }
        });

        res.json({ message: `Withdrawal of ₦${amount.toLocaleString()} processed successfully`, balance: wallet.balance });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
