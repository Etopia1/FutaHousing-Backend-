import mongoose, { Schema, Document } from 'mongoose';

export type TransactionType = 'funding' | 'withdrawal' | 'escrow_hold' | 'escrow_release' | 'agent_payout' | 'refund' | 'commission';
export type TransactionStatus = 'pending' | 'success' | 'failed';
export type PaymentMethod = 'paystack' | 'wallet';

export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId;
    walletId?: mongoose.Types.ObjectId;
    reference: string;
    amount: number;
    type: TransactionType;
    status: TransactionStatus;
    paymentMethod: PaymentMethod;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', index: true },
        reference: { type: String, required: true, unique: true, index: true },
        amount: { type: Number, required: true },
        type: {
            type: String,
            enum: ['funding', 'withdrawal', 'escrow_hold', 'escrow_release', 'agent_payout', 'refund', 'commission'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'success', 'failed'],
            default: 'pending'
        },
        paymentMethod: {
            type: String,
            enum: ['paystack', 'wallet'],
            required: true
        },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

TransactionSchema.index({ createdAt: -1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
