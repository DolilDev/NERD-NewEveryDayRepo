// REST routes for finance records, wired to the in-memory store.
//
// Input is validated by the pure functions in ../validation. On bad input or a
// missing id we throw an ApiError; Express 5 forwards synchronous throws to the
// centralized error handler, which renders the `{ error }` JSON response.

import { Router } from 'express';
import { store } from '../store.ts';
import { validateNewRecord, validateUpdateRecord } from '../validation.ts';
import { badRequest, notFound } from '../errors.ts';

export const recordsRouter = Router();

// GET /api/records — list all records.
recordsRouter.get('/', (_req, res) => {
  res.json(store.getAll());
});

// POST /api/records/reset — clear all records.
// Declared before "/:id" so it is never captured as an id param.
recordsRouter.post('/reset', (_req, res) => {
  store.reset();
  res.json({ message: 'All records cleared.' });
});

// GET /api/records/:id — fetch one record.
recordsRouter.get('/:id', (req, res) => {
  const record = store.getById(req.params.id);
  if (!record) {
    throw notFound(`No record found with id "${req.params.id}".`);
  }
  res.json(record);
});

// POST /api/records — create a record.
recordsRouter.post('/', (req, res) => {
  const result = validateNewRecord(req.body);
  if (!result.value) {
    throw badRequest(result.errors.join(' '));
  }
  const created = store.add(result.value);
  res.status(201).json(created);
});

// PUT /api/records/:id — update a record.
recordsRouter.put('/:id', (req, res) => {
  const result = validateUpdateRecord(req.body);
  if (!result.value) {
    throw badRequest(result.errors.join(' '));
  }
  const updated = store.update(req.params.id, result.value);
  if (!updated) {
    throw notFound(`No record found with id "${req.params.id}".`);
  }
  res.json(updated);
});

// DELETE /api/records/:id — remove a record.
recordsRouter.delete('/:id', (req, res) => {
  const removed = store.delete(req.params.id);
  if (!removed) {
    throw notFound(`No record found with id "${req.params.id}".`);
  }
  res.status(204).send();
});
