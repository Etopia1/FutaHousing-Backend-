const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const test = async () => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    console.log('Using Secret:', secret ? secret.substring(0, 8) + '...' : 'MISSING');

    try {
        const res = await axios.post('https://api.paystack.co/transaction/initialize', {
            email: 'test@example.com',
            amount: 50000,
            reference: 'TEST_' + Date.now(),
        }, {
            headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Success:', res.data.status);
        console.log('Auth URL:', res.data.data.authorization_url);
    } catch (err) {
        console.error('Error:', err.response?.data || err.message);
    }
};

test();
