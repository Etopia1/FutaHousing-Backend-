import { Request, Response } from 'express';
import { EscrowService } from '../services/escrow.service';

export class EscrowController {
    static async hold(req: any, res: Response) {
        try {
            const { bookingId } = req.body;
            const { userId } = req.user;

            const result = await EscrowService.hold(userId, bookingId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async release(req: any, res: Response) {
        try {
            const { bookingId } = req.body;
            // Only admins or automated systems should usually release, 
            // but here we follow the prompt flow where student confirmation triggers it.
            const result = await EscrowService.release(bookingId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async refund(req: any, res: Response) {
        try {
            const { bookingId } = req.body;
            const result = await EscrowService.refund(bookingId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}
