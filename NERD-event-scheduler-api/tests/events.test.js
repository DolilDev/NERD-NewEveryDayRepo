const request = require('supertest');
const createApp = require('../src/app');
const store = require('../src/store/eventStore');

const app = createApp();

const validEvent = () => ({
  title: 'Team Standup',
  description: 'Daily sync',
  date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  notificationTime: 15,
});

beforeEach(() => {
  store.clear();
});

describe('Events CRUD API', () => {
  describe('POST /events', () => {
    it('creates an event and returns 201 with an id', async () => {
      const res = await request(app).post('/events').send(validEvent());
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'Team Standup',
        description: 'Daily sync',
        notificationTime: 15,
        email: null,
      });
      expect(typeof res.body.id).toBe('string');
      expect(res.body.createdAt).toBeDefined();
    });

    it('stores an optional email when provided', async () => {
      const res = await request(app)
        .post('/events')
        .send({ ...validEvent(), email: 'invitee@example.com' });
      expect(res.status).toBe(201);
      expect(res.body.email).toBe('invitee@example.com');
    });
  });

  describe('GET /events', () => {
    it('returns an empty array when there are no events', async () => {
      const res = await request(app).get('/events');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns all created events', async () => {
      await request(app).post('/events').send(validEvent());
      await request(app).post('/events').send(validEvent());
      const res = await request(app).get('/events');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /events/:id', () => {
    it('returns a single event by id', async () => {
      const created = await request(app).post('/events').send(validEvent());
      const res = await request(app).get(`/events/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app).get('/events/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/not found/);
    });
  });

  describe('PUT /events/:id', () => {
    it('updates an existing event', async () => {
      const created = await request(app).post('/events').send(validEvent());
      const res = await request(app)
        .put(`/events/${created.body.id}`)
        .send({ ...validEvent(), title: 'Updated', notificationTime: 30 });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated');
      expect(res.body.notificationTime).toBe(30);
      expect(res.body.updatedAt).toBeDefined();
    });

    it('returns 404 when updating an unknown id', async () => {
      const res = await request(app).put('/events/nope').send(validEvent());
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /events/:id', () => {
    it('deletes an existing event and returns 204', async () => {
      const created = await request(app).post('/events').send(validEvent());
      const res = await request(app).delete(`/events/${created.body.id}`);
      expect(res.status).toBe(204);

      const after = await request(app).get(`/events/${created.body.id}`);
      expect(after.status).toBe(404);
    });

    it('returns 404 when deleting an unknown id', async () => {
      const res = await request(app).delete('/events/nope');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /health', () => {
    it('reports ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
