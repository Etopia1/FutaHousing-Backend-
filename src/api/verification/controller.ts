import { Response } from 'express';
import VerificationDocument from '../../models/VerificationDocument';
import User from '../../models/User';
import { PaystackService } from '../../services/paystack.service';
import { NotificationService } from '../../services/notification.service';

// Submit document for verification (supports base64 for face capture)
export const submitDocument = async (req: any, res: Response) => {
    try {
        const { type, fileUrl } = req.body;

        if (!type || !fileUrl) {
            return res.status(400).json({ error: 'type and fileUrl are required' });
        }

        const allowedTypes = ['STUDENT_ID', 'NIN', 'SELFIE', 'HOSTEL_IMAGE', 'AGENT_NIN', 'AGENT_FACE'];
        if (!allowedTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid document type' });
        }

        // Upsert: replace existing doc of same type for this user
        const doc = await VerificationDocument.findOneAndUpdate(
            { userId: req.user.userId, type },
            { fileUrl, status: 'PENDING' },
            { upsert: true, new: true }
        );

        res.status(201).json(doc);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to submit document' });
    }
};

// Submit agent KYC: NIN photo + face capture in one call
export const submitAgentKyc = async (req: any, res: Response) => {
    try {
        const { ninUrl, faceUrl } = req.body;

        if (!ninUrl || !faceUrl) {
            return res.status(400).json({ error: 'Both NIN photo URL and face capture URL are required' });
        }

        const userId = req.user.userId;

        // Upsert both documents
        await Promise.all([
            VerificationDocument.findOneAndUpdate(
                { userId, type: 'AGENT_NIN' },
                { fileUrl: ninUrl, status: 'PENDING' },
                { upsert: true, new: true }
            ),
            VerificationDocument.findOneAndUpdate(
                { userId, type: 'AGENT_FACE' },
                { fileUrl: faceUrl, status: 'PENDING' },
                { upsert: true, new: true }
            ),
        ]);

        // Mark user verification as pending review
        await User.findByIdAndUpdate(userId, { verificationStatus: 'PENDING' });

        res.json({ message: 'KYC documents submitted. Your account is under review.' });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to submit KYC' });
    }
};

// Helper to sync user verification status based on ALL documents
const syncUserVerificationStatus = async (userId: string) => {
    const [user, docs] = await Promise.all([
        User.findById(userId),
        VerificationDocument.find({ userId })
    ]);

    if (!user) return;

    // Required types for agents: AGENT_NIN and AGENT_FACE
    // For students: STUDENT_ID
    const requiredTypes = user.role === 'AGENT' ? ['AGENT_NIN', 'AGENT_FACE'] : ['STUDENT_ID'];

    const approvedDocs = docs.filter(d => d.status === 'APPROVED').map(d => d.type);
    const rejectedDocs = docs.filter(d => d.status === 'REJECTED');

    if (rejectedDocs.length > 0) {
        user.verificationStatus = 'REJECTED';
    } else if (requiredTypes.every(type => approvedDocs.includes(type as any))) {
        user.verificationStatus = 'APPROVED';
    } else {
        user.verificationStatus = 'PENDING';
    }

    await user.save();
    return user.verificationStatus;
};

// Admin: Review document (Approve / Reject)
export const reviewDocument = async (req: any, res: Response) => {
    try {
        const { status } = req.body; // APPROVED | REJECTED
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const doc = await VerificationDocument.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        // Sync user verification status based on ALL documents
        const finalStatus = await syncUserVerificationStatus(String(doc.userId));

        // Notify User of review status
        await NotificationService.create({
            recipient: doc.userId,
            type: 'system',
            title: status === 'APPROVED' ? 'Document Approved' : 'Document Rejected',
            message: status === 'APPROVED'
                ? `Your ${doc.type} has been approved. Account status: ${finalStatus}.`
                : `Your ${doc.type} was rejected. Please check and re-submit.`,
            link: `/dashboard?tab=profile`
        });

        res.json(doc);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to review document' });
    }
};

// Get all documents for a user
export const getMyDocuments = async (req: any, res: Response) => {
    try {
        const docs = await VerificationDocument.find({ userId: req.user.userId });
        res.json(docs);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
};

// Save bank details for auto-withdraw
export const saveBankDetails = async (req: any, res: Response) => {
    try {
        const { bankName, accountNumber, accountName } = req.body;
        const userId = req.user.userId;

        if (!bankName || !accountNumber || !accountName) {
            return res.status(400).json({ error: 'Bank name, account number and name are required' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Normalize names for comparison
        const normalize = (name: string) => name.toLowerCase().replace(/\s+/g, ' ').trim();
        const userNameNormalized = normalize(user.name);
        const accountNameNormalized = normalize(accountName);

        // Basic check: account name must contain all parts of the user's name
        const userParts = userNameNormalized.split(' ');
        const matchesOverall = userParts.every(part => accountNameNormalized.includes(part));

        if (!matchesOverall) {
            // BLOCK ACCOUNT for policy violation
            await User.findByIdAndUpdate(userId, {
                isBlocked: true,
                verificationStatus: 'REJECTED'
            });
            return res.status(403).json({
                error: 'POLICY VIOLATION: Bank account name must match your registered name and NIN. Your account has been blocked for security review.'
            });
        }

        // 1. Resolve Bank Code
        const banksRes = await PaystackService.listBanks();
        const bank = banksRes.data.find((b: any) => b.name.toLowerCase().includes(bankName.toLowerCase()));
        if (!bank) return res.status(400).json({ error: 'Bank not recognized' });

        // 2. Create Recipient
        const recipientRes = await PaystackService.createTransferRecipient(accountName, accountNumber, bank.code);

        // 3. Save to User
        await User.findByIdAndUpdate(userId, {
            bankDetails: {
                bankName,
                accountNumber,
                accountName,
                bankCode: bank.code,
                recipientCode: recipientRes.data.recipient_code
            }
        });

        res.json({ message: 'Bank details saved successfully' });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to save bank details' });
    }
};
