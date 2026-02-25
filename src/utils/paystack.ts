// ══════════════════════════════════════════════════════════════════════════════
//  FUTA Housing — Paystack Utility
//  Handles interaction with Paystack API for payment verification and transfers
// ══════════════════════════════════════════════════════════════════════════════

import axios from 'axios';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export class PaystackService {
    /**
     * Initialize a transaction
     */
    static async initializeTransaction(email: string, amount: number, reference: string, userId: string, data: any = {}) {
        try {
            const response = await axios.post(
                `${PAYSTACK_BASE_URL}/transaction/initialize`,
                {
                    email,
                    amount: amount * 100, // Paystack works in kobo
                    reference,
                    callback_url: `${process.env.FRONTEND_URL}/dashboard/wallet/verify`,
                    metadata: { userId, ...(data.metadata || {}) }
                },
                {
                    headers: {
                        Authorization: `Bearer ${PAYSTACK_SECRET}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Paystack Initialization Error:', error.response?.data || error.message);
            throw new Error('Failed to initialize Paystack transaction');
        }
    }

    /**
     * Verify a transaction
     */
    static async verifyTransaction(reference: string) {
        try {
            const response = await axios.get(
                `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
                {
                    headers: {
                        Authorization: `Bearer ${PAYSTACK_SECRET}`,
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Paystack Verification Error:', error.response?.data || error.message);
            throw new Error('Failed to verify Paystack transaction');
        }
    }

    /**
     * Create a transfer recipient
     */
    static async createTransferRecipient(name: string, accountNumber: string, bankCode: string) {
        try {
            const response = await axios.post(
                `${PAYSTACK_BASE_URL}/transferrecipient`,
                {
                    type: 'nuban',
                    name,
                    account_number: accountNumber,
                    bank_code: bankCode,
                    currency: 'NGN',
                },
                {
                    headers: {
                        Authorization: `Bearer ${PAYSTACK_SECRET}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Paystack Recipient Error:', error.response?.data || error.message);
            throw new Error('Failed to create Paystack transfer recipient');
        }
    }

    /**
     * Initiate a transfer
     */
    static async initiateTransfer(amount: number, recipientCode: string, reference: string, reason: string = 'Wallet Withdrawal') {
        try {
            const response = await axios.post(
                `${PAYSTACK_BASE_URL}/transfer`,
                {
                    source: 'balance',
                    amount: amount * 100, // Paystack works in kobo
                    recipient: recipientCode,
                    reference,
                    reason,
                },
                {
                    headers: {
                        Authorization: `Bearer ${PAYSTACK_SECRET}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Paystack Transfer Error:', error.response?.data || error.message);
            throw new Error('Failed to initiate Paystack transfer');
        }
    }

    /**
     * List Banks
     */
    static async listBanks() {
        try {
            const response = await axios.get(`${PAYSTACK_BASE_URL}/bank`, {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`,
                },
            });
            return response.data;
        } catch (error: any) {
            console.error('Paystack Banks Error:', error.response?.data || error.message);
            throw new Error('Failed to fetch bank list');
        }
    }
}
