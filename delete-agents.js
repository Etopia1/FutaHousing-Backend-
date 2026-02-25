const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/futahousing';

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected.');

        // Since we can't easily import the models in a plain JS script without more setup,
        // we'll use the raw collection.
        const db = mongoose.connection.db;

        console.log('Fetching agents...');
        const agents = await db.collection('users').find({ role: 'AGENT' }).toArray();
        const agentIds = agents.map(a => a._id);

        if (agentIds.length === 0) {
            console.log('No agents found.');
            process.exit(0);
        }

        console.log(`Deleting data for ${agentIds.length} agents...`);

        // Perform deletions
        await Promise.all([
            db.collection('wallets').deleteMany({ userId: { $in: agentIds } }),
            db.collection('verificationdocuments').deleteMany({ userId: { $in: agentIds } }),
            db.collection('otps').deleteMany({ userId: { $in: agentIds } }),
            db.collection('bookings').deleteMany({ $or: [{ studentId: { $in: agentIds } }, { agentId: { $in: agentIds } }] }),
            db.collection('transactions').deleteMany({ userId: { $in: agentIds } }),
            db.collection('hostels').deleteMany({ agentId: { $in: agentIds } }),
            db.collection('users').deleteMany({ _id: { $in: agentIds } })
        ]);

        console.log('✅ Cleanup complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

run();
