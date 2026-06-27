import express from 'express';
import store from '../store/inMemory.js';
import { authMiddleware } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();

// Middleware to require authentication for all transaction endpoints
router.use(authMiddleware);

// GET all transactions with optional filters
router.get('/', (req, res, next) => {
  try {
    const { type, category } = req.query;
    const filters = {};

    if (type) {
      if (!['income', 'expense'].includes(type)) {
        throw new ValidationError('Type must be either "income" or "expense"');
      }
      filters.type = type;
    }

    if (category) {
      filters.category = category;
    }

    const transactions = store.getTransactionsByUserId(req.user.id, filters);
    res.status(200).json(transactions);
  } catch (error) {
    next(error);
  }
});

// POST create a new transaction
router.post('/', (req, res, next) => {
  try {
    const { type, amount, category, description, date } = req.body;

    // Validation
    if (!type) {
      throw new ValidationError('Type is required');
    }

    if (!['income', 'expense'].includes(type)) {
      throw new ValidationError('Type must be either "income" or "expense"');
    }

    if (amount === undefined || amount === null) {
      throw new ValidationError('Amount is required');
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      throw new ValidationError('Category is required and must be a non-empty string');
    }

    if (description !== undefined && typeof description !== 'string') {
      throw new ValidationError('Description must be a string');
    }

    if (!date) {
      throw new ValidationError('Date is required');
    }

    // Create transaction
    const transaction = store.createTransaction(
      req.user.id,
      type,
      amount,
      category,
      description || '',
      date
    );

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

export default router;
