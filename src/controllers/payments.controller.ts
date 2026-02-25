import { Request, Response } from 'express';
import { verifyPaystackSignature } from '../utils/verifyPaystackSignature';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { WalletService } from '../services/wallet.service';
import { NotificationService } from '../services/notification.service';
import { sendTransactionEmail } from '../utils/email';

export class PaymentsController {
    static async webhook(req: Request, res: Response) {
        const signature = req.headers['x-paystack-signature'] as string;
        const secretKey = process.env.PAYSTACK_SECRET_KEY || '';

        if (!verifyPaystackSignature(req.body, signature, secretKey)) {
            return res.status(401).send('Invalid signature');
        }

        const event = req.body;

        if (event.event === 'charge.success') {
            const { reference } = event.data;
            const transaction = await Transaction.findOne({ reference });

            if (transaction && transaction.status === 'pending') {
                const amount = event.data.amount / 100; // convert from kobo

                // Update transaction
                transaction.status = 'success';
                await transaction.save();

                // Update wallet
                const wallet = await WalletService.getOrCreateWallet(transaction.userId.toString());
                wallet.balance += amount;
                await wallet.save();

                // Notify Student (Internal)
                await NotificationService.create({
                    recipient: transaction.userId,
                    type: 'payment',
                    title: 'Wallet Funded',
                    message: `Your wallet has been successfully funded with ₦${amount.toLocaleString()}.`,
                    link: `/dashboard?tab=wallet`
                });

                // 📧 Notify Student (Email)
                const user = await User.findById(transaction.userId);
                if (user) {
                    await sendTransactionEmail(user.email, user.name, {
                        type: 'deposit',
                        amount,
                        purpose: 'Wallet Top-up via Paystack',
                        reference: reference,
                        status: 'SUCCESS',
                        timestamp: new Date()
                    });
                }

                console.log(`[Webhook] Wallet ${wallet._id} funded with ${amount}`);
            }
        }

        if (event.event === 'transfer.success' || event.event === 'transfer.failed') {
            const { reference, status } = event.data;
            const transaction = await Transaction.findOne({ reference });

            if (transaction && transaction.status === 'pending') {
                const isSuccess = status === 'success';
                transaction.status = isSuccess ? 'success' : 'failed';
                await transaction.save();

                // Notify User (Internal)
                await NotificationService.create({
                    recipient: transaction.userId,
                    type: 'payment',
                    title: isSuccess ? 'Withdrawal Successful' : 'Withdrawal Failed',
                    message: isSuccess
                        ? `Your withdrawal of ₦${transaction.amount.toLocaleString()} was successful.`
                        : `Your withdrawal of ₦${transaction.amount.toLocaleString()} failed. Funds have been returned to your balance.`,
                    link: `/dashboard?tab=wallet`
                });

                // 📧 Notify User (Email)
                const user = await User.findById(transaction.userId);
                if (user) {
                    await sendTransactionEmail(user.email, user.name, {
                        type: 'withdrawal',
                        amount: transaction.amount,
                        purpose: 'Funds Payout to Bank',
                        reference: reference,
                        status: isSuccess ? 'SUCCESS' : 'FAILED',
                        timestamp: new Date()
                    });
                }

                // If failed, we should technically refund the wallet balance. 
                if (!isSuccess) {
                    const wallet = await WalletService.getOrCreateWallet(transaction.userId.toString());
                    wallet.balance += transaction.amount;
                    await wallet.save();
                }
            }
        }

        res.sendStatus(200);
    }
}
