import { Router } from 'express';
import { EscrowController } from '../controllers/escrow.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/hold', authenticate, EscrowController.hold);
router.post('/release', authenticate, EscrowController.release);
router.post('/refund', authenticate, EscrowController.refund);

export default router;
