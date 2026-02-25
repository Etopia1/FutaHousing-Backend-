import crypto from 'crypto';

export const generateReference = (prefix: string = 'TRX'): string => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${prefix}-${timestamp}-${random}`;
};
