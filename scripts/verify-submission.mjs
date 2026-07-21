import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const requiredFiles = [
  'README.md',
  'counter.compact',
  'tests/counter.test.ts',
  'managed/counter/contract/index.js',
  'managed/counter/contract/index.d.ts',
  'managed/counter/compiler/contract-info.json',
];

const trackedFiles = new Set(
  execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .trim()
    .split('\n'),
);

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`${file}: missing from working tree`);
  if (!trackedFiles.has(file)) failures.push(`${file}: not tracked by git`);
}

const managedFiles = [...trackedFiles].filter((file) =>
  file.startsWith('managed/counter/'),
);
if (managedFiles.length === 0) {
  failures.push('managed/counter/: no compiled files tracked by git');
}

if (existsSync('counter.compact')) {
  const compact = readFileSync('counter.compact', 'utf8');
  const requiredPatterns = [
    [/\bexport\s+ledger\b/, 'public ledger declaration'],
    [/\bwitness\s+localSecretKey\b/, 'private witness declaration'],
    [/\bexport\s+circuit\b/, 'exported circuit definition'],
    [/\bdisclose\s*\(/, 'deliberate disclose() usage'],
  ];
  for (const [pattern, label] of requiredPatterns) {
    if (!pattern.test(compact)) failures.push(`counter.compact: missing ${label}`);
  }
}

if (failures.length > 0) {
  console.error('Submission verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Submission verification passed.');
console.log(`Required files: ${requiredFiles.length}`);
console.log(`Tracked managed artifacts: ${managedFiles.length}`);
