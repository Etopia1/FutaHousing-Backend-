const axios = require('axios');
require('dotenv').config();

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const INITIALIZE_URL = 'https://api.paystack.co/transaction/initialize';

async function testPaystack() {
    console.log('Using Secret Key:', SECRET_KEY ? SECRET_KEY.substring(0, 10) + '...' : 'MISSING');

    try {
        const response = await axios.post(INITIALIZE_URL, {
            email: 'test@example.com',
            amount: 500 * 100,
            callback_url: 'http://localhost:3000/dashboard'
        }, {
            headers: {
                Authorization: `Bearer ${SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Success!', response.data);
    } catch (err) {
        if (err.response) {
            console.error('Error Response Data:', err.response.data);
            console.error('Error Status:', err.response.status);
        } else {
            console.error('Error Message:', err.message);
        }
    }
}

testPaystack();
