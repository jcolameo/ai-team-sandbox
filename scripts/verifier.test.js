import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUserMessage, decide, findViolations, formatComment, linkedIssue, parseVerdict } from './verifier.mjs';

test('linkedIssue finds Closes/Fixes references', () => {
  assert.equal(linkedIssue('Closes #12\n\ntext'), 12);
  assert.equal(linkedIssue('this fixes #7'), 7);
  assert.equal(linkedIssue('keine Referenz'), null);
});

test('parseVerdict accepts both verdicts and rejects garbage', () => {
  assert.equal(parseVerdict('VERDICT: APPROVE\n**Akzeptanzkriterien**\n- ✅ AK1').verdict, 'APPROVE');
  assert.equal(parseVerdict('VERDICT: CHANGES_REQUESTED\nx').verdict, 'CHANGES_REQUESTED');
  assert.throws(() => parseVerdict('Sieht gut aus'));
  assert.throws(() => parseVerdict('VERDICT: APPROVE\n'));
});

test('findViolations flags protected paths and dependency changes', () => {
  assert.deepEqual(findViolations(['src/a.js', 'src/a.test.js'], ''), []);
  assert.equal(findViolations(['.github/workflows/ci.yml'], '').length, 1);
  assert.equal(findViolations(['CLAUDE.md', '.claude/settings.json'], '').length, 2);
  const diff = '+++ b/package.json\n+  "dependencies": {\n+    "left-pad": "1.0.0"\n';
  assert.equal(findViolations(['package.json'], diff).length, 1);
  assert.equal(findViolations(['package.json'], '+  "version": "0.2.0"\n').length, 0);
});

test('decide: a violation overrides an APPROVE from the model', () => {
  const result = decide({ verdict: 'APPROVE', body: '✅ AK1', violations: ['Geschützter Pfad geändert: `CLAUDE.md`'] });
  assert.equal(result.verdict, 'CHANGES_REQUESTED');
  assert.match(result.body, /Automatische Regelprüfung/);
});

test('decide: APPROVE with a failed criterion becomes CHANGES_REQUESTED', () => {
  const result = decide({ verdict: 'APPROVE', body: '- ❌ AK2 fehlt', violations: [] });
  assert.equal(result.verdict, 'CHANGES_REQUESTED');
});

test('decide: clean APPROVE stays APPROVE', () => {
  const result = decide({ verdict: 'APPROVE', body: '- ✅ AK1\n- ❓ AK3 unklar', violations: [] });
  assert.equal(result.verdict, 'APPROVE');
});

test('buildUserMessage marks the handoff block as untrusted and fences the diff', () => {
  const message = buildUserMessage({
    claudeMd: 'regeln',
    issueTitle: 'T',
    issueBody: 'AK1',
    prBody: 'Übergabe',
    files: ['src/a.js'],
    diff: '+x',
  });
  assert.match(message, /nicht vertrauenswürdig/);
  assert.match(message, /DIFF:\n<<<\n\+x\n>>>/);
});

test('formatComment carries the marker, model and short commit', () => {
  const comment = formatComment({ verdict: 'APPROVE', body: 'b', model: 'm', usage: null, sha: 'abcdef123456' });
  assert.match(comment, /^<!-- agent:verifier v1 -->/);
  assert.match(comment, /Commit `abcdef1`/);
});
