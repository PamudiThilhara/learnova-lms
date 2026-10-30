import { PDFParse } from 'pdf-parse';

const buffer = await new Promise(resolve => process.once('message', message => resolve(message.buffer)));
let parser;
let output;
try {
  parser = new PDFParse({ data: new Uint8Array(buffer), isEvalSupported: false });
  const info = await parser.getInfo();
  if (info.total > 100) output = { error: 'pages' };
  else {
    const result = await parser.getText();
    const text = result.pages.map(page => page.text).join('\n\n').replace(/\u0000/g, '').trim();
    if (text.length > 300000) output = { error: 'length' };
    else if (text.replace(/\s/g, '').length < 200) output = { error: 'empty' };
    else output = { text, pages: info.total };
  }
} catch {
  // Parser errors can contain private file details; return only a fixed category.
  output = { error: 'unsupported' };
} finally { if (parser) await parser.destroy().catch(() => {}); }
process.send(output, () => process.disconnect());
