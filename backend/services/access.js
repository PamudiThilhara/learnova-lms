import { Course, Enrollment } from '../models/index.js';
import { identifier } from '../validators/index.js';
import { HttpError } from '../middleware/errors.js';
export async function getCourse(id) {
  const course = await Course.findById(identifier.parse(id));
  if (!course) throw new HttpError(404, 'Course not found.');
  return course;
}
export function requireOwner(user, course) {
  if (!user || (user.role !== 'admin' && user._id !== course.instructorId)) throw new HttpError(403, 'Only the course instructor or an administrator can perform this action.');
}
export async function requireEnrollment(user, courseId) {
  const enrollment = await Enrollment.findOne({ userId: user._id, courseId });
  if (!enrollment) throw new HttpError(403, 'Enroll in this course before recording learning activity.');
  return enrollment;
}
