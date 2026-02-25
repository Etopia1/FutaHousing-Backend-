import { Request, Response } from 'express';
import { WalletService } from '../services/wallet.service';
import User from '../models/User';

export class WalletController {
    static async fund(req: any, res: Response) {
        try {
            const amount = parseFloat(req.body.amount);
            let { userId, email } = req.user;

            // Fallback: If email is missing in token, fetch from DB
            if (!email) {
                const user = await User.findById(userId);
                if (user) {
                    email = user.email;
                }
            }

            console.log(`[Wallet] Fund request for User: ${userId}, Email: ${email}, Amount: ${amount}`);

            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({ error: 'Invalid amount' });
            }

            if (!email) {
                return res.status(400).json({ error: 'User email is required to initialize payment' });
            }

            const result = await WalletService.fundWallet(userId, email, amount);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async verify(req: any, res: Response) {
        try {
            const { reference } = req.body;
            if (!reference) return res.status(400).json({ error: 'Reference is required' });

            const result = await WalletService.verifyFunding(reference);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async withdraw(req: any, res: Response) {
        try {
            let { amount, bankDetails } = req.body;
            const { userId } = req.user;

            amount = parseFloat(amount);

            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({ error: 'Withdrawal amount is required and must be greater than zero.' });
            }

            // Auto-withdraw: If bankDetails not provided, fetch from user profile
            if (!bankDetails) {
                const user = await User.findById(userId);
                if (!user || !user.bankDetails || !user.bankDetails.accountNumber) {
                    return res.status(400).json({ error: 'No bank details provided and no saved bank details found in your profile. Please add bank details first.' });
                }
                bankDetails = {
                    bankName: user.bankDetails.bankName,
                    accountNumber: user.bankDetails.accountNumber,
                    accountName: user.bankDetails.accountName
                };
            }

            const transaction = await WalletService.withdraw(userId, amount, bankDetails);
            res.json({ message: 'Withdrawal initiated successfully', transaction });
        } catch (error: any) {
            console.error('[WalletController] Withdrawal Error:', error);
            res.status(400).json({ error: error.message || 'Failed to process withdrawal' });
        }
    }

    static async getBalance(req: any, res: Response) {
        try {
            const { userId } = req.user;
            const balanceData = await WalletService.getBalance(userId);
            res.json(balanceData);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getTransactions(req: any, res: Response) {
        try {
            const { userId } = req.user;
            const transactions = await WalletService.getTransactions(userId);
            res.json(transactions);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getWalletDetails(req: any, res: Response) {
        try {
            const { userId } = req.user;
            const wallet = await WalletService.getBalance(userId);
            const transactions = await WalletService.getTransactions(userId);
            res.json({ wallet, transactions });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
