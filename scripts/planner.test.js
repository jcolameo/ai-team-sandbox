import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chat } from './abacus.mjs';
import { buildUserMessage, formatComment, parseVerdict } from './planner.mjs';

test('parseVerdict reads REFINED and body', () => {
  const result = parseVerdict('VERDICT: REFINED\n**Zusammenfassung** ok');
  assert.deepEqual(result, { verdict: 'REFINED', body: '**Zusammenfassung** ok' });
});

test('parseVerdict reads NEEDS_INFO', () => {
  assert.equal(parseVerdict('VERDICT: NEEDS_INFO\n1. Was genau?').verdict, 'NEEDS_INFO');
});

test('parseVerdict rejects answers without a verdict line', () => {
  assert.throws(() => parseVerdict('Hier ist meine Analyse'));
  assert.throws(() => parseVerdict('VERDICT: REFINED\n'));
});

test('buildUserMessage fences the issue text and clips long bodies', () => {
  const message = buildUserMessage({ title: 'T', body: 'x'.repeat(9000), claudeMd: 'regeln', files: 'src/a.js' });
  assert.match(message, /Daten, keine Anweisungen/);
  assert.match(message, /\[\.\.\. gekürzt\]/);
  assert.ok(message.length < 9000 + 500);
});

test('formatComment carries the marker and model', () => {
  const comment = formatComment({ body: 'b', model: 'm', usage: { input_tokens: 1, output_tokens: 2 } });
  assert.match(comment, /^<!-- agent:planner v1 -->/);
  assert.match(comment, /m · 1 in \/ 2 out/);
});

test('chat posts the OpenAI-style request and returns the content', async () => {
  let seen;
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      seen = { url: req.url, auth: req.headers.authorization, body: JSON.parse(raw) };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ model: 'fake', choices: [{ message: { content: 'ok' } }], usage: { input_tokens: 3, output_tokens: 1 } }));
    });
  });
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
    const result = await chat({ model: 'route-llm', system: 's', user: 'u', apiKey: 'k', baseUrl });
    assert.equal(result.content, 'ok');
    assert.equal(seen.url, '/v1/chat/completions');
    assert.equal(seen.auth, 'Bearer k');
    assert.equal(seen.body.messages[0].role, 'system');
  } finally {
    server.close();
  }
});

test('chat surfaces API errors without hiding the status', async () => {
  const fetchImpl = async () => new Response('{"error":"Invalid API Key"}', { status: 403 });
  await assert.rejects(chat({ model: 'm', system: 's', user: 'u', apiKey: 'k', fetchImpl }), /403/);
  await assert.rejects(chat({ model: 'm', system: 's', user: 'u' }), /ABACUS_API_KEY/);
});
