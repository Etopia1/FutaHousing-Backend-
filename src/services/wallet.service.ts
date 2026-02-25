import mongoose from 'mongoose';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';
import { PaystackService } from './paystack.service';
import { generateReference } from '../utils/generateReference';

export class WalletService {
    static async fundWallet(userId: string, email: string, amount: number) {
        const wallet = await this.getOrCreateWallet(userId);
        const reference = generateReference('FUND');

        // Create pending transaction with wallet link
        await Transaction.create({
            userId,
            walletId: wallet._id,
            reference,
            amount,
            type: 'funding',
            status: 'pending',
            paymentMethod: 'paystack'
        });

        // Initialize Paystack
        const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
        const paystackData = await PaystackService.initializeTransaction(email, amount, reference, userId, callbackUrl);

        return paystackData.data || paystackData;
    }

    static async verifyFunding(reference: string) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const transaction = await Transaction.findOne({ reference }).session(session);
            if (!transaction) throw new Error('Transaction not found');
            if (transaction.status === 'success') return { message: 'Already processed' };

            const paystackRes = await PaystackService.verifyTransaction(reference);

            if (paystackRes?.data?.status === 'success') {
                const amount = paystackRes.data.amount / 100;

                // Update transaction
                transaction.status = 'success';
                transaction.metadata = { ...transaction.metadata, paystack: paystackRes.data };
                await transaction.save({ session });

                // Update wallet
                const wallet = await this.getOrCreateWallet(transaction.userId.toString());
                const walletInSession = await Wallet.findById(wallet._id).session(session);
                if (walletInSession) {
                    walletInSession.balance += amount;
                    await walletInSession.save({ session });
                }

                await session.commitTransaction();
                return { success: true, amount };
            } else {
                await session.abortTransaction();
                return { success: false, status: paystackRes.data.status };
            }
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async withdraw(userId: string, amount: number, bankDetails: { bankName: string, accountNumber: string, accountName: string }) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const wallet = await Wallet.findOne({ userId }).session(session);
            if (!wallet || wallet.balance < amount) {
                throw new Error('Insufficient funds in vault');
            }

            // 1. Resolve Bank Code from Name
            const banksRes = await PaystackService.listBanks();
            const bank = banksRes.data.find((b: any) => b.name.toLowerCase().includes(bankDetails.bankName.toLowerCase()));
            if (!bank) throw new Error(`Bank '${bankDetails.bankName}' not recognized by settlement gateway`);

            // 2. Create Transfer Recipient
            const recipientRes = await PaystackService.createTransferRecipient(
                bankDetails.accountName,
                bankDetails.accountNumber,
                bank.code
            );
            const recipientCode = recipientRes.data.recipient_code;

            // 3. Deduct balance
            wallet.balance -= amount;
            await wallet.save({ session });

            const reference = generateReference('WIT');

            // 4. Create pending transaction record
            const transaction = await Transaction.create([{
                userId,
                reference,
                amount,
                type: 'withdrawal',
                status: 'pending',
                paymentMethod: 'wallet',
                metadata: { bankDetails, recipientCode }
            }], { session, ordered: true });

            // 5. Initiate Paystack Transfer
            await PaystackService.initiateTransfer(amount, recipientCode, reference);

            await session.commitTransaction();
            return transaction[0];
        } catch (error: any) {
            await session.abortTransaction();
            console.error('[Withdrawal Service Error]:', error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async getBalance(userId: string) {
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = await Wallet.create({ userId });
        }
        return {
            balance: wallet.balance,
            escrowBalance: wallet.escrowBalance,
            totalBalance: wallet.balance + wallet.escrowBalance
        };
    }

    static async getTransactions(userId: string) {
        return await Transaction.find({ userId }).sort({ createdAt: -1 });
    }

    static async getOrCreateWallet(userId: string) {
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = await Wallet.create({ userId });
        }
        return wallet;
    }
}
