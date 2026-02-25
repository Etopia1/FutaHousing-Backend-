const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/futahousing';
const ADMIN_EMAIL = 'futahousing1@gmail.com';

async function fix() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected.');

        const db = mongoose.connection.db;
        const result = await db.collection('users').updateOne(
            { email: ADMIN_EMAIL },
            {
                $set: {
                    isEmailVerified: true,
                    isPhoneVerified: true,
                    verificationStatus: 'APPROVED'
                }
            }
        );

        if (result.matchedCount > 0) {
            console.log(`✅ Successfully updated admin (${ADMIN_EMAIL}). You can now log in.`);
        } else {
            console.log(`❌ Admin account with email ${ADMIN_EMAIL} not found.`);
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

fix();
