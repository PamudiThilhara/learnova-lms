import type { Course } from './courses';
export type Question = { question: string; options: string[]; answer: number; explanation: string };
export const quizFor = (course: Course): Question[] => course.quiz ?? [];
export type Assignment = { id: string; courseId: string; title: string; instructions: string; due: string };
export const assignmentFor = (course: Course): Assignment => ({ id: 'assignment-' + course.id, courseId: course.id, title: course.assignment?.title ?? '', instructions: course.assignment?.instructions ?? '', due: course.assignment?.due ?? '' });
