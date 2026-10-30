import { getCourse, requireEnrollment, requireOwner } from '../services/access.js';
import { identifier } from '../validators/index.js';
import { HttpError } from '../middleware/errors.js';
import { youtubePlayback } from '../services/lesson-video.js';

export async function get(req, res) {
  const course = await getCourse(req.params.id, req.user);
  const lesson = course.lessons.find(item => item.id === identifier.parse(req.params.lessonId));
  if (!lesson) throw new HttpError(404, 'Lesson not found.');
  if (req.user.role === 'admin' || course.instructorId === req.user._id) requireOwner(req.user, course);
  else if (req.user.role === 'student') await requireEnrollment(req.user, course._id);
  else throw new HttpError(403, 'Only enrolled students, the course instructor, or an administrator can view this lesson video.');
  const video = youtubePlayback(lesson.video);
  if (!video) throw new HttpError(404, 'This lesson does not have a video.');
  res.json({ video });
}
