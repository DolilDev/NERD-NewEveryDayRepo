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

// GET single transaction by id
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = store.getTransactionById(id);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.userId !== req.user.id) {
      throw new ValidationError('Unauthorized: transaction does not belong to this user');
    }

    res.status(200).json(transaction);
  } catch (error) {
    next(error);
  }
});

// PUT update a transaction
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, amount, category, description, date } = req.body;

    const transaction = store.getTransactionById(id);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.userId !== req.user.id) {
      throw new ValidationError('Unauthorized: transaction does not belong to this user');
    }

    // Validation for updates
    if (type !== undefined && !['income', 'expense'].includes(type)) {
      throw new ValidationError('Type must be either "income" or "expense"');
    }

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      throw new ValidationError('Amount must be a positive number');
    }

    if (category !== undefined && (typeof category !== 'string' || category.trim().length === 0)) {
      throw new ValidationError('Category must be a non-empty string');
    }

    if (description !== undefined && typeof description !== 'string') {
      throw new ValidationError('Description must be a string');
    }

    // Build update object
    const updates = {};
    if (type !== undefined) updates.type = type;
    if (amount !== undefined) updates.amount = amount;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;

    const updatedTransaction = store.updateTransaction(id, updates);
    res.status(200).json(updatedTransaction);
  } catch (error) {
    next(error);
  }
});

// DELETE a transaction
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = store.getTransactionById(id);
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.userId !== req.user.id) {
      throw new ValidationError('Unauthorized: transaction does not belong to this user');
    }

    store.deleteTransaction(id);
    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
