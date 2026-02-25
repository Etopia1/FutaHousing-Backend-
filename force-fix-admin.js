const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGODB_URI;

async function fix() {
    try {
        console.log('Connecting...');
        await mongoose.connect(uri);
        console.log('Connected.');

        const db = mongoose.connection.db;

        // Fix by email
        const targetEmails = ['futahousing1@gmail.com', 'futahousing@gmail.com'];

        console.log('Applying force patch to admin accounts...');
        const result = await db.collection('users').updateMany(
            { email: { $in: targetEmails } },
            {
                $set: {
                    role: 'ADMIN',
                    isEmailVerified: true,
                    isPhoneVerified: true,
                    verificationStatus: 'APPROVED'
                }
            }
        );

        console.log(`✅ Patch applied. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
