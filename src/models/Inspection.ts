import mongoose, { Schema, Document } from 'mongoose';

export interface IInspection extends Document {
    studentId: mongoose.Types.ObjectId;
    hostelId: mongoose.Types.ObjectId;
    amount: number;
    status: 'PAID' | 'COMPLETED' | 'CANCELLED';
    inspectionDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const InspectionSchema = new Schema<IInspection>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true },
        amount: { type: Number, required: true },
        status: { type: String, enum: ['PAID', 'COMPLETED', 'CANCELLED'], default: 'PAID' },
        inspectionDate: { type: Date },
    },
    { timestamps: true }
);

export default mongoose.model<IInspection>('Inspection', InspectionSchema);
