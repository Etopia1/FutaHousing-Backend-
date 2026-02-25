const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGODB_URI;

async function check() {
    try {
        console.log('Connecting...');
        await mongoose.connect(uri);
        console.log('Connected.');

        const db = mongoose.connection.db;
        const users = await db.collection('users').find({
            $or: [
                { email: 'futahousing@gmail.com' },
                { email: 'futahousing1@gmail.com' }
            ]
        }).toArray();

        console.log('--- FOUND USERS ---');
        users.forEach(u => {
            console.log(`Email: ${u.email}`);
            console.log(`Role: ${u.role}`);
            console.log(`Email Verified: ${u.isEmailVerified}`);
            console.log(`Phone Verified: ${u.isPhoneVerified}`);
            console.log(`Status: ${u.verificationStatus}`);
            console.log('-------------------');
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
