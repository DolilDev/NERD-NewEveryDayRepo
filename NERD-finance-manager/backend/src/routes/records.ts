// REST routes for finance records, wired to the in-memory store.
//
// Input validation and centralized error handling are layered on in a later
// step; here we focus on mapping HTTP verbs to store operations and returning
// 404 when an id does not exist.

import { Router } from 'express';
import { store } from '../store.ts';
import type { NewRecordInput, UpdateRecordInput } from '@shared';

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
    res.status(404).json({ error: `No record found with id "${req.params.id}".` });
    return;
  }
  res.json(record);
});

// POST /api/records — create a record.
recordsRouter.post('/', (req, res) => {
  const created = store.add(req.body as NewRecordInput);
  res.status(201).json(created);
});

// PUT /api/records/:id — update a record.
recordsRouter.put('/:id', (req, res) => {
  const updated = store.update(req.params.id, req.body as UpdateRecordInput);
  if (!updated) {
    res.status(404).json({ error: `No record found with id "${req.params.id}".` });
    return;
  }
  res.json(updated);
});

// DELETE /api/records/:id — remove a record.
recordsRouter.delete('/:id', (req, res) => {
  const removed = store.delete(req.params.id);
  if (!removed) {
    res.status(404).json({ error: `No record found with id "${req.params.id}".` });
    return;
  }
  res.status(204).send();
});
