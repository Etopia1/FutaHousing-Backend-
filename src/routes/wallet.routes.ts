import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, WalletController.getWalletDetails);
router.get('/balance', authenticate, WalletController.getBalance);
router.get('/transactions', authenticate, WalletController.getTransactions);
router.post('/fund', authenticate, WalletController.fund);
router.post('/verify', authenticate, WalletController.verify);
router.post('/withdraw', authenticate, WalletController.withdraw);

export default router;
