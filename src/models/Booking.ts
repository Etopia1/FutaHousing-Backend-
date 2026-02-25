import mongoose, { Schema, Document } from 'mongoose';

export type BookingStatus = 'pending' | 'paid' | 'confirmed' | 'completed' | 'cancelled';
export type EscrowStatus = 'held' | 'released' | 'refunded';

export interface IBooking extends Document {
    studentId: mongoose.Types.ObjectId;
    agentId: mongoose.Types.ObjectId;
    propertyId: mongoose.Types.ObjectId; // References Hostel
    amount: number;
    inspectionFee: number;
    status: BookingStatus;
    escrowStatus: EscrowStatus;
    createdAt: Date;
    updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        propertyId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true },
        amount: { type: Number, required: true },
        inspectionFee: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['pending', 'paid', 'confirmed', 'completed', 'cancelled'],
            default: 'pending'
        },
        escrowStatus: {
            type: String,
            enum: ['held', 'released', 'refunded'],
            default: 'held'
        },
    },
    { timestamps: true }
);

export default mongoose.model<IBooking>('Booking', BookingSchema);
