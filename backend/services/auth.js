import jwt from 'jsonwebtoken';
import { randomUUID, createHash } from 'node:crypto';
import { Session, User } from '../models/index.js';
import { HttpError } from '../middleware/errors.js';

export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const cookieName = 'learnova_session';
export const cookieOptions = config => ({ httpOnly: true, secure: config.production, sameSite: 'lax', path: '/api' });
export async function issueSession(user, remember, res, config) {
  const seconds = remember ? 7 * 86400 : 12 * 3600;
  const sid = randomUUID();
  await Session.create({ _id: sid, userId: user._id, expiresAt: new Date(Date.now() + seconds * 1000) });
  const token = jwt.sign({ sid }, config.JWT_SECRET, { subject: user._id, expiresIn: seconds, algorithm: 'HS256', issuer: 'learnova', audience: 'learnova-web' });
  res.cookie(cookieName, token, { ...cookieOptions(config), ...(remember ? { maxAge: seconds * 1000 } : {}) });
}
export async function resolveSession(req, res, next) {
  try {
    const token = req.cookies[cookieName];
    if (token) {
      let payload;
      try { payload = jwt.verify(token, req.app.locals.config.JWT_SECRET, { algorithms: ['HS256'], issuer: 'learnova', audience: 'learnova-web' }); }
      catch { res.clearCookie(cookieName, cookieOptions(req.app.locals.config)); return next(); }
      const session = await Session.findOne({ _id: payload.sid, userId: payload.sub, expiresAt: { $gt: new Date() } });
      if (session) {
        const user = await User.findOne({ _id: payload.sub, status: 'Active' });
        if (user) { req.user = user; req.sessionId = session._id; }
      }
      if (!req.user) res.clearCookie(cookieName, cookieOptions(req.app.locals.config));
    }
    next();
  } catch (error) { next(error); }
}
export function requireAuth(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Please sign in to continue.'));
  next();
}
export const roles = (...allowed) => (req, res, next) => {
  if (!req.user) return next(new HttpError(401, 'Please sign in to continue.'));
  if (!allowed.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to perform this action.'));
  next();
};
