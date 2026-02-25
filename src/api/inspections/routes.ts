import express from 'express';
import { authenticate } from '../../middleware/auth';
import {
    createInspection,
    getMyInspections,
    getAgentInspections,
    completeInspection,
    cancelInspection
} from './controller';

const router = express.Router();

router.post('/', authenticate, createInspection);
router.get('/my-inspections', authenticate, getMyInspections);
router.get('/agent-inspections', authenticate, getAgentInspections);
router.post('/:id/complete', authenticate, completeInspection);
router.post('/:id/cancel', authenticate, cancelInspection);

export default router;
