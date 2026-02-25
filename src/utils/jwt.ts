import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const generateToken = (userId: string, role: string, email: string) => {
    return jwt.sign({ userId, role, email }, JWT_SECRET, { expiresIn: '1d' });
};

export const generateResetToken = (userId: string) => {
    return jwt.sign({ userId, purpose: 'PASSWORD_RESET' }, JWT_SECRET, { expiresIn: '15m' });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET);
};

