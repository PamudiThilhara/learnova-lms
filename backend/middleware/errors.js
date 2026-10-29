export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  if (error.name === 'ZodError') return res.status(422).json({ message: 'Please check the submitted fields.', errors: error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) });
  if (error.code === 11000) return res.status(409).json({ message: 'A record with those details already exists.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(422).json({ message: 'Invalid record data.' });
  if (error.name === 'MulterError') return res.status(422).json({ message: 'Choose a supported file up to 10 MB.' });
  const status = error.status || (error.type === 'entity.too.large' ? 413 : 500);
  if (status >= 500) console.error('Request failed:', error.name);
  res.status(status).json({ message: status >= 500 && !(error instanceof HttpError) ? 'The service is temporarily unavailable. Please try again.' : error.message });
}
