import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationDocument extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'STUDENT_ID' | 'NIN' | 'SELFIE' | 'HOSTEL_IMAGE' | 'AGENT_NIN' | 'AGENT_FACE';
    fileUrl: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: Date;
    updatedAt: Date;
}

const VerificationDocumentSchema = new Schema<IVerificationDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: ['STUDENT_ID', 'NIN', 'SELFIE', 'HOSTEL_IMAGE', 'AGENT_NIN', 'AGENT_FACE'], required: true },
        fileUrl: { type: String, required: true },
        status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    },
    { timestamps: true }
);

export default mongoose.model<IVerificationDocument>('VerificationDocument', VerificationDocumentSchema);
