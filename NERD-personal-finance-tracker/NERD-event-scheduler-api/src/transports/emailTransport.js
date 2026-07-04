const nodemailer = require('nodemailer');

/**
 * Email notification transport backed by Nodemailer + an Ethereal test account.
 *
 * Ethereal is a fake SMTP service: nothing is actually delivered, but every
 * message gets a browser-viewable "preview URL" which we log. The throwaway
 * test account is created on first use - no real credentials are needed.
 */

let transporterPromise = null;

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = nodemailer.createTestAccount().then((account) =>
      nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: account.user, pass: account.pass },
      })
    );
  }
  return transporterPromise;
}

module.exports = {
  name: 'email',
  async send(event) {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: '"Event Scheduler" <no-reply@event-scheduler.test>',
      to: event.email,
      subject: `Reminder: ${event.title}`,
      text:
        `Your event "${event.title}" starts at ${event.date}.` +
        (event.description ? `\n\n${event.description}` : ''),
    });

    const previewURL = nodemailer.getTestMessageUrl(info);
    // eslint-disable-next-line no-console
    console.log(
      `[notification] Email sent for "${event.title}" -> ${event.email}. Preview: ${previewURL}`
    );

    return { transport: 'email', messageId: info.messageId, previewURL };
  },

  // Reset the cached transporter (used by tests).
  _reset() {
    transporterPromise = null;
  },
};
