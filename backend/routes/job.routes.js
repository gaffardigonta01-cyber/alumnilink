import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
  getJobs,
  getMyJobs,
  getMyApplications,
  createJob,
  updateJob,
  deleteJob,
  applyForJob,
  updateApplicationStatus,
} from '../controllers/job.controller.js';

const router = Router();
router.use(protect);

router.get('/', getJobs);
router.get('/my-jobs', getMyJobs);
router.get('/my-applications', getMyApplications);
router.post('/', createJob);
router.put('/applications/:id/status', updateApplicationStatus);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);
router.post('/:id/apply', applyForJob);

export default router;
