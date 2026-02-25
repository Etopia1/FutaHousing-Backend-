import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWallet extends Document {
    userId: mongoose.Types.ObjectId;
    balance: number;
    escrowBalance: number;
    currency: string;
    status: 'active' | 'suspended';
    createdAt: Date;
    updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
        balance: { type: Number, default: 0, min: 0 },
        escrowBalance: { type: Number, default: 0, min: 0 },
        currency: { type: String, default: 'NGN' },
        status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    },
    { timestamps: true }
);

WalletSchema.virtual('totalBalance').get(function () {
    return this.balance + this.escrowBalance;
});

WalletSchema.set('toJSON', { virtuals: true });
WalletSchema.set('toObject', { virtuals: true });

const Wallet: Model<IWallet> = mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);
export default Wallet;
