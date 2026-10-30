// Grounded, distinct questions for test doubles only. Never imported by server.js.
const items = [
  ['What does authentication verify?', 'Identity', 'Authentication verifies identity using credentials.'],
  ['Which mechanism encrypts the connection and validates its certificate?', 'TLS', 'TLS encrypts the connection and validates the server certificate.'],
  ['Which operations does a database readWrite role permit?', 'Reading and writing application collections', 'A database readWrite role permits reading and writing application collections.'],
  ['What access does the principle of least privilege grant?', 'Only the access required for the application', 'Least privilege grants only the access required for the application.'],
  ['What enforces deadlines independently of a browser clock?', 'Server timestamps', 'Server timestamps enforce deadlines independently of a browser clock.'],
];
export const fixtureQuestions = count => items.slice(0, count).map(([question, correct, quote]) => ({ question, options: [correct, 'Changing the font weight', 'Setting the page color', 'Measuring the screen width'], answer: 0, explanation: quote, sourceQuote: quote }));
