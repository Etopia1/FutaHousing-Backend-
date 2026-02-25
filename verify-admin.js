const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const UserSchema = new mongoose.Schema({
    email: String,
    isEmailVerified: Boolean,
    verificationStatus: String,
    role: String
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function verifyAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const adminEmail = 'futahousing1@gmail.com';

        const result = await User.findOneAndUpdate(
            { email: adminEmail },
            {
                isEmailVerified: true,
                verificationStatus: 'APPROVED',
                twoFactorEnabled: false
            },
            { new: true }
        );

        if (result) {
            console.log(`Admin ${adminEmail} verified successfully!`);
            console.log('Status:', result.verificationStatus);
            console.log('Email Verified:', result.isEmailVerified);
        } else {
            console.log(`Admin account ${adminEmail} not found. Please register first.`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

verifyAdmin();
