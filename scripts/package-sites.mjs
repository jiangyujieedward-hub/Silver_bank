import './sites-env.mjs';
import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const build = spawnSync(process.execPath, ['scripts/run-framework.mjs', 'build'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);
for (const file of ['.openai/hosting.json', 'dist/server/index.js', 'dist/server/wrangler.json']) {
  if (!existsSync(file)) throw new Error(`Missing deployment file: ${file}`);
}
mkdirSync('.sites-runtime', { recursive: true });
const archive = path.resolve('.sites-runtime/silver-bank-deploy.tar.gz');
const result = spawnSync('tar', ['-czf', archive, '.openai/hosting.json', 'dist', 'drizzle'], { stdio: 'inherit', env: { ...process.env, COPYFILE_DISABLE: '1' } });
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Sites deployment archive: ${archive}`);
