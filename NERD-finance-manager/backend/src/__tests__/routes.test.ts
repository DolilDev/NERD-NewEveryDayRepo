import request from 'supertest';
import { createApp } from '../app.ts';
import { store } from '../store.ts';

const app = createApp();

const valid = {
  type: 'income' as const,
  amount: 100,
  category: 'Salary',
  date: '2026-06-01',
};

async function createRecord() {
  const res = await request(app).post('/api/records').send(valid);
  return res.body as { id: string };
}

beforeEach(() => store.reset());

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('records API', () => {
  it('GET /api/records is empty initially', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST creates a record (201)', async () => {
    const res = await request(app).post('/api/records').send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(valid);
    expect(res.body.id).toEqual(expect.any(String));
  });

  it('POST rejects an invalid body (400)', async () => {
    const res = await request(app)
      .post('/api/records')
      .send({ type: 'x', amount: -1, category: '', date: 'no' });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it('POST rejects malformed JSON (400)', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Content-Type', 'application/json')
      .send('{ not json');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/JSON/i);
  });

  it('GET /:id returns the record', async () => {
    const created = await createRecord();
    const res = await request(app).get(`/api/records/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
  });

  it('GET /:id returns 404 when missing', async () => {
    const res = await request(app).get('/api/records/missing');
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it('PUT updates a record', async () => {
    const created = await createRecord();
    const res = await request(app).put(`/api/records/${created.id}`).send({ amount: 250 });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(250);
  });

  it('PUT returns 400 for an invalid update', async () => {
    const created = await createRecord();
    const res = await request(app).put(`/api/records/${created.id}`).send({ amount: -1 });
    expect(res.status).toBe(400);
  });

  it('PUT returns 404 for a missing id', async () => {
    const res = await request(app).put('/api/records/missing').send({ amount: 5 });
    expect(res.status).toBe(404);
  });

  it('DELETE removes a record (204)', async () => {
    const created = await createRecord();
    const res = await request(app).delete(`/api/records/${created.id}`);
    expect(res.status).toBe(204);
    const after = await request(app).get('/api/records');
    expect(after.body).toEqual([]);
  });

  it('DELETE returns 404 for a missing id', async () => {
    const res = await request(app).delete('/api/records/missing');
    expect(res.status).toBe(404);
  });

  it('POST /api/records/reset clears all records', async () => {
    await createRecord();
    const res = await request(app).post('/api/records/reset');
    expect(res.status).toBe(200);
    const after = await request(app).get('/api/records');
    expect(after.body).toEqual([]);
  });

  it('returns a JSON 404 for an unknown route', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it('returns 500 when the store throws unexpectedly', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const storeSpy = jest.spyOn(store, 'getAll').mockImplementation(() => {
      throw new Error('boom');
    });

    const res = await request(app).get('/api/records');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/internal/i);

    storeSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
