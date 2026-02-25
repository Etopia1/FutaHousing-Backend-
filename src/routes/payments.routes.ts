import { Router } from 'express';
import { PaymentsController } from '../controllers/payments.controller';
import { WalletController } from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Webhook for Paystack - No auth middleware, uses signature verification
router.post('/webhook', PaymentsController.webhook);

// Initialize payment (Used by frontend to fund wallet)
router.post('/initialize', authenticate, WalletController.fund);

export default router;
