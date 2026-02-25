import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

// Define custom Request interface or augment express
interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = verifyToken(token) as any;
        // Normalize: ensure both 'id' and 'userId' exist
        if (decoded.userId && !decoded.id) decoded.id = decoded.userId;
        if (decoded.id && !decoded.userId) decoded.userId = decoded.id;

        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

export const authorizeRole = (role: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (req.user?.role !== role && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};
