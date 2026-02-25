import crypto from 'crypto';

export const verifyPaystackSignature = (body: any, signature: string, secretKey: string): boolean => {
    const hash = crypto
        .createHmac('sha512', secretKey)
        .update(JSON.stringify(body))
        .digest('hex');
    return hash === signature;
};
