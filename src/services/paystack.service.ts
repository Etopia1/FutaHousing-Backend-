import axios from 'axios';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export class PaystackService {
    private static get secret(): string {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
            console.error('[Paystack] CRITICAL: PAYSTACK_SECRET_KEY is missing!');
            throw new Error('PAYSTACK_SECRET_KEY is not defined in environment variables');
        }
        console.log(`[Paystack] Using key: ${secret.substring(0, 7)}...`);
        return secret;
    }

    static async initializeTransaction(email: string, amount: number, reference: string, userId: string, callbackUrl: string) {
        try {
            console.log(`[Paystack] Initializing transaction for ${email}, amount: ${amount}`);
            const response = await axios.post(
                `${PAYSTACK_BASE_URL}/transaction/initialize`,
                {
                    email,
                    amount: Math.round(amount * 100), // kobo
                    reference,
                    callback_url: callbackUrl,
                    currency: 'NGN',
                    metadata: { userId }
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.secret}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            const errorDetail = error.response?.data?.message || error.message;
            console.error('Paystack Init Error:', error.response?.data || error.message);
            throw new Error(`Paystack Gateway Error: ${errorDetail}`);
        }
    }

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
                        Authorization: `Bearer ${this.secret}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Paystack Recipient Error:', error.response?.data || error.message);
            throw new Error('Failed to create transfer recipient');
        }
    }

    static async initiateTransfer(amount: number, recipientCode: string, reference: string) {
        try {
            const response = await axios.post(
                `${PAYSTACK_BASE_URL}/transfer`,
                {
                    source: 'balance',
                    amount: amount * 100, // kobo
                    recipient: recipientCode,
                    reference,
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.secret}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Paystack Transfer Error:', error.response?.data || error.message);
            throw new Error('Failed to initiate transfer');
        }
    }

    static async verifyTransaction(reference: string) {
        try {
            const response = await axios.get(
                `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.secret}`,
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Paystack Verify Error:', error.response?.data || error.message);
            throw new Error('Failed to verify Paystack transaction');
        }
    }

    static async listBanks() {
        try {
            const response = await axios.get(
                `${PAYSTACK_BASE_URL}/bank`,
                {
                    headers: {
                        Authorization: `Bearer ${this.secret}`,
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Paystack Banks Error:', error.response?.data || error.message);
            throw new Error('Failed to fetch banks from Paystack');
        }
    }

    /**
     * Resolve Account Number to name
     */
    static async resolveAccountNumber(accountNumber: string, bankCode: string) {
        try {
            const response = await axios.get(
                `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.secret}`,
                    },
                }
            );
            return response.data; // { status, message, data: { account_number, account_name, bank_id } }
        } catch (error: any) {
            console.error('Paystack Resolve Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to resolve bank account');
        }
    }

    /**
     * Verify Identity (NIN) via Paystack
     */
    static async verifyIdentity(nin: string, firstName: string, lastName: string) {
        try {
            // Paystack requires specific verification details
            const response = await axios.post(
                `${PAYSTACK_BASE_URL}/identity_verification`,
                {
                    id_type: 'nin',
                    number: nin,
                    first_name: firstName,
                    last_name: lastName,
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.secret}`,
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Paystack Identity Error:', error.response?.data || error.message);
            // If identity doesn't match, Paystack usually returns a 4xx or 200 with specific status
            throw new Error(error.response?.data?.message || 'NIN verification failed');
        }
    }
}
