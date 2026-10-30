import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HttpError } from '../middleware/errors.js';

let activeExtractions = 0;
export function pdfWorkerEnvironment(env = process.env) {
  // The parser needs OS/runtime paths, not database, JWT, SMTP, or AI credentials.
  return Object.fromEntries(['SystemRoot', 'WINDIR', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'TZ'].filter(key => typeof env[key] === 'string').map(key => [key, env[key]]));
}
export async function extractPdf(buffer) {
  if (!buffer || buffer.length > 10 * 1024 * 1024 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new HttpError(422, 'Choose a valid PDF up to 10 MB.');
  if (activeExtractions >= 3) throw new HttpError(503, 'PDF processing is busy. Please try again shortly.');
  activeExtractions++;
  try { return await new Promise((resolve, reject) => {
    // Process isolation also protects the API from native PDF-library failures.
    // Suppress all library output so private data never reaches application logs.
    const worker = fork(fileURLToPath(new URL('./pdf-worker.js', import.meta.url)), [], { windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'], serialization: 'advanced', env: pdfWorkerEnvironment(), execArgv: ['--max-old-space-size=192'] });
    let finished = false;
    const finish = (error, value, terminate = true) => {
      if (finished) return; finished = true; clearTimeout(timer); if (terminate) worker.kill();
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => finish(new HttpError(422, 'This PDF took too long to read. Try a smaller, text-based document.')), 20000);
    worker.once('message', result => {
      const messages = { pages: 'Use a PDF with no more than 100 pages.', length: 'This PDF contains too much text. Split it into smaller lecture notes.', empty: 'No usable lecture text was found. Scanned PDFs need OCR first; upload a searchable, text-based PDF.', unsupported: 'This PDF could not be read. It may be encrypted, damaged, or unsupported. Export an unprotected, text-based PDF.' };
      finish(result.error ? new HttpError(422, messages[result.error] || messages.unsupported) : null, result, false);
    });
    worker.once('error', () => finish(new HttpError(422, 'This PDF could not be processed. Try a smaller, text-based PDF.')));
    worker.once('exit', () => { if (!finished) finish(new HttpError(422, 'PDF extraction stopped. Try a different text-based PDF.')); });
    worker.send({ buffer }, error => { if (error) finish(new HttpError(422, 'PDF extraction could not start. Please try again.')); });
  }); } finally { activeExtractions--; }
}
