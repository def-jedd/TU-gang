// Stand-in for Jed's Python tutor (apps/bikol-rag-cli/server.py) with the same
// routes and response shapes, for testing Express forwarding + Listen without
// Gemini. Answers are canned reviewed Bikol text and labeled provider "mock".
// Usage: node scripts/fake-tutor.mjs   (listens on :8000, like server.py)
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 8000);
const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/health') {
    return json(res, 200, { status: 'ok', version: 'mvp', provider: 'mock' });
  }
  if (req.method === 'POST' && req.url === '/api/explain') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body;
      try { body = JSON.parse(raw || '{}'); } catch { return json(res, 422, { error: 'Invalid JSON' }); }
      const question = String(body.question ?? '').trim();
      if (!question && !body.topic) return json(res, 422, { error: 'Ask a question or choose a topic card.' });
      if (question === 'slow') return setTimeout(() => json(res, 200, {}), 5000);
      json(res, 200, {
        request_id: randomUUID().replaceAll('-', ''),
        topic: body.topic ?? 'melting',
        language: 'bikol_daet',
        explanation: 'An yelo natunaw kun ini nagkukua nin init hale sa palibot kaini.',
        example: 'An yelo na nawalat sa lamesa luway-luway na nagigin likidong tubig.',
        key_points: ['An init nagpapatunaw kan yelo', 'An yelo nagigin likidong tubig', 'Mas mainit, mas dali matunaw'],
        source_ids: ['sample_003'],
        provider: 'mock',
      });
    });
    return;
  }
  json(res, 404, { error: 'Not Found' });
}).listen(PORT, () => console.log(`fake tutor (provider "mock") on http://localhost:${PORT}`));
