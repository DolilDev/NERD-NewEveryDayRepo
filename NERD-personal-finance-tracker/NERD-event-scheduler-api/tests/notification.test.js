const {
  createNotificationService,
} = require('../src/services/notificationService');
const consoleTransport = require('../src/transports/consoleTransport');

jest.mock('nodemailer');
const nodemailer = require('nodemailer');
const emailTransport = require('../src/transports/emailTransport');

// Let queued microtasks (the transport's async send + catch) settle.
const flush = () => Promise.resolve();

describe('notificationService (scheduling with mocked timers)', () => {
  let send;
  let transport;

  beforeEach(() => {
    jest.useFakeTimers();
    send = jest.fn().mockResolvedValue({ transport: 'mock' });
    transport = { name: 'mock', send };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // Event 10 min ahead; default notificationTime 5 => fires 5 min from "now".
  function evt(overrides = {}) {
    return {
      id: 'e1',
      title: 'Demo',
      date: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      notificationTime: 5,
      ...overrides,
    };
  }

  it('fires the transport when the notification time is reached', async () => {
    const svc = createNotificationService({ transport });
    svc.schedule(evt());
    expect(svc.pendingCount()).toBe(1);
    expect(send).not.toHaveBeenCalled();

    jest.advanceTimersByTime(5 * 60 * 1000);
    await flush();

    expect(send).toHaveBeenCalledTimes(1);
    expect(svc.pendingCount()).toBe(0);
  });

  it('does not schedule when the notification time is already in the past', () => {
    const svc = createNotificationService({ transport });
    const result = svc.schedule(
      evt({ date: new Date(Date.now() - 1000).toISOString() })
    );
    expect(result).toBeNull();
    expect(svc.pendingCount()).toBe(0);
  });

  it('does not schedule for an invalid date', () => {
    const svc = createNotificationService({ transport });
    expect(svc.schedule(evt({ date: 'not-a-date' }))).toBeNull();
  });

  it('cancel prevents the notification from firing', async () => {
    const svc = createNotificationService({ transport });
    svc.schedule(evt());
    svc.cancel('e1');
    expect(svc.pendingCount()).toBe(0);

    jest.advanceTimersByTime(10 * 60 * 1000);
    await flush();
    expect(send).not.toHaveBeenCalled();
  });

  it('cancel is a no-op for an unknown id', () => {
    const svc = createNotificationService({ transport });
    expect(() => svc.cancel('nope')).not.toThrow();
  });

  it('reschedule replaces the existing timer', async () => {
    const svc = createNotificationService({ transport });
    svc.schedule(evt({ notificationTime: 5 })); // fires at +5 min
    svc.reschedule(evt({ notificationTime: 1 })); // now fires at +9 min
    expect(svc.pendingCount()).toBe(1);

    jest.advanceTimersByTime(5 * 60 * 1000);
    await flush();
    expect(send).not.toHaveBeenCalled(); // old timer was cancelled

    jest.advanceTimersByTime(4 * 60 * 1000);
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('routes to the email transport when the event has an email', async () => {
    const emailSend = jest.fn().mockResolvedValue({ transport: 'email' });
    const svc = createNotificationService({
      transport,
      emailTransport: { name: 'email', send: emailSend },
    });
    svc.schedule(evt({ email: 'a@b.com' }));

    jest.advanceTimersByTime(5 * 60 * 1000);
    await flush();

    expect(emailSend).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });

  it('logs but does not throw when a transport rejects', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const failing = {
      name: 'x',
      send: jest.fn().mockRejectedValue(new Error('smtp down')),
    };
    const svc = createNotificationService({ transport: failing });
    svc.schedule(evt());

    jest.advanceTimersByTime(5 * 60 * 1000);
    // Let send() reject and the rejection propagate through to .catch().
    for (let i = 0; i < 5; i += 1) {
      await flush();
    }

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('clamps very-far-future delays to the setTimeout maximum', async () => {
    const svc = createNotificationService({ transport });
    const farFuture = new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000
    ).toISOString(); // 60 days ahead, beyond the ~24.8 day limit
    svc.schedule(evt({ date: farFuture, notificationTime: 0 }));
    expect(svc.pendingCount()).toBe(1);

    jest.advanceTimersByTime(2 ** 31 - 1); // the clamp value
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('consoleTransport', () => {
  it('logs the reminder and reports its transport name', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const result = await consoleTransport.send({
      title: 'A',
      date: 'D',
      description: 'desc',
    });
    expect(spy).toHaveBeenCalled();
    expect(result).toEqual({ transport: 'console' });
    spy.mockRestore();
  });

  it('works without a description', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await consoleTransport.send({ title: 'A', date: 'D' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('emailTransport (mocked nodemailer)', () => {
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    emailTransport._reset();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('sends mail via an Ethereal account and returns a preview URL', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'abc' });
    nodemailer.createTestAccount.mockResolvedValue({ user: 'u', pass: 'p' });
    nodemailer.createTransport.mockReturnValue({ sendMail });
    nodemailer.getTestMessageUrl.mockReturnValue(
      'https://ethereal.email/message/xyz'
    );

    const result = await emailTransport.send({
      title: 'Demo',
      date: '2030-01-01T10:00:00Z',
      email: 'a@b.com',
      description: 'hi',
    });

    expect(nodemailer.createTestAccount).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.com', subject: 'Reminder: Demo' })
    );
    expect(result).toEqual({
      transport: 'email',
      messageId: 'abc',
      previewURL: 'https://ethereal.email/message/xyz',
    });
  });

  it('reuses the cached transporter across sends', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'def' });
    nodemailer.createTestAccount.mockResolvedValue({ user: 'u', pass: 'p' });
    nodemailer.createTransport.mockReturnValue({ sendMail });
    nodemailer.getTestMessageUrl.mockReturnValue('https://ethereal.email/message/2');

    await emailTransport.send({ title: 'A', date: 'D', email: 'a@b.com' });
    await emailTransport.send({ title: 'B', date: 'D', email: 'c@d.com' });

    expect(nodemailer.createTestAccount).toHaveBeenCalledTimes(1); // cached
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});
