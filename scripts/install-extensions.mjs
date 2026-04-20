import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const extensionsPath = path.resolve(process.cwd(), '.vscode', 'extensions.json');

function runCode(args) {
  return spawnSync('code', args, { encoding: 'utf8' });
}

console.log('========================================');
console.log('VS Code Extensions Installer');
console.log('========================================');
console.log('');

if (!fs.existsSync(extensionsPath)) {
  console.error('ERROR: .vscode/extensions.json not found. Aborting operation.');
  process.exit(1);
}

const raw = fs.readFileSync(extensionsPath, 'utf8');
const parsed = JSON.parse(raw);
const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

const codeCheck = runCode(['--version']);
if (codeCheck.error || codeCheck.status !== 0) {
  console.error(
    "ERROR: 'code' command not available. Ensure VS Code is installed and 'code' is in PATH.",
  );
  process.exit(1);
}

const listed = runCode(['--list-extensions']);
if (listed.error || listed.status !== 0) {
  if (listed.stderr) {
    process.stderr.write(listed.stderr);
  }
  process.exit(listed.status ?? 1);
}

const installed = new Set(
  listed.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean),
);

console.log('Starting installation...');
console.log('');

for (const extension of recommendations) {
  if (installed.has(extension)) {
    console.log(`-> ${extension} is already installed. Skipped.`);
    console.log('----------------------------------------');
    continue;
  }

  const install = runCode(['--install-extension', extension]);
  if (install.stdout) {
    process.stdout.write(install.stdout);
  }
  if (install.stderr) {
    process.stderr.write(install.stderr);
  }

  if (install.status === 0) {
    console.log(`  OK: Successfully installed: ${extension}`);
  } else {
    console.log(`  NG: Installation failed: ${extension}`);
  }
  console.log('----------------------------------------');
}

console.log('');
console.log('Done.');
console.log('========================================');
