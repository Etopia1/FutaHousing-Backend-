import mongoose, { Schema, Document } from 'mongoose';

export interface IOtp extends Document {
    userId: mongoose.Types.ObjectId;
    email: string;
    code: string;
    purpose: 'EMAIL_VERIFY' | 'LOGIN_2FA' | 'PASSWORD_RESET';
    expiresAt: Date;
    attempts: number;
    createdAt: Date;
}

const OtpSchema = new Schema<IOtp>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        email: { type: String, required: true },
        code: { type: String, required: true },
        purpose: { type: String, enum: ['EMAIL_VERIFY', 'LOGIN_2FA', 'PASSWORD_RESET'], required: true },
        expiresAt: { type: Date, required: true },
        attempts: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Auto-delete expired OTPs
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IOtp>('Otp', OtpSchema);
