import express from 'express';
import { authenticate, authorizeRole } from '../../middleware/auth';
import { submitDocument, reviewDocument, getMyDocuments, submitAgentKyc } from './controller';

const router = express.Router();

router.get('/', authenticate, getMyDocuments);
router.post('/', authenticate, submitDocument);
router.post('/agent-kyc', authenticate, submitAgentKyc);
router.post('/bank-details', authenticate, (req: any, res: any) => {
    const { saveBankDetails } = require('./controller');
    saveBankDetails(req, res);
});
router.post('/:id/review', authenticate, authorizeRole('ADMIN'), reviewDocument);

export default router;
