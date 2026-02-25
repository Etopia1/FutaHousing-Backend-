import User from '../models/User';
import Wallet from '../models/Wallet';
import { hashPassword } from '../utils/hash';

const ADMIN_EMAIL = 'futahousing@gmail.com';
const ADMIN_PASSWORD = 'FutaHouse1234@';

export const seedAdmin = async () => {
    try {
        // 🛡️ SECURITY PATCH: Automatically verify ALL accounts with the ADMIN role
        // Also explicitly ensure the primary admin accounts are verified and set as ADMIN.
        await User.updateMany(
            { email: { $in: ['futahousing@gmail.com', 'futahousing1@gmail.com'] } },
            {
                $set: {
                    role: 'ADMIN',
                    isEmailVerified: true,
                    isPhoneVerified: true,
                    verificationStatus: 'APPROVED'
                }
            }
        );

        // This ensures existing admins don't get locked out by the new Dual Verification system.
        await User.updateMany(
            { role: 'ADMIN' },
            {
                $set: {
                    isEmailVerified: true,
                    isPhoneVerified: true,
                    verificationStatus: 'APPROVED'
                }
            }
        );
        console.log('🛡️  Administrative integrity check: All admin accounts verified.');

        const existing = await User.findOne({ email: ADMIN_EMAIL });
        if (existing) {
            return;
        }

        const hashed = await hashPassword(ADMIN_PASSWORD);
        const admin = await User.create({
            name: 'Super Admin',
            email: ADMIN_EMAIL,
            phone: '08000000000',
            password: hashed,
            role: 'ADMIN',
            verificationStatus: 'APPROVED',
            isEmailVerified: true,
            isPhoneVerified: true,
        });

        await Wallet.create({ userId: admin._id, balance: 0, escrowBalance: 0 });
        console.log('✅ Super admin created: futahousing1@gmail.com');
    } catch (err: any) {
        console.error('❌ Admin seed error:', err.message);
    }
};
