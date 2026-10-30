import '../config/env.js';
import { readFile, stat } from 'node:fs/promises';
import { extractPdf } from '../services/pdf-text.js';
import { generateQuestions } from '../services/ai-question-generator.js';
import { HttpError } from '../middleware/errors.js';

// Explicit opt-in live provider check. Never logs PDF text, generated content, or secrets.
try {
  if (!process.env.GEMINI_API_KEY) throw new HttpError(503, 'Configure GEMINI_API_KEY in the backend environment before running this live check.');
  const path = process.argv[2];
  if (!path) throw new HttpError(422, 'Usage: npm run check:ai -- "path-to-lecture.pdf"');
  const info = await stat(path);
  if (!info.isFile() || info.size > 10 * 1024 * 1024) throw new HttpError(422, 'Choose a real PDF file up to 10 MB.');
  const { text, pages } = await extractPdf(await readFile(path));
  const generated = await generateQuestions({ text, questionCount: 5, difficulty: 'Easy' });
  console.log(`PASS: Read ${pages} PDF page(s); Gemini returned ${generated.questions.length} validated questions with four distinct choices, a correct answer, explanation, and supporting source quote. No document contents or secrets were printed. No database records were changed.`);
} catch (error) {
  console.error(error instanceof HttpError ? error.message : 'The live AI check could not complete. Verify the local PDF path and provider configuration.');
  process.exitCode = 1;
}
