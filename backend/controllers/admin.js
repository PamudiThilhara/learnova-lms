import { User, Course, Enrollment, QuizAttempt, Submission, Session, Activity, Setting, ContactMessage } from '../models/index.js';
import { HttpError } from '../middleware/errors.js';
import { identifier, settings, contact } from '../validators/index.js';
import { publicUser, publicRecord } from '../services/state.js';
import { seedCatalog } from '../services/seed.js';
import { aiModels } from '../models/ai-quiz.js';
export async function userStatus(req, res) {
  const user = await User.findById(identifier.parse(req.params.id));
  if (!user) throw new HttpError(404, 'User not found.');
  if (user.role === 'admin' || user._id === req.user._id) throw new HttpError(403, 'Administrator accounts cannot be blocked here.');
  user.status = user.status === 'Active' ? 'Blocked' : 'Active'; await user.save();
  if (user.status === 'Blocked') await Session.deleteMany({ userId: user._id });
  res.json({ user: publicUser(user) });
}
export async function deleteUser(req, res) {
  const id = identifier.parse(req.params.id); const user = await User.findById(id);
  if (!user) throw new HttpError(404, 'User not found.');
  if (id === req.user._id || user.role === 'admin') throw new HttpError(403, 'Administrator accounts cannot be deleted here.');
  if (await Course.exists({ instructorId: id })) throw new HttpError(409, 'Remove this instructor’s courses before deleting their account.');
  await User.deleteOne({ _id: id });
  await Promise.all([Enrollment, QuizAttempt, Submission, Session, ...aiModels].map(m => m.deleteMany({ userId: id })));
  await Activity.deleteMany({ actorId: id }); res.status(204).end();
}
export async function saveSettings(req, res) {
  const data = settings.parse(req.body);
  await Setting.findOneAndUpdate({ _id: 'platform' }, { $set: data }, { upsert: true, runValidators: true }); res.json({ settings: data });
}
export async function saveContact(req, res) { const message = await ContactMessage.create(contact.parse(req.body)); res.status(201).json({ id: message._id, message: 'Your message has been saved for the support team.' }); }
export async function contacts(req, res) { res.json({ messages: (await ContactMessage.find().sort({ createdAt: -1 }).limit(100).lean()).map(publicRecord) }); }
export async function samples(req, res) {
  if (req.app.locals.config.NODE_ENV !== 'development' || req.app.locals.mailEnv.ALLOW_SAMPLE_SEED !== 'true') throw new HttpError(403, 'Sample data is available only when explicitly enabled in development.');
  await seedCatalog(req.app.locals.mailEnv.SEED_PASSWORD); res.json({ message: 'Missing sample records restored. Existing records were preserved.' });
}
