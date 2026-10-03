import './sites-env.mjs';
import { existsSync } from 'node:fs';
import { spawnSync, spawn } from 'node:child_process';
const args = process.argv.slice(2);
const port = process.env.PORT || '5173';
if (!existsSync('dist/server/wrangler.json')) {
  const build = spawnSync(process.execPath, ['scripts/run-framework.mjs', 'build'], { stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status || 1);
}
const child = spawn(process.execPath, ['--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'dist/server/wrangler.json', '--local', '--persist-to', '.wrangler/state', '--ip', process.env.HOST || '127.0.0.1', '--port', port, '--inspector-port', '0', ...args], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exit(1); });
child.on('exit', code => process.exit(code || 0));
