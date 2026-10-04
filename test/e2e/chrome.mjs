// A headless Chrome of the suite's own (0.10.3 review): asked for any free debugging port
// (--remote-debugging-port=0), which it writes to DevToolsActivePort in its profile. So a
// suite never attaches to another Chrome that happens to hold a port it picked at random.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export async function launchChrome(name, extra = []) {
  const dir = `/tmp/${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, ...extra, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 150; i++) {
    try { const port = +readFileSync(dir + '/DevToolsActivePort', 'utf8').split('\n')[0]; if (port) return { proc, PORT: port }; } catch { /* not written yet */ }
    await new Promise(r => setTimeout(r, 100));
  }
  proc.kill(); throw new Error('Chrome did not start');
}
