import express from 'express';
import store from '../store/inMemory.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Middleware to require authentication
router.use(authMiddleware);

// GET financial summary
router.get('/', (req, res, next) => {
  try {
    const summary = store.getTransactionsSummary(req.user.id);
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
});

export default router;
