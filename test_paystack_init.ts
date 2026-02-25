import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    console.log('Using Secret:', secret ? secret.substring(0, 8) + '...' : 'MISSING');

    try {
        const res = await axios.post('https://api.paystack.co/transaction/initialize', {
            email: 'test@example.com',
            amount: 50000, // 500 Naira
            reference: 'TEST_' + Date.now(),
        }, {
            headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Success:', res.data);
    } catch (err: any) {
        console.error('Error:', err.response?.data || err.message);
    }
};

test();
