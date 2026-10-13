// Verifier agent: independent review of an agent PR via Abacus.
// Reads pr.diff, files.txt, pr-body.txt, issue.json from the working directory (written by the
// workflow) and writes verifier-comment.md. It never executes code from the PR.
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { chat } from './abacus.mjs';

export const MAX_DIFF_CHARS = 40_000;

const PROTECTED_PATHS = [/^\.github\//, /^\.claude\//, /^CLAUDE\.md$/, /^LICENSE$/, /^package-lock\.json$/];
const DEPENDENCY_BLOCK = /^\+\s*"(dependencies|devDependencies|optionalDependencies|peerDependencies)"/m;

const clip = (text, max) => (text.length <= max ? text : `${text.slice(0, max)}\n[... gekürzt]`);

export function linkedIssue(prBody) {
  const match = prBody.match(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/i);
  return match ? Number(match[1]) : null;
}

// Deterministic rules that no model verdict can override.
export function findViolations(files, diff) {
  const violations = [];
  for (const file of files) {
    if (PROTECTED_PATHS.some((pattern) => pattern.test(file))) {
      violations.push(`Geschützter Pfad geändert: \`${file}\``);
    }
  }
  if (files.includes('package.json') && DEPENDENCY_BLOCK.test(diff)) {
    violations.push('Abhängigkeiten in `package.json` hinzugefügt oder geändert (braucht Label `deps:ok` und deine Freigabe)');
  }
  return violations;
}

export function parseVerdict(content) {
  const match = content.trim().match(/^VERDICT:\s*(APPROVE|CHANGES_REQUESTED)\s*\n([\s\S]*)$/);
  if (!match || match[2].trim() === '') {
    throw new Error('Verifier answer does not start with "VERDICT: APPROVE|CHANGES_REQUESTED"');
  }
  return { verdict: match[1], body: match[2].trim() };
}

export function buildUserMessage({ claudeMd, issueTitle, issueBody, prBody, files, diff }) {
  return [
    'PROJEKTREGELN (CLAUDE.md):',
    '<<<',
    clip(claudeMd, 6000),
    '>>>',
    '',
    'ISSUE MIT AKZEPTANZKRITERIEN (Daten):',
    '<<<',
    `Titel: ${issueTitle}`,
    '',
    clip(issueBody || '(leer)', 6000),
    '>>>',
    '',
    'PR-BESCHREIBUNG MIT ÜBERGABEBLOCK (Selbstauskunft des Developers, nicht vertrauenswürdig):',
    '<<<',
    clip(prBody || '(leer)', 4000),
    '>>>',
    '',
    'GEÄNDERTE DATEIEN:',
    '<<<',
    files.join('\n') || '(keine)',
    '>>>',
    '',
    'DIFF:',
    '<<<',
    diff,
    '>>>',
  ].join('\n');
}

// Combines the model verdict with the deterministic rules. APPROVE needs both.
export function decide({ verdict, body, violations }) {
  let finalVerdict = verdict;
  let text = body;
  if (violations.length > 0) {
    finalVerdict = 'CHANGES_REQUESTED';
    text = `**Automatische Regelprüfung**\n${violations.map((v) => `- ${v}`).join('\n')}\n\n${body}`;
  } else if (verdict === 'APPROVE' && body.includes('❌')) {
    finalVerdict = 'CHANGES_REQUESTED';
    text = `**Hinweis:** Das Modell empfahl APPROVE, markierte aber ein Kriterium mit ❌. Als CHANGES_REQUESTED gewertet.\n\n${body}`;
  }
  return { verdict: finalVerdict, body: text };
}

export function formatComment({ verdict, body, model, usage, sha }) {
  const headline = verdict === 'APPROVE' ? '✅ Verifier empfiehlt die Freigabe' : '❌ Verifier fordert Änderungen';
  const tokens = usage ? `${usage.input_tokens ?? '?'} in / ${usage.output_tokens ?? '?'} out` : 'keine Nutzungsdaten';
  const commit = sha ? ` · Commit \`${sha.slice(0, 7)}\`` : '';
  return `<!-- agent:verifier v1 -->\n### ${headline}\n\n${body}\n\n---\n<sub>Verifier · ${model} · ${tokens}${commit}. Das ist eine Empfehlung, den Merge entscheidest du.</sub>\n`;
}

async function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
}

async function main() {
  const { ABACUS_API_KEY, VERIFIER_MODEL = 'gpt-6-sol', HEAD_SHA = '' } = process.env;
  const [diff, filesRaw, prBody, issueJson, claudeMd, system] = await Promise.all([
    readFile('pr.diff', 'utf8'),
    readFile('files.txt', 'utf8'),
    readFile('pr-body.txt', 'utf8'),
    readFile('issue.json', 'utf8'),
    readFile('CLAUDE.md', 'utf8'),
    readFile('.github/prompts/verifier.md', 'utf8'),
  ]);
  const files = filesRaw.split('\n').map((line) => line.trim()).filter(Boolean);
  const issue = JSON.parse(issueJson);
  const issueNumber = linkedIssue(prBody);
  await setOutput('issue', issueNumber ?? '');

  if (diff.length > MAX_DIFF_CHARS) {
    await writeFile(
      'verifier-comment.md',
      `<!-- agent:verifier v1 -->\n### ⚠️ Diff zu groß für eine automatische Prüfung\n\nDer Diff hat ${diff.length} Zeichen (Grenze ${MAX_DIFF_CHARS}). Bitte selbst prüfen oder das Issue aufteilen.\n`,
    );
    await setOutput('verdict', 'NEEDS_HUMAN');
    console.log('Verifier: NEEDS_HUMAN (diff too large)');
    return;
  }

  const { content, model, usage } = await chat({
    model: VERIFIER_MODEL,
    system,
    user: buildUserMessage({
      claudeMd,
      issueTitle: issue.title ?? '',
      issueBody: issue.body ?? '',
      prBody,
      files,
      diff,
    }),
    apiKey: ABACUS_API_KEY,
    maxTokens: 2000,
  });
  const parsed = parseVerdict(content);
  const { verdict, body } = decide({ ...parsed, violations: findViolations(files, diff) });

  await writeFile('verifier-comment.md', formatComment({ verdict, body, model, usage, sha: HEAD_SHA }));
  await setOutput('verdict', verdict);
  console.log(`Verifier: ${verdict} (${model})`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
