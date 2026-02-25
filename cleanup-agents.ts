import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from './src/models/User';
import Wallet from './src/models/Wallet';
import Hostel from './src/models/Hostel';
import VerificationDocument from './src/models/VerificationDocument';
import Otp from './src/models/Otp';
import Booking from './src/models/Booking';
import Transaction from './src/models/Transaction';
import connectDB from './src/lib/db';

dotenv.config();

const cleanAgents = async () => {
    try {
        await connectDB();

        // Find all agent IDs
        const agents = await User.find({ role: 'AGENT' }).select('_id');
        const ids = agents.map(a => a._id);

        if (ids.length === 0) {
            console.log('ℹ️ No agents found to delete.');
            process.exit(0);
        }

        console.log(`🧹 Found ${ids.length} agents. Cleaning up associated data...`);

        // Delete cascade (similar to admin controller logic)
        await Promise.all([
            Wallet.deleteMany({ userId: { $in: ids } }),
            VerificationDocument.deleteMany({ userId: { $in: ids } }),
            Otp.deleteMany({ userId: { $in: ids } }),
            Booking.deleteMany({ $or: [{ studentId: { $in: ids } }, { agentId: { $in: ids } }] }),
            Transaction.deleteMany({ userId: { $in: ids } }),
            Hostel.deleteMany({ agentId: { $in: ids } }),
        ]);

        const result = await User.deleteMany({ role: 'AGENT' });
        console.log(`✅ Successfully deleted ${result.deletedCount} agents and all their associated records.`);

        process.exit(0);
    } catch (err: any) {
        console.error('❌ Cleanup error:', err.message);
        process.exit(1);
    }
};

cleanAgents();
