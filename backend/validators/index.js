import { z } from 'zod';
import { youtubeReference } from '../services/lesson-video.js';
const str = (min, max) => z.string().trim().min(min).max(max);
export const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const email = z.email().max(254).transform(s => s.toLowerCase());
export const password = z.string().min(8).refine(s => Buffer.byteLength(s, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes.');
export const registration = z.object({ name: str(2, 200), email, password, role: z.enum(['student', 'instructor']).default('student'), terms: z.literal(true) });
export const login = z.object({ email, password, remember: z.boolean().default(false) });
const image = max => z.string().max(max).refine(s => /^\/images\/[a-zA-Z0-9_.-]+$/.test(s) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(s), 'Use a category image or PNG, JPEG, WebP upload.');
export const profile = z.object({ name: str(2, 200), email, phone: z.string().trim().max(25).refine(s => !s || /^[+\d\s()-]{7,25}$/.test(s)), bio: z.string().trim().max(3000), avatar: z.union([z.literal(''), image(280000)]) });
const question = z.object({ question: str(1, 2000), options: z.array(str(1, 2000)).length(4), answer: z.number().int().min(0).max(3), explanation: str(1, 5000) });
const lessonVideo = z.union([
  z.object({ provider: z.literal('youtube'), videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/) }).strict(),
  z.object({ provider: z.literal('youtube'), url: z.string().max(2048).refine(value => youtubeReference(value) !== null, 'Enter a valid HTTPS YouTube video URL.') }).strict().transform(value => youtubeReference(value.url)),
]).nullable().optional();
export const courseInput = z.object({
  status: z.enum(['draft', 'published']).optional(),
  title: str(3, 200), description: str(20, 20000), image: image(700000),
  category: z.enum(['Programming', 'Design', 'Marketing', 'Business', 'Data Science', 'Personal Development']),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']), duration: str(1, 100), price: z.number().finite().min(0).max(1000000),
  outcomes: z.array(str(1, 1000)).min(1).max(100),
  lessons: z.array(z.object({ id: identifier, title: str(1, 200), duration: str(1, 100), content: str(1, 50000), exercise: z.string().max(10000).default(''), video: lessonVideo })).min(1).max(200).refine(v => new Set(v.map(l => l.id)).size === v.length, 'Lesson IDs must be unique.'),
  quiz: z.array(question).max(100).optional(),
  assignment: z.object({ title: str(3, 200), instructions: str(20, 20000), due: z.iso.date() }).optional(),
});
export const grade = z.object({ marks: z.number().finite().min(0).max(100), feedback: str(1, 10000) });
export const settings = z.object({ notifications: z.boolean(), weeklyDigest: z.boolean() });
export const contact = z.object({ name: str(2, 200), email, subject: str(3, 300), message: str(20, 20000) });
export const answers = z.object({ answers: z.array(z.number().int().min(0).max(3)).min(1).max(100) });
export const reflection = str(30, 50000);
