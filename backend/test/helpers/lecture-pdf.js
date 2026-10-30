// A real, minimal searchable PDF for isolated tests. Contains no user data.
export const lectureText = 'Network security separates authentication from authorization. Authentication verifies identity using credentials. Authorization determines which operations an authenticated user can perform. TLS encrypts the connection and validates the server certificate. A database readWrite role permits reading and writing application collections. Least privilege grants only the access required for the application. A secure system checks permissions on every request. Server timestamps enforce deadlines independently of a browser clock.';
export function lecturePdf(text = lectureText) {
  const lines = text.match(/.{1,80}(?:\s|$)/g) ?? [];
  const commands = ['BT /F1 12 Tf 40 760 Td', ...lines.map((line, index) => `${index ? '0 -18 Td ' : ''}(${line.replace(/[\\()]/g, '\\$&').trim()}) Tj`), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
