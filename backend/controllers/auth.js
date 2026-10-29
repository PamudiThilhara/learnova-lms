import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { User, Session } from '../models/index.js';
import { HttpError } from '../middleware/errors.js';
import * as validate from '../validators/index.js';
import { issueSession, cookieName, cookieOptions, tokenHash } from '../services/auth.js';
import { publicUser, recordActivity } from '../services/state.js';

export async function register(req, res) {
  const data = validate.registration.parse(req.body);
  const user = await User.create({ name: data.name, email: data.email, role: data.role, passwordHash: await bcrypt.hash(data.password, 12) });
  await issueSession(user, false, res, req.app.locals.config);
  await recordActivity(user._id, `${user.name} joined Learnova`);
  res.status(201).json({ user: publicUser(user) });
}
export async function login(req, res) {
  const data = validate.login.parse(req.body);
  const user = await User.findOne({ email: data.email }).select('+passwordHash');
  // A dummy hash keeps unknown-user requests on the password comparison path.
  const valid = await bcrypt.compare(data.password, user?.passwordHash ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
  if (!user || !valid || user.status !== 'Active') throw new HttpError(401, 'Email or password is incorrect, or the account is unavailable.');
  if (req.sessionId) await Session.deleteOne({ _id: req.sessionId });
  await issueSession(user, data.remember, res, req.app.locals.config);
  res.json({ user: publicUser(user) });
}
export async function logout(req, res) {
  if (req.sessionId) await Session.deleteOne({ _id: req.sessionId });
  res.clearCookie(cookieName, cookieOptions(req.app.locals.config));
  res.status(204).end();
}
export async function updateProfile(req, res) {
  const data = validate.profile.parse(req.body);
  Object.assign(req.user, data);
  await req.user.save();
  res.json({ user: publicUser(req.user) });
}
export async function forgotPassword(req, res) {
  const { email } = z.object({ email: validate.email }).parse(req.body);
  const env = req.app.locals.mailEnv;
  if (!env.SMTP_HOST || !env.SMTP_FROM) throw new HttpError(503, 'Password recovery email is not configured.');
  const user = await User.findOne({ email, status: 'Active' });
  if (user) {
    const token = randomBytes(32).toString('hex');
    user.resetHash = tokenHash(token); user.resetExpires = new Date(Date.now() + 30 * 60000);
    await user.save();
    const mailer = req.app.locals.mailer ?? nodemailer.createTransport({ host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587), secure: env.SMTP_SECURE === 'true', ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}) });
    const url = new URL('/login', req.app.locals.config.FRONTEND_URL); url.searchParams.set('reset', token);
    try { await mailer.sendMail({ from: env.SMTP_FROM, to: email, subject: 'Reset your Learnova password', text: `Open ${url} within 30 minutes. Enter your email and a new password in the login form. Ignore this email if you did not request a reset.` }); }
    catch (error) { user.resetHash = undefined; user.resetExpires = undefined; await user.save(); throw error; }
  }
  res.json({ message: 'If an active account matches that email, a password reset link has been sent.' });
}
export async function resetPassword(req, res) {
  const data = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: validate.password }).parse(req.body);
  // Atomically consume the token to prevent concurrent replay.
  const hash = await bcrypt.hash(data.password, 12);
  const user = await User.findOneAndUpdate({ resetHash: tokenHash(data.token), resetExpires: { $gt: new Date() }, status: 'Active' }, { $set: { passwordHash: hash }, $unset: { resetHash: 1, resetExpires: 1 } }, { returnDocument: 'after' });
  if (!user) throw new HttpError(400, 'This reset link has expired or already been used.');
  await Session.deleteMany({ userId: user._id });
  res.clearCookie(cookieName, cookieOptions(req.app.locals.config));
  res.json({ message: 'Password updated. You can now sign in.' });
}
