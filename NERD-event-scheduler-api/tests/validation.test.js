const request = require('supertest');
const createApp = require('../src/app');
const store = require('../src/store/eventStore');
const {
  validateEventInput,
  isValidEmail,
} = require('../src/validation/eventValidation');
const ApiError = require('../src/errors/ApiError');
const { errorHandler, notFoundHandler } = require('../src/middleware/errorHandler');

const app = createApp();
const base = { title: 'X', date: '2030-01-01T10:00:00Z', notificationTime: 10 };

describe('validateEventInput', () => {
  it('accepts a valid payload', () => {
    expect(validateEventInput(base)).toEqual([]);
  });

  it('accepts a valid payload with optional fields', () => {
    expect(
      validateEventInput({ ...base, description: 'notes', email: 'a@b.com' })
    ).toEqual([]);
  });

  it('rejects a non-object body', () => {
    expect(validateEventInput(null)).toContain('Request body must be a JSON object');
    expect(validateEventInput('str')).toContain('Request body must be a JSON object');
    expect(validateEventInput([])).toContain('Request body must be a JSON object');
  });

  it('requires a non-empty string title', () => {
    expect(validateEventInput({ ...base, title: '   ' })).toEqual(
      expect.arrayContaining([expect.stringContaining('title')])
    );
    expect(validateEventInput({ ...base, title: 5 })).toEqual(
      expect.arrayContaining([expect.stringContaining('title')])
    );
  });

  it('requires a valid ISO date', () => {
    expect(validateEventInput({ ...base, date: 'not-a-date' })).toEqual(
      expect.arrayContaining([expect.stringContaining('date')])
    );
  });

  it('requires notificationTime to be a number >= 0', () => {
    expect(validateEventInput({ ...base, notificationTime: -1 })).toEqual(
      expect.arrayContaining([expect.stringContaining('notificationTime')])
    );
    expect(validateEventInput({ ...base, notificationTime: 'soon' })).toEqual(
      expect.arrayContaining([expect.stringContaining('notificationTime')])
    );
  });

  it('rejects a non-string description', () => {
    expect(validateEventInput({ ...base, description: 123 })).toEqual(
      expect.arrayContaining([expect.stringContaining('description')])
    );
  });

  it('rejects an invalid email but allows null/absent', () => {
    expect(validateEventInput({ ...base, email: 'nope' })).toEqual(
      expect.arrayContaining([expect.stringContaining('email')])
    );
    expect(validateEventInput({ ...base, email: null })).toEqual([]);
  });
});

describe('isValidEmail', () => {
  it('validates email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('bad')).toBe(false);
    expect(isValidEmail(42)).toBe(false);
  });
});

describe('ApiError', () => {
  it('carries status code, message and details', () => {
    const e = new ApiError(400, 'bad', ['x']);
    expect(e).toBeInstanceOf(Error);
    expect(e.statusCode).toBe(400);
    expect(e.message).toBe('bad');
    expect(e.details).toEqual(['x']);
  });

  it('provides badRequest and notFound factories', () => {
    expect(ApiError.badRequest('b', ['d']).statusCode).toBe(400);
    expect(ApiError.notFound('n').statusCode).toBe(404);
    expect(ApiError.notFound('n').details).toBeUndefined();
  });
});

// Exercise the error handler in isolation to cover every branch (incl. 500).
function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('errorHandler (unit)', () => {
  it('maps an ApiError to its status and message', () => {
    const res = mockRes();
    errorHandler(new ApiError(404, 'missing'), {}, res, () => {});
    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toBe('missing');
  });

  it('hides internal details on 500 and logs the error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockRes();
    errorHandler(new Error('boom'), {}, res, () => {});
    expect(res.statusCode).toBe(500);
    expect(res.body.error.message).toBe('Internal server error');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('treats a parse-failed SyntaxError as 400', () => {
    const res = mockRes();
    const err = new SyntaxError('Unexpected token');
    err.type = 'entity.parse.failed';
    errorHandler(err, {}, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toMatch(/Malformed JSON/);
  });

  it('notFoundHandler forwards a 404 ApiError', () => {
    let forwarded;
    notFoundHandler({ method: 'GET', originalUrl: '/x' }, {}, (e) => {
      forwarded = e;
    });
    expect(forwarded).toBeInstanceOf(ApiError);
    expect(forwarded.statusCode).toBe(404);
  });
});

describe('Error handling (HTTP)', () => {
  beforeEach(() => store.clear());

  it('returns 400 with details for an invalid POST body', async () => {
    const res = await request(app).post('/events').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('returns 400 for an invalid PUT body', async () => {
    const created = await request(app).post('/events').send(base);
    const res = await request(app)
      .put(`/events/${created.body.id}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/events')
      .set('Content-Type', 'application/json')
      .send('{ this is not json');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Malformed JSON/);
  });

  it('returns 404 for an unknown route', async () => {
    const res = await request(app).get('/totally/unknown');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/);
  });
});
