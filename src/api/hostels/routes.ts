import express from 'express';
import { authenticate, authorizeRole } from '../../middleware/auth';
import { listHostels, getHostel, createHostel, updateHostel, deleteHostel, getMyHostels } from './controller';

const router = express.Router();

router.get('/', listHostels);
router.get('/my-hostels', authenticate, authorizeRole('AGENT'), getMyHostels);
router.get('/:id', getHostel);

router.post('/', authenticate, authorizeRole('AGENT'), createHostel);
router.put('/:id', authenticate, authorizeRole('AGENT'), updateHostel);
router.delete('/:id', authenticate, authorizeRole('AGENT'), deleteHostel);

export default router;
