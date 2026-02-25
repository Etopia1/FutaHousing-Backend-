export const PAYSTACK_CONFIG = {
    SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || '',
    PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || '',
    INITIALIZE_URL: 'https://api.paystack.co/transaction/initialize',
    VERIFY_URL: 'https://api.paystack.co/transaction/verify',
    WEBHOOK_URL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/webhook`,
    // IMPORTANT: CALLBACK_URL is where the user returns AFTER payment
    CALLBACK_URL: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
};
