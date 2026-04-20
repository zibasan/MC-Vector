import process from 'node:process';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const tauriDir = path.resolve(projectRoot, 'src-tauri');

const action = process.argv[2];

if (action !== 'outdated' && action !== 'audit') {
  console.error('Usage: node scripts/cargo-optional.mjs <outdated|audit>');
  process.exit(1);
}

const note =
  action === 'outdated'
    ? "Note: Install cargo-outdated with 'cargo install cargo-outdated'"
    : "Note: Install cargo-audit with 'cargo install cargo-audit'";

const result = spawnSync('cargo', [action], {
  cwd: tauriDir,
  encoding: 'utf8',
});

if (result.error) {
  console.log(note);
  process.exit(0);
}

if (result.stderr && /no such command: `(?:outdated|audit)`/i.test(result.stderr)) {
  console.log(note);
  process.exit(0);
}

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status === 0) {
  process.exit(0);
}

process.exit(0);
