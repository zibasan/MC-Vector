import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

if (typeof version !== 'string' || version.length === 0) {
  console.error('ERROR: package.json version is missing.');
  process.exit(1);
}

const tag = `v${version}`;

const pushResult = spawnSync('git', ['push', 'origin', tag], { stdio: 'inherit' });

if (typeof pushResult.status === 'number' && pushResult.status !== 0) {
  process.exit(pushResult.status);
}
if (pushResult.error) {
  console.error(pushResult.error.message);
  process.exit(1);
}

console.log(`Release workflow triggered for ${tag}`);
