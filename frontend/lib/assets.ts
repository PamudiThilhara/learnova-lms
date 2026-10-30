export const assets = {
  logo: '/images/learnova-logo-transparent.png', hero: '/images/02_home_hero.png', courses: '/images/03_courses.png',
  login: '/images/04_login.png', signup: '/images/05_signup.png', learning: '/images/06_course_learning.png',
  quiz: '/images/07_quiz.png', certificate: '/images/08_certificate.png', student: '/images/09_student_dashboard.png',
  instructor: '/images/10_instructor.png', admin: '/images/11_admin.png', avatar: '/images/12_profile_avatar.png',
  background: '/images/13_background.png', courseIcon: '/images/14_course_icon.png', quizIcon: '/images/15_quiz_icon.png',
  certificateIcon: '/images/16_certificate_icon.png', progressIcon: '/images/17_progress_icon.png', studentsIcon: '/images/18_students_icon.png',
  instructorIcon: '/images/19_instructor_icon.png', settingsIcon: '/images/20_settings_icon.png',
} as const;
export type Asset = keyof typeof assets;
export function courseImageSource(source: string) {
  // Preserve database records and uploaded thumbnails while repairing legacy asset paths.
  if (!source || (source.startsWith('/images/') && !Object.values(assets).some(path => path === source))) return assets.courses;
  return source;
}
