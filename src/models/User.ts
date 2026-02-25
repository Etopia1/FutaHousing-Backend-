import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    phone: string;
    role: 'STUDENT' | 'AGENT' | 'ADMIN';
    password: string;
    idNumber?: string;
    nin?: string;
    address?: string;
    businessName?: string;
    profilePicture?: string;
    ninImage?: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    twoFactorEnabled: boolean;
    verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    bankDetails?: {
        bankName: string;
        accountNumber: string;
        accountName: string;
        bankCode?: string;
        recipientCode?: string;
    };
    aiVerification?: {
        score: number;
        similarityPercent: string;
        passed: boolean;
        message: string;
    };
    isBlocked: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        phone: { type: String, required: true },
        role: { type: String, enum: ['STUDENT', 'AGENT', 'ADMIN'], default: 'STUDENT' },
        password: { type: String, required: true },
        idNumber: { type: String },
        nin: { type: String },
        address: { type: String },
        businessName: { type: String },
        profilePicture: { type: String },
        ninImage: { type: String },
        isEmailVerified: { type: Boolean, default: false },
        isPhoneVerified: { type: Boolean, default: false },
        twoFactorEnabled: { type: Boolean, default: false },
        verificationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
        bankDetails: {
            bankName: String,
            accountNumber: String,
            accountName: String,
            bankCode: String,
            recipientCode: String
        },
        aiVerification: {
            score: Number,
            similarityPercent: String,
            passed: Boolean,
            message: String
        },
        isBlocked: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
