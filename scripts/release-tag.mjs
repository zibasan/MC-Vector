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

const tagResult = spawnSync('git', ['tag', '-a', tag, '-m', `Release ${tag}`], {
  stdio: 'inherit',
});

if (typeof tagResult.status === 'number' && tagResult.status !== 0) {
  process.exit(tagResult.status);
}
if (tagResult.error) {
  console.error(tagResult.error.message);
  process.exit(1);
}

console.log(`Tag ${tag} created. Push with: git push origin ${tag}`);
