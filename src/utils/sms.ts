import axios from 'axios';

/**
 * Send an SMS via Termii (Nigerian SMS gateway — https://termii.com)
 * Free tier: 50 test messages. Paid: ~₦3/SMS
 *
 * Required env vars:
 *   TERMII_API_KEY   — from https://app.termii.com/settings/api
 *   TERMII_SENDER_ID — alphanumeric name e.g. "FUTAHousing" (must be registered)
 */
export const sendSms = async (phone: string, message: string): Promise<boolean> => {
    const apiKey = process.env.TERMII_API_KEY;

    if (!apiKey) {
        // No SMS key configured — log and skip gracefully
        console.warn(`[SMS] TERMII_API_KEY not set. Skipping SMS to ${phone}.`);
        console.log(`[SMS CONTENT] To: ${phone} | Message: ${message}`);
        return false;
    }

    // Normalize Nigerian phone numbers: 0xxxxxxxxx → +234xxxxxxxxx
    let normalized = phone.trim().replace(/\s+/g, '');
    if (normalized.startsWith('0')) {
        normalized = '+234' + normalized.slice(1);
    } else if (!normalized.startsWith('+')) {
        normalized = '+' + normalized;
    }

    try {
        const response = await axios.post(
            'https://api.ng.termii.com/api/sms/send',
            {
                to: normalized,
                from: process.env.TERMII_SENDER_ID || 'N-Alert',
                sms: message,
                type: 'plain',
                api_key: apiKey,
                channel: 'generic', // Switched back to generic as it's more standard for N-Alert on many accounts
            },
            { timeout: 15_000 }
        );

        const success = response.data?.code === 'ok' || response.status === 200;
        if (success) {
            console.log(`📱 SMS sent to ${normalized}`);
        } else {
            console.error(`[SMS] Termii response:`, response.data);
        }
        return success;
    } catch (err: any) {
        console.error(`[SMS] Failed to send to ${normalized}:`, err.response?.data || err.message);
        return false;
    }
};
